declare class DatabaseManager {
    private db;
    constructor();
    private init;
    run(sql: string, params?: any[]): void;
    get(sql: string, params?: any[]): any;
    all(sql: string, params?: any[]): any[];
    transaction(fn: () => void): () => void;
    close(): void;
}
export declare const database: DatabaseManager;
export {};
