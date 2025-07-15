export declare const adminService: {
    getSystemStats(): Promise<{
        total_users: any;
        daily_active: any;
        daily_requests: any;
        daily_tokens: any;
        total_requests: any;
        total_tokens: any;
    }>;
    addTokens(telegramId: number, dailyTokens: number, totalTokens: number): Promise<void>;
    removeTokens(telegramId: number, dailyTokens: number, totalTokens: number): Promise<{
        success: boolean;
        message: string;
        currentTokens?: {
            daily: number;
            total: number;
        };
    }>;
    getTotalUsers(): Promise<number>;
    getActiveUsers(): Promise<number>;
};
