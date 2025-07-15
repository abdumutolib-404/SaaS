export interface PromocodeCreateData {
    code: string;
    type: 'TOKENS' | 'TTS' | 'STT' | 'PRO' | 'PREMIUM';
    description?: string;
    daily_tokens?: number;
    total_tokens?: number;
    tts_limit?: number;
    stt_limit?: number;
    pro_days?: number;
    plan_name?: string;
    max_usage: number;
    created_by: number;
}
export declare const promocodeService: {
    /**
     * Create a new promocode with enhanced features
     */
    createPromocode(data: PromocodeCreateData): Promise<void>;
    /**
     * Use a promocode with enhanced features
     */
    usePromocode(code: string, userId: number): Promise<{
        success: boolean;
        message: string;
        tokens?: {
            daily: number;
            total: number;
        };
    }>;
    /**
     * Add TTS limit to user
     */
    addTTSLimit(userId: number, limit: number): Promise<void>;
    /**
     * Add STT limit to user
     */
    addSTTLimit(userId: number, limit: number): Promise<void>;
    /**
     * Get promocode by code
     */
    getPromocodeByCode(code: string): Promise<any>;
    /**
     * Get active promocodes
     */
    getActivePromocodes(): Promise<any[]>;
    /**
     * Delete promocode
     */
    deletePromocode(id: number): Promise<void>;
    /**
     * Get promocode statistics
     */
    getPromocodeStats(): Promise<any>;
};
