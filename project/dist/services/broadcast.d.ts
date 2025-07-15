import { Telegraf } from 'telegraf';
export declare const broadcastService: {
    broadcastToAll(bot: Telegraf, message: string): Promise<number>;
    broadcastToActive(bot: Telegraf, message: string): Promise<number>;
    broadcastToCount(bot: Telegraf, message: string, count: number): Promise<number>;
    broadcastToGroups(bot: Telegraf, message: string): Promise<number>;
    broadcastMediaToAll(bot: Telegraf, message: any, caption: string): Promise<number>;
    broadcastMediaToActive(bot: Telegraf, message: any, caption: string): Promise<number>;
    broadcastMediaToCount(bot: Telegraf, message: any, caption: string, count: number): Promise<number>;
    broadcastMediaToGroups(bot: Telegraf, message: any, caption: string): Promise<number>;
};
