import { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';
import { getRepository } from "typeorm";
import { formatUserReturn, User } from "../../entities/User";

// GET
// Returns user ranking
export async function get(req: Request, res: Response): Promise<Response | void> {
  try {
    const userRepository = getRepository(User);
    const totalUsers = await userRepository.find({
      order: {
        totalPixels: "DESC"
      },
      take: 50
    });
    const dailyUsers = await userRepository.find({
      order: {
        dailyPixels: "DESC"
      },
      take: 50
    });
    res.status(StatusCodes.OK).json({
      totalRanking: totalUsers.map(formatUserReturn),
      dailyRanking: dailyUsers.map(formatUserReturn),
    });
  } catch (err) {
    console.error(err);
    return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
  }
}