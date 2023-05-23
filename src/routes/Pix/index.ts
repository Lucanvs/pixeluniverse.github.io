import { RoutesType, RoutesTypeWS } from '../types';
import { connect } from './controller';

const crud: RoutesType[] = [];

const websockets: RoutesTypeWS[] = [
  {
    route: '/pix/connect',
    controller: connect,
  }
];

export default {
  crud,
  websockets
};