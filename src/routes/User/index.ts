import { checkLogin } from '../auth';
import { RoutesType, Method, RoutesTypeWS } from '../types';
import { login, register, get, update, del } from './controller';

const crud: RoutesType[] = [
  {
    method: Method.POST,
    route: "/user/login",
    controller: login,
  },
  {
    method: Method.POST,
    route: "/user/register",
    controller: register,
  },
  {
    method: Method.GET,
    route: "/user/me",
    controller: get,
    middlewares: [
      checkLogin(),
    ]
  },
  {
    method: Method.PUT,
    route: "/user/me",
    controller: update,
    middlewares: [
      checkLogin(),
    ]
  },
  {
    method: Method.DELETE,
    route: "/user/me",
    controller: del,
    middlewares: [
      checkLogin(),
    ]
  },
];

const websockets: RoutesTypeWS[] = [];

export default {
  crud,
  websockets
};