import { Request, Response } from "express";
import { StatusCodes } from 'http-status-codes';
import * as fs from 'fs';
import * as pathResolve from 'path';
import * as sharp from 'sharp';
import { colorBgChunk, getChunkPath, getMergedChunk, mergeChunks } from "../../utils/chunks";

function getDatesData(canvas: string): Array<{ date: string, saves: Array<string>}> | null {
  const path = pathResolve.resolve(`./chunks/${canvas}/history/saves.json`);

  if (fs.existsSync(path))
    return JSON.parse(fs.readFileSync(path).toString());
  else
    return null;
}

// GET
// Returns dates
export async function getDate(req: Request, res: Response): Promise<Response | void> {
  try {
    const { canvas } = req.params;

    const data = getDatesData(canvas);

    if (data)
      return res.status(StatusCodes.OK).send(data.map((e) => e.date));
    else
      return res.sendStatus(StatusCodes.NOT_FOUND);
  } catch (err) {
    console.error(err);
    return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

// GET
// Returns hours of date
export async function getHours(req: Request, res: Response): Promise<Response | void> {
  try {
    const { date, canvas } = req.params;

    const data = getDatesData(canvas);

    if (data)
      return res.status(StatusCodes.OK).send(data.find((e) => e.date === date)?.saves || []);
    else
      return res.sendStatus(StatusCodes.NOT_FOUND);
  } catch (err) {
    console.error(err);
    return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

// GET
// Returns chunk
export async function getHistoryChunk(req: Request, res: Response): Promise<Response | void> {
  try {
    const { canvas, x, y, date, hour } = req.params;

    let allDates = getDatesData(canvas)?.reverse().map((e) => ({ ...e, saves: e.saves.reverse() }));

    if (!allDates)
      return res.sendStatus(StatusCodes.NOT_FOUND);
    
    const dateIndex = allDates.findIndex((e) => e.date === date);
    if (dateIndex === -1)
      return res.sendStatus(StatusCodes.NOT_FOUND);
    const saveIndex = allDates[dateIndex].saves.findIndex((e) => e === hour);
    if (saveIndex === -1)
      return res.sendStatus(StatusCodes.NOT_FOUND);

    allDates = allDates.slice(dateIndex);
    allDates[0].saves = allDates[0].saves.slice(saveIndex);

    let found: null | string = null;

    allDates.some((d) => {
      d.saves.some((s) => {
        const path = pathResolve.resolve(`./chunks/${canvas}/history/${d.date}/${s}/${x}/${y}.png`);

        console.log(path);
        if (fs.existsSync(path)) {
          found = path;
          return true;
        }
        return false;
      })
      if (found)
        return true;
      return false;
    })

    const bgPath = getChunkPath(Number(x), Number(y), canvas, true);
    if (found) {
      const img = await mergeChunks(
        bgPath,
        found,
      );
      if (img) {
        res.writeHead(StatusCodes.OK, {
          'Content-Type': 'image/png',
          'Content-Length': img.length
        });
        res.end(img);
      } else {
        return res.sendStatus(StatusCodes.NOT_FOUND);
      }
    } else {
      let bgBuffer = await sharp(bgPath).raw().toBuffer({ resolveWithObject: true });
      bgBuffer = colorBgChunk(bgBuffer);

      const img = await sharp(bgBuffer.data, { raw: { ...bgBuffer.info, channels: bgBuffer.info.channels as (1 | 2 | 3 | 4) }}).png().toBuffer();
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