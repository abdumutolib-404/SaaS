export declare const statsService: {
    getUserStats(telegramId: number): Promise<{
        user_id: number;
        daily_requests: any;
        daily_tokens: any;
        total_requests: number;
        total_tokens: number;
        tts_usage: any;
        stt_usage: any;
        referrals: any;
        referral_earnings: any;
        created_at: string;
    }>;
    updateStats(telegramId: number, tokens: number): Promise<void>;
};
