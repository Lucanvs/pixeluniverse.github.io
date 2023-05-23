import "reflect-metadata";
import * as express from "express";
import * as expressWs from "express-ws";
import * as cors from "cors";
import * as bodyParser from "body-parser";
import * as dotenv from 'dotenv';
import { Request, Response, NextFunction } from "express";
import { Connection, createConnection } from "typeorm";

import routes from './routes';
import { StatusCodes } from "http-status-codes";
import { setupCrons } from "./crons";

dotenv.config();

const appBase = express();
appBase.use(cors({
  exposedHeaders: 'Authorization'
}));
appBase.use(bodyParser.json());
const wsInstance = expressWs(appBase);
const { app } = wsInstance;

routes.crud.forEach((route) => {
  app[route.method](
    route.route,
    ...(route.middlewares || []),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await route.controller(req, res, next);
      } catch (e) {
        console.error(e);
        return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
      }
    }
  )
});

routes.websockets.forEach((route) => {
  app.ws(
    route.route,
    route.controller,
  )
});

export let typeormConnection: Connection;

createConnection({
  "type": "postgres",
  "url": process.env.DATABASE_URL, // When commented, default to localhost
  "synchronize": true,
  "logging": false,
  "username": "postgres",
  "database": "mappix",
  // "ssl": true,
  // "extra": {
  //   "ssl": {
  //     "rejectUnauthorized": false
  //   }
  // },
  "entities": [`${__dirname}/entities/**/*`],
  "subscribers": [`${__dirname}/entities/**/*`]
}).then(() => {
  app.listen(process.env.PORT || 8080, () => {
    setInterval(() => {
      wsInstance.getWss().clients.forEach((c) => {
        if (c.readyState === c.OPEN)
          c.ping();
      });
    }, 10000);
    setupCrons();

    console.log(`[API] Listening to ${process.env.PORT || 8080}`);
  })
});
