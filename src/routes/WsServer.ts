import * as ws from 'ws';

class WsServer {
  private _clients: {id: number, client: ws}[] = [];
  private _currId = 0;

  clientNb(): number {
    return this._clients.length;
  }

  addClient(c: ws): number {
    this._clients.push({id: this._currId, client: c});
    return this._currId++;
  }

  sendToClients(data: unknown, sender?: number): void {
    this._clients.forEach((c) => {
      try {
        if (sender === undefined || c.id !== sender) {
          c.client.send(JSON.stringify(data));
        }
      } catch (e) {
        console.error(e);
      }
    });
  }

  sendToClient(data: unknown, id: number): void {
    const c = this._clients.find((e) => e.id === id);

    if (c) {
      try {
        c.client.send(JSON.stringify(data));
      } catch (e) {
        console.error(e);
      }
    }
  }

  removeClient(id: number): void {
    this._clients = this._clients.filter((e) => e.id !== id);
  }
}

export default WsServer;