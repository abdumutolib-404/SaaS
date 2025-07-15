export interface LogData {
    [key: string]: any;
}
declare class Logger {
    private formatTimestamp;
    private formatData;
    info(message: string, data?: LogData): void;
    success(message: string, data?: LogData): void;
    warning(message: string, data?: LogData): void;
    error(message: string, data?: LogData): void;
    user(message: string, data?: LogData): void;
    admin(message: string, data?: LogData): void;
    ai(message: string, data?: LogData): void;
    broadcast(message: string, data?: LogData): void;
    database(message: string, data?: LogData): void;
    system(message: string, data?: LogData): void;
    banner(): void;
    separator(): void;
}
export declare const logger: Logger;
export {};
