import { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';
import { getMergedChunk } from "../../utils/chunks";

// GET
// Returns chunk
export async function get(req: Request, res: Response): Promise<Response | void> {
  try {
    const { canvas, x, y } = req.params;
    const img = await getMergedChunk(Number(x), Number(y), canvas);

    if (!img) {
      return res.sendStatus(StatusCodes.NOT_FOUND);
    } else {
      res.writeHead(StatusCodes.OK, {
        'Content-Type': 'image/png',
        'Content-Length': img.length
      });
      res.end(img);  
    }
  } catch (err) {
    console.error(err);
    return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
  }
}