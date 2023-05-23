import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { getRepository } from "typeorm";
import * as jwt from "jsonwebtoken";

import { User, UserType } from "../entities/User";

interface JwtPayload {
  userId: number,
  email: string,
}

export function checkRole(roles: UserType[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    const id = res.locals.jwtPayload.userId;
    const userRepository = getRepository(User);

    try {
      const user = await userRepository.findOneOrFail(id);

      if (roles.indexOf(user.type) !== -1) {
        res.locals.role = user.type;
        next();
      } else {
        return res.status(StatusCodes.UNAUTHORIZED).send(`User is not of role ${roles}`);
      }
    } catch (e) {
      return res.status(StatusCodes.UNAUTHORIZED).send(`User ${id} not found`);
    }
  }
}

export function checkLogin(passthrough?: boolean) {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    const token = <string>req.headers['authorization'];

    const { success, user, jwtPayload, error } = await getUserWithJwt(token);

    if (success && user) {
      res.locals.jwtPayload = jwtPayload;
      res.locals.user = user;
      const newToken = user.getJWTToken();
      res.set('Authorization', newToken);
      return next();
    } else {
      console.log(error);
      if (passthrough) {
        res.locals.user = undefined;
        return next();
      } else {
        return res.status(StatusCodes.UNAUTHORIZED).send(`JWT is not correct or user was not found`);
      }
    }
  }
}

export async function getUserWithJwt(token: string) {
  try {
    const jwtPayload = <JwtPayload>jwt.verify(token, process.env.JWT_SECRET || "SECRET");
    const { userId } = jwtPayload;
    const user = await getRepository(User).findOneOrFail(userId);
    return { success: true, user, jwtPayload };
  } catch (e) {
    return { success: false, error: e };
  }
}