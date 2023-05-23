import * as fs from 'fs'
import * as pathResolve from 'path';
import * as sharp from 'sharp';
import { CHUNK_SIZE } from './constants';

export function getChunkPath(chunkX: number, chunkY: number, canvas: string, bg: boolean) {
  if (!bg)
    return pathResolve.resolve(`./chunks/${canvas}/fg/${chunkX}/${chunkY}.png`);
  else
    return pathResolve.resolve(`./chunks/${canvas}/bg/${chunkX}/${chunkY}.png`);
}

export function colorBgChunk(bgBuffer: { data: Buffer, info: sharp.OutputInfo }) {
  for (let i = 0; i < CHUNK_SIZE * CHUNK_SIZE * 3; i += 3) {
    if (bgBuffer.data[i] === 0 && bgBuffer.data[i + 1] === 0 && bgBuffer.data[i + 2] === 0) {
      bgBuffer.data[i] = 202;
      bgBuffer.data[i + 1] = 227;
      bgBuffer.data[i + 2] = 255;
    }
  }
  return bgBuffer;
}

export async function mergeChunks(bgPath: string, fgPath: string) {
  if (!fs.existsSync(fgPath) || !fs.existsSync(bgPath))
    return null;
  let bgBuffer = await sharp(bgPath).raw().toBuffer({ resolveWithObject: true });
  bgBuffer = colorBgChunk(bgBuffer);

  const bg = sharp(bgBuffer.data, { raw: { ...bgBuffer.info, channels: bgBuffer.info.channels as (1 | 2 | 3 | 4) }})
  const result = bg.composite([ { input: fgPath } ]);
  return await result.png().toBuffer();

}

export async function getMergedChunk(chunkX: number, chunkY: number, canvas: string): Promise<Buffer | null> {
  const fgPath = getChunkPath(chunkX, chunkY, canvas, false);
  const bgPath = getChunkPath(chunkX, chunkY, canvas, true);

  return await mergeChunks(bgPath, fgPath);
}