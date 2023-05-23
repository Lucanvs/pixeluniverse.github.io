import { RoutesType, Method, RoutesTypeWS } from '../types';
import { get } from './controller';

const crud: RoutesType[] = [
  {
    method: Method.GET,
    route: "/chunk/:canvas/:x/:y",
    controller: get,
  },
];

const websockets: RoutesTypeWS[] = [];

export default {
  crud,
  websockets
};