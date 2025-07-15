import { database } from '../config/database.js';
import { userService } from './user.js';
import { logger } from '../utils/logger.js';
export const referralService = {
    // Referral constants
    REFERRER_REWARD: {
        daily_tokens: 5000,
        total_tokens: 15000
    },
    REFERRED_REWARD: {
        daily_tokens: 3000,
        total_tokens: 10000
    },
    /**
     * Generate unique referral code for user
     */
    generateReferralCode(userId) {
        const timestamp = Date.now().toString(36);
        const userIdHex = userId.toString(16);
        return `ref_${userIdHex}_${timestamp}`;
    },
    /**
     * Create or get referral link for user
     */
    async createReferralLink(userId, botUsername) {
        try {
            // Check if user already has a referral link
            let referralLink = database.get('SELECT * FROM referral_links WHERE user_id = ?', [userId]);
            if (!referralLink) {
                // Create new referral link
                const referralCode = this.generateReferralCode(userId);
                database.run(`
          INSERT INTO referral_links (user_id, referral_code, clicks, conversions)
          VALUES (?, ?, 0, 0)
        `, [userId, referralCode]);
                referralLink = database.get('SELECT * FROM referral_links WHERE user_id = ?', [userId]);
                logger.success('Referral link created', { user_id: userId, referral_code: referralCode });
            }
            return referralLink;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error creating referral link', { error: errorMessage, user_id: userId });
            throw error;
        }
    },
    /**
     * Generate referral link URL
     */
    async generateReferralLink(userId, botUsername) {
        const referralLink = await this.createReferralLink(userId, botUsername);
        return `https://t.me/${botUsername}?start=${referralLink.referral_code}`;
    },
    /**
     * Extract referrer ID from referral code
     */
    extractReferrerId(referralCode) {
        try {
            if (!referralCode || !referralCode.startsWith('ref_')) {
                return null;
            }
            // Find referral link by code
            const referralLink = database.get('SELECT user_id FROM referral_links WHERE referral_code = ?', [referralCode]);
            if (referralLink) {
                // Increment click count
                database.run('UPDATE referral_links SET clicks = clicks + 1 WHERE referral_code = ?', [referralCode]);
                return referralLink.user_id;
            }
            return null;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error extracting referrer ID', { error: errorMessage, referral_code: referralCode });
            return null;
        }
    },
    /**
     * Process referral when new user joins
     */
    async processReferral(referrerId, newUserId) {
        try {
            // Check if user is trying to refer themselves
            if (referrerId === newUserId) {
                return { success: false, message: 'O\'zingizni taklif qila olmaysiz' };
            }
            // Check if referrer exists
            const referrer = await userService.getUser(referrerId);
            if (!referrer) {
                return { success: false, message: 'Taklif qiluvchi foydalanuvchi topilmadi' };
            }
            // Check if new user already has a referrer
            const existingReferral = database.get('SELECT id FROM referrals WHERE referred_id = ?', [newUserId]);
            if (existingReferral) {
                return { success: false, message: 'Siz allaqachon boshqa foydalanuvchi tomonidan taklif qilingansiz' };
            }
            // Create referral record
            const transaction = database.transaction(() => {
                // Insert referral
                database.run(`
          INSERT INTO referrals (referrer_id, referred_id, reward_given)
          VALUES (?, ?, 1)
        `, [referrerId, newUserId]);
                const referralId = database.get('SELECT last_insert_rowid() as id').id;
                // Give reward to referrer
                database.run(`
          UPDATE users SET 
            daily_tokens = daily_tokens + ?,
            total_tokens = total_tokens + ?,
            referral_count = referral_count + 1,
            referral_earnings = referral_earnings + ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE telegram_id = ?
        `, [
                    this.REFERRER_REWARD.daily_tokens,
                    this.REFERRER_REWARD.total_tokens,
                    this.REFERRER_REWARD.total_tokens,
                    referrerId
                ]);
                // Give reward to new user
                database.run(`
          UPDATE users SET 
            daily_tokens = daily_tokens + ?,
            total_tokens = total_tokens + ?,
            referred_by = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE telegram_id = ?
        `, [
                    this.REFERRED_REWARD.daily_tokens,
                    this.REFERRED_REWARD.total_tokens,
                    referrerId,
                    newUserId
                ]);
                // Record referrer reward
                database.run(`
          INSERT INTO referral_rewards (user_id, referral_id, daily_tokens, total_tokens)
          VALUES (?, ?, ?, ?)
        `, [referrerId, referralId, this.REFERRER_REWARD.daily_tokens, this.REFERRER_REWARD.total_tokens]);
                // Record referred user reward
                database.run(`
          INSERT INTO referral_rewards (user_id, referral_id, daily_tokens, total_tokens)
          VALUES (?, ?, ?, ?)
        `, [newUserId, referralId, this.REFERRED_REWARD.daily_tokens, this.REFERRED_REWARD.total_tokens]);
                // Increment conversion count for referral link
                database.run(`
          UPDATE referral_links SET conversions = conversions + 1 
          WHERE user_id = ?
        `, [referrerId]);
            });
            transaction();
            logger.success('Referral processed successfully', {
                referrer_id: referrerId,
                referred_id: newUserId,
                referrer_reward: this.REFERRER_REWARD,
                referred_reward: this.REFERRED_REWARD
            });
            return {
                success: true,
                message: `Taklif muvaffaqiyatli! Har ikkalangiz ham mukofot oldingiz!`
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error processing referral', {
                error: errorMessage,
                referrer_id: referrerId,
                referred_id: newUserId
            });
            return { success: false, message: 'Taklif jarayonida xatolik yuz berdi' };
        }
    },
    /**
     * Get user's referral statistics
     */
    async getReferralStats(userId, botUsername) {
        try {
            const user = await userService.getUser(userId);
            if (!user) {
                throw new Error('Foydalanuvchi topilmadi');
            }
            // Get or create referral link
            const referralLink = await this.createReferralLink(userId, botUsername);
            const referralUrl = `https://t.me/${botUsername}?start=${referralLink.referral_code}`;
            // Get referral count and earnings from user table
            const totalReferrals = user.referral_count || 0;
            const totalEarnings = user.referral_earnings || 0;
            // Get recent referrals with user info
            const recentReferrals = database.all(`
        SELECT 
          r.created_at,
          u.first_name,
          u.username,
          rr.daily_tokens,
          rr.total_tokens
        FROM referrals r
        JOIN users u ON r.referred_id = u.telegram_id
        LEFT JOIN referral_rewards rr ON r.id = rr.referral_id AND rr.user_id = r.referrer_id
        WHERE r.referrer_id = ?
        ORDER BY r.created_at DESC
        LIMIT 10
      `, [userId]);
            // Calculate conversion rate
            const conversionRate = referralLink.clicks > 0 ?
                (referralLink.conversions / referralLink.clicks * 100) : 0;
            return {
                total_referrals: totalReferrals,
                total_earnings: totalEarnings,
                recent_referrals: recentReferrals,
                referral_link: referralUrl,
                referral_code: referralLink.referral_code,
                clicks: referralLink.clicks,
                conversions: referralLink.conversions,
                conversion_rate: Math.round(conversionRate * 100) / 100
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error getting referral stats', { error: errorMessage, user_id: userId });
            // Return default stats with generated link
            const referralLink = await this.createReferralLink(userId, botUsername);
            const referralUrl = `https://t.me/${botUsername}?start=${referralLink.referral_code}`;
            return {
                total_referrals: 0,
                total_earnings: 0,
                recent_referrals: [],
                referral_link: referralUrl,
                referral_code: referralLink.referral_code,
                clicks: 0,
                conversions: 0,
                conversion_rate: 0
            };
        }
    },
    /**
     * Get all referrals for admin
     */
    async getAllReferrals() {
        try {
            return database.all(`
        SELECT 
          r.*,
          u1.first_name as referrer_name,
          u1.username as referrer_username,
          u2.first_name as referred_name,
          u2.username as referred_username
        FROM referrals r
        JOIN users u1 ON r.referrer_id = u1.telegram_id
        JOIN users u2 ON r.referred_id = u2.telegram_id
        ORDER BY r.created_at DESC
      `);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error getting all referrals', { error: errorMessage });
            return [];
        }
    },
    /**
     * Get referral leaderboard
     */
    async getReferralLeaderboard(limit = 10) {
        try {
            return database.all(`
        SELECT 
          telegram_id,
          first_name,
          username,
          referral_count,
          referral_earnings
        FROM users
        WHERE referral_count > 0
        ORDER BY referral_count DESC, referral_earnings DESC
        LIMIT ?
      `, [limit]);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error getting referral leaderboard', { error: errorMessage });
            return [];
        }
    },
    /**
     * Check if user was referred by someone
     */
    async getReferrerInfo(userId) {
        try {
            return database.get(`
        SELECT 
          u.telegram_id,
          u.first_name,
          u.username,
          r.created_at
        FROM referrals r
        JOIN users u ON r.referrer_id = u.telegram_id
        WHERE r.referred_id = ?
      `, [userId]);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error getting referrer info', { error: errorMessage, user_id: userId });
            return null;
        }
    },
    /**
     * Get referral system statistics for admin
     */
    async getSystemReferralStats() {
        try {
            const totalReferrals = database.get('SELECT COUNT(*) as count FROM referrals')?.count || 0;
            const totalRewards = database.get('SELECT SUM(total_tokens) as total FROM referral_rewards')?.total || 0;
            const topReferrers = await this.getReferralLeaderboard(5);
            const dailyReferrals = database.get(`
        SELECT COUNT(*) as count FROM referrals 
        WHERE date(created_at) = date('now')
      `)?.count || 0;
            const weeklyReferrals = database.get(`
        SELECT COUNT(*) as count FROM referrals 
        WHERE date(created_at) >= date('now', '-7 days')
      `)?.count || 0;
            const totalClicks = database.get('SELECT SUM(clicks) as total FROM referral_links')?.total || 0;
            const totalConversions = database.get('SELECT SUM(conversions) as total FROM referral_links')?.total || 0;
            const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks * 100) : 0;
            return {
                total_referrals: totalReferrals,
                total_rewards: totalRewards,
                daily_referrals: dailyReferrals,
                weekly_referrals: weeklyReferrals,
                total_clicks: totalClicks,
                total_conversions: totalConversions,
                conversion_rate: Math.round(conversionRate * 100) / 100,
                top_referrers: topReferrers
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error getting system referral stats', { error: errorMessage });
            return {
                total_referrals: 0,
                total_rewards: 0,
                daily_referrals: 0,
                weekly_referrals: 0,
                total_clicks: 0,
                total_conversions: 0,
                conversion_rate: 0,
                top_referrers: []
            };
        }
    }
};
//# sourceMappingURL=referral.js.map