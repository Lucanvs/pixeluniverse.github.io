import {Request, Response, NextFunction} from "express";
import * as ws from 'ws';

export enum Method {
  GET = "get",
  POST = "post",
  DELETE = "delete",
  PUT = "put",
  PATCH = "patch",
}

export interface RoutesType {
  method: Method,
  route: string,
  controller: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
  middlewares?: ((req: Request, res: Response, next: NextFunction) => Promise<unknown>)[]
}

export interface RoutesTypeWS {
  route: string,
  controller: (ws: ws, req: Request, next: NextFunction) => Promise<unknown>,
}
