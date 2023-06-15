class SimuloLocalClient {
    constructor(serverController, id) {
        this.listeners = {};
        this.serverController = serverController;
        this.id = id;
    }
    connect() {
        this.emit("connect", null);
        this.emit("ready", null);
    }
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach((listener) => {
                listener(data);
            });
        }
    }
    on(event, listener) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }
    off(event, listener) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter((l) => l != listener);
        }
    }
    emitData(type, data) {
        this.serverController.handleData({ type: type, data: data }, this.id);
    }
    emitReliableData(type, data) {
        // TODO: this
    }
}
export default SimuloLocalClient;
//# sourceMappingURL=SimuloLocalClient.js.map