import { RoutesType, Method, RoutesTypeWS } from '../types';
import { get, post } from './controller';

const crud: RoutesType[] = [
  {
    method: Method.GET,
    route: "/captcha.svg",
    controller: get,
  },
  {
    method: Method.POST,
    route: "/captcha/verify",
    controller: post,
  }
];

const websockets: RoutesTypeWS[] = [];

export default {
  crud,
  websockets
};