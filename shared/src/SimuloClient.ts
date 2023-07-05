interface SimuloClient {
    id: string;
    connect(): void;
    on(type: string, callback: Function): void;
    off(type: string, callback: Function): void;
    /** Emit data over WebRTC */
    emitData(type: string, data: any): void;
    /** Emit data over WebSocket */
    emitReliableData(type: string, data: any): void;
}

export default SimuloClient;