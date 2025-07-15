import { database } from '../config/database.js';
import { userService } from './user.js';
import { proService } from './pro.js';
import { planService } from './plan.js';
import { logger } from '../utils/logger.js';

export interface PromocodeCreateData {
  code: string;
  type: 'TOKENS' | 'TTS' | 'STT' | 'PRO' | 'PREMIUM';
  description?: string;
  // Token rewards
  daily_tokens?: number;
  total_tokens?: number;
  // TTS/STT rewards
  tts_limit?: number;
  stt_limit?: number;
  // PRO/PREMIUM rewards
  pro_days?: number;
  plan_name?: string;
  // Usage limits
  max_usage: number;
  created_by: number;
}

export const promocodeService = {
  /**
   * Create a new promocode with enhanced features
   */
  async createPromocode(data: PromocodeCreateData): Promise<void> {
    try {
      const {
        code,
        type,
        description,
        daily_tokens = 0,
        total_tokens = 0,
        tts_limit = 0,
        stt_limit = 0,
        pro_days = 0,
        plan_name = '',
        max_usage,
        created_by
      } = data;

      // Validate input
      if (!code || !type || !max_usage) {
        throw new Error('Kod, tur va maksimal foydalanish majburiy!');
      }

      // Check if code already exists
      const existingCode = await this.getPromocodeByCode(code);
      if (existingCode) {
        throw new Error('Bu kod allaqachon mavjud!');
      }

      // Insert into database
      await database.run(`
        INSERT INTO promocodes (
          code, type, description, daily_tokens, total_tokens, 
          tts_limit, stt_limit, pro_days, plan_name, max_usage, 
          current_usage, is_active, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?)
      `, [
        code.toUpperCase(),
        type,
        description || '',
        daily_tokens,
        total_tokens,
        tts_limit,
        stt_limit,
        pro_days,
        plan_name,
        max_usage,
        created_by
      ]);

      logger.admin('Enhanced promocode created', {
        code: code.toUpperCase(),
        type,
        description,
        daily_tokens,
        total_tokens,
        tts_limit,
        stt_limit,
        pro_days,
        plan_name,
        max_usage,
        created_by
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error creating enhanced promocode', { error: errorMessage });
      throw error;
    }
  },

  /**
   * Use a promocode with enhanced features
   */
  async usePromocode(code: string, userId: number): Promise<{ success: boolean; message: string; tokens?: { daily: number; total: number } }> {
    try {
      const promocode = await this.getPromocodeByCode(code);
      
      if (!promocode) {
        return { success: false, message: 'Promokod topilmadi yoki faol emas.' };
      }

      if (!promocode.is_active) {
        return { success: false, message: 'Bu promokod faol emas.' };
      }

      if (promocode.current_usage >= promocode.max_usage) {
        return { success: false, message: 'Bu promokod limiti tugagan.' };
      }

      // Check if user already used this promocode
      const alreadyUsed = await database.get(
        'SELECT * FROM promocode_usage WHERE promocode_id = ? AND user_id = ?',
        [promocode.id, userId]
      );

      if (alreadyUsed) {
        return { success: false, message: 'Siz bu promokodni allaqachon ishlatgansiz.' };
      }

      // Apply promocode benefits based on type
      let resultMessage = '';
      let tokens = { daily: 0, total: 0 };

      switch (promocode.type) {
        case 'TOKENS':
          if (promocode.daily_tokens > 0 || promocode.total_tokens > 0) {
            await userService.addTokens(userId, promocode.daily_tokens, promocode.total_tokens);
            tokens = { daily: promocode.daily_tokens, total: promocode.total_tokens };
            resultMessage = `Token qo'shildi: ${promocode.daily_tokens} kunlik, ${promocode.total_tokens} umumiy`;
          }
          break;

        case 'TTS':
          if (promocode.tts_limit > 0) {
            await this.addTTSLimit(userId, promocode.tts_limit);
            resultMessage = `TTS limit qo'shildi: +${promocode.tts_limit} ovoz`;
          }
          break;

        case 'STT':
          if (promocode.stt_limit > 0) {
            await this.addSTTLimit(userId, promocode.stt_limit);
            resultMessage = `STT limit qo'shildi: +${promocode.stt_limit} STT`;
          }
          break;

        case 'PRO':
          if (promocode.pro_days > 0) {
            await proService.grantProStatus(userId, promocode.pro_days);
            resultMessage = `PRO status berildi: ${promocode.pro_days} kun`;
          }
          break;

        case 'PREMIUM':
          if (promocode.plan_name) {
            await planService.changeUserPlan(userId, promocode.plan_name, promocode.created_by);
            resultMessage = `Plan o'zgartirildi: ${promocode.plan_name}`;
          }
          break;

        default:
          return { success: false, message: 'Noto\'g\'ri promokod turi.' };
      }

      // Record usage
      await database.run(
        'INSERT INTO promocode_usage (promocode_id, user_id) VALUES (?, ?)',
        [promocode.id, userId]
      );

      // Update usage count
      await database.run(
        'UPDATE promocodes SET current_usage = current_usage + 1 WHERE id = ?',
        [promocode.id]
      );

      logger.admin('Enhanced promocode used', {
        code: code.toUpperCase(),
        type: promocode.type,
        user_id: userId,
        result: resultMessage
      });

      return { 
        success: true, 
        message: resultMessage,
        tokens: promocode.type === 'TOKENS' ? tokens : undefined
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error using enhanced promocode', { error: errorMessage, code, user_id: userId });
      return { success: false, message: 'Promokod ishlatishda xatolik yuz berdi.' };
    }
  },

  /**
   * Add TTS limit to user
   */
  async addTTSLimit(userId: number, limit: number): Promise<void> {
    try {
      const monthYear = new Date().toISOString().substring(0, 7);
      
      await database.run(`
        INSERT INTO tts_usage (user_id, month_year, usage_count) 
        VALUES (?, ?, -?) 
        ON CONFLICT(user_id, month_year) 
        DO UPDATE SET usage_count = MAX(0, usage_count - ?)
      `, [userId, monthYear, limit, limit]);

      logger.info('TTS limit added', { user_id: userId, limit });
    } catch (error) {
      logger.error('Error adding TTS limit', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        user_id: userId
      });
    }
  },

  /**
   * Add STT limit to user
   */
  async addSTTLimit(userId: number, limit: number): Promise<void> {
    try {
      const monthYear = new Date().toISOString().substring(0, 7);
      
      await database.run(`
        INSERT INTO stt_usage (user_id, month_year, usage_count) 
        VALUES (?, ?, -?) 
        ON CONFLICT(user_id, month_year) 
        DO UPDATE SET usage_count = MAX(0, usage_count - ?)
      `, [userId, monthYear, limit, limit]);

      logger.info('STT limit added', { user_id: userId, limit });
    } catch (error) {
      logger.error('Error adding STT limit', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        user_id: userId
      });
    }
  },

  /**
   * Get promocode by code
   */
  async getPromocodeByCode(code: string): Promise<any> {
    try {
      return await database.get(
        'SELECT * FROM promocodes WHERE code = ? AND is_active = 1',
        [code.toUpperCase()]
      );
    } catch (error) {
      logger.error('Error getting promocode', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        code
      });
      return null;
    }
  },

  /**
   * Get active promocodes
   */
  async getActivePromocodes(): Promise<any[]> {
    try {
      return await database.all(`
        SELECT code, type, description, daily_tokens, total_tokens, 
               tts_limit, stt_limit, pro_days, plan_name, max_usage, 
               current_usage, created_at 
        FROM promocodes 
        WHERE is_active = 1 AND current_usage < max_usage 
        ORDER BY created_at DESC
      `);
    } catch (error) {
      logger.error('Error getting active promocodes', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  },

  /**
   * Delete promocode
   */
  async deletePromocode(id: number): Promise<void> {
    try {
      await database.run('DELETE FROM promocodes WHERE id = ?', [id]);
      logger.admin('Promocode deleted', { id });
    } catch (error) {
      logger.error('Error deleting promocode', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        id
      });
      throw error;
    }
  },

  /**
   * Get promocode statistics
   */
  async getPromocodeStats(): Promise<any> {
    try {
      const totalPromocodes = await database.get('SELECT COUNT(*) as count FROM promocodes');
      const activePromocodes = await database.get('SELECT COUNT(*) as count FROM promocodes WHERE is_active = 1');
      const totalUsage = await database.get('SELECT COUNT(*) as count FROM promocode_usage');
      
      return {
        total_promocodes: totalPromocodes?.count || 0,
        active_promocodes: activePromocodes?.count || 0,
        total_usage: totalUsage?.count || 0
      };
    } catch (error) {
      logger.error('Error getting promocode stats', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { total_promocodes: 0, active_promocodes: 0, total_usage: 0 };
    }
  }
};