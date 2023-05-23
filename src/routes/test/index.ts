import { RoutesType, Method, RoutesTypeWS } from '../types';
import test from './test';

const crud: RoutesType[] = [
  {
    method: Method.GET,
    route: "/test",
    controller: test
  },
];

const websockets: RoutesTypeWS[] = [];

export default {
  crud,
  websockets
};