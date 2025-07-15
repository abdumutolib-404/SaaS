export interface Referral {
    id: number;
    referrer_id: number;
    referred_id: number;
    reward_given: boolean;
    created_at: string;
}
export interface ReferralLink {
    id: number;
    user_id: number;
    referral_code: string;
    clicks: number;
    conversions: number;
    created_at: string;
}
export interface ReferralReward {
    id: number;
    user_id: number;
    referral_id: number;
    daily_tokens: number;
    total_tokens: number;
    created_at: string;
}
export interface ReferralStats {
    total_referrals: number;
    total_earnings: number;
    recent_referrals: any[];
    referral_link: string;
    referral_code: string;
    clicks: number;
    conversions: number;
    conversion_rate: number;
}
export declare const referralService: {
    REFERRER_REWARD: {
        daily_tokens: number;
        total_tokens: number;
    };
    REFERRED_REWARD: {
        daily_tokens: number;
        total_tokens: number;
    };
    /**
     * Generate unique referral code for user
     */
    generateReferralCode(userId: number): string;
    /**
     * Create or get referral link for user
     */
    createReferralLink(userId: number, botUsername: string): Promise<ReferralLink>;
    /**
     * Generate referral link URL
     */
    generateReferralLink(userId: number, botUsername: string): Promise<string>;
    /**
     * Extract referrer ID from referral code
     */
    extractReferrerId(referralCode: string): number | null;
    /**
     * Process referral when new user joins
     */
    processReferral(referrerId: number, newUserId: number): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Get user's referral statistics
     */
    getReferralStats(userId: number, botUsername: string): Promise<ReferralStats>;
    /**
     * Get all referrals for admin
     */
    getAllReferrals(): Promise<any[]>;
    /**
     * Get referral leaderboard
     */
    getReferralLeaderboard(limit?: number): Promise<any[]>;
    /**
     * Check if user was referred by someone
     */
    getReferrerInfo(userId: number): Promise<any | null>;
    /**
     * Get referral system statistics for admin
     */
    getSystemReferralStats(): Promise<any>;
};
