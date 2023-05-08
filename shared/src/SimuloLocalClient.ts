import SimuloClient from "./SimuloClient";
import SimuloServerController from "./SimuloServerController";

class SimuloLocalClient implements SimuloClient {
    listeners: { [key: string]: Function[] } = {};
    serverController: SimuloServerController;
    id: string;
    connect(): void {
        this.emit("connect", null);
        this.emit("ready", null);
    }
    emit(event: string, data: any) {
        if (this.listeners[event]) {
            this.listeners[event].forEach((listener) => {
                listener(data);
            });
        }
    }
    on(event: string, listener: Function) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }
    off(event: string, listener: Function) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter((l) => l != listener);
        }
    }
    emitData(type: string, data: any): void {
        this.serverController.handleData({ type: type, data: data }, this.id);
    }
    emitReliableData(type: string, data: any): void {
        // TODO: this
    }

    constructor(serverController: SimuloServerController, id: string) {
        this.serverController = serverController;
        this.id = id;
    }



}

export default SimuloLocalClient;