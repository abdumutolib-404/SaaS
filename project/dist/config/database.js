import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
class DatabaseManager {
    db;
    constructor() {
        const dbPath = path.join(__dirname, '../../bot.db');
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.init();
    }
    init() {
        logger.database('Initializing database...');
        try {
            // Users table with plan_type
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          telegram_id INTEGER UNIQUE NOT NULL,
          username TEXT,
          first_name TEXT NOT NULL,
          last_name TEXT,
          age INTEGER,
          interests TEXT,
          daily_tokens INTEGER DEFAULT 2000,
          total_tokens INTEGER DEFAULT 15000,
          daily_used INTEGER DEFAULT 0,
          total_used INTEGER DEFAULT 0,
          selected_model TEXT DEFAULT 'deepseek/deepseek-chat-v3-0324:free',
          is_active BOOLEAN DEFAULT 1,
          registration_completed BOOLEAN DEFAULT 0,
          referred_by INTEGER,
          referral_count INTEGER DEFAULT 0,
          referral_earnings INTEGER DEFAULT 0,
          is_pro BOOLEAN DEFAULT 0,
          pro_expires_at DATETIME,
          plan_type TEXT DEFAULT 'FREE',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Check if plan_type column exists in users table
            const userTableInfo = this.db.pragma('table_info(users)');
            const hasPlanType = userTableInfo.some((col) => col.name === 'plan_type');
            if (!hasPlanType) {
                this.db.exec('ALTER TABLE users ADD COLUMN plan_type TEXT DEFAULT "FREE"');
                logger.database('Added plan_type column to users table');
            }
            // Models table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS models (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          provider TEXT NOT NULL,
          category TEXT DEFAULT 'General',
          max_tokens INTEGER DEFAULT 4000,
          cost_per_token REAL DEFAULT 0.00001,
          is_active BOOLEAN DEFAULT 1,
          model_type TEXT DEFAULT 'FREE',
          monthly_limit INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Check if model_type and monthly_limit columns exist
            const modelTableInfo = this.db.pragma('table_info(models)');
            const hasModelType = modelTableInfo.some((col) => col.name === 'model_type');
            const hasMonthlyLimit = modelTableInfo.some((col) => col.name === 'monthly_limit');
            const hasCategory = modelTableInfo.some((col) => col.name === 'category');
            if (!hasModelType) {
                this.db.exec('ALTER TABLE models ADD COLUMN model_type TEXT DEFAULT "FREE"');
                logger.database('Added model_type column to models table');
            }
            if (!hasMonthlyLimit) {
                this.db.exec('ALTER TABLE models ADD COLUMN monthly_limit INTEGER DEFAULT 0');
                logger.database('Added monthly_limit column to models table');
            }
            if (!hasCategory) {
                this.db.exec('ALTER TABLE models ADD COLUMN category TEXT DEFAULT "General"');
                logger.database('Added category column to models table');
            }
            // Plans table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS plans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          daily_tokens INTEGER NOT NULL,
          total_tokens INTEGER NOT NULL,
          image_limit INTEGER DEFAULT 0,
          tts_limit INTEGER DEFAULT 0,
          stt_limit INTEGER DEFAULT 0,
          pro_model_access BOOLEAN DEFAULT 0,
          priority_processing BOOLEAN DEFAULT 0,
          price_monthly REAL DEFAULT 0,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Check if stt_limit column exists
            const planTableInfo = this.db.pragma('table_info(plans)');
            const hasSTTLimitPlans = planTableInfo.some((col) => col.name === 'stt_limit');
            if (!hasSTTLimitPlans) {
                this.db.exec('ALTER TABLE plans ADD COLUMN stt_limit INTEGER DEFAULT 0');
                logger.database('Added stt_limit column to plans table');
            }
            // User stats table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          requests INTEGER DEFAULT 0,
          tokens INTEGER DEFAULT 0,
          tts_usage INTEGER DEFAULT 0,
          stt_usage INTEGER DEFAULT 0,
          referrals INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Check if tts_usage, stt_usage, referrals columns exist
            const statsTableInfo = this.db.pragma('table_info(user_stats)');
            const hasTTSUsage = statsTableInfo.some((col) => col.name === 'tts_usage');
            const hasSTTUsageStats = statsTableInfo.some((col) => col.name === 'stt_usage');
            const hasReferrals = statsTableInfo.some((col) => col.name === 'referrals');
            if (!hasTTSUsage) {
                this.db.exec('ALTER TABLE user_stats ADD COLUMN tts_usage INTEGER DEFAULT 0');
                logger.database('Added tts_usage column to user_stats table');
            }
            if (!hasSTTUsageStats) {
                this.db.exec('ALTER TABLE user_stats ADD COLUMN stt_usage INTEGER DEFAULT 0');
                logger.database('Added stt_usage column to user_stats table');
            }
            if (!hasReferrals) {
                this.db.exec('ALTER TABLE user_stats ADD COLUMN referrals INTEGER DEFAULT 0');
                logger.database('Added referrals column to user_stats table');
            }
            // Promocodes table - Enhanced
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS promocodes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT UNIQUE NOT NULL,
          type TEXT NOT NULL DEFAULT 'TOKENS',
          description TEXT DEFAULT '',
          daily_tokens INTEGER DEFAULT 0,
          total_tokens INTEGER DEFAULT 0,
          tts_limit INTEGER DEFAULT 0,
          stt_limit INTEGER DEFAULT 0,
          pro_days INTEGER DEFAULT 0,
          plan_name TEXT DEFAULT '',
          max_usage INTEGER NOT NULL,
          current_usage INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT 1,
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
            // Check if new columns exist in promocodes table
            const promocodeTableInfo = this.db.pragma('table_info(promocodes)');
            const hasType = promocodeTableInfo.some((col) => col.name === 'type');
            const hasDescription = promocodeTableInfo.some((col) => col.name === 'description');
            const hasTTSLimit = promocodeTableInfo.some((col) => col.name === 'tts_limit');
            const hasSTTLimit = promocodeTableInfo.some((col) => col.name === 'stt_limit');
            const hasProDays = promocodeTableInfo.some((col) => col.name === 'pro_days');
            const hasPlanName = promocodeTableInfo.some((col) => col.name === 'plan_name');
            if (!hasType) {
                this.db.exec('ALTER TABLE promocodes ADD COLUMN type TEXT DEFAULT "TOKENS"');
                logger.database('Added type column to promocodes table');
            }
            if (!hasDescription) {
                this.db.exec('ALTER TABLE promocodes ADD COLUMN description TEXT DEFAULT ""');
                logger.database('Added description column to promocodes table');
            }
            if (!hasTTSLimit) {
                this.db.exec('ALTER TABLE promocodes ADD COLUMN tts_limit INTEGER DEFAULT 0');
                logger.database('Added tts_limit column to promocodes table');
            }
            if (!hasSTTLimit) {
                this.db.exec('ALTER TABLE promocodes ADD COLUMN stt_limit INTEGER DEFAULT 0');
                logger.database('Added stt_limit column to promocodes table');
            }
            if (!hasProDays) {
                this.db.exec('ALTER TABLE promocodes ADD COLUMN pro_days INTEGER DEFAULT 0');
                logger.database('Added pro_days column to promocodes table');
            }
            if (!hasPlanName) {
                this.db.exec('ALTER TABLE promocodes ADD COLUMN plan_name TEXT DEFAULT ""');
                logger.database('Added plan_name column to promocodes table');
            }
            // Promocode usage table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS promocode_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          promocode_id INTEGER REFERENCES promocodes(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(promocode_id, user_id)
        )
      `);
            // Rate limits table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS rate_limits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          request_count INTEGER DEFAULT 1,
          window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id)
        )
      `);
            // Referral links table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS referral_links (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          referral_code TEXT UNIQUE NOT NULL,
          clicks INTEGER DEFAULT 0,
          conversions INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(telegram_id),
          UNIQUE(user_id)
        )
      `);
            // Referral system tables
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS referrals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          referrer_id INTEGER NOT NULL,
          referred_id INTEGER NOT NULL,
          reward_given BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (referrer_id) REFERENCES users(telegram_id),
          FOREIGN KEY (referred_id) REFERENCES users(telegram_id),
          UNIQUE(referred_id)
        )
      `);
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS referral_rewards (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          referral_id INTEGER NOT NULL,
          daily_tokens INTEGER NOT NULL,
          total_tokens INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(telegram_id),
          FOREIGN KEY (referral_id) REFERENCES referrals(id)
        )
      `);
            // PRO Features Tables
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS pro_model_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          model_id TEXT NOT NULL,
          usage_count INTEGER DEFAULT 0,
          month_year TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(telegram_id),
          FOREIGN KEY (model_id) REFERENCES models(id),
          UNIQUE(user_id, model_id, month_year)
        )
      `);
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS tts_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          month_year TEXT NOT NULL,
          usage_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(telegram_id),
          UNIQUE(user_id, month_year)
        )
      `);
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS stt_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          month_year TEXT NOT NULL,
          usage_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(telegram_id),
          UNIQUE(user_id, month_year)
        )
      `);
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS conversation_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          conversation_id TEXT NOT NULL,
          message_role TEXT NOT NULL,
          message_content TEXT NOT NULL,
          model_used TEXT,
          tokens_used INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(telegram_id)
        )
      `);
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS saved_conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          conversation_id TEXT NOT NULL,
          title TEXT NOT NULL,
          message_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(telegram_id)
        )
      `);
            // Insert default plans if they don't exist
            const existingPlans = this.db.prepare('SELECT COUNT(*) as count FROM plans').get();
            if (existingPlans.count === 0) {
                const plans = [
                    ['FREE', 'Free Plan', 2000, 15000, 3, 1, 1, 0, 0, 0, 1],
                    ['PRO', 'Pro Plan', 8000, 80000, 10, 3, 3, 1, 1, 12000, 1],
                    ['PREMIUM', 'Premium Plan', 12000, 150000, 25, 10, 10, 1, 1, 25000, 1]
                ];
                const insertPlan = this.db.prepare(`
          INSERT INTO plans (name, display_name, daily_tokens, total_tokens, image_limit, tts_limit, stt_limit, pro_model_access, priority_processing, price_monthly, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
                for (const plan of plans) {
                    insertPlan.run(...plan);
                }
                logger.database('Default plans created');
            }
            // Chat sessions and messages tables
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          message_count INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT 1,
          FOREIGN KEY (user_id) REFERENCES users(telegram_id)
        )
      `);
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          user_id INTEGER NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          tokens_used INTEGER DEFAULT 0,
          model_used TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES chat_sessions(id),
          FOREIGN KEY (user_id) REFERENCES users(telegram_id)
        )
      `);
            // User preferences table for smart features
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          preference_type TEXT NOT NULL,
          preference_value TEXT NOT NULL,
          confidence REAL DEFAULT 0.0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(telegram_id),
          UNIQUE(user_id, preference_type, preference_value)
        )
      `);
            // Image usage table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS image_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          month_year TEXT NOT NULL,
          usage_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(telegram_id),
          UNIQUE(user_id, month_year)
        )
      `);
            // Insert default promocodes if they don't exist
            const existingPromocodes = this.db.prepare('SELECT COUNT(*) as count FROM promocodes').get();
            const promocodes = [
                ['WELCOME2025', 'TOKENS', 'Yangi foydalanuvchilar uchun', 2000, 5000, 0, 0, 0, '', 1000, 0, 1, 1],
                ['BONUS2025', 'TOKENS', 'Bonus tokenlar', 3000, 10000, 0, 0, 0, '', 500, 0, 1, 1],
                ['PREMIUM50', 'TOKENS', 'Premium tokenlar', 5000, 20000, 0, 0, 0, '', 100, 0, 1, 1],
                ['NEWUSER', 'TOKENS', 'Yangi foydalanuvchi bonusi', 1500, 3000, 0, 0, 0, '', 2000, 0, 1, 1],
                ['SPECIAL100', 'TOKENS', 'Maxsus bonus', 10000, 50000, 0, 0, 0, '', 50, 0, 1, 1],
                ['VOICE2025', 'TTS', 'Ovoz yaratish bonusi', 0, 0, 5, 0, 0, '', 200, 0, 1, 1],
                ['SPEECH2025', 'STT', 'Nutq tanish bonusi', 0, 0, 0, 5, 0, '', 200, 0, 1, 1],
                ['PRO7DAYS', 'PRO', '7 kunlik PRO', 0, 0, 0, 0, 7, '', 50, 0, 1, 1],
                ['PREMIUM30', 'PREMIUM', '30 kunlik PREMIUM', 0, 0, 0, 0, 0, 'PREMIUM', 20, 0, 1, 1]
            ];
            const insertPromocode = this.db.prepare(`
          INSERT INTO promocodes (code, type, description, daily_tokens, total_tokens, tts_limit, stt_limit, pro_days, plan_name, max_usage, current_usage, is_active, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
            for (const promo of promocodes) {
                insertPromocode.run(...promo);
            }
            logger.database('Enhanced default promocodes created');
        }
        // Update existing models with PRO/FREE classification and categories
        finally {
        }
        // Update existing models with PRO/FREE classification and categories
        const models = [
            // FREE Models - Coding & Development
            ['deepseek/deepseek-chat-v3-0324:free', 'DeepSeek Chat V3', 'DeepSeek', 'Coding & Development', 8000, 'FREE', 0],
            ['deepseek/deepseek-r1-0528:free', 'DeepSeek R1', 'DeepSeek', 'Reasoning & Logic', 8000, 'FREE', 0],
            ['qwen/qwen-2.5-coder-32b-instruct:free', 'Qwen 2.5 Coder', 'Alibaba', 'Coding & Development', 8000, 'FREE', 0],
            ['agentica-org/deepcoder-14b-preview:free', 'DeepCoder 14B', 'Agentica', 'Coding & Development', 4000, 'FREE', 0],
            ['mistralai/devstral-small:free', 'Devstral Small', 'Mistral AI', 'Coding & Development', 4000, 'FREE', 0],
            // FREE Models - General Chat
            ['deepseek/deepseek-chat:free', 'DeepSeek Chat', 'DeepSeek', 'General Chat', 4000, 'FREE', 0],
            ['google/gemini-2.0-flash-exp:free', 'Gemini 2.0 Flash', 'Google', 'General Chat', 8000, 'FREE', 0],
            ['qwen/qwen3-32b:free', 'Qwen 3 32B', 'Alibaba', 'General Chat', 8000, 'FREE', 0],
            ['mistralai/mistral-nemo:free', 'Mistral Nemo', 'Mistral AI', 'General Chat', 4000, 'FREE', 0],
            ['meta-llama/llama-3.3-70b-instruct:free', 'Llama 3.3 70B', 'Meta', 'General Chat', 8000, 'FREE', 0],
            // FREE Models - Creative & Writing
            ['google/gemma-3-27b-it:free', 'Gemma 3 27B', 'Google', 'Creative & Writing', 8000, 'FREE', 0],
            ['cognitivecomputations/dolphin3.0-mistral-24b:free', 'Dolphin 3.0 Mistral', 'Cognitive', 'Creative & Writing', 8000, 'FREE', 0],
            ['shisa-ai/shisa-v2-llama3.3-70b:free', 'Shisa V2 Llama 70B', 'Shisa AI', 'Creative & Writing', 8000, 'FREE', 0],
            // FREE Models - Vision & Multimodal
            ['qwen/qwen2.5-vl-72b-instruct:free', 'Qwen 2.5 VL 72B', 'Alibaba', 'Vision & Multimodal', 8000, 'FREE', 0],
            ['qwen/qwen2.5-vl-32b-instruct:free', 'Qwen 2.5 VL 32B', 'Alibaba', 'Vision & Multimodal', 8000, 'FREE', 0],
            ['meta-llama/llama-3.2-11b-vision-instruct:free', 'Llama 3.2 Vision', 'Meta', 'Vision & Multimodal', 4000, 'FREE', 0],
            // FREE Models - Specialized
            ['qwen/qwq-32b:free', 'QwQ 32B', 'Alibaba', 'Reasoning & Logic', 8000, 'FREE', 0],
            ['thudm/glm-z1-32b:free', 'GLM Z1 32B', 'THUDM', 'Reasoning & Logic', 8000, 'FREE', 0],
            ['nvidia/llama-3.3-nemotron-super-49b-v1:free', 'Nemotron Super 49B', 'NVIDIA', 'Specialized', 8000, 'FREE', 0],
            // PRO Models - Premium Chat (Max $0.5/1M tokens)
            ['openai/gpt-4o-mini', '⭐ GPT-4o Mini', 'OpenAI', 'Premium Chat', 4000, 'PRO', 1],
            ['anthropic/claude-3-haiku', '⭐ Claude 3 Haiku', 'Anthropic', 'Premium Chat', 4000, 'PRO', 150],
            ['google/gemini-pro', '⭐ Gemini Pro', 'Google', 'Premium Chat', 4000, 'PRO', 150],
            ['mistralai/mistral-small', '⭐ Mistral Small', 'Mistral AI', 'Premium Chat', 4000, 'PRO', 150],
            ['cohere/command-r', '⭐ Command R', 'Cohere', 'Premium Chat', 4000, 'PRO', 150],
            // Continue with more FREE models...
            ['qwen/qwen3-235b-a22b:free', 'Qwen 3 235B A22B', 'Alibaba', 'General Chat', 16000, 'FREE', 0],
            ['qwen/qwen3-14b:free', 'Qwen 3 14B', 'Alibaba', 'General Chat', 8000, 'FREE', 0],
            ['deepseek/deepseek-r1-0528-qwen3-8b:free', 'DeepSeek R1 Qwen3 8B', 'DeepSeek', 'Reasoning & Logic', 8000, 'FREE', 0],
            ['meta-llama/llama-4-maverick:free', 'Llama 4 Maverick', 'Meta', 'General Chat', 8000, 'FREE', 0],
            ['microsoft/mai-ds-r1:free', 'MAI DS R1', 'Microsoft', 'Specialized', 4000, 'FREE', 0],
            ['mistralai/mistral-small-3.1-24b-instruct:free', 'Mistral Small 3.1', 'Mistral AI', 'General Chat', 8000, 'FREE', 0],
            ['deepseek/deepseek-v3-base:free', 'DeepSeek V3 Base', 'DeepSeek', 'General Chat', 8000, 'FREE', 0],
            ['moonshotai/kimi-dev-72b:free', 'Kimi Dev 72B', 'Moonshot AI', 'Coding & Development', 8000, 'FREE', 0],
            ['mistralai/mistral-small-3.2-24b-instruct:free', 'Mistral Small 3.2', 'Mistral AI', 'General Chat', 8000, 'FREE', 0],
            ['qwen/qwen3-30b-a3b:free', 'Qwen 3 30B A3B', 'Alibaba', 'General Chat', 8000, 'FREE', 0],
            ['qwen/qwen-2.5-72b-instruct:free', 'Qwen 2.5 72B', 'Alibaba', 'General Chat', 8000, 'FREE', 0],
            ['meta-llama/llama-4-scout:free', 'Llama 4 Scout', 'Meta', 'General Chat', 8000, 'FREE', 0],
            ['deepseek/deepseek-r1-distill-llama-70b:free', 'DeepSeek R1 Distill', 'DeepSeek', 'Reasoning & Logic', 8000, 'FREE', 0],
            ['mistralai/mistral-7b-instruct:free', 'Mistral 7B', 'Mistral AI', 'General Chat', 4000, 'FREE', 0],
            ['meta-llama/llama-3.1-8b-instruct:free', 'Llama 3.1 8B', 'Meta', 'General Chat', 4000, 'FREE', 0],
            ['nousresearch/deephermes-3-llama-3-8b-preview:free', 'DeepHermes 3 8B', 'Nous Research', 'General Chat', 4000, 'FREE', 0],
            ['qwen/qwen3-8b:free', 'Qwen 3 8B', 'Alibaba', 'General Chat', 4000, 'FREE', 0],
            ['google/gemma-3-12b-it:free', 'Gemma 3 12B', 'Google', 'General Chat', 4000, 'FREE', 0],
            ['google/gemma-2-9b-it:free', 'Gemma 2 9B', 'Google', 'General Chat', 4000, 'FREE', 0],
            ['thudm/glm-4-32b:free', 'GLM 4 32B', 'THUDM', 'General Chat', 8000, 'FREE', 0],
            ['google/gemma-3n-e4b-it:free', 'Gemma 3N E4B', 'Google', 'General Chat', 4000, 'FREE', 0],
            ['cognitivecomputations/dolphin3.0-r1-mistral-24b:free', 'Dolphin 3.0 R1', 'Cognitive', 'Creative & Writing', 8000, 'FREE', 0],
            ['mistralai/mistral-small-24b-instruct-2501:free', 'Mistral Small 2501', 'Mistral AI', 'General Chat', 8000, 'FREE', 0],
            ['rekaai/reka-flash-3:free', 'Reka Flash 3', 'Reka AI', 'General Chat', 4000, 'FREE', 0],
            ['arliai/qwq-32b-arliai-rpr-v1:free', 'QwQ 32B ArliAI', 'ArliAI', 'Reasoning & Logic', 8000, 'FREE', 0],
            ['meta-llama/llama-3.2-1b-instruct:free', 'Llama 3.2 1B', 'Meta', 'General Chat', 2000, 'FREE', 0],
            ['sarvamai/sarvam-m:free', 'Sarvam M', 'Sarvam AI', 'General Chat', 4000, 'FREE', 0],
            ['google/gemma-3-4b-it:free', 'Gemma 3 4B', 'Google', 'General Chat', 4000, 'FREE', 0],
            ['featherless/qwerky-72b:free', 'Qwerky 72B', 'Featherless', 'Creative & Writing', 8000, 'FREE', 0],
            ['moonshotai/kimi-vl-a3b-thinking:free', 'Kimi VL A3B', 'Moonshot AI', 'Vision & Multimodal', 4000, 'FREE', 0],
            ['nvidia/llama-3.1-nemotron-ultra-253b-v1:free', 'Nemotron Ultra 253B', 'NVIDIA', 'Specialized', 16000, 'FREE', 0]
        ];
        const insertModel = this.db.prepare(`
        INSERT OR REPLACE INTO models (id, name, provider, category, max_tokens, cost_per_token, is_active, model_type, monthly_limit) 
        VALUES (?, ?, ?, ?, ?, 0.0, 1, ?, ?)
      `);
        let modelsAdded = 0;
        for (const [id, name, provider, category, maxTokens, modelType, monthlyLimit] of models) {
            try {
                insertModel.run(id, name, provider, category, maxTokens, modelType, monthlyLimit);
                modelsAdded++;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger.error(`Failed to add model: ${name}`, { error: errorMessage });
            }
        }
        logger.success(`Database initialized`, { models_added: modelsAdded, total_models: models.length });
    }
    catch(error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Database initialization error', { error: errorMessage });
        throw error;
    }
}
run(sql, string, params, any[] = []);
void {
    try: {
        const: stmt = this.db.prepare(sql),
        stmt, : .run(...params)
    }, catch(error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Database run error', { sql: sql.substring(0, 100), error: errorMessage });
        throw error;
    }
};
get(sql, string, params, any[] = []);
any;
{
    try {
        const stmt = this.db.prepare(sql);
        return stmt.get(...params);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Database get error', { sql: sql.substring(0, 100), error: errorMessage });
        throw error;
    }
}
all(sql, string, params, any[] = []);
any[];
{
    try {
        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Database all error', { sql: sql.substring(0, 100), error: errorMessage });
        throw error;
    }
}
transaction(fn, () => void );
() => void {
    try: {
        return: this.db.transaction(fn)
    }, catch(error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Database transaction error', { error: errorMessage });
        throw error;
    }
};
close();
void {
    logger, : .database('Closing database connection'),
    this: .db.close()
};
export const database = new DatabaseManager();
//# sourceMappingURL=database.js.map