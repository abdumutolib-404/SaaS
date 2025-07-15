import { database } from '../config/database.js';
import { userService } from './user.js';
export const statsService = {
    async getUserStats(telegramId) {
        const user = await userService.getUser(telegramId);
        if (!user)
            throw new Error('Foydalanuvchi topilmadi');
        // Bugungi statistika
        const today = new Date().toDateString();
        const dailyStats = await database.get(`
      SELECT * FROM user_stats 
      WHERE user_id = ? AND date(created_at) = date('now')
    `, [user.id]);
        // TTS va STT statistikasi
        const monthYear = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const ttsStats = await database.get(`
      SELECT usage_count FROM tts_usage 
      WHERE user_id = ? AND month_year = ?
    `, [telegramId, monthYear]);
        const sttStats = await database.get(`
      SELECT usage_count FROM stt_usage 
      WHERE user_id = ? AND month_year = ?
    `, [telegramId, monthYear]);
        // Referral statistikasi
        const referralStats = await database.get(`
      SELECT referral_count, referral_earnings FROM users 
      WHERE telegram_id = ?
    `, [telegramId]);
        return {
            user_id: user.telegram_id,
            daily_requests: dailyStats?.requests || 0,
            daily_tokens: dailyStats?.tokens || 0,
            total_requests: user.total_used > 0 ? Math.floor(user.total_used / 100) : 0,
            total_tokens: user.total_used,
            tts_usage: ttsStats?.usage_count || 0,
            stt_usage: sttStats?.usage_count || 0,
            referrals: referralStats?.referral_count || 0,
            referral_earnings: referralStats?.referral_earnings || 0,
            created_at: user.created_at
        };
    },
    async updateStats(telegramId, tokens) {
        const user = await userService.getUser(telegramId);
        if (!user)
            return;
        // Token ishlatilishini yangilash
        await userService.updateTokenUsage(telegramId, tokens);
        // Statistika yangilash
        const existingStats = await database.get(`
      SELECT * FROM user_stats 
      WHERE user_id = ? AND date(created_at) = date('now')
    `, [user.id]);
        if (existingStats) {
            await database.run(`
        UPDATE user_stats SET 
          requests = requests + 1, 
          tokens = tokens + ? 
        WHERE id = ?
      `, [tokens, existingStats.id]);
        }
        else {
            await database.run(`
        INSERT INTO user_stats (user_id, requests, tokens)
        VALUES (?, 1, ?)
      `, [user.id, tokens]);
        }
    }
};
//# sourceMappingURL=stats.js.map