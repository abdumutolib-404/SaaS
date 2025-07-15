import { database } from '../config/database.js';
import { userService } from './user.js';
import { logger } from '../utils/logger.js';
export const planService = {
    /**
     * Get all available plans
     */
    async getAllPlans() {
        try {
            return database.all('SELECT * FROM plans WHERE is_active = 1 ORDER BY price_monthly ASC');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error getting all plans', { error: errorMessage });
            return [];
        }
    },
    /**
     * Get plan by name
     */
    async getPlanByName(planName) {
        try {
            return database.get('SELECT * FROM plans WHERE name = ? AND is_active = 1', [planName.toUpperCase()]);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error getting plan by name', { error: errorMessage, plan_name: planName });
            return null;
        }
    },
    /**
     * Get user's current plan
     */
    async getUserPlan(userId) {
        try {
            const user = await userService.getUser(userId);
            if (!user)
                return null;
            const planName = user.plan_type || 'FREE';
            return await this.getPlanByName(planName);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error getting user plan', { error: errorMessage, user_id: userId });
            return null;
        }
    },
    /**
     * Change user's plan
     */
    async changeUserPlan(userId, planName, adminId) {
        try {
            const plan = await this.getPlanByName(planName);
            if (!plan) {
                return { success: false, message: 'Plan topilmadi' };
            }
            const user = await userService.getUser(userId);
            if (!user) {
                return { success: false, message: 'Foydalanuvchi topilmadi' };
            }
            // Update user plan and related settings
            const isPro = plan.name !== 'FREE';
            const proExpiresAt = isPro ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null; // 30 days from now
            database.run(`
        UPDATE users SET 
          plan_type = ?,
          is_pro = ?,
          pro_expires_at = ?,
          daily_tokens = ?,
          total_tokens = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE telegram_id = ?
      `, [
                plan.name,
                isPro ? 1 : 0,
                proExpiresAt ? proExpiresAt.toISOString() : null,
                plan.daily_tokens,
                plan.total_tokens,
                userId
            ]);
            logger.success('User plan changed', {
                user_id: userId,
                new_plan: plan.name,
                admin_id: adminId,
                is_pro: isPro,
                expires_at: proExpiresAt
            });
            return {
                success: true,
                message: `Plan muvaffaqiyatli o'zgartirildi: ${plan.display_name}`
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error changing user plan', { error: errorMessage, user_id: userId, plan_name: planName });
            return { success: false, message: 'Plan o\'zgartirishda xatolik yuz berdi' };
        }
    },
    /**
     * Get plan comparison data
     */
    async getPlanComparison() {
        try {
            const plans = await this.getAllPlans();
            return {
                plans: plans.map(plan => ({
                    name: plan.name,
                    display_name: plan.display_name,
                    daily_tokens: plan.daily_tokens,
                    total_tokens: plan.total_tokens,
                    image_limit: plan.image_limit,
                    tts_limit: plan.tts_limit,
                    pro_model_access: plan.pro_model_access,
                    priority_processing: plan.priority_processing,
                    price_monthly: plan.price_monthly,
                    features: this.getPlanFeatures(plan)
                }))
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error getting plan comparison', { error: errorMessage });
            return { plans: [] };
        }
    },
    /**
     * Get plan features list
     */
    getPlanFeatures(plan) {
        const features = [
            `${plan.daily_tokens.toLocaleString()} kunlik token`,
            `${plan.total_tokens.toLocaleString()} umumiy token`,
            `${plan.image_limit} rasm/oy (tez orada)`,
            `${plan.tts_limit} ovoz/oy`
        ];
        if (plan.pro_model_access) {
            features.push('Premium AI modellari');
        }
        else {
            features.push('Premium modellar: 4 so\'rov/kun');
        }
        if (plan.priority_processing) {
            features.push('Tezkor ishlov berish');
        }
        if (plan.name === 'FREE') {
            features.push('45+ bepul AI model');
        }
        else {
            features.push('Barcha AI modellar');
            features.push('Suhbatlarni saqlash (tez orada)');
            features.push('Eksport qilish (tez orada)');
            features.push('Xotira rejimi (tez orada)');
        }
        return features;
    },
    /**
     * Check if user can access PRO models
     */
    async canAccessProModels(userId) {
        try {
            const plan = await this.getUserPlan(userId);
            return plan ? plan.pro_model_access : false;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error checking PRO model access', { error: errorMessage, user_id: userId });
            return false;
        }
    },
    /**
     * Get plan statistics for admin
     */
    async getPlanStatistics() {
        try {
            const stats = database.all(`
        SELECT 
          plan_type,
          COUNT(*) as user_count,
          AVG(daily_used) as avg_daily_usage,
          AVG(total_used) as avg_total_usage
        FROM users 
        WHERE is_active = 1 
        GROUP BY plan_type
      `);
            const totalUsers = database.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1')?.count || 0;
            return {
                total_users: totalUsers,
                plan_distribution: stats,
                revenue_estimate: stats.reduce((sum, stat) => {
                    const plan = database.get('SELECT price_monthly FROM plans WHERE name = ?', [stat.plan_type]);
                    return sum + (stat.user_count * (plan?.price_monthly || 0));
                }, 0)
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error getting plan statistics', { error: errorMessage });
            return {
                total_users: 0,
                plan_distribution: [],
                revenue_estimate: 0
            };
        }
    }
};
//# sourceMappingURL=plan.js.map