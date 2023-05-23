import { RoutesType, Method, RoutesTypeWS } from '../types';
import { getDate, getHours, getHistoryChunk } from './controller';

const crud: RoutesType[] = [
  {
    method: Method.GET,
    route: "/history/dates/:canvas",
    controller: getDate,
  },
  {
    method: Method.GET,
    route: "/history/hours/:date/:canvas",
    controller: getHours
  },
  {
    method: Method.GET,
    route: "/history/chunk/:date/:hour/:canvas/:x/:y",
    controller: getHistoryChunk,
  }
];

const websockets: RoutesTypeWS[] = [];

export default {
  crud,
  websockets
};