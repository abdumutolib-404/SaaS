import { Telegraf } from 'telegraf';
import { BOT_TOKEN, ADMIN_IDS } from './config/constants.js';
import { userService } from './services/user.js';
import { modelService } from './services/model.js';
import { openRouterService } from './services/openrouter.js';
import { statsService } from './services/stats.js';
import { adminService } from './services/admin.js';
import { broadcastService } from './services/broadcast.js';
import { promocodeService } from './services/promocode.js';
import { referralService } from './services/referral.js';
import { proService } from './services/pro.js';
import { planService } from './services/plan.js';
import { ttsService } from './services/tts_improved.js';
import { sttService } from './services/stt_improved.js';
import { imageService } from './services/image.js';
import { TelegramFormatter } from './utils/formatter.js';
import { KeyboardBuilder, validateKeyboard } from './utils/keyboard.js';
import { logger } from './utils/logger.js';
// Bot instance
const bot = new Telegraf(BOT_TOKEN);
// Session storage
const sessions = new Map();
// Chat mode storage
const chatModes = new Map();
// Get session
function getSession(userId) {
    if (!sessions.has(userId)) {
        sessions.set(userId, { step: null, data: {} });
    }
    return sessions.get(userId);
}
// Clear session
function clearSession(userId) {
    sessions.delete(userId);
}
// Check if user is admin
function isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
}
// Safe message sender with error handling
async function safeReply(ctx, text, extra) {
    try {
        // Validate keyboard if present
        if (extra?.reply_markup && !validateKeyboard(extra)) {
            logger.warning('Invalid keyboard detected, sending without keyboard', { user_id: ctx.from?.id });
            delete extra.reply_markup;
        }
        // Try HTML first
        try {
            await ctx.reply(text, { parse_mode: 'HTML', ...extra });
        }
        catch (htmlError) {
            // Fallback to plain text
            const plainText = TelegramFormatter.toPlainText(text);
            await ctx.reply(plainText, extra);
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to send message', {
            error: errorMessage,
            user_id: ctx.from?.id,
            text_length: text.length
        });
    }
}
// Safe edit message
async function safeEdit(ctx, text, extra) {
    try {
        if (extra?.reply_markup && !validateKeyboard(extra)) {
            logger.warning('Invalid keyboard detected, editing without keyboard', { user_id: ctx.from?.id });
            delete extra.reply_markup;
        }
        try {
            await ctx.editMessageText(text, { parse_mode: 'HTML', ...extra });
        }
        catch (htmlError) {
            const plainText = TelegramFormatter.toPlainText(text);
            await ctx.editMessageText(plainText, extra);
        }
    }
    catch (error) {
        // If edit fails, send new message
        await safeReply(ctx, text, extra);
    }
}
// Bot startup
bot.launch().then(() => {
    logger.banner();
    logger.success('Bot started successfully!');
    logger.info('Bot username', { username: bot.botInfo?.username });
    logger.separator();
}).catch((error) => {
    logger.error('Failed to start bot', { error: error.message });
    process.exit(1);
});
// Error handling
bot.catch((err, ctx) => {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Bot error occurred', {
        error: errorMessage,
        user_id: ctx.from?.id,
        update_type: ctx.updateType
    });
});
// Graceful shutdown
process.once('SIGINT', () => {
    logger.system('Received SIGINT, shutting down gracefully...');
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    logger.system('Received SIGTERM, shutting down gracefully...');
    bot.stop('SIGTERM');
});
// Start command - FIXED: Always show main menu
bot.start(async (ctx) => {
    try {
        const user = await userService.ensureUser(ctx.from);
        const userPlan = await planService.getUserPlan(user.telegram_id);
        // Clear any existing session and chat mode
        clearSession(user.telegram_id);
        chatModes.delete(user.telegram_id);
        logger.user('User started bot', {
            user_id: user.telegram_id,
            username: user.username,
            name: user.first_name,
            plan: userPlan?.name || 'FREE'
        });
        // Check for referral
        const startParam = ctx.message && 'text' in ctx.message ? ctx.message.text.split(' ')[1] : null;
        if (startParam) {
            const referrerId = referralService.extractReferrerId(startParam);
            if (referrerId && referrerId !== user.telegram_id) {
                const referralResult = await referralService.processReferral(referrerId, user.telegram_id);
                if (referralResult.success) {
                    const referrer = await userService.getUser(referrerId);
                    if (referrer) {
                        // Notify referrer
                        try {
                            await bot.telegram.sendMessage(referrerId, TelegramFormatter.formatReferralNotification(user.first_name));
                        }
                        catch (error) {
                            logger.warning('Failed to notify referrer', { referrer_id: referrerId });
                        }
                        // Welcome referred user
                        await safeReply(ctx, TelegramFormatter.formatReferralWelcome(user.first_name, user.telegram_id, referrer.first_name), KeyboardBuilder.createRegistrationMenu());
                        return;
                    }
                }
            }
        }
        // Show registration or main menu
        if (!user.registration_completed) {
            await safeReply(ctx, TelegramFormatter.formatWelcomeNew(user.first_name), KeyboardBuilder.createRegistrationMenu());
        }
        else {
            await safeReply(ctx, TelegramFormatter.formatWelcome(user.first_name, user.telegram_id), KeyboardBuilder.createMainMenu(isAdmin(user.telegram_id), userPlan?.name || 'FREE'));
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Start command error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.'));
    }
});
// Help command
bot.command('help', async (ctx) => {
    try {
        const user = await userService.getUser(ctx.from.id);
        const helpText = TelegramFormatter.formatHelp(user, isAdmin(ctx.from.id));
        await safeReply(ctx, helpText, KeyboardBuilder.createBackButton());
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Help command error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('Yordam ma\'lumotini olishda xatolik yuz berdi.'));
    }
});
// Plans command
bot.command('plans', async (ctx) => {
    try {
        const comparison = await planService.getPlanComparison();
        await safeReply(ctx, TelegramFormatter.formatPlansComparison(comparison), KeyboardBuilder.createBackButton());
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Plans command error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('Rejalarni olishda xatolik yuz berdi.'));
    }
});
// Model selection command
bot.command('model', async (ctx) => {
    try {
        const user = await userService.getUser(ctx.from.id);
        const userPlan = await planService.getUserPlan(ctx.from.id);
        const canAccessPro = userPlan ? userPlan.pro_model_access : false;
        const freeModels = await modelService.getFreeModels();
        const proModels = await modelService.getProModels();
        const keyboard = new KeyboardBuilder();
        // Add FREE models section by category
        if (freeModels.length > 0) {
            const categories = await modelService.getCategories();
            for (const category of categories) {
                const categoryModels = freeModels.filter(m => m.category === category);
                if (categoryModels.length > 0) {
                    keyboard.addButton(`🆓 ${category}`, `category_free_${category.replace(/\s+/g, '_')}`);
                    categoryModels.slice(0, 5).forEach(model => {
                        const emoji = user?.selected_model === model.id ? '✅' : '🤖';
                        keyboard.addButton(`${emoji} ${model.name}`, `select_model_${model.id}`);
                    });
                }
            }
        }
        // Add PRO models section
        if (proModels.length > 0) {
            keyboard.addButton('💎 PRO MODELLAR', 'models_pro_header');
            proModels.slice(0, 10).forEach(model => {
                const emoji = user?.selected_model === model.id ? '✅' : '⭐';
                const disabled = !canAccessPro ? ' (1/oy)' : '';
                keyboard.addButton(`${emoji} ${model.name}${disabled}`, `select_model_${model.id}`);
            });
        }
        keyboard.addButton('🏠 Bosh sahifa', 'back_to_main');
        await safeReply(ctx, `🤖 ${TelegramFormatter.bold('AI Model tanlang:')}\n\n` +
            `🆓 FREE modellar - cheksiz\n` +
            `💎 PRO modellar - ${canAccessPro ? 'cheksiz' : '1 marta/oy'}\n\n` +
            `Joriy model: ${user?.selected_model ?
                (await modelService.getModel(user.selected_model))?.name || 'Noma\'lum' :
                'Tanlanmagan'}`, keyboard.build());
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Model command error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('Modellarni olishda xatolik yuz berdi.'));
    }
});
// Stats command
bot.command('stats', async (ctx) => {
    try {
        const stats = await statsService.getUserStats(ctx.from.id);
        await safeReply(ctx, TelegramFormatter.formatStats(stats), KeyboardBuilder.createBackButton());
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Stats command error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('Statistikani olishda xatolik yuz berdi.'));
    }
});
// Balance command
bot.command('balance', async (ctx) => {
    try {
        const user = await userService.getUser(ctx.from.id);
        if (!user) {
            await safeReply(ctx, TelegramFormatter.formatError('Foydalanuvchi topilmadi.'));
            return;
        }
        // Get TTS/STT stats
        const ttsStats = await ttsService.getTTSStats(ctx.from.id);
        const sttStats = await sttService.getSTTStats(ctx.from.id);
        const imageStats = await imageService.getImageStats(ctx.from.id);
        const balanceText = TelegramFormatter.formatBalance(user) + '\n\n' +
            TelegramFormatter.bold('🔊 TTS/STT/Image Limitlar:') + '\n' +
            `🔊 TTS: ${ttsStats.current_usage}/${ttsStats.limit} (oy)\n` +
            `🎤 STT: ${sttStats.current_usage}/${sttStats.limit} (oy)\n` +
            `🖼️ Rasm: ${imageStats.current_usage}/${imageStats.limit} (oy)`;
        await safeReply(ctx, balanceText, KeyboardBuilder.createBackButton());
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Balance command error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('Balansni olishda xatolik yuz berdi.'));
    }
});
// Image generation command
bot.command('image', async (ctx) => {
    try {
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length === 0) {
            await safeReply(ctx, TelegramFormatter.formatError('Format: /image <tasvir>') + '\n\n' +
                TelegramFormatter.bold('Misol:') + '\n' +
                TelegramFormatter.code('/image quyosh va tog\'lar manzarasi') + '\n\n' +
                TelegramFormatter.bold('Limitlar:') + '\n' +
                '🆓 FREE: 3 rasm/oy\n' +
                '💎 PRO: 10 rasm/oy\n' +
                '🌟 PREMIUM: 25 rasm/oy');
            return;
        }
        const prompt = args.join(' ');
        await safeReply(ctx, '🖼️ Rasm yaratilmoqda... Iltimos, kuting (30-60 soniya).');
        const result = await imageService.generateImage(prompt, ctx.from.id);
        if (result.success && result.imageUrl) {
            const imageStats = await imageService.getImageStats(ctx.from.id);
            try {
                await ctx.replyWithPhoto(result.imageUrl, {
                    caption: TelegramFormatter.formatImageGenerated(prompt, imageStats.remaining, imageStats.limit),
                    parse_mode: 'HTML'
                });
            }
            catch (photoError) {
                // If photo fails, send as document
                await ctx.replyWithDocument(result.imageUrl, {
                    caption: TelegramFormatter.formatImageGenerated(prompt, imageStats.remaining, imageStats.limit),
                    parse_mode: 'HTML'
                });
            }
        }
        else {
            await safeReply(ctx, TelegramFormatter.formatError(result.error || 'Rasm yaratishda xatolik yuz berdi.'));
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Image command error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('Rasm yaratishda xatolik yuz berdi.'));
    }
});
// Promocode command
bot.command('promocode', async (ctx) => {
    try {
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length === 0) {
            await safeReply(ctx, TelegramFormatter.formatPromocodeUsage());
            return;
        }
        const code = args[0].toUpperCase();
        const result = await promocodeService.usePromocode(code, ctx.from.id);
        if (result.success && result.tokens) {
            await safeReply(ctx, TelegramFormatter.formatPromocodeSuccess(result.message, result.tokens.daily, result.tokens.total));
        }
        else {
            await safeReply(ctx, TelegramFormatter.formatError(result.message));
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Promocode command error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('Promokod ishlatishda xatolik yuz berdi.'));
    }
});
// Referral command
bot.command('referral', async (ctx) => {
    try {
        const botInfo = await bot.telegram.getMe();
        const stats = await referralService.getReferralStats(ctx.from.id, botInfo.username);
        await safeReply(ctx, TelegramFormatter.formatReferralStats(stats), KeyboardBuilder.createReferralMenu());
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Referral command error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('Taklif ma\'lumotlarini olishda xatolik yuz berdi.'));
    }
});
// TTS command
bot.command('tts', async (ctx) => {
    try {
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length === 0) {
            await safeReply(ctx, TelegramFormatter.formatError('Format: /tts <matn>') + '\n\n' +
                TelegramFormatter.bold('Misol:') + '\n' +
                TelegramFormatter.code('/tts Salom, qanday ahvolingiz?'));
            return;
        }
        const text = args.join(' ');
        await safeReply(ctx, '🔊 Ovoz yaratilmoqda... Iltimos, kuting.');
        const result = await ttsService.generateSpeech(text, ctx.from.id);
        if (result.success && result.audioBuffer) {
            const stats = await ttsService.getTTSStats(ctx.from.id);
            await ctx.replyWithVoice({ source: result.audioBuffer }, {
                caption: TelegramFormatter.formatTTSGenerated(stats.remaining, stats.limit),
                parse_mode: 'HTML'
            });
        }
        else {
            await safeReply(ctx, TelegramFormatter.formatError(result.error || 'Ovoz yaratishda xatolik yuz berdi.'));
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('TTS command error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('Ovoz yaratishda xatolik yuz berdi.'));
    }
});
// PRO stats command
bot.command('pro_stats', async (ctx) => {
    try {
        const stats = await proService.getProStats(ctx.from.id);
        await safeReply(ctx, TelegramFormatter.formatProStats(stats), KeyboardBuilder.createBackButton());
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('PRO stats command error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('PRO statistikani olishda xatolik yuz berdi.'));
    }
});
// Admin commands
bot.command('admin', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        await safeReply(ctx, TelegramFormatter.formatError('Sizda admin huquqi yo\'q.'));
        return;
    }
    try {
        const stats = await adminService.getSystemStats();
        await safeReply(ctx, TelegramFormatter.formatAdminStats(stats), KeyboardBuilder.createAdminPanel());
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Admin command error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('Admin panelni ochishda xatolik yuz berdi.'));
    }
});
bot.command('add_tokens', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        await safeReply(ctx, TelegramFormatter.formatError('Sizda admin huquqi yo\'q.'));
        return;
    }
    try {
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length !== 3) {
            await safeReply(ctx, TelegramFormatter.formatAdminTokenUsage('add'));
            return;
        }
        const [userIdStr, dailyTokensStr, totalTokensStr] = args;
        const userId = parseInt(userIdStr);
        const dailyTokens = parseInt(dailyTokensStr);
        const totalTokens = parseInt(totalTokensStr);
        if (isNaN(userId) || isNaN(dailyTokens) || isNaN(totalTokens)) {
            await safeReply(ctx, TelegramFormatter.formatError('Noto\'g\'ri format. Raqamlar kiriting.'));
            return;
        }
        await adminService.addTokens(userId, dailyTokens, totalTokens);
        await safeReply(ctx, TelegramFormatter.formatTokenOperation(userIdStr, dailyTokens, totalTokens, 'added'));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Add tokens command error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('Token qo\'shishda xatolik yuz berdi.'));
    }
});
bot.command('remove_tokens', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        await safeReply(ctx, TelegramFormatter.formatError('Sizda admin huquqi yo\'q.'));
        return;
    }
    try {
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length !== 3) {
            await safeReply(ctx, TelegramFormatter.formatAdminTokenUsage('remove'));
            return;
        }
        const [userIdStr, dailyTokensStr, totalTokensStr] = args;
        const userId = parseInt(userIdStr);
        const dailyTokens = parseInt(dailyTokensStr);
        const totalTokens = parseInt(totalTokensStr);
        if (isNaN(userId) || isNaN(dailyTokens) || isNaN(totalTokens)) {
            await safeReply(ctx, TelegramFormatter.formatError('Noto\'g\'ri format. Raqamlar kiriting.'));
            return;
        }
        const result = await adminService.removeTokens(userId, dailyTokens, totalTokens);
        if (result.success) {
            await safeReply(ctx, TelegramFormatter.formatTokenOperation(userIdStr, dailyTokens, totalTokens, 'removed'));
        }
        else {
            await safeReply(ctx, TelegramFormatter.formatError(result.message));
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Remove tokens command error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('Token ayirishda xatolik yuz berdi.'));
    }
});
bot.command('grant_pro', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        await safeReply(ctx, TelegramFormatter.formatError('Sizda admin huquqi yo\'q.'));
        return;
    }
    try {
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length < 1 || args.length > 2) {
            await safeReply(ctx, TelegramFormatter.formatError('Format: /grant_pro <user_id> [days]') + '\n\n' +
                TelegramFormatter.bold('Misol:') + '\n' +
                TelegramFormatter.code('/grant_pro 123456789 30'));
            return;
        }
        const userId = parseInt(args[0]);
        const days = args[1] ? parseInt(args[1]) : 30;
        if (isNaN(userId) || isNaN(days)) {
            await safeReply(ctx, TelegramFormatter.formatError('Noto\'g\'ri format. Raqamlar kiriting.'));
            return;
        }
        await proService.grantProStatus(userId, days);
        await safeReply(ctx, TelegramFormatter.formatSuccess(`Foydalanuvchi ${userId} ga ${days} kunlik PRO status berildi!`));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Grant PRO command error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('PRO status berishda xatolik yuz berdi.'));
    }
});
bot.command('change_plan', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        await safeReply(ctx, TelegramFormatter.formatError('Sizda admin huquqi yo\'q.'));
        return;
    }
    try {
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length !== 2) {
            await safeReply(ctx, TelegramFormatter.formatError('Format: /change_plan <user_id> <plan>') + '\n\n' +
                TelegramFormatter.bold('Misol:') + '\n' +
                TelegramFormatter.code('/change_plan 123456789 PRO') + '\n\n' +
                TelegramFormatter.bold('Mavjud planlar:') + '\n' +
                '• FREE\n• PRO\n• PREMIUM');
            return;
        }
        const userId = parseInt(args[0]);
        const planName = args[1].toUpperCase();
        if (isNaN(userId)) {
            await safeReply(ctx, TelegramFormatter.formatError('Noto\'g\'ri user ID.'));
            return;
        }
        const result = await planService.changeUserPlan(userId, planName, ctx.from.id);
        if (result.success) {
            await safeReply(ctx, TelegramFormatter.formatSuccess(result.message));
            // Notify user about plan change
            try {
                const plan = await planService.getPlanByName(planName);
                if (plan) {
                    await bot.telegram.sendMessage(userId, TelegramFormatter.formatPlanChanged(plan.name, plan.display_name));
                }
            }
            catch (notifyError) {
                logger.warning('Failed to notify user about plan change', { user_id: userId });
            }
        }
        else {
            await safeReply(ctx, TelegramFormatter.formatError(result.message));
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Change plan command error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('Plan o\'zgartirishda xatolik yuz berdi.'));
    }
});
// Enhanced admin promocode creation command
bot.command('create_promo', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        await safeReply(ctx, TelegramFormatter.formatError('Sizda admin huquqi yo\'q.'));
        return;
    }
    try {
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length < 4) {
            await safeReply(ctx, TelegramFormatter.formatAdminPromocodeGuide());
            return;
        }
        const [code, type, ...params] = args;
        const validTypes = ['TOKENS', 'TTS', 'STT', 'PRO', 'PREMIUM'];
        if (!validTypes.includes(type.toUpperCase())) {
            await safeReply(ctx, TelegramFormatter.formatError('Noto\'g\'ri promokod turi. Faqat: TOKENS, TTS, STT, PRO, PREMIUM'));
            return;
        }
        let promocodeData = {
            code: code.toUpperCase(),
            type: type.toUpperCase(),
            created_by: ctx.from.id
        };
        switch (type.toUpperCase()) {
            case 'TOKENS':
                if (params.length < 3) {
                    await safeReply(ctx, TelegramFormatter.formatError('Format: /create_promo <kod> TOKENS <daily> <total> <max_usage> [tavsif]'));
                    return;
                }
                promocodeData.daily_tokens = parseInt(params[0]);
                promocodeData.total_tokens = parseInt(params[1]);
                promocodeData.max_usage = parseInt(params[2]);
                promocodeData.description = params.slice(3).join(' ') || `${params[0]} kunlik, ${params[1]} umumiy token`;
                break;
            case 'TTS':
                if (params.length < 2) {
                    await safeReply(ctx, TelegramFormatter.formatError('Format: /create_promo <kod> TTS <limit> <max_usage> [tavsif]'));
                    return;
                }
                promocodeData.tts_limit = parseInt(params[0]);
                promocodeData.max_usage = parseInt(params[1]);
                promocodeData.description = params.slice(2).join(' ') || `${params[0]} TTS ovoz yaratish`;
                break;
            case 'STT':
                if (params.length < 2) {
                    await safeReply(ctx, TelegramFormatter.formatError('Format: /create_promo <kod> STT <limit> <max_usage> [tavsif]'));
                    return;
                }
                promocodeData.stt_limit = parseInt(params[0]);
                promocodeData.max_usage = parseInt(params[1]);
                promocodeData.description = params.slice(2).join(' ') || `${params[0]} STT nutq tanish`;
                break;
            case 'PRO':
                if (params.length < 2) {
                    await safeReply(ctx, TelegramFormatter.formatError('Format: /create_promo <kod> PRO <kunlar> <max_usage> [tavsif]'));
                    return;
                }
                promocodeData.pro_days = parseInt(params[0]);
                promocodeData.max_usage = parseInt(params[1]);
                promocodeData.description = params.slice(2).join(' ') || `${params[0]} kunlik PRO status`;
                break;
            case 'PREMIUM':
                if (params.length < 2) {
                    await safeReply(ctx, TelegramFormatter.formatError('Format: /create_promo <kod> PREMIUM <plan> <max_usage> [tavsif]'));
                    return;
                }
                promocodeData.plan_name = params[0].toUpperCase();
                promocodeData.max_usage = parseInt(params[1]);
                promocodeData.description = params.slice(2).join(' ') || `${params[0]} plan o'tkazish`;
                break;
        }
        await promocodeService.createPromocode(promocodeData);
        let successMessage = `✅ Promokod yaratildi: ${code.toUpperCase()}\n\n`;
        successMessage += `🎫 Tur: ${type.toUpperCase()}\n`;
        successMessage += `📝 Tavsif: ${promocodeData.description}\n`;
        successMessage += `📊 Maksimal foydalanish: ${promocodeData.max_usage}\n`;
        if (promocodeData.daily_tokens)
            successMessage += `🔥 Kunlik tokenlar: ${promocodeData.daily_tokens}\n`;
        if (promocodeData.total_tokens)
            successMessage += `💎 Umumiy tokenlar: ${promocodeData.total_tokens}\n`;
        if (promocodeData.tts_limit)
            successMessage += `🔊 TTS limit: ${promocodeData.tts_limit}\n`;
        if (promocodeData.stt_limit)
            successMessage += `🎤 STT limit: ${promocodeData.stt_limit}\n`;
        if (promocodeData.pro_days)
            successMessage += `💎 PRO kunlar: ${promocodeData.pro_days}\n`;
        if (promocodeData.plan_name)
            successMessage += `🌟 Plan: ${promocodeData.plan_name}\n`;
        await safeReply(ctx, successMessage);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Create promo command error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('Promokod yaratishda xatolik yuz berdi: ' + errorMessage));
    }
});
// Delete promo command - NEW
bot.command('delete_promo', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        await safeReply(ctx, TelegramFormatter.formatError('Sizda admin huquqi yo\'q.'));
        return;
    }
    try {
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length !== 1) {
            await safeReply(ctx, TelegramFormatter.formatError('Format: /delete_promo <code>') + '\n\n' +
                TelegramFormatter.bold('Misol:') + '\n' +
                TelegramFormatter.code('/delete_promo HELLO2025'));
            return;
        }
        const code = args[0].toUpperCase();
        const promocode = await promocodeService.getPromocodeByCode(code);
        if (!promocode) {
            await safeReply(ctx, TelegramFormatter.formatError('Promokod topilmadi.'));
            return;
        }
        await promocodeService.deletePromocode(promocode.id);
        await safeReply(ctx, TelegramFormatter.formatSuccess(`Promokod o'chirildi: ${code}`));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Delete promo command error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('Promokod o\'chirishda xatolik yuz berdi.'));
    }
});
// Broadcast command - FIXED
bot.command('broadcast', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        await safeReply(ctx, TelegramFormatter.formatError('Sizda admin huquqi yo\'q.'));
        return;
    }
    try {
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length === 0) {
            await safeReply(ctx, TelegramFormatter.formatError('Format: /broadcast <xabar>') + '\n\n' +
                TelegramFormatter.bold('Misol:') + '\n' +
                TelegramFormatter.code('/broadcast Yangi funksiya qo\'shildi!'));
            return;
        }
        const message = args.join(' ');
        await safeReply(ctx, '📢 Xabar yuborilmoqda...');
        const successCount = await broadcastService.broadcastToAll(bot, message);
        await safeReply(ctx, TelegramFormatter.formatSuccess(`Xabar yuborildi!\n\n📊 Muvaffaqiyatli: ${successCount} foydalanuvchi`));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Broadcast command error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('Xabar yuborishda xatolik yuz berdi.'));
    }
});
// Voice message handler for STT
bot.on('voice', async (ctx) => {
    try {
        const user = await userService.ensureUser(ctx.from);
        await safeReply(ctx, '🎤 Ovoz matnga aylantirilmoqda... Iltimos, kuting.');
        // Get voice file
        const voice = ctx.message.voice;
        const fileLink = await ctx.telegram.getFileLink(voice.file_id);
        // Download audio file
        const response = await fetch(fileLink.href);
        const audioBuffer = Buffer.from(await response.arrayBuffer());
        const result = await sttService.convertSpeechToText(audioBuffer, user.telegram_id);
        if (result.success && result.text) {
            const stats = await sttService.getSTTStats(user.telegram_id);
            await safeReply(ctx, TelegramFormatter.formatSTTConverted(result.text, stats.remaining, stats.limit));
        }
        else {
            await safeReply(ctx, TelegramFormatter.formatError(result.error || 'Ovozni matnga aylantirishda xatolik yuz berdi.'));
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Voice handler error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('Ovozni matnga aylantirishda xatolik yuz berdi.'));
    }
});
// Callback query handlers - FIXED: All buttons now handled
bot.on('callback_query', async (ctx) => {
    try {
        const data = ctx.callbackQuery.data;
        const user = await userService.ensureUser(ctx.from);
        const userPlan = await planService.getUserPlan(user.telegram_id);
        const session = getSession(user.telegram_id);
        await ctx.answerCbQuery();
        switch (data) {
            case 'back_to_main':
                clearSession(user.telegram_id);
                chatModes.delete(user.telegram_id);
                await safeEdit(ctx, TelegramFormatter.formatWelcome(user.first_name, user.telegram_id), KeyboardBuilder.createMainMenu(isAdmin(user.telegram_id), userPlan?.name || 'FREE'));
                break;
            case 'start_registration':
                session.step = 'name';
                await safeEdit(ctx, TelegramFormatter.formatRegistrationStep('name'));
                break;
            case 'skip_registration':
                await userService.completeRegistration(user.telegram_id);
                await safeEdit(ctx, TelegramFormatter.formatRegistrationSkipped(user.telegram_id), KeyboardBuilder.createMainMenu(isAdmin(user.telegram_id), userPlan?.name || 'FREE'));
                break;
            case 'start_chat':
                if (!user.selected_model) {
                    await safeEdit(ctx, TelegramFormatter.formatError('Avval AI model tanlang!'), KeyboardBuilder.createBackButton());
                    break;
                }
                chatModes.set(user.telegram_id, true);
                const model = await modelService.getModel(user.selected_model);
                await safeEdit(ctx, TelegramFormatter.formatChatModeStart(model?.name || 'Noma\'lum'), new KeyboardBuilder().addButton('🔚 Suhbatni tugatish', 'end_chat').build());
                break;
            case 'end_chat':
                chatModes.delete(user.telegram_id);
                await safeEdit(ctx, TelegramFormatter.formatChatModeEnd(), KeyboardBuilder.createMainMenu(isAdmin(user.telegram_id), userPlan?.name || 'FREE'));
                break;
            case 'select_model':
                const freeModels = await modelService.getFreeModels();
                const proModels = await modelService.getProModels();
                const canAccessPro = userPlan ? userPlan.pro_model_access : false;
                const keyboard = new KeyboardBuilder();
                // Add FREE models section by category
                if (freeModels.length > 0) {
                    const categories = await modelService.getCategories();
                    for (const category of categories) {
                        const categoryModels = freeModels.filter(m => m.category === category);
                        if (categoryModels.length > 0) {
                            const categoryKey = category.replace(/\s+/g, '_').substring(0, 20);
                            keyboard.addButton(`🆓 ${category}`, `cat_free_${categoryKey}`);
                            categoryModels.slice(0, 5).forEach(model => {
                                const emoji = user.selected_model === model.id ? '✅' : '🤖';
                                const modelKey = model.id.length > 45 ?
                                    model.id.split('').reduce((a, b) => {
                                        a = ((a << 5) - a) + b.charCodeAt(0);
                                        return a & a;
                                    }, 0).toString(36) : model.id;
                                keyboard.addButton(`${emoji} ${model.name}`, `sel_${Math.abs(parseInt(modelKey, 36) || 0).toString(36)}`);
                            });
                        }
                    }
                }
                // Add PRO models section
                if (proModels.length > 0) {
                    keyboard.addButton('💎 PRO MODELLAR', 'models_pro_header');
                    proModels.slice(0, 10).forEach(model => {
                        const emoji = user.selected_model === model.id ? '✅' : '⭐';
                        const disabled = !canAccessPro ? ' (1/oy)' : '';
                        const modelKey = model.id.length > 45 ?
                            model.id.split('').reduce((a, b) => {
                                a = ((a << 5) - a) + b.charCodeAt(0);
                                return a & a;
                            }, 0).toString(36) : model.id;
                        keyboard.addButton(`${emoji} ${model.name}${disabled}`, `sel_${Math.abs(parseInt(modelKey, 36) || 0).toString(36)}`);
                    });
                }
                keyboard.addButton('🏠 Bosh sahifa', 'back_to_main');
                await safeEdit(ctx, `🤖 ${TelegramFormatter.bold('AI Model tanlang:')}\n\n` +
                    `🆓 FREE modellar - cheksiz\n` +
                    `💎 PRO modellar - ${canAccessPro ? 'cheksiz' : '1 marta/oy'}\n\n` +
                    `Joriy model: ${user.selected_model ?
                        (await modelService.getModel(user.selected_model))?.name || 'Noma\'lum' :
                        'Tanlanmagan'}`, keyboard.build());
                break;
            case 'stats':
                const stats = await statsService.getUserStats(user.telegram_id);
                await safeEdit(ctx, TelegramFormatter.formatStats(stats), KeyboardBuilder.createBackButton());
                break;
            case 'balance':
                const ttsStats = await ttsService.getTTSStats(user.telegram_id);
                const sttStats = await sttService.getSTTStats(user.telegram_id);
                const imageStats = await imageService.getImageStats(user.telegram_id);
                const balanceText = TelegramFormatter.formatBalance(user) + '\n\n' +
                    TelegramFormatter.bold('🔊 TTS/STT/Image Limitlar:') + '\n' +
                    `🔊 TTS: ${ttsStats.current_usage}/${ttsStats.limit} (oy)\n` +
                    `🎤 STT: ${sttStats.current_usage}/${sttStats.limit} (oy)\n` +
                    `🖼️ Rasm: ${imageStats.current_usage}/${imageStats.limit} (oy)`;
                await safeEdit(ctx, balanceText, KeyboardBuilder.createBackButton());
                break;
            case 'pro_stats':
                const proStats = await proService.getProStats(user.telegram_id);
                await safeEdit(ctx, TelegramFormatter.formatProStats(proStats), KeyboardBuilder.createBackButton());
                break;
            case 'view_plans':
                const comparison = await planService.getPlanComparison();
                await safeEdit(ctx, TelegramFormatter.formatPlansComparison(comparison), KeyboardBuilder.createBackButton());
                break;
            case 'generate_tts':
                session.step = 'tts_text';
                await safeEdit(ctx, '🔊 Ovozga aylantirish uchun matn kiriting:\n\n' +
                    'Maksimal: 1000 belgi\n\n' +
                    '💡 O\'zbek yoki ingliz tilida yozing.');
                break;
            case 'generate_image':
                session.step = 'image_prompt';
                const currentImageStats = await imageService.getImageStats(user.telegram_id);
                await safeEdit(ctx, '🖼️ Rasm yaratish uchun tasvir kiriting:\n\n' +
                    'Misol: "quyosh va tog\'lar manzarasi"\n\n' +
                    `📊 Qolgan: ${currentImageStats.remaining}/${currentImageStats.limit} rasm\n` +
                    `📅 Keyingi reset: Keyingi oy\n\n` +
                    '💡 Ingliz tilida yozing (yaxshiroq natija uchun).');
                break;
            case 'generate_stt':
                await safeEdit(ctx, '🎤 Ovozni matnga aylantirish:\n\n' +
                    '📱 Ovozli xabar yuboring\n' +
                    '⏱️ Maksimal: 60 soniya\n\n' +
                    '💡 Aniq va ravshan gapiring.');
                break;
            case 'referral_stats':
                const botInfo = await bot.telegram.getMe();
                const referralStats = await referralService.getReferralStats(user.telegram_id, botInfo.username);
                await safeEdit(ctx, TelegramFormatter.formatReferralStats(referralStats), KeyboardBuilder.createReferralMenu());
                break;
            case 'use_promocode':
                session.step = 'promocode';
                await safeEdit(ctx, TelegramFormatter.formatPromocodeInput());
                break;
            case 'available_promocodes':
                const activePromocodes = await promocodeService.getActivePromocodes();
                await safeEdit(ctx, TelegramFormatter.formatAvailablePromocodes(activePromocodes), KeyboardBuilder.createBackButton());
                break;
            case 'admin_panel':
                if (!isAdmin(user.telegram_id)) {
                    await ctx.answerCbQuery('Sizda admin huquqi yo\'q!', { show_alert: true });
                    break;
                }
                const adminStats = await adminService.getSystemStats();
                await safeEdit(ctx, TelegramFormatter.formatAdminStats(adminStats), KeyboardBuilder.createAdminPanel());
                break;
            // Admin panel buttons
            case 'admin_stats':
                if (!isAdmin(user.telegram_id)) {
                    await ctx.answerCbQuery('Sizda admin huquqi yo\'q!', { show_alert: true });
                    break;
                }
                const systemStats = await adminService.getSystemStats();
                await safeEdit(ctx, TelegramFormatter.formatAdminStats(systemStats), KeyboardBuilder.createAdminPanel());
                break;
            case 'admin_add_tokens':
                if (!isAdmin(user.telegram_id)) {
                    await ctx.answerCbQuery('Sizda admin huquqi yo\'q!', { show_alert: true });
                    break;
                }
                await safeEdit(ctx, TelegramFormatter.formatAdminTokenUsage('add') + '\n\n' +
                    TelegramFormatter.bold('Buyruq:') + '\n' +
                    TelegramFormatter.code('/add\\_tokens <user\\_id> <daily> <total>'), KeyboardBuilder.createBackButton());
                break;
            case 'admin_remove_tokens':
                if (!isAdmin(user.telegram_id)) {
                    await ctx.answerCbQuery('Sizda admin huquqi yo\'q!', { show_alert: true });
                    break;
                }
                await safeEdit(ctx, TelegramFormatter.formatAdminTokenUsage('remove') + '\n\n' +
                    TelegramFormatter.bold('Buyruq:') + '\n' +
                    TelegramFormatter.code('/remove\\_tokens <user\\_id> <daily> <total>'), KeyboardBuilder.createBackButton());
                break;
            case 'admin_grant_pro':
                if (!isAdmin(user.telegram_id)) {
                    await ctx.answerCbQuery('Sizda admin huquqi yo\'q!', { show_alert: true });
                    break;
                }
                await safeEdit(ctx, TelegramFormatter.bold('PRO status berish:') + '\n\n' +
                    TelegramFormatter.code('/grant\\_pro <user\\_id> [days]') + '\n\n' +
                    TelegramFormatter.bold('Misol:') + '\n' +
                    TelegramFormatter.code('/grant\\_pro 123456789 30'), KeyboardBuilder.createBackButton());
                break;
            case 'admin_change_plan':
                if (!isAdmin(user.telegram_id)) {
                    await ctx.answerCbQuery('Sizda admin huquqi yo\'q!', { show_alert: true });
                    break;
                }
                await safeEdit(ctx, TelegramFormatter.bold('Plan o\'zgartirish:') + '\n\n' +
                    TelegramFormatter.code('/change\\_plan <user\\_id> <plan>') + '\n\n' +
                    TelegramFormatter.bold('Mavjud planlar:') + '\n' +
                    '• FREE\n• PRO\n• PREMIUM', KeyboardBuilder.createBackButton());
                break;
            case 'admin_promocodes':
                if (!isAdmin(user.telegram_id)) {
                    await ctx.answerCbQuery('Sizda admin huquqi yo\'q!', { show_alert: true });
                    break;
                }
                await safeEdit(ctx, TelegramFormatter.bold('Promokod yaratish:') + '\n\n' +
                    TelegramFormatter.code('/add\\_promo <code> <daily> <total> <usage>') + '\n\n' +
                    TelegramFormatter.bold('Misol:') + '\n' +
                    TelegramFormatter.code('/add\\_promo HELLO2025 1000 5000 100') + '\n\n' +
                    TelegramFormatter.bold('Promokod o\'chirish:') + '\n\n' +
                    TelegramFormatter.code('/delete\\_promo <code>'), KeyboardBuilder.createBackButton());
                break;
            case 'admin_available_promocodes':
                if (!isAdmin(user.telegram_id)) {
                    await ctx.answerCbQuery('Sizda admin huquqi yo\'q!', { show_alert: true });
                    break;
                }
                const allPromocodes = await promocodeService.getActivePromocodes();
                const promoText = TelegramFormatter.formatAvailablePromocodes(allPromocodes) + '\n\n' +
                    TelegramFormatter.bold('🗑️ Promokod o\'chirish:') + '\n' +
                    TelegramFormatter.code('/delete\\_promo <kod>');
                await safeEdit(ctx, promoText, KeyboardBuilder.createBackButton());
                break;
            case 'admin_broadcast':
                if (!isAdmin(user.telegram_id)) {
                    await ctx.answerCbQuery('Sizda admin huquqi yo\'q!', { show_alert: true });
                    break;
                }
                await safeEdit(ctx, TelegramFormatter.bold('Xabar yuborish:') + '\n\n' +
                    TelegramFormatter.code('/broadcast <xabar>') + '\n\n' +
                    TelegramFormatter.bold('Misol:') + '\n' +
                    TelegramFormatter.code('/broadcast Yangi funksiya qo\'shildi!'), KeyboardBuilder.createBackButton());
                break;
            case 'admin_models':
                if (!isAdmin(user.telegram_id)) {
                    await ctx.answerCbQuery('Sizda admin huquqi yo\'q!', { show_alert: true });
                    break;
                }
                const allModels = await modelService.getAllModels();
                const freeCount = allModels.filter(m => m.model_type === 'FREE').length;
                const proCount = allModels.filter(m => m.model_type === 'PRO').length;
                await safeEdit(ctx, TelegramFormatter.bold('Model statistikasi:') + '\n\n' +
                    `🆓 FREE modellar: ${freeCount}\n` +
                    `💎 PRO modellar: ${proCount}\n` +
                    `📊 Jami modellar: ${allModels.length}`, KeyboardBuilder.createBackButton());
                break;
            case 'admin_referrals':
                if (!isAdmin(user.telegram_id)) {
                    await ctx.answerCbQuery('Sizda admin huquqi yo\'q!', { show_alert: true });
                    break;
                }
                const referralSystemStats = await referralService.getSystemReferralStats();
                await safeEdit(ctx, TelegramFormatter.formatAdminReferralStats(referralSystemStats), KeyboardBuilder.createBackButton());
                break;
            case 'admin_commands':
                if (!isAdmin(user.telegram_id)) {
                    await ctx.answerCbQuery('Sizda admin huquqi yo\'q!', { show_alert: true });
                    break;
                }
                await safeEdit(ctx, TelegramFormatter.bold('Admin buyruqlari:') + '\n\n' +
                    TelegramFormatter.code('/admin') + ' - Admin panel\n' +
                    TelegramFormatter.code('/add\\_tokens <id> <daily> <total>') + ' - Token qo\'shish\n' +
                    TelegramFormatter.code('/remove\\_tokens <id> <daily> <total>') + ' - Token ayirish\n' +
                    TelegramFormatter.code('/grant\\_pro <id> [days]') + ' - PRO berish\n' +
                    TelegramFormatter.code('/change\\_plan <id> <plan>') + ' - Plan o\'zgartirish\n' +
                    TelegramFormatter.code('/add\\_promo <code> <daily> <total> <usage>') + ' - Promokod yaratish\n' +
                    TelegramFormatter.code('/delete\\_promo <code>') + ' - Promokod o\'chirish\n' +
                    TelegramFormatter.code('/broadcast <xabar>') + ' - Xabar yuborish', KeyboardBuilder.createBackButton());
                break;
            // Referral menu buttons
            case 'my_referral_stats':
                const myReferralStats = await referralService.getReferralStats(user.telegram_id, (await bot.telegram.getMe()).username);
                await safeEdit(ctx, TelegramFormatter.formatReferralStats(myReferralStats), KeyboardBuilder.createReferralMenu());
                break;
            case 'get_referral_link':
                const botUsername = (await bot.telegram.getMe()).username;
                const referralLink = await referralService.generateReferralLink(user.telegram_id, botUsername);
                await safeEdit(ctx, TelegramFormatter.bold('Sizning taklif havolangiz:') + '\n\n' +
                    TelegramFormatter.code(referralLink) + '\n\n' +
                    '📋 Havolani nusxalash uchun ustiga bosing\n' +
                    '👥 Do\'stlaringizga yuboring va mukofot oling!', KeyboardBuilder.createReferralMenu());
                break;
            case 'referral_leaderboard':
                const leaderboard = await referralService.getReferralLeaderboard(10);
                let leaderboardText = TelegramFormatter.bold('🏆 Top taklifchilar:') + '\n\n';
                if (leaderboard.length > 0) {
                    leaderboard.forEach((user, index) => {
                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                        leaderboardText += `${medal} ${user.first_name} - ${user.referral_count} taklif\n`;
                    });
                }
                else {
                    leaderboardText += 'Hozircha taklifchilar yo\'q.';
                }
                await safeEdit(ctx, leaderboardText, KeyboardBuilder.createReferralMenu());
                break;
            // Ignore header buttons
            case 'models_free_header':
            case 'models_pro_header':
                await ctx.answerCbQuery();
                break;
            default:
                // Handle model selection
                if (data.startsWith('sel_')) {
                    const shortModelId = data.replace('sel_', '');
                    const selectedModel = await modelService.getModelByShortId(shortModelId);
                    if (!selectedModel) {
                        await ctx.answerCbQuery('Model topilmadi!', { show_alert: true });
                        break;
                    }
                    // Check PRO model access for FREE users
                    if (selectedModel.model_type === 'PRO' && !userPlan?.pro_model_access) {
                        // Allow limited access for FREE users
                        const usageCheck = await proService.checkProModelUsage(user.telegram_id, selectedModel.id);
                        if (!usageCheck.allowed) {
                            await ctx.answerCbQuery(`Bu PRO model! FREE foydalanuvchilar uchun ${usageCheck.limit} marta/oy. Limitingiz tugagan.`, { show_alert: true });
                            break;
                        }
                    }
                    await userService.updateSelectedModel(user.telegram_id, selectedModel.id);
                    await ctx.answerCbQuery(`Model tanlandi: ${selectedModel.name}`, { show_alert: true });
                    await safeEdit(ctx, TelegramFormatter.formatModelSelected(selectedModel.name, selectedModel.model_type), KeyboardBuilder.createMainMenu(isAdmin(user.telegram_id), userPlan?.name || 'FREE'));
                }
                else if (data.startsWith('cat_free_')) {
                    // Handle category selection - just show info
                    const category = data.replace('cat_free_', '').replace(/_/g, ' ');
                    await ctx.answerCbQuery(`${category} kategoriyasi`, { show_alert: false });
                }
                else {
                    // Unknown callback
                    await ctx.answerCbQuery('Noma\'lum buyruq!', { show_alert: true });
                }
                break;
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Callback query error', { error: errorMessage, user_id: ctx.from?.id });
        await ctx.answerCbQuery('Xatolik yuz berdi!', { show_alert: true });
    }
});
// Text message handler
bot.on('text', async (ctx) => {
    try {
        const user = await userService.ensureUser(ctx.from);
        const session = getSession(user.telegram_id);
        const text = ctx.message.text;
        // Handle registration steps
        if (session.step) {
            switch (session.step) {
                case 'name':
                    await userService.updateUserInfo(user.telegram_id, { name: text });
                    session.step = 'age';
                    await safeReply(ctx, TelegramFormatter.formatRegistrationStep('age'));
                    break;
                case 'age':
                    const age = parseInt(text);
                    if (isNaN(age) || age < 1 || age > 120) {
                        await safeReply(ctx, TelegramFormatter.formatError('Iltimos, to\'g\'ri yosh kiriting (1-120).'));
                        break;
                    }
                    await userService.updateUserInfo(user.telegram_id, { age });
                    session.step = 'interests';
                    await safeReply(ctx, TelegramFormatter.formatRegistrationStep('interests'));
                    break;
                case 'interests':
                    await userService.updateUserInfo(user.telegram_id, { interests: text });
                    await userService.completeRegistration(user.telegram_id);
                    clearSession(user.telegram_id);
                    const userPlan = await planService.getUserPlan(user.telegram_id);
                    await safeReply(ctx, TelegramFormatter.formatRegistrationComplete(user.telegram_id), KeyboardBuilder.createMainMenu(isAdmin(user.telegram_id), userPlan?.name || 'FREE'));
                    break;
                case 'tts_text':
                    clearSession(user.telegram_id);
                    await safeReply(ctx, '🔊 Ovoz yaratilmoqda... Iltimos, kuting.');
                    const ttsResult = await ttsService.generateSpeech(text, user.telegram_id);
                    if (ttsResult.success && ttsResult.audioBuffer) {
                        const ttsStats = await ttsService.getTTSStats(user.telegram_id);
                        await ctx.replyWithVoice({ source: ttsResult.audioBuffer }, {
                            caption: TelegramFormatter.formatTTSGenerated(ttsStats.remaining, ttsStats.limit),
                            parse_mode: 'HTML'
                        });
                    }
                    else {
                        await safeReply(ctx, TelegramFormatter.formatError(ttsResult.error || 'Ovoz yaratishda xatolik yuz berdi.'));
                    }
                    break;
                case 'image_prompt':
                    clearSession(user.telegram_id);
                    await safeReply(ctx, '🖼️ Rasm yaratilmoqda... Iltimos, kuting (30-60 soniya).');
                    const imageResult = await imageService.generateImage(text, user.telegram_id);
                    if (imageResult.success && imageResult.imageUrl) {
                        const imageStats = await imageService.getImageStats(user.telegram_id);
                        try {
                            await ctx.replyWithPhoto(imageResult.imageUrl, {
                                caption: TelegramFormatter.formatImageGenerated(text, imageStats.remaining, imageStats.limit),
                                parse_mode: 'HTML'
                            });
                        }
                        catch (photoError) {
                            await ctx.replyWithDocument(imageResult.imageUrl, {
                                caption: TelegramFormatter.formatImageGenerated(text, imageStats.remaining, imageStats.limit),
                                parse_mode: 'HTML'
                            });
                        }
                    }
                    else {
                        await safeReply(ctx, TelegramFormatter.formatError(imageResult.error || 'Rasm yaratishda xatolik yuz berdi.'));
                    }
                    break;
                case 'promocode':
                    clearSession(user.telegram_id);
                    const code = text.toUpperCase();
                    const result = await promocodeService.usePromocode(code, user.telegram_id);
                    if (result.success && result.tokens) {
                        await safeReply(ctx, TelegramFormatter.formatPromocodeSuccess(result.message, result.tokens.daily, result.tokens.total));
                    }
                    else {
                        await safeReply(ctx, TelegramFormatter.formatError(result.message));
                    }
                    break;
            }
            return;
        }
        // Handle chat mode
        if (chatModes.has(user.telegram_id)) {
            if (!user.selected_model) {
                await safeReply(ctx, TelegramFormatter.formatError('Model tanlanmagan!'));
                return;
            }
            // Check token limits
            const remainingDaily = user.daily_tokens - user.daily_used;
            const remainingTotal = user.total_tokens - user.total_used;
            if (remainingDaily <= 0 || remainingTotal <= 0) {
                await safeReply(ctx, TelegramFormatter.formatTokenLimit(user.telegram_id));
                return;
            }
            try {
                const response = await openRouterService.generateResponse(text, user.selected_model, user.telegram_id, user);
                await statsService.updateStats(user.telegram_id, response.tokens);
                // Send response with proper formatting
                await safeReply(ctx, response.text);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                await safeReply(ctx, TelegramFormatter.formatError(errorMessage));
            }
            return;
        }
        // Handle group mentions and replies
        if (ctx.chat.type !== 'private') {
            const botInfo = await bot.telegram.getMe();
            const isMentioned = text.includes(`@${botInfo.username}`);
            const isReply = ctx.message.reply_to_message?.from?.id === botInfo.id;
            if (isMentioned || isReply) {
                if (!user.selected_model) {
                    await safeReply(ctx, TelegramFormatter.formatError('Avval /model buyrug\'i bilan AI model tanlang!'));
                    return;
                }
                // Check token limits for group usage
                const remainingDaily = user.daily_tokens - user.daily_used;
                const remainingTotal = user.total_tokens - user.total_used;
                if (remainingDaily <= 0 || remainingTotal <= 0) {
                    await safeReply(ctx, TelegramFormatter.formatTokenLimit(user.telegram_id));
                    return;
                }
                const cleanText = text.replace(`@${botInfo.username}`, '').trim();
                if (!cleanText)
                    return;
                try {
                    const response = await openRouterService.generateResponse(cleanText, user.selected_model, user.telegram_id, user);
                    await statsService.updateStats(user.telegram_id, response.tokens);
                    // Send response with proper formatting
                    await safeReply(ctx, response.text);
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    await safeReply(ctx, TelegramFormatter.formatError(errorMessage));
                }
            }
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Text handler error', { error: errorMessage, user_id: ctx.from?.id });
        await safeReply(ctx, TelegramFormatter.formatError('Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.'));
    }
});
export default bot;
//# sourceMappingURL=index.js.map