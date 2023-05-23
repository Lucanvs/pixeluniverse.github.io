import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as TextToSVG from 'text-to-svg';

const textToSVG = TextToSVG.loadSync();

class CaptchaController {
  acceptedCaptchaIps: { ip: string, time: number }[] = [];
  waitingCaptchaIps: { ip: string, text: string, time: number }[] = [];
  checkInterval: NodeJS.Timeout;

  constructor() {
    this.checkInterval = setInterval(() => this.clearValidity(), 60000);
  }
  destructor() {
    clearInterval(this.checkInterval);
  }
  clearValidity() {
    const minTime = new Date(Date.now());
    minTime.setMinutes(minTime.getMinutes() - 30);
    this.acceptedCaptchaIps = this.acceptedCaptchaIps.filter(({ time }) => time > minTime.getTime());
    this.waitingCaptchaIps = this.waitingCaptchaIps.filter(({ time }) => time > minTime.getTime());
  }

  clearForIp(ip: string) {
    this.waitingCaptchaIps = this.waitingCaptchaIps.filter((e) => e.ip !== ip);
  }
  checkIsValid(ip: string) {
    return this.acceptedCaptchaIps.findIndex((e) => ip === e.ip) !== -1;
  }
  createCaptcha(ip: string) {
    this.clearForIp(ip);
    const text = (Math.random() + 1).toString(36).substring(7, 12);
    this.waitingCaptchaIps.push({ ip, text, time: Date.now() });
    return text;
  }
  validateCaptcha(ip: string, text: string) {
    const waiting = this.waitingCaptchaIps.find((e) => ip === e.ip);

    this.clearForIp(ip);
    if (!waiting || text !== waiting.text) {
      return false;
    } else {
      this.acceptedCaptchaIps = this.acceptedCaptchaIps.filter((e) => e.ip !== ip);
      this.acceptedCaptchaIps.push({ ip, time: Date.now() });
      return true;
    }
  }
}

export const captchaController = new CaptchaController();

// GET
// Returns CAPTCHA
export async function get(req: Request, res: Response): Promise<Response | void> {
  const attributes = { fill: 'red', stroke: 'black' };
  const options = { x: 250, y: 150, fontSize: 150, anchor: 'center middle', attributes };
  const RANDOMNESS = 10;
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
  const text = captchaController.createCaptcha(ip);

  // @ts-ignore
  const d = textToSVG.getD(text, options);
  const cmdRegEx = /[a-z][^a-z]*/ig;
  const commands = d.match(cmdRegEx);
  const finalD = commands!.filter((c) => c !== 'Z').map((command, i) => {
    const c = command[0];
    const positions = command.replaceAll('-', ' -').substr(1).split(' ').filter((e) => e !== '');
    const randomizedPositions = positions.map((pos) => {
      const pValue = Number(pos);
      const r = Math.random() * RANDOMNESS - RANDOMNESS / 2;
      if (isNaN(pValue + r)) {
        console.log(command, pValue, pos, r);
      }
      return Math.round(pValue + r);
    });
    return (c !== 'M' || i === 0 ? c : 'L') + randomizedPositions.join(' ');
  });
  const finalSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="500" height="300" viewBox="0,0,500,300">
      <rect width="100%" height="100%" fill="#EFEFEF"/>
      <path fill="none" stroke="black" style="stroke-width: 5;" d="${finalD.join('')}"/>
    </svg>
  `;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.status(StatusCodes.OK).send(finalSvg);
}

// POST
// Validate Captcha with text
export async function post(req: Request, res: Response): Promise<Response | void> {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
  const { text }: { text: string } = req.body;
  const isValid = captchaController.validateCaptcha(ip, text.toLowerCase());

  if (!isValid)
    return res.sendStatus(StatusCodes.UNAUTHORIZED);
  return res.sendStatus(StatusCodes.OK);
}