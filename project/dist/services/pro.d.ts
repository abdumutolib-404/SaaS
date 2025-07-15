export interface ProModelUsage {
    id: number;
    user_id: number;
    model_id: string;
    usage_count: number;
    month_year: string;
    created_at: string;
    updated_at: string;
}
export interface TTSUsage {
    id: number;
    user_id: number;
    month_year: string;
    usage_count: number;
    created_at: string;
    updated_at: string;
}
export interface STTUsage {
    id: number;
    user_id: number;
    month_year: string;
    usage_count: number;
    created_at: string;
    updated_at: string;
}
export declare const proService: {
    /**
     * Get current month-year string
     */
    getCurrentMonthYear(): string;
    /**
     * Get current day string for daily limits
     */
    getCurrentDay(): string;
    /**
     * Check if user is PRO
     */
    isUserPro(userId: number): Promise<boolean>;
    /**
     * Grant PRO status to user
     */
    grantProStatus(userId: number, durationDays?: number): Promise<void>;
    /**
     * Expire PRO status
     */
    expireProStatus(userId: number): Promise<void>;
    /**
     * Check PRO model usage limit
     * FREE: 1/day, PRO: 150/month, PREMIUM: unlimited
     */
    checkProModelUsage(userId: number, modelId: string): Promise<{
        allowed: boolean;
        remaining: number;
        limit: number;
    }>;
    /**
     * Increment PRO model usage
     */
    incrementProModelUsage(userId: number, modelId: string): Promise<void>;
    /**
     * Check TTS usage limit
     */
    checkTTSUsage(userId: number): Promise<{
        allowed: boolean;
        remaining: number;
        limit: number;
    }>;
    /**
     * Increment TTS usage
     */
    incrementTTSUsage(userId: number): Promise<void>;
    /**
     * Check STT usage limit
     */
    checkSTTUsage(userId: number): Promise<{
        allowed: boolean;
        remaining: number;
        limit: number;
    }>;
    /**
     * Increment STT usage
     */
    incrementSTTUsage(userId: number): Promise<void>;
    /**
     * Get user's PRO statistics
     */
    getProStats(userId: number): Promise<any>;
    /**
     * Check image usage limit
     */
    checkImageUsage(userId: number): Promise<{
        allowed: boolean;
        remaining: number;
        limit: number;
    }>;
    /**
     * Increment image usage
     */
    incrementImageUsage(userId: number): Promise<void>;
    /**
     * Reset monthly usage (for admin or cron job)
     */
    resetMonthlyUsage(): Promise<void>;
};
