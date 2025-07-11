/**
 * Telegram formatter utility
 * Supports HTML, Markdown V2, and plain text formatting
 */

export class TelegramFormatter {
  /**
   * Escape special characters for HTML
   */
  static escapeHTML(text: string): string {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Escape special characters for Markdown V2
   */
  static escapeMarkdown(text: string): string {
    if (!text || typeof text !== 'string') return '';
    
    // Characters that need to be escaped in Markdown V2
    const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
    
    let escaped = text;
    for (const char of specialChars) {
      escaped = escaped.replace(new RegExp('\\' + char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '\\' + char);
    }
    
    return escaped;
  }

  /**
   * Convert text to HTML format
   */
  static toHTML(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')  // Bold
      .replace(/\*([^*]+)\*/g, '<b>$1</b>')      // Bold (single asterisk)
      .replace(/_([^_]+)_/g, '<i>$1</i>')        // Italic
      .replace(/`([^`]+)`/g, '<code>$1</code>')  // Code
      .replace(/~([^~]+)~/g, '<s>$1</s>')        // Strikethrough
      .replace(/__([^_]+)__/g, '<u>$1</u>')      // Underline
      .replace(/\\(.)/g, '$1');                  // Remove escapes
  }

  /**
   * Convert text to Markdown V2 format
   */
  static toMarkdownV2(text: string): string {
    if (!text) return '';
    
    // First escape special characters, then apply formatting
    let escaped = this.escapeMarkdown(text);
    
    return escaped
      .replace(/\*\*([^*]+)\*\*/g, '*$1*')      // Bold
      .replace(/_([^_]+)_/g, '_$1_')             // Italic
      .replace(/`([^`]+)`/g, '`$1`')             // Code (no escaping inside)
      .replace(/~([^~]+)~/g, '~$1~')             // Strikethrough
      .replace(/__([^_]+)__/g, '__$1__');        // Underline
  }

  /**
   * Format text as bold (HTML)
   */
  static bold(text: string): string {
    if (!text) return '';
    return `<b>${this.escapeHTML(text)}</b>`;
  }

  /**
   * Format text as italic (HTML)
   */
  static italic(text: string): string {
    if (!text) return '';
    return `<i>${this.escapeHTML(text)}</i>`;
  }

  /**
   * Format text as code (HTML)
   */
  static code(text: string): string {
    if (!text) return '';
    return `<code>${this.escapeHTML(text)}</code>`;
  }

  /**
   * Format text as code block (HTML)
   */
  static codeBlock(text: string): string {
    if (!text) return '';
    return `<pre>${this.escapeHTML(text)}</pre>`;
  }

  /**
   * Format text as strikethrough (HTML)
   */
  static strikethrough(text: string): string {
    if (!text) return '';
    return `<s>${this.escapeHTML(text)}</s>`;
  }

  /**
   * Format text as underline (HTML)
   */
  static underline(text: string): string {
    if (!text) return '';
    return `<u>${this.escapeHTML(text)}</u>`;
  }

  /**
   * Create a link (HTML)
   */
  static link(text: string, url: string): string {
    if (!text || !url) return text || '';
    return `<a href="${url}">${this.escapeHTML(text)}</a>`;
  }

  /**
   * Create formatted welcome message for new users
   */
  static formatWelcomeNew(firstName: string): string {
    return [
      `🎉 Assalomu alaykum, ${this.bold(firstName)}!`,
      '',
      '🤖 Men AI chatbot man. Sizga turli AI modellari bilan suhbatlashishda yordam beraman.',
      '',
      '📝 Yaxshiroq xizmat ko\'rsatish uchun qisqacha ma\'lumot bering yoki o\'tkazib yuboring.',
      '',
      this.formatInfo('Hozirda botda hamma userlar uchun har kuni jami 50 so\'rov yuborish mumkin. So\'rovlar 5:00 yangilanadi. Bu faqat free userlar uchun, pro va premium userlar uchun limit yo\'q.')
    ].join('\n');
  }

  /**
   * Create formatted welcome message
   */
  static formatWelcome(firstName: string, userId: number): string {
    return [
      `🎉 Assalomu alaykum, ${this.bold(firstName)}!`,
      '',
      '🤖 Men AI chatbot man. Sizga turli AI modellari bilan suhbatlashishda yordam beraman.',
      '',
      '📝 Guruhda: Reply yoki @mention qiling',
      '💬 Shaxsiy chatda: "Suhbat boshlash" tugmasini bosing',
      '',
      `🆔 Sizning ID: ${this.code(String(userId))}`,
      '',
      this.formatInfo('Hozirda botda hamma userlar uchun har kuni jami 50 so\'rov yuborish mumkin. So\'rovlar 5:00 yangilanadi. Bu faqat free userlar uchun, pro va premium userlar uchun limit yo\'q.')
    ].join('\n');
  }

  /**
   * Create formatted referral welcome message
   */
  static formatReferralWelcome(firstName: string, userId: number, referrerName: string): string {
    return [
      `🎉 Assalomu alaykum, ${this.bold(firstName)}!`,
      '',
      `🎁 Siz ${this.bold(referrerName)} tomonidan taklif qilingansiz!`,
      '',
      '🤖 Men AI chatbot man. Sizga turli AI modellari bilan suhbatlashishda yordam beraman.',
      '',
      this.formatSuccess('Taklif mukofoti olindi!'),
      `🔥 Kunlik: +3,000 token`,
      `💎 Umumiy: +10,000 token`,
      '',
      `🆔 Sizning ID: ${this.code(String(userId))}`,
      '',
      this.formatInfo('Hozirda botda hamma userlar uchun har kuni jami 50 so\'rov yuborish mumkin. So\'rovlar 5:00 yangilanadi. Bu faqat free userlar uchun, pro va premium userlar uchun limit yo\'q.')
    ].join('\n');
  }

  /**
   * Format registration steps
   */
  static formatRegistrationStep(step: string): string {
    switch (step) {
      case 'name':
        return [
          '👤 Ismingizni kiriting:',
          '',
          '💡 Bu ma\'lumot sizga shaxsiylashtirilgan javoblar berish uchun kerak.'
        ].join('\n');
      case 'age':
        return [
          '👤 Yoshingizni kiriting (masalan: 25):',
          '',
          '💡 Bu ma\'lumot sizga mos javoblar berish uchun kerak.'
        ].join('\n');
      case 'interests':
        return [
          '🎯 Qiziqishlaringizni kiriting (masalan: dasturlash, sport, musiqa):',
          '',
          '💡 Bu sizga tegishli javoblar berish uchun kerak.'
        ].join('\n');
      default:
        return 'Ma\'lumot kiriting:';
    }
  }

  /**
   * Format registration completion
   */
  static formatRegistrationComplete(userId: number): string {
    return [
      this.formatSuccess('Ro\'yxatdan o\'tish yakunlandi!'),
      '',
      '🤖 Endi AI modellari bilan suhbatlashishingiz mumkin.',
      '',
      `🆔 Sizning ID: ${this.code(String(userId))}`
    ].join('\n');
  }

  /**
   * Format registration skipped
   */
  static formatRegistrationSkipped(userId: number): string {
    return [
      this.formatSuccess('Xush kelibsiz!'),
      '',
      '🤖 Endi AI modellari bilan suhbatlashishingiz mumkin.',
      '',
      `🆔 Sizning ID: ${this.code(String(userId))}`
    ].join('\n');
  }

  /**
   * Format chat mode start
   */
  static formatChatModeStart(modelName: string): string {
    return [
      this.bold('💬 Suhbat rejimi yoqildi!'),
      '',
      `🤖 Tanlangan model: ${this.code(modelName)}`,
      '',
      '📝 Endi har qanday xabar yozsangiz, AI javob beradi.',
      '🔚 Suhbatni tugatish uchun "Suhbatni tugatish" tugmasini bosing.'
    ].join('\n');
  }

  /**
   * Format chat mode end
   */
  static formatChatModeEnd(): string {
    return [
      this.formatSuccess('Suhbat rejimi tugatildi!'),
      '',
      '🏠 Asosiy menyuga qaytdingiz.'
    ].join('\n');
  }

  /**
   * Format model selected
   */
  static formatModelSelected(modelName: string, modelType: string = 'FREE'): string {
    const typeEmoji = modelType === 'PRO' ? '💎' : '🆓';
    return [
      this.formatSuccess(`Model tanlandi: ${typeEmoji} ${modelName}`),
      '',
      this.formatWarning('Eslatma: Barcha AI modellari O\'zbek tilini bir xil darajada bilmaydi. Agar javob ingliz tilida kelsa, "O\'zbek tilida javob ber" deb so\'rang.')
    ].join('\n');
  }

  /**
   * Format promocode input
   */
  static formatPromocodeInput(): string {
    return [
      '🎫 Promokod kiriting:',
      '',
      'Promokod kodini yozing (masalan: BONUS2025)',
      '',
      '💡 Promokod orqali qo\'shimcha tokenlar olishingiz mumkin.'
    ].join('\n');
  }

  /**
   * Format promocode usage instructions
   */
  static formatPromocodeUsage(): string {
    return [
      this.formatError('Format: /promocode <kod>'),
      '',
      this.bold('Misol:'),
      this.code('/promocode BONUS2025')
    ].join('\n');
  }

  /**
   * Format available promocodes
   */
  static formatAvailablePromocodes(promocodes: any[]): string {
    const lines = [
      this.bold('🎫 Mavjud promokodlar:'),
      ''
    ];

    if (promocodes.length === 0) {
      lines.push('Hozircha faol promokodlar yo\'q.');
    } else {
      promocodes.forEach((promo, index) => {
        const remaining = promo.max_usage - promo.current_usage;
        lines.push(
          `${index + 1}. ${this.bold(promo.code)}`,
          `   🔥 Kunlik: +${promo.daily_tokens}`,
          `   💎 Umumiy: +${promo.total_tokens}`,
          `   📊 Qolgan: ${remaining}/${promo.max_usage}`,
          ''
        );
      });
    }

    lines.push(
      this.bold('Qanday ishlatish:'),
      this.code('/promocode <kod>'),
      '',
      this.bold('Misol:'),
      this.code('/promocode BONUS2025')
    );

    return lines.join('\n');
  }

  /**
   * Format token limit message
   */
  static formatTokenLimit(userId: number): string {
    return [
      this.formatError('Token limitingiz tugagan!'),
      '',
      '💡 Admin bilan bog\'laning yoki ertaga qayta urinib ko\'ring.',
      `🆔 Sizning ID: ${this.code(String(userId))}`,
      '👨‍💼 Admin: @abdumutolib\\_abdulahadov'
    ].join('\n');
  }

  /**
   * Format admin token usage instructions
   */
  static formatAdminTokenUsage(operation: 'add' | 'remove'): string {
    const verb = operation === 'add' ? 'qo\'shish' : 'ayirish';
    const command = operation === 'add' ? 'add_tokens' : 'remove_tokens';
    
    return [
      this.formatError(`Format: /${command} <user_id> <daily_tokens> <total_tokens>`),
      '',
      this.bold('Misol:'),
      this.code(`/${command} 123456789 1000 5000`)
    ].join('\n');
  }

  /**
   * Create formatted stats message
   */
  static formatStats(stats: any): string {
    return [
      this.bold('📊 Sizning statistikangiz:'),
      '',
      `🆔 User ID: ${this.code(String(stats.user_id || 'N/A'))}`,
      `📅 Bugungi so'rovlar: ${stats.daily_requests || 0}`,
      `🔥 Bugungi tokenlar: ${stats.daily_tokens || 0}`,
      `📈 Jami so'rovlar: ${stats.total_requests || 0}`,
      `💎 Jami tokenlar: ${stats.total_tokens || 0}`,
      `🔊 TTS ishlatilgan: ${stats.tts_usage || 0}`,
      `🎤 STT ishlatilgan: ${stats.stt_usage || 0}`,
      `👥 Takliflar: ${stats.referrals || 0}`,
      `💰 Taklif daromadi: ${stats.referral_earnings || 0} token`,
      `📆 Ro'yxatdan o'tgan: ${stats.created_at ? new Date(stats.created_at).toLocaleDateString('uz-UZ') : 'N/A'}`
    ].join('\n');
  }

  /**
   * Create formatted balance message
   */
  static formatBalance(user: any): string {
    const remainingDaily = (user.daily_tokens || 0) - (user.daily_used || 0);
    const remainingTotal = (user.total_tokens || 0) - (user.total_used || 0);
    

    return [
      this.bold('💰 Sizning balansingiz:'),
      '',
      `🆔 User ID: ${this.code(String(user.telegram_id))}`,
      `📋 Plan: ${user.plan_type || 'FREE'}`,
      `🔥 Qolgan kunlik: ${remainingDaily} token`,
      `💎 Qolgan umumiy: ${remainingTotal} token`,
    ].join('\n');
  }

  /**
   * Create formatted admin stats message
   */
  static formatAdminStats(stats: any): string {
    return [
      this.bold('📊 Tizim statistikasi:'),
      '',
      `👥 Jami foydalanuvchilar: ${stats.total_users || 0}`,
      `📅 Bugungi faol: ${stats.daily_active || 0}`,
      `💬 Bugungi so'rovlar: ${stats.daily_requests || 0}`,
      `🔥 Bugungi tokenlar: ${stats.daily_tokens || 0}`,
      `📈 Jami so'rovlar: ${stats.total_requests || 0}`,
      `💎 Jami tokenlar: ${stats.total_tokens || 0}`
    ].join('\n');
  }

  /**
   * Create formatted help message
   */
  static formatHelp(user: any, isAdmin: boolean = false): string {
    const lines = [
      this.bold('🤖 AI Chatbot Yordam'),
      '',
      this.bold('Asosiy buyruqlar:'),
      `${this.code('/start')} - Botni qayta ishga tushirish`,
      `${this.code('/model')} - AI model tanlash`,
      `${this.code('/stats')} - Statistikangizni ko'rish`,
      `${this.code('/balance')} - Qolgan tokenlarni tekshirish`,
      `${this.code('/promocode <kod>')} - Promokod ishlatish`,
      `${this.code('/referral')} - Taklif tizimi`,
      `${this.code('/tts <matn>')} - Ovoz yaratish`,
      `${this.code('/pro_stats')} - PRO statistika`,
      `${this.code('/plans')} - Rejalar ko'rish`,
      `${this.code('/help')} - Bu yordam xabari`,
      ''
    ];

    if (isAdmin) {
      lines.push(
        this.bold('Admin buyruqlari:'),
        `${this.code('/admin')} - Admin panel`,
        `${this.code('/add\\_tokens <user\\_id> <daily> <total>')} - Token qo\\'shish`,
        `${this.code('/remove\\_tokens <user\\_id> <daily> <total>')} - Token ayirish`,
        `${this.code('/grant\\_pro <user\\_id> <days>')} - PRO berish`,
        `${this.code('/change\\_plan <user\\_id> <plan>')} - Plan o\\'zgartirish`,
        `${this.code('/add\\_promo <code> <daily> <total> <usage>')} - Promokod yaratish`,
        `${this.code('/delete\\_promo <code>')} - Promokod o\\'chirish`,
        `${this.code('/broadcast <xabar>')} - Xabar yuborish`,
        ''
      );
    }

    lines.push(
      this.bold('Qanday foydalanish:'),
      '• Shaxsiy chatda: "Suhbat boshlash" tugmasini bosing',
      '• Guruhda: Botga reply qiling yoki @mention qiling',
      '',
      this.bold('Rejalar:'),
      '🆓 FREE: 2,000 kunlik, 15,000 umumiy token',
      '💎 PRO: 8,000 kunlik, 80,000 umumiy token + Premium modellar (8,000 so\'m/oy)',
      '🌟 PREMIUM: 12,000 kunlik, 150,000 umumiy token + Barcha imkoniyatlar (20,000 so\'m/oy)',
      '',
      this.bold('PRO xususiyatlari:'),
      '💎 Premium AI modellari (GPT-4, Claude-3, Gemini Pro)',
      '🔊 Ko\'proq ovoz yaratish (3/oy vs 1/oy)',
      '🎤 Ko\'proq STT (3/oy vs 1/oy)',
      '⚡ Tezroq ishlov berish',
      '💾 Suhbatlarni saqlash (tez orada)',
      '📤 Eksport qilish (tez orada)',
      '🧠 Xotira rejimi (tez orada)',
      '',
      this.bold('Sizning ma\'lumotlaringiz:'),
      `🆔 ID: ${this.code(String(user?.telegram_id))}`,
      `📋 Plan: ${user?.plan_type || 'FREE'}`,
      `${user?.is_pro ? '💎' : '🆓'} Status: ${user?.is_pro ? 'PRO' : 'FREE'}`,
      `🔥 Kunlik limit: ${user?.daily_tokens || 0} token`,
      `💎 Umumiy limit: ${user?.total_tokens || 0} token`,
      '',
      this.bold('Token tugasa:'),
      'Admin bilan bog\'laning: @abdulahadov\\_abdumutolib'
    );

    return lines.join('\n');
  }

  /**
   * Create formatted promocode success message
   */
  static formatPromocodeSuccess(message: string, dailyTokens: number, totalTokens: number): string {
    return [
      this.formatSuccess(message),
      '',
      this.bold('🎁 Qo\'shildi:'),
      `🔥 Kunlik: +${dailyTokens} token`,
      `💎 Umumiy: +${totalTokens} token`
    ].join('\n');
  }

  /**
   * Create formatted token operation message
   */
  static formatTokenOperation(userId: string, dailyTokens: number, totalTokens: number, operation: 'added' | 'removed'): string {
    const operationText = operation === 'added' ? 'qo\'shildi' : 'ayirildi';
    const operationSymbol = operation === 'added' ? '+' : '-';
    
    return [
      this.formatSuccess(`Foydalanuvchi ${userId} ga tokenlar ${operationText}!`),
      '',
      this.bold(`📊 ${operation === 'added' ? 'Qo\'shildi' : 'Ayirildi'}:`),
      `🔥 Kunlik: ${operationSymbol}${dailyTokens}`,
      `💎 Umumiy: ${operationSymbol}${totalTokens}`
    ].join('\n');
  }

  /**
   * Format referral statistics
   */
  static formatReferralStats(stats: any): string {
    const lines = [
      this.bold('👥 Taklif tizimi statistikasi:'),
      '',
      `🔗 Sizning taklif havolangiz:`,
      this.code(stats.referral_link),
      '',
      `📊 Jami takliflar: ${stats.total_referrals}`,
      `💰 Jami daromad: ${stats.total_earnings} token`,
      `👆 Bosilgan: ${stats.clicks} marta`,
      `✅ Konversiya: ${stats.conversions} (${stats.conversion_rate}%)`,
      ''
    ];

    if (stats.recent_referrals && stats.recent_referrals.length > 0) {
      lines.push(this.bold('📋 So\'nggi takliflar:'));
      stats.recent_referrals.slice(0, 5).forEach((referral: any, index: number) => {
        const date = new Date(referral.created_at).toLocaleDateString('uz-UZ');
        const name = referral.first_name || 'Noma\'lum';
        lines.push(`${index + 1}. ${name} - ${date} (+${referral.total_tokens || 0} token)`);
      });
      lines.push('');
    }

    lines.push(
      this.bold('💡 Qanday ishlaydi:'),
      '• Havolangizni do\'stlaringizga yuboring',
      '• Ular bot orqali ro\'yxatdan o\'tganda:',
      '  - Siz: +5,000 kunlik, +15,000 umumiy token',
      '  - Ular: +3,000 kunlik, +10,000 umumiy token',
      '',
      this.bold('🎯 Bonus takliflar:'),
      '• 5 taklif = 25,000 token bonus',
      '• 10 taklif = 50,000 token bonus',
      '• 25 taklif = 150,000 token bonus'
    );

    return lines.join('\n');
  }

  /**
   * Format referral notification for referrer
   */
  static formatReferralNotification(referredName: string): string {
    return [
      this.formatSuccess('Yangi taklif!'),
      '',
      `🎉 ${this.bold(referredName)} sizning taklifingiz orqali botga qo'shildi!`,
      '',
      this.bold('🎁 Sizga mukofot:'),
      '🔥 Kunlik: +5,000 token',
      '💎 Umumiy: +15,000 token'
    ].join('\n');
  }

  /**
   * Format admin referral stats
   */
  static formatAdminReferralStats(stats: any): string {
    const lines = [
      this.bold('👥 Taklif tizimi statistikasi:'),
      '',
      `📊 Jami takliflar: ${stats.total_referrals || 0}`,
      `💰 Jami mukofotlar: ${stats.total_rewards || 0} token`,
      `📅 Bugungi takliflar: ${stats.daily_referrals || 0}`,
      `📈 Haftalik takliflar: ${stats.weekly_referrals || 0}`,
      `👆 Jami bosilgan: ${stats.total_clicks || 0}`,
      `✅ Jami konversiya: ${stats.total_conversions || 0} (${stats.conversion_rate || 0}%)`,
      ''
    ];

    if (stats.top_referrers && stats.top_referrers.length > 0) {
      lines.push(this.bold('🏆 Top taklifchilar:'));
      stats.top_referrers.forEach((user: any, index: number) => {
        const name = user.first_name || 'Noma\'lum';
        lines.push(`${index + 1}. ${name} - ${user.referral_count} taklif (${user.referral_earnings} token)`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Format PRO statistics
   */
  static formatProStats(stats: any): string {
    const lines = [
      this.bold(`${stats.is_pro ? '💎' : '🆓'} ${stats.is_pro ? 'PRO' : 'FREE'} Statistika`),
      '',
      `📅 Oy: ${stats.month_year}`,
      `📋 Plan: ${stats.plan_type || 'FREE'}`,
      ''
    ];

    if (stats.is_pro) {
      lines.push(
        this.bold('💎 PRO Status:'),
        `⏰ Amal qiladi: ${stats.pro_expires_at ? new Date(stats.pro_expires_at).toLocaleDateString('uz-UZ') : 'Cheksiz'}`,
        ''
      );

      if (stats.pro_models && stats.pro_models.length > 0) {
        lines.push(this.bold('🤖 PRO Modellar ishlatilishi:'));
        stats.pro_models.forEach((model: any) => {
          lines.push(`• ${model.name}: ${model.usage_count}/${model.monthly_limit}`);
        });
        lines.push('');
      }
    }

    lines.push(
      this.bold('🔊 Ovoz yaratish:'),
      `📊 Ishlatilgan: ${stats.tts_usage}/${stats.tts_limit}`,
      `🔄 Qolgan: ${stats.tts_limit - stats.tts_usage}`,
      '',
      this.bold('🎤 Ovozni matnga:'),
      `📊 Ishlatilgan: ${stats.stt_usage}/${stats.stt_limit}`,
      `🔄 Qolgan: ${stats.stt_limit - stats.stt_usage}`,
      ''
    );

    if (!stats.is_pro) {
      lines.push(
        this.bold('💎 PRO ga o\'tish:'),
        '• Premium AI modellari',
        '• Ko\'proq ovoz yaratish (3/oy)',
        '• Ko\'proq STT (3/oy)',
        '• Tezroq ishlov berish',
        '• Suhbatlarni saqlash (tez orada)',
        '• Eksport qilish (tez orada)',
        '• Xotira rejimi (tez orada)',
        '',
        'Admin bilan bog\'laning: @abdumutolib\\_abdulahadov'
      );
    }

    return lines.join('\n');
  }

  /**
   * Format plans comparison
   */
  static formatPlansComparison(comparison: any): string {
    const lines = [
      this.bold('📋 Mavjud rejalar:'),
      ''
    ];

    comparison.plans.forEach((plan: any) => {
      const emoji = plan.name === 'FREE' ? '🆓' : plan.name === 'PRO' ? '💎' : '🌟';
      lines.push(
        `${emoji} ${this.bold(plan.display_name)}`,
        plan.price_monthly > 0 ? `💰 ${plan.price_monthly} so'm/oy` : '💰 Bepul',
        ''
      );

      plan.features.forEach((feature: string) => {
        lines.push(`  ✓ ${feature}`);
      });

      lines.push('');
    });

    lines.push(
      this.bold('📞 Plan o\'zgartirish:'),
      'Admin bilan bog\'laning: @abdumutolib\\_abdulahadov'
    );

    return lines.join('\n');
  }

  /**
   * Format plan change notification
   */
  static formatPlanChanged(planName: string, displayName: string): string {
    const emoji = planName === 'FREE' ? '🆓' : planName === 'PRO' ? '💎' : '🌟';
    return [
      this.formatSuccess(`Plan o'zgartirildi: ${emoji} ${displayName}`),
      '',
      '🔄 Yangi imkoniyatlar faollashtirildi!',
      '📊 Balans va limitlar yangilandi.'
    ].join('\n');
  }

  /**
   * Format TTS generation result
   */
  static formatTTSGenerated(remaining: number, limit: number): string {
    return [
      this.formatSuccess('Ovoz muvaffaqiyatli yaratildi!'),
      '',
      `📊 Qolgan: ${remaining}/${limit} ovoz`,
      `📅 Keyingi reset: Keyingi oy`
    ].join('\n');
  }

  /**
   * Format STT conversion result
   */
  static formatSTTConverted(text: string, remaining: number, limit: number): string {
    return [
      this.formatSuccess('Ovoz matnga aylantirildi!'),
      '',
      this.bold('📝 Matn:'),
      this.code(text),
      '',
      `📊 Qolgan: ${remaining}/${limit} STT`,
      `📅 Keyingi reset: Keyingi oy`
    ].join('\n');
  }

  /**
   * Format PRO model limit error
   */
  static formatProModelLimit(modelName: string, remaining: number, limit: number): string {
    return [
      this.formatError('PRO model limiti tugagan!'),
      '',
      `🤖 Model: ${modelName}`,
      `📊 Ishlatilgan: ${limit - remaining}/${limit}`,
      `🔄 Qolgan: ${remaining}`,
      `📅 Reset: Keyingi oy`,
      '',
      '💡 Boshqa PRO modellarni sinab ko\'ring!'
    ].join('\n');
  }

  /**
   * Create formatted error message
   */
  static formatError(message: string): string {
    return `❌ ${message}`;
  }

  /**
   * Create formatted success message
   */
  static formatSuccess(message: string): string {
    return `✅ ${message}`;
  }

  /**
   * Create formatted warning message
   */
  static formatWarning(message: string): string {
    return `⚠️ ${message}`;
  }

  /**
   * Create formatted info message
   */
  static formatInfo(message: string): string {
    return `ℹ️ ${message}`;
  }

  /**
   * Create plain text version (fallback)
   */
  static toPlainText(text: string): string {
    if (!text) return '';
    
    // Remove all HTML and Markdown formatting
    return text
      .replace(/<[^>]*>/g, '')           // Remove HTML tags
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1')     // Remove bold (single asterisk)
      .replace(/_([^_]+)_/g, '$1')       // Remove italic
      .replace(/`([^`]+)`/g, '$1')       // Remove code
      .replace(/~([^~]+)~/g, '$1')       // Remove strikethrough
      .replace(/__([^_]+)__/g, '$1')     // Remove underline
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/\\(.)/g, '$1')           // Remove escapes
      .replace(/&amp;/g, '&')           // Decode HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
}

export default TelegramFormatter;