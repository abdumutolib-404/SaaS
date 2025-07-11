import { Markup } from 'telegraf';
import {InlineKeyboardMarkup} from "telegraf/typings/core/types/typegram"

// Helper function to truncate callback data to fit Telegram's 64-byte limit
function truncateCallbackData(data: string): string {
  const maxLength = 64;
  if (data.length <= maxLength) {
    return data;
  }
  
  // For model selection, keep the essential part
  if (data.startsWith('select_model_')) {
    const modelId = data.replace('select_model_', '');
    // Create a shorter identifier for long model IDs
    if (modelId.length > 45) { // 64 - 'select_model_'.length = 51, leave some buffer
      const hash = modelId.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      return `select_model_${Math.abs(hash).toString(36)}`;
    }
  }
  
  // For categories, truncate safely
  if (data.startsWith('category_')) {
    const categoryName = data.replace('category_', '');
    // Encode category name to handle special characters
    const encodedCategory = encodeURIComponent(categoryName);
    const truncatedCategory = encodedCategory.substring(0, maxLength - 9); // 9 = 'category_'.length
    return `category_${truncatedCategory}`;
  }
  
  return data.substring(0, maxLength);
}

// Helper function to validate callback data
function validateCallbackData(data: string): boolean {
  if (!data || typeof data !== 'string') return false;
  if (data.length > 64) return false;
  
  // Check for invalid characters (Telegram allows most characters, but let's be safe)
  const invalidChars = /[\x00-\x1F\x7F]/;
  return !invalidChars.test(data);
}

export class KeyboardBuilder {
  private buttons: Array<Array<{ text: string; callback_data: string }>> = [];

  addRow(buttons: Array<{ text: string; callback_data: string }>): this {
    if (buttons && buttons.length > 0) {
      const validButtons = buttons.filter(button => {
        if (!button.text || !button.callback_data) return false;
        const truncatedData = truncateCallbackData(button.callback_data);
        return validateCallbackData(truncatedData);
      }).map(button => ({
        text: button.text,
        callback_data: truncateCallbackData(button.callback_data)
      }));
      
      if (validButtons.length > 0) {
        this.buttons.push(validButtons);
      }
    }
    return this;
  }

  addButton(text: string, callback_data: string): this {
    if (text && callback_data) {
      const truncatedData = truncateCallbackData(callback_data);
      if (validateCallbackData(truncatedData)) {
        this.buttons.push([{ text, callback_data: truncatedData }]);
      }
    }
    return this;
  }

  build(): { reply_markup: InlineKeyboardMarkup } {
    if (this.buttons.length === 0) {
      // Return empty keyboard if no buttons
      return Markup.inlineKeyboard([]);
    }

    try {
      const keyboard = this.buttons.map(row => 
        row.map(button => Markup.button.callback(button.text, button.callback_data))
      );

      return Markup.inlineKeyboard(keyboard);
    } catch (error) {
      // Return empty keyboard on error
      return Markup.inlineKeyboard([]);
    }
  }

  static createMainMenu(isAdmin: boolean = false, userPlan: string = 'FREE'): { reply_markup: InlineKeyboardMarkup } {
    const builder = new KeyboardBuilder();
    
    try {
      builder.addButton('💬 Suhbat boshlash', 'start_chat');
      builder.addButton('🤖 Model tanlash', 'select_model');
      builder.addRow([
        { text: '📊 Statistika', callback_data: 'stats' },
        { text: '💰 Balans', callback_data: 'balance' }
      ]);
      builder.addRow([
        { text: '🔊 Ovoz yaratish', callback_data: 'generate_tts' },
        { text: '🎤 Ovozni matnga', callback_data: 'generate_stt' }
      ]);
      builder.addRow([
        { text: '👥 Taklif tizimi', callback_data: 'referral_stats' },
        { text: '🎫 Promokod', callback_data: 'use_promocode' }
      ]);
      builder.addButton('📋 Rejalar', 'view_plans');
      
      const planEmoji = userPlan === 'FREE' ? '🆓' : userPlan === 'PRO' ? '💎' : '🌟';
      builder.addButton(`${planEmoji} ${userPlan} Statistika`, 'pro_stats');
      
      if (isAdmin) {
        builder.addButton('⚙️ Admin Panel', 'admin_panel');
      }

      return builder.build();
    } catch (error) {
      return Markup.inlineKeyboard([]);
    }
  }

  static createBackButton(): { reply_markup: InlineKeyboardMarkup } {
    try {
      return new KeyboardBuilder()
        .addButton('🏠 Bosh sahifa', 'back_to_main')
        .build();
    } catch (error) {
      return Markup.inlineKeyboard([]);
    }
  }

  static createAdminPanel(): { reply_markup: InlineKeyboardMarkup } {
    try {
      return new KeyboardBuilder()
        .addButton('📊 Statistika', 'admin_stats')
        .addRow([
          { text: '💰 Token qo\'shish', callback_data: 'admin_add_tokens' },
          { text: '💸 Token ayirish', callback_data: 'admin_remove_tokens' }
        ])
        .addRow([
          { text: '💎 PRO berish', callback_data: 'admin_grant_pro' },
          { text: '📋 Plan o\'zgartirish', callback_data: 'admin_change_plan' }
        ])
        .addRow([
          { text: '🎫 Promokodlar', callback_data: 'admin_promocodes' },
          { text: '📢 Broadcast', callback_data: 'admin_broadcast' }
        ])
        .addRow([
          { text: '🤖 Modellar', callback_data: 'admin_models' },
          { text: '👥 Takliflar', callback_data: 'admin_referrals' }
        ])
        .addRow([
          { text: '📋 Buyruqlar', callback_data: 'admin_commands' },
          { text: '🎁 Promokod ro\'yxati', callback_data: 'admin_available_promocodes' }
        ])
        .addButton('🏠 Bosh sahifa', 'back_to_main')
        .build();
    } catch (error) {
      return Markup.inlineKeyboard([]);
    }
  }

  static createRegistrationMenu(): { reply_markup: InlineKeyboardMarkup } {
    try {
      return new KeyboardBuilder()
        .addButton('📝 Ro\'yxatdan o\'tish', 'start_registration')
        .addButton('⏭️ O\'tkazib yuborish', 'skip_registration')
        .build();
    } catch (error) {
      return Markup.inlineKeyboard([]);
    }
  }

  static createReferralMenu(): { reply_markup: InlineKeyboardMarkup } {
    try {
      return new KeyboardBuilder()
        .addButton('📊 Mening statistikam', 'my_referral_stats')
        .addButton('🔗 Havolani olish', 'get_referral_link')
        .addButton('🏆 Reyting', 'referral_leaderboard')
        .addButton('🏠 Bosh sahifa', 'back_to_main')
        .build();
    } catch (error) {
      return Markup.inlineKeyboard([]);
    }
  }

  static createProFeaturesMenu(): { reply_markup: InlineKeyboardMarkup } {
    try {
      return new KeyboardBuilder()
        .addButton('🔊 Ovoz yaratish', 'generate_tts')
        .addButton('🎤 Ovozni matnga', 'generate_stt')
        .addButton('💎 PRO Modellar', 'pro_models')
        .addButton('📊 PRO Statistika', 'pro_stats')
        .addButton('🏠 Bosh sahifa', 'back_to_main')
        .build();
    } catch (error) {
      return Markup.inlineKeyboard([]);
    }
  }

  static createPromocodeMenu(): { reply_markup: InlineKeyboardMarkup } {
    try {
      return new KeyboardBuilder()
        .addButton('🎫 Promokod ishlatish', 'use_promocode')
        .addButton('📋 Mavjud promokodlar', 'available_promocodes')
        .addButton('🏠 Bosh sahifa', 'back_to_main')
        .build();
    } catch (error) {
      return Markup.inlineKeyboard([]);
    }
  }

  static createTTSMenu(): { reply_markup: InlineKeyboardMarkup } {
    try {
      return new KeyboardBuilder()
        .addButton('🔊 Ovoz yaratish', 'generate_tts')
        .addButton('📊 TTS Statistika', 'tts_stats')
        .addButton('🏠 Bosh sahifa', 'back_to_main')
        .build();
    } catch (error) {
      return Markup.inlineKeyboard([]);
    }
  }

  static createSTTMenu(): { reply_markup: InlineKeyboardMarkup } {
    try {
      return new KeyboardBuilder()
        .addButton('🎤 Ovozni matnga', 'generate_stt')
        .addButton('📊 STT Statistika', 'stt_stats')
        .addButton('🏠 Bosh sahifa', 'back_to_main')
        .build();
    } catch (error) {
      return Markup.inlineKeyboard([]);
    }
  }
}

export function validateKeyboard(keyboard: any): boolean {
  try {
    if (!keyboard || !keyboard.reply_markup) {
      return false;
    }

    const markup = keyboard.reply_markup;
    
    if (!markup.inline_keyboard || !Array.isArray(markup.inline_keyboard)) {
      return false;
    }

    // Allow empty keyboards
    if (markup.inline_keyboard.length === 0) {
      return true;
    }

    // Validate each row and button
    for (const row of markup.inline_keyboard) {
      if (!Array.isArray(row)) {
        return false;
      }

      for (const button of row) {
        if (!button || typeof button !== 'object') {
          return false;
        }
        
        if (!button.text || typeof button.text !== 'string') {
          return false;
        }
        
        // Check for callback_data or other valid button properties
        if (!button.callback_data && !button.url && !button.switch_inline_query && !button.switch_inline_query_current_chat) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}