import axios from 'axios';
import { OPENROUTER_API_KEY } from '../config/constants.js';
import { OpenRouterResponse, User } from '../types/bot.js';
import { modelService } from './model.js';
import { rateLimitService } from './rateLimit.js';
import { proService } from './pro.js';
import { planService } from './plan.js';
import { logger } from '../utils/logger.js';

export const openRouterService = {
  async generateResponse(
    prompt: string, 
    modelId: string, 
    userId: number,
    user?: User
  ): Promise<OpenRouterResponse> {
    // Get user's plan
    const userPlan = await planService.getUserPlan(userId);
    const isPro = userPlan ? userPlan.pro_model_access : false;
    
    // Check rate limit (PRO users get higher priority)
    const rateLimit = await rateLimitService.checkRateLimit(userId);
    
    if (!rateLimit.allowed && !isPro) {
      const resetTime = rateLimit.resetTime;
      const waitMinutes = resetTime ? Math.ceil((resetTime.getTime() - Date.now()) / 60000) : 1;
      
      throw new Error(
        `Juda ko'p so'rov yuborildi! ${waitMinutes} daqiqadan keyin qayta urinib ko'ring.\n\n` +
        `Limit: 10 so'rov/daqiqa\nQolgan: ${rateLimit.remainingRequests} so'rov\n\n` +
        `💎 PRO foydalanuvchilar uchun tezroq ishlov berish!`
      );
    }

    const model = await modelService.getModel(modelId);
    if (!model) {
      logger.error('Model not found', { model_id: modelId, user_id: userId });
      throw new Error('Model topilmadi');
    }

    // Check PRO model usage limits for FREE users
    if (model.model_type === 'PRO') {
      if (!isPro) {
        // FREE users get limited access to PRO models
        const usageCheck = await proService.checkProModelUsage(userId, modelId);
        if (!usageCheck.allowed) {
          throw new Error(
            `🔒 Premium model limiti tugagan!\n\n` +
            `🤖 Model: ${model.name}\n` +
            `📊 FREE foydalanuvchilar uchun: ${usageCheck.limit} so'rov/kun\n` +
            `🔄 Qolgan: ${usageCheck.remaining} so'rov\n\n` +
            `💎 PRO rejaga o'ting va cheksiz foydalaning!\n` +
            `Admin bilan bog'laning: @abdulahadov_abdumutolib`
          );
        }
      }
    }

    try {
      // System message yaratish
      let systemMessage = 'Siz foydali AI yordamchisiz. O\'zbek tilida javob bering.';
      
      if (user?.age || user?.interests || user?.first_name) {
        systemMessage += '\n\nFoydalanuvchi haqida ma\'lumot:';
        if (user.first_name) {
          systemMessage += `\n- Ismi: ${user.first_name}`;
        }
        if (user.age) {
          systemMessage += `\n- Yoshi: ${user.age}`;
        }
        if (user.interests) {
          systemMessage += `\n- Qiziqishlari: ${user.interests}`;
        }
        systemMessage += '\n\nBu ma\'lumotlardan foydalanib, foydalanuvchiga shaxsiylashtirilgan va mos javob bering.';
      }

      logger.ai('Sending request to OpenRouter', { 
        model: model.name, 
        model_type: model.model_type,
        user_id: userId, 
        user_plan: userPlan?.name || 'FREE',
        is_pro: isPro,
        prompt_length: prompt.length,
        max_tokens: Math.min(model.max_tokens, model.model_type === 'PRO' && !isPro ? 1000 : model.max_tokens),
        remaining_requests: rateLimit.remainingRequests
      });

      // PRO users get faster processing (no artificial delay)
      if (!isPro) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for free users
      }

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: modelId,
          messages: [
            {
              role: 'system',
              content: systemMessage
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: Math.min(model.max_tokens, model.model_type === 'PRO' && !isPro ? 1000 : model.max_tokens),
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'X-Title': 'Telegram AI Bot'
          },
          timeout: isPro ? 45000 : 30000 // PRO users get longer timeout
        }
      );

      const completion = response.data.choices[0].message.content;
      const tokens = response.data.usage?.total_tokens || 100;

      // Increment PRO model usage if applicable for FREE users
      if (model.model_type === 'PRO' && !isPro) {
        await proService.incrementProModelUsage(userId, modelId);
      }

      logger.success('OpenRouter response received', { 
        user_id: userId, 
        model_type: model.model_type,
        user_plan: userPlan?.name || 'FREE',
        is_pro: isPro,
        tokens, 
        response_length: completion.length,
        remaining_requests: rateLimit.remainingRequests - 1
      });

      return {
        text: TelegramFormatter.toHTML(completion),
        tokens: tokens
      };
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorData = error.response?.data || errorMessage;
      
      logger.error('OpenRouter API Error', { 
        error: errorData,
        model_id: modelId,
        model_type: model.model_type,
        user_id: userId,
        user_plan: userPlan?.name || 'FREE',
        is_pro: isPro,
        status: error.response?.status,
        timeout: error.code === 'ECONNABORTED'
      });

      if (error.response?.status === 429) {
        throw new Error('AI xizmati band. Iltimos, bir oz kutib qayta urinib ko\'ring.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('So\'rov vaqti tugadi. Iltimos, qayta urinib ko\'ring.');
      } else if (error.response?.status >= 500) {
        throw new Error('AI xizmati vaqtincha ishlamayapti. Keyinroq qayta urinib ko\'ring.');
      } else {
        throw new Error('AI xizmati bilan bog\'lanishda xatolik yuz berdi.');
      }
    }
  }
};