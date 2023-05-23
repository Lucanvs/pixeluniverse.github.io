import { NextFunction, Request } from 'express-serve-static-core';
import * as ws from 'ws';
import * as fs from 'fs';
import * as pathResolve from 'path';
import * as md5 from 'md5';
import * as crypto from 'crypto';
import { PNG } from 'pngjs';

import WsServer from '../WsServer';
import { captchaController } from '../Captcha/controller';
import { getUserWithJwt } from '../auth';
import { User } from '../../entities/User';
import { getRepository } from 'typeorm';
import { getChunkPath } from '../../utils/chunks';
import { CHUNK_SIZE, COOLDOWN_TIME, MAX_COOLDOWN, palette, canvases } from '../../utils/constants';

function hexToRgb(hex: string) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return {
    r: parseInt(result![1], 16),
    g: parseInt(result![2], 16),
    b: parseInt(result![3], 16)
  };
}

class World extends WsServer {
  ipCooldowns: { userId: number | undefined, ip: string, cd: number }[] = [];
  cooldownInterval: NodeJS.Timeout;
  users: Array<{ user: User, connectedIds: number[] }> = [];
  chatMessages: { author: string, msg: string }[] = [];

  constructor() {
    super();
    this.ipCooldowns = [];
    this.cooldownInterval = setInterval(() => this.reduceCooldowns(), 1000);
    this.loadMessages();
  }
  destructor() {
    clearInterval(this.cooldownInterval);
  }

  loadMessages() {
    try {
      const path = pathResolve.resolve(`./chat/messages.json`);
      const exists = fs.existsSync(path);
      if (exists) {
        const buffer = fs.readFileSync(path, 'utf8');
        const data = JSON.parse(buffer);
        this.chatMessages = data.slice(-50);
      }
    } catch (err) {
      console.error(err);
    }
  }
  reduceCooldowns() {
    const now = Date.now();
    this.ipCooldowns = this.ipCooldowns.filter((e) => e.cd - now > 0);
  }
  get lastChatMessages() {
    return this.chatMessages.slice(-50);
  }

  getCooldown(ip: string, userId: number | undefined) {
    return this.ipCooldowns.find((e) => e.ip === ip || (userId !== undefined && e.userId === userId));
  }

  placePixel(x: number, y: number, canvas: string, color: string, ip: string, userId: number | undefined, isAdmin: boolean) {
    const cooldown = this.getCooldown(ip, userId);

    if (cooldown && cooldown.cd > Date.now() + MAX_COOLDOWN - COOLDOWN_TIME && !isAdmin)
      return { success: false, cd: cooldown?.cd || 0, isDifferent: false };
    if (palette.findIndex((e) => e === color) === -1)
      return { success: false, cd: cooldown?.cd || 0, isDifferent: false };

    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    let px = x % CHUNK_SIZE;
    let py = y % CHUNK_SIZE;
    px = px >= 0 ? px : CHUNK_SIZE + px;
    py = py >= 0 ? py : CHUNK_SIZE + py;

    const path = getChunkPath(chunkX, chunkY, canvas, false);
    const exists = fs.existsSync(path);
    if (exists) {
      const data = fs.readFileSync(path);
      const png = PNG.sync.read(data);
      const c = hexToRgb(color);
      const idx = (png.width * py + px) << 2;
      const isDifferent = png.data[idx] !== c.r || png.data[idx + 1] !== c.g || png.data[idx + 2] !== c.b || png.data[idx + 3] !== 255;

      png.data[idx] = c.r;
      png.data[idx + 1] = c.g;
      png.data[idx + 2] = c.b;
      png.data[idx + 3] = 255
      
      fs.writeFileSync(path, PNG.sync.write(png));
      if (isAdmin)
        return { success: true, cd: 0, isDifferent };
      if (cooldown) {
        cooldown.cd += COOLDOWN_TIME;
        return { success: true, cd: cooldown.cd, isDifferent };
      } else {
        this.ipCooldowns.push({ ip, userId, cd: Date.now() + COOLDOWN_TIME });
        return { success: true, cd: Date.now() + COOLDOWN_TIME, isDifferent };
      }
    }
    return { success: false, cd: cooldown?.cd || 0, isDifferent: false };
  }
  addMessage(mess: { author: string, msg: string }) {
    this.chatMessages.push(mess);
    const path = pathResolve.resolve(`./chat/messages.json`);
    const exists = fs.existsSync(path);
    if (exists) {
      const buffer = fs.readFileSync(path, 'utf8');
      const data = JSON.parse(buffer);
      data.push(mess);
      fs.writeFileSync(path, JSON.stringify(data));
    }
  }

  getUser(userId: number | undefined): User | undefined {
    return this.users.find((e) => e.user.id === userId)?.user;
  }
  addPixelCount(userId: number) {
    const userRepository = getRepository(User);
    const user = this.users.find((e) => e.user.id === userId);

    if (user) {
      user.user.totalPixels++;
      user.user.dailyPixels++;
      userRepository.save(user.user);
    }
  }
  loginClient(user: User, id: number) {
    const existing = this.users.find((e) => e.user.id === user.id);

    if (!existing) {
      this.users.push({ user, connectedIds: [ id ] });
    } else {
      if (!existing.connectedIds.find((e) => e === id))
        existing.connectedIds.push(id);
    }
  }
  logoutClient(userId: number | undefined, id: number) {
    if (userId === undefined)
      return;

    const user = this.users.find((e) => e.user.id === userId);

    if (user) {
      user.connectedIds = user.connectedIds.filter((e) => e !== id);
      if (user.connectedIds.length === 0)
        this.users = this.users.filter((e) => e.user.id !== userId);
    }
  }
  addPixClient(c: ws) {
    const id = super.addClient(c);
    return id;
  }
  removePixClient(id: number) {
    super.removeClient(id);
  }
  wrapReturnUserInfos(data: any, ip: string, userId: number | undefined) {
    const cd = this.getCooldown(ip, userId);
    const user = this.users.find((e) => e.user.id === userId);

    return {
      cd: cd?.cd || 0,
      totalPixels: user ? user.user.totalPixels : 0,
      dailyPixels: user ? user.user.dailyPixels : 0,
      ...data,
    }
  }
  resetDaily() {
    this.users = this.users.map((u) => {
      u.user.dailyPixels = 0;
      return u;
    });
  }
}

const world = new World();

export function getWorld() {
  return world;
}

function createColor(text: string) {
  return '#' + md5(text).substr(0, 6);
}

class ConnectionChecker {
  usedIds: Array<{ time: number, id: string }> = [];
  clearInterval: NodeJS.Timeout;
  ID_LIFETIME = 5 * 1000;

  constructor() {
    this.clearInterval = setInterval(() => this.clearUsedIds(), this.ID_LIFETIME / 2);
  }
  destructor() {
    clearInterval(this.clearInterval);
  }

  clearUsedIds() {
    const limit = Date.now() - (this.ID_LIFETIME * 2);
    this.usedIds = this.usedIds.filter((e) => e.time > limit);
  }

  checkHash(hash: string) {
    const ENCRYPTION_KEY = process.env.WS_HASH_KEY!;
    const textParts = hash.split(':');

    if (textParts.length !== 2)
      return false;
  
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    const [ date, id ] = decrypted.toString().split('-');

    const decryptedDate = Number(date);
  
    if (!decryptedDate)
      return false;
  
    const timeDiff = Date.now() - decryptedDate;

    if (timeDiff > this.ID_LIFETIME)
      return false;

    if (this.usedIds.findIndex((e) => e.id === id) !== -1)
      return false;
    
    this.usedIds.push({ time: decryptedDate, id });
    return true;
  }
};

const connectionChecker = new ConnectionChecker();

export async function connect(ws: ws, req: Request, next: NextFunction) {
  if (process.env.NODE_ENV !== "development" && (
      req.headers.origin !== process.env.FRONT_URL ||
      !req.query['hash'] ||
      !connectionChecker.checkHash(req.query['hash'] as string)
  )) {
    ws.close(1013);
    return;
  }

  const connectedAt = Date.now();
  const id = world.addPixClient(ws);
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
  let color = createColor(ip);
  let userId: number | undefined = undefined;

  ws.on('message', (msg) => {
    try {
      const { type, data, key } = JSON.parse(msg as string);
      const isAdmin = key === process.env.ADMIN_KEY;
      switch (type) {
        case 'placePixel':
          const timeDiff = Date.now() - connectedAt > 1000;
          const canvas = canvases.find((e) => e.id === data.canvas);

          const captchaValid = timeDiff && captchaController.checkIsValid(ip);
          const isValid = isAdmin || (captchaController && canvas && !canvas.locked);

          if (isValid) {
            const { success, cd, isDifferent } = world.placePixel(data.x, data.y, data.canvas, data.color, ip, userId, isAdmin);
            if (success) {
              if (isDifferent)
                world.sendToClients({ type, data: { x: data.x, y: data.y, color: data.color, canvas: data.canvas }}, id);

              if (userId !== undefined)
                world.addPixelCount(userId);
              world.sendToClient({ type: 'confirmPixel', data: world.wrapReturnUserInfos({ pos: { x: data.x, y: data.y }}, ip, userId) }, id);
            } else {
              world.sendToClient({ type: 'refusePixel', data: { cd, pos: { x: data.x, y: data.y }}}, id);
            }
          } else {
            if (!captchaValid)
              world.sendToClient({ type: 'captchaNeeded', data: world.wrapReturnUserInfos({ pos: { x: data.x, y: data.y }}, ip, userId) }, id);
            else
              world.sendToClient({ type: 'refusePixel', data: world.wrapReturnUserInfos({ pos: { x: data.x, y: data.y }}, ip, userId) }, id);
          }
        break;
        case 'sendMessage':
          if (userId) {
            const msg = { author: world.getUser(userId)!.username, msg: String(data), color };
            world.addMessage(msg);
            world.sendToClients({ type: 'chatMessage', data: msg });
          }
        break;
        case 'loginUser':
          (async () => {
            const { success, user: u } = await getUserWithJwt(data);
  
            if (success && u) {
              userId = u.id;
              world.loginClient(u, id);
              color = createColor(u.username);
            }
          })();
        break;
        case 'logoutUser':
          world.logoutClient(userId, id);
          userId = -1;
      }
    } catch (err) {
      console.error(err);
      ws.close();
      world.removePixClient(id);
      world.sendToClients({ type: 'playerNb', data: world.clientNb() }, id);
    }
  });
  ws.on('close', () => {
    console.log('Closing client');
    world.removePixClient(id);
    world.sendToClients({ type: 'playerNb', data: world.clientNb() }, id);
  });
  ws.on('error', () => {
    console.log('Error client');
    world.removePixClient(id);
    world.sendToClients({ type: 'playerNb', data: world.clientNb() }, id);
  })
  if (ws.readyState === ws.OPEN) {
    world.sendToClients({ type: 'playerNb', data: world.clientNb() }, id);
    world.sendToClient({
      type: 'init',
      data: {
        canvases,
        playerNb: world.clientNb(),
        cooldown: world.getCooldown(ip, userId)?.cd || 0,
        chatMessages: world.lastChatMessages,
      }
    }, id);
  }
}