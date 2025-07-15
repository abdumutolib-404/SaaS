import { User } from '../types/bot.js';
export declare const userService: {
    ensureUser(telegramUser: any): Promise<User>;
    getUser(telegramId: number): Promise<User | null>;
    updateSelectedModel(telegramId: number, modelId: string): Promise<void>;
    updateTokenUsage(telegramId: number, tokens: number): Promise<void>;
    updateUserInfo(telegramId: number, info: {
        name?: string;
        age?: number;
        interests?: string;
    }): Promise<void>;
    completeRegistration(telegramId: number): Promise<void>;
    addTokens(telegramId: number, dailyTokens: number, totalTokens: number): Promise<void>;
    removeTokens(telegramId: number, dailyTokens: number, totalTokens: number): Promise<{
        success: boolean;
        message: string;
        currentTokens?: {
            daily: number;
            total: number;
        };
    }>;
};
