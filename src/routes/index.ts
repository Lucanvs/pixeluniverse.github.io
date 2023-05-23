import { RoutesType, RoutesTypeWS } from './types';
import Test from './test';
import Chunks from './Chunks';
import Pix from './Pix';
import Captcha from './Captcha';
import User from './User';
import Ranking from './Ranking';
import History from './History';

const modules = [
  Test,
  Chunks,
  Pix,
  Captcha,
  User,
  Ranking,
  History
];

const crud: RoutesType[] = modules.flatMap((e) => e.crud);
const websockets: RoutesTypeWS[] = modules.flatMap((e) => e.websockets);

export default {
  crud,
  websockets,
};