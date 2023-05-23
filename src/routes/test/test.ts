import {Request, Response, NextFunction} from "express";

export default async function test(req: Request, res: Response, next: NextFunction) {
  return "MapPix Test";
}
