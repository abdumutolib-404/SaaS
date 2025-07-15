export class KeyboardBuilder {
    buttons = [];
    currentRow = [];
    addButton(text, callbackData, newRow = false) {
        if (newRow && this.currentRow.length > 0) {
            this.buttons.push([...this.currentRow]);
            this.currentRow = [];
        }
        this.currentRow.push({ text, callback_data: callbackData });
        return this;
    }
    addUrl(text, url, newRow = false) {
        if (newRow && this.currentRow.length > 0) {
            this.buttons.push([...this.currentRow]);
            this.currentRow = [];
        }
        this.currentRow.push({ text, url });
        return this;
    }
    addRow() {
        if (this.currentRow.length > 0) {
            this.buttons.push([...this.currentRow]);
            this.currentRow = [];
        }
        return this;
    }
    build() {
        if (this.currentRow.length > 0) {
            this.buttons.push([...this.currentRow]);
        }
        return {
            reply_markup: {
                inline_keyboard: this.buttons
            }
        };
    }
    // Static methods for common keyboards
    static createMainMenu(isAdmin = false, userPlan = 'FREE') {
        const keyboard = new KeyboardBuilder();
        keyboard.addButton('💬 Suhbat boshlash', 'start_chat');
        keyboard.addButton('🤖 Model tanlash', 'select_model');
        keyboard.addRow();
        keyboard.addButton('📊 Statistika', 'stats');
        keyboard.addButton('💰 Balans', 'balance');
        keyboard.addRow();
        keyboard.addButton('🔊 Ovoz yaratish', 'generate_tts');
        keyboard.addButton('🖼️ Rasm yaratish', 'generate_image');
        keyboard.addRow();
        keyboard.addButton('💎 PRO statistika', 'pro_stats');
        keyboard.addButton('📋 Rejalar', 'view_plans');
        keyboard.addRow();
        keyboard.addButton('👥 Taklif tizimi', 'referral_stats');
        keyboard.addButton('🎫 Promokod', 'use_promocode');
        keyboard.addRow();
        keyboard.addButton('📜 Mavjud promokodlar', 'available_promocodes');
        keyboard.addRow();
        if (isAdmin) {
            keyboard.addButton('👨‍💼 Admin Panel', 'admin_panel');
        }
        return keyboard.build();
    }
    static createRegistrationMenu() {
        return new KeyboardBuilder()
            .addButton('📝 Ro\'yxatdan o\'tish', 'start_registration')
            .addButton('⏭️ O\'tkazib yuborish', 'skip_registration', true)
            .build();
    }
    static createBackButton() {
        return new KeyboardBuilder()
            .addButton('🏠 Bosh sahifa', 'back_to_main')
            .build();
    }
    static createAdminPanel() {
        return new KeyboardBuilder()
            .addButton('📊 Statistika', 'admin_stats')
            .addButton('💰 Token qo\'shish', 'admin_add_tokens', true)
            .addButton('💸 Token ayirish', 'admin_remove_tokens')
            .addButton('💎 PRO berish', 'admin_grant_pro', true)
            .addButton('📋 Plan o\'zgartirish', 'admin_change_plan')
            .addButton('🎫 Promokodlar', 'admin_promocodes', true)
            .addButton('📜 Mavjud promokodlar', 'admin_available_promocodes')
            .addButton('📢 Broadcast', 'admin_broadcast', true)
            .addButton('🤖 Modellar', 'admin_models')
            .addButton('👥 Referral tizimi', 'admin_referrals', true)
            .addButton('📝 Buyruqlar', 'admin_commands')
            .addButton('🏠 Bosh sahifa', 'back_to_main', true)
            .build();
    }
    static createReferralMenu() {
        return new KeyboardBuilder()
            .addButton('📊 Mening statistikam', 'my_referral_stats')
            .addButton('🔗 Taklif havolam', 'get_referral_link', true)
            .addButton('🏆 Reyting', 'referral_leaderboard')
            .addButton('🏠 Bosh sahifa', 'back_to_main', true)
            .build();
    }
}
export function validateKeyboard(keyboard) {
    try {
        if (!keyboard || !keyboard.reply_markup)
            return true;
        const inlineKeyboard = keyboard.reply_markup.inline_keyboard;
        if (!Array.isArray(inlineKeyboard))
            return false;
        for (const row of inlineKeyboard) {
            if (!Array.isArray(row))
                return false;
            for (const button of row) {
                if (!button || typeof button !== 'object')
                    return false;
                if (!button.text || typeof button.text !== 'string')
                    return false;
                // Check if button has either callback_data or url
                if (!button.callback_data && !button.url)
                    return false;
                // Check callback_data length (Telegram limit: 64 bytes)
                if (button.callback_data && button.callback_data.length > 64)
                    return false;
                // Check text length (reasonable limit)
                if (button.text.length > 50)
                    return false;
            }
        }
        return true;
    }
    catch (error) {
        return false;
    }
}
//# sourceMappingURL=keyboard.js.map