import { database } from '../config/database.js';
import { userService } from './user.js';
import { planService } from './plan.js';
import { logger } from '../utils/logger.js';
export const proService = {
    /**
     * Get current month-year string
     */
    getCurrentMonthYear() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    },
    /**
     * Get current day string for daily limits
     */
    getCurrentDay() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    },
    /**
     * Check if user is PRO
     */
    async isUserPro(userId) {
        try {
            const user = await userService.getUser(userId);
            if (!user || !user.is_pro)
                return false;
            // Check if PRO subscription is still valid
            if (user.pro_expires_at) {
                const expiryDate = new Date(user.pro_expires_at);
                const now = new Date();
                if (now > expiryDate) {
                    // Expire PRO status
                    await this.expireProStatus(userId);
                    return false;
                }
            }
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error checking PRO status', { error: errorMessage, user_id: userId });
            return false;
        }
    },
    /**
     * Grant PRO status to user
     */
    async grantProStatus(userId, durationDays = 30) {
        try {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + durationDays);
            // Update user with PRO status and PRO plan with proper limits
            database.run(`
        UPDATE users SET 
          is_pro = 1, 
          pro_expires_at = ?,
          plan_type = 'PRO',
          daily_tokens = 8000,
          total_tokens = 80000,
          daily_used = 0,
          updated_at = CURRENT_TIMESTAMP
        WHERE telegram_id = ?
      `, [expiryDate.toISOString(), userId]);
            logger.success('PRO status granted', { user_id: userId, expires_at: expiryDate });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error granting PRO status', { error: errorMessage, user_id: userId });
            throw error;
        }
    },
    /**
     * Expire PRO status
     */
    async expireProStatus(userId) {
        try {
            database.run(`
        UPDATE users SET 
          is_pro = 0, 
          pro_expires_at = NULL,
          plan_type = 'FREE',
          daily_tokens = 2000,
          total_tokens = 15000,
          daily_used = 0,
          updated_at = CURRENT_TIMESTAMP
        WHERE telegram_id = ?
      `, [userId]);
            logger.info('PRO status expired', { user_id: userId });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error expiring PRO status', { error: errorMessage, user_id: userId });
            throw error;
        }
    },
    /**
     * Check PRO model usage limit
     * FREE: 1/day, PRO: 150/month, PREMIUM: unlimited
     */
    async checkProModelUsage(userId, modelId) {
        try {
            // Get model info
            const model = database.get('SELECT * FROM models WHERE id = ? AND model_type = "PRO"', [modelId]);
            if (!model) {
                return { allowed: true, remaining: 999, limit: 999 }; // Not a PRO model
            }
            const user = await userService.getUser(userId);
            const userPlan = await planService.getUserPlan(userId);
            let limit = 1; // FREE default (1 per day)
            if (userPlan?.name === 'PRO')
                limit = 150;
            else if (userPlan?.name === 'PREMIUM')
                limit = 999999; // Unlimited
            // For FREE users, check daily limit
            const timeKey = userPlan?.name === 'FREE' ? this.getCurrentDay() : this.getCurrentMonthYear();
            // Get current monthly usage
            const usage = database.get(`
        SELECT usage_count FROM pro_model_usage 
        WHERE user_id = ? AND model_id = ? AND month_year = ?
      `, [userId, modelId, timeKey]);
            const currentUsage = usage?.usage_count || 0;
            const remaining = Math.max(0, limit - currentUsage);
            return {
                allowed: currentUsage < limit,
                remaining,
                limit
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error checking PRO model usage', { error: errorMessage, user_id: userId, model_id: modelId });
            return { allowed: false, remaining: 0, limit: 0 };
        }
    },
    /**
     * Increment PRO model usage
     */
    async incrementProModelUsage(userId, modelId) {
        try {
            const userPlan = await planService.getUserPlan(userId);
            const timeKey = userPlan?.name === 'FREE' ? this.getCurrentDay() : this.getCurrentMonthYear();
            // Check if record exists
            const existing = database.get(`
        SELECT id FROM pro_model_usage 
        WHERE user_id = ? AND model_id = ? AND month_year = ?
      `, [userId, modelId, timeKey]);
            if (existing) {
                database.run(`
          UPDATE pro_model_usage SET 
            usage_count = usage_count + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND model_id = ? AND month_year = ?
        `, [userId, modelId, timeKey]);
            }
            else {
                database.run(`
          INSERT INTO pro_model_usage (user_id, model_id, usage_count, month_year)
          VALUES (?, ?, 1, ?)
        `, [userId, modelId, timeKey]);
            }
            logger.info('PRO model usage incremented', { user_id: userId, model_id: modelId });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error incrementing PRO model usage', { error: errorMessage, user_id: userId, model_id: modelId });
            throw error;
        }
    },
    /**
     * Check TTS usage limit
     */
    async checkTTSUsage(userId) {
        try {
            const userPlan = await planService.getUserPlan(userId);
            let limit = 1; // FREE default
            if (userPlan?.name === 'PRO')
                limit = 3;
            else if (userPlan?.name === 'PREMIUM')
                limit = 10;
            const monthYear = this.getCurrentMonthYear();
            const usage = database.get(`
        SELECT usage_count FROM tts_usage 
        WHERE user_id = ? AND month_year = ?
      `, [userId, monthYear]);
            const currentUsage = usage?.usage_count || 0;
            const remaining = Math.max(0, limit - currentUsage);
            return {
                allowed: currentUsage < limit,
                remaining,
                limit
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error checking TTS usage', { error: errorMessage, user_id: userId });
            return { allowed: false, remaining: 0, limit: 0 };
        }
    },
    /**
     * Increment TTS usage
     */
    async incrementTTSUsage(userId) {
        try {
            const monthYear = this.getCurrentMonthYear();
            const existing = database.get(`
        SELECT id FROM tts_usage 
        WHERE user_id = ? AND month_year = ?
      `, [userId, monthYear]);
            if (existing) {
                database.run(`
          UPDATE tts_usage SET 
            usage_count = usage_count + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND month_year = ?
        `, [userId, monthYear]);
            }
            else {
                database.run(`
          INSERT INTO tts_usage (user_id, usage_count, month_year)
          VALUES (?, 1, ?)
        `, [userId, monthYear]);
            }
            logger.info('TTS usage incremented', { user_id: userId });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error incrementing TTS usage', { error: errorMessage, user_id: userId });
            throw error;
        }
    },
    /**
     * Check STT usage limit
     */
    async checkSTTUsage(userId) {
        try {
            const userPlan = await planService.getUserPlan(userId);
            let limit = 1; // FREE default
            if (userPlan?.name === 'PRO')
                limit = 3;
            else if (userPlan?.name === 'PREMIUM')
                limit = 10;
            const monthYear = this.getCurrentMonthYear();
            const usage = database.get(`
        SELECT usage_count FROM stt_usage 
        WHERE user_id = ? AND month_year = ?
      `, [userId, monthYear]);
            const currentUsage = usage?.usage_count || 0;
            const remaining = Math.max(0, limit - currentUsage);
            return {
                allowed: currentUsage < limit,
                remaining,
                limit
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error checking STT usage', { error: errorMessage, user_id: userId });
            return { allowed: false, remaining: 0, limit: 0 };
        }
    },
    /**
     * Increment STT usage
     */
    async incrementSTTUsage(userId) {
        try {
            const monthYear = this.getCurrentMonthYear();
            const existing = database.get(`
        SELECT id FROM stt_usage 
        WHERE user_id = ? AND month_year = ?
      `, [userId, monthYear]);
            if (existing) {
                database.run(`
          UPDATE stt_usage SET 
            usage_count = usage_count + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND month_year = ?
        `, [userId, monthYear]);
            }
            else {
                database.run(`
          INSERT INTO stt_usage (user_id, usage_count, month_year)
          VALUES (?, 1, ?)
        `, [userId, monthYear]);
            }
            logger.info('STT usage incremented', { user_id: userId });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error incrementing STT usage', { error: errorMessage, user_id: userId });
            throw error;
        }
    },
    /**
     * Get user's PRO statistics
     */
    async getProStats(userId) {
        try {
            const user = await userService.getUser(userId);
            const isPro = await this.isUserPro(userId);
            const userPlan = await planService.getUserPlan(userId);
            const monthYear = this.getCurrentMonthYear();
            // Get PRO model usage
            const proModelUsage = database.all(`
        SELECT pmu.model_id, pmu.usage_count, m.name, m.monthly_limit
        FROM pro_model_usage pmu
        JOIN models m ON pmu.model_id = m.id
        WHERE pmu.user_id = ? AND pmu.month_year = ?
      `, [userId, monthYear]);
            // Get TTS usage
            const ttsUsage = database.get(`
        SELECT usage_count FROM tts_usage 
        WHERE user_id = ? AND month_year = ?
      `, [userId, monthYear]);
            // Get STT usage
            const sttUsage = database.get(`
        SELECT usage_count FROM stt_usage 
        WHERE user_id = ? AND month_year = ?
      `, [userId, monthYear]);
            const planType = userPlan?.name || 'FREE';
            let ttsLimit = 1;
            let sttLimit = 1;
            if (planType === 'PRO') {
                ttsLimit = 3;
                sttLimit = 3;
            }
            else if (planType === 'PREMIUM') {
                ttsLimit = 10;
                sttLimit = 10;
            }
            return {
                is_pro: isPro,
                plan_type: planType,
                pro_expires_at: user?.pro_expires_at,
                pro_models: proModelUsage,
                tts_usage: ttsUsage?.usage_count || 0,
                tts_limit: ttsLimit,
                stt_usage: sttUsage?.usage_count || 0,
                stt_limit: sttLimit,
                month_year: monthYear
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error getting PRO stats', { error: errorMessage, user_id: userId });
            return {
                is_pro: false,
                plan_type: 'FREE',
                pro_expires_at: null,
                pro_models: [],
                tts_usage: 0,
                tts_limit: 1,
                stt_usage: 0,
                stt_limit: 1,
                month_year: this.getCurrentMonthYear()
            };
        }
    },
    /**
     * Check image usage limit
     */
    async checkImageUsage(userId) {
        try {
            const userPlan = await planService.getUserPlan(userId);
            let limit = 1; // FREE default
            if (userPlan?.name === 'PRO')
                limit = 5;
            else if (userPlan?.name === 'PREMIUM')
                limit = 10;
            const monthYear = this.getCurrentMonthYear();
            const usage = database.get(`
        SELECT usage_count FROM image_usage 
        WHERE user_id = ? AND month_year = ?
      `, [userId, monthYear]);
            const currentUsage = usage?.usage_count || 0;
            const remaining = Math.max(0, limit - currentUsage);
            return {
                allowed: currentUsage < limit,
                remaining,
                limit
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error checking image usage', { error: errorMessage, user_id: userId });
            return { allowed: false, remaining: 0, limit: 0 };
        }
    },
    /**
     * Increment image usage
     */
    async incrementImageUsage(userId) {
        try {
            const monthYear = this.getCurrentMonthYear();
            const existing = database.get(`
        SELECT id FROM image_usage 
        WHERE user_id = ? AND month_year = ?
      `, [userId, monthYear]);
            if (existing) {
                database.run(`
          UPDATE image_usage SET 
            usage_count = usage_count + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND month_year = ?
        `, [userId, monthYear]);
            }
            else {
                database.run(`
          INSERT INTO image_usage (user_id, usage_count, month_year)
          VALUES (?, 1, ?)
        `, [userId, monthYear]);
            }
            logger.info('Image usage incremented', { user_id: userId });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error incrementing image usage', { error: errorMessage, user_id: userId });
            throw error;
        }
    },
    /**
     * Reset monthly usage (for admin or cron job)
     */
    async resetMonthlyUsage() {
        try {
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const lastMonthYear = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
            // Delete old usage records (keep only current and last month)
            database.run('DELETE FROM tts_usage WHERE month_year < ?', [lastMonthYear]);
            database.run('DELETE FROM stt_usage WHERE month_year < ?', [lastMonthYear]);
            database.run('DELETE FROM pro_model_usage WHERE month_year < ?', [lastMonthYear]);
            database.run('DELETE FROM image_usage WHERE month_year < ?', [lastMonthYear]);
            logger.success('Monthly usage reset completed');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error resetting monthly usage', { error: errorMessage });
            throw error;
        }
    }
};
//# sourceMappingURL=pro.js.map