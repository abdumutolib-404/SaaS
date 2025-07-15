export interface Plan {
    id: number;
    name: string;
    display_name: string;
    daily_tokens: number;
    total_tokens: number;
    image_limit: number;
    tts_limit: number;
    pro_model_access: boolean;
    priority_processing: boolean;
    price_monthly: number;
    is_active: boolean;
    created_at: string;
}
export declare const planService: {
    /**
     * Get all available plans
     */
    getAllPlans(): Promise<Plan[]>;
    /**
     * Get plan by name
     */
    getPlanByName(planName: string): Promise<Plan | null>;
    /**
     * Get user's current plan
     */
    getUserPlan(userId: number): Promise<Plan | null>;
    /**
     * Change user's plan
     */
    changeUserPlan(userId: number, planName: string, adminId?: number): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Get plan comparison data
     */
    getPlanComparison(): Promise<any>;
    /**
     * Get plan features list
     */
    getPlanFeatures(plan: Plan): string[];
    /**
     * Check if user can access PRO models
     */
    canAccessProModels(userId: number): Promise<boolean>;
    /**
     * Get plan statistics for admin
     */
    getPlanStatistics(): Promise<any>;
};
