interface SimuloClient {
    id: string;
    connect(): void;
    on(type: string, callback: Function): void;
    off(type: string, callback: Function): void;
    emitData(type: string, data: any): void;
    emitReliableData(type: string, data: any): void;
}

export default SimuloClient;