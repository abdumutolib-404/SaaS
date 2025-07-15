import axios from 'axios';
import { OPENROUTER_API_KEY } from '../config/constants.js';
import { OpenRouterResponse, User } from '../types/bot.js';
import { modelService } from './model.js';
import { rateLimitService } from './rateLimit.js';
import { proService } from './pro.js';
import { planService } from './plan.js';
import { TelegramFormatter } from '../utils/formatter.js';
import { logger } from '../utils/logger.js';

export const openRouterService = {
  /**
   * Generate response using free APIs first, fallback to OpenRouter
   */
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

    // Try free APIs first for FREE models
    if (model.model_type === 'FREE') {
      try {
        const freeResponse = await this.generateWithFreeAPI(prompt, modelId, userId, user);
        if (freeResponse.success) {
          return freeResponse;
        }
      } catch (error) {
        logger.warning('Free API failed, falling back to OpenRouter', { 
          user_id: userId, 
          model_id: modelId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Fallback to OpenRouter
    return await this.generateWithOpenRouter(prompt, modelId, userId, user, model, userPlan, isPro, rateLimit);
  },

  /**
   * Generate response using free APIs (Groq, Hugging Face)
   */
  async generateWithFreeAPI(
    prompt: string, 
    modelId: string, 
    userId: number,
    user?: User
  ): Promise<OpenRouterResponse & { success: boolean }> {
    try {
      // First try Groq API (very fast and free)
      const groqResponse = await this.tryGroqAPI(prompt, modelId, userId, user);
      if (groqResponse.success) {
        return groqResponse;
      }

      // Fallback to Hugging Face
      const hfResponse = await this.tryHuggingFaceAPI(prompt, modelId, userId, user);
      if (hfResponse.success) {
        return hfResponse;
      }

      return { success: false, text: '', tokens: 0 };
    } catch (error) {
      logger.error('Free API error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        user_id: userId
      });
      return { success: false, text: '', tokens: 0 };
    }
  },

  /**
   * Try Groq API (fastest free API)
   */
  async tryGroqAPI(
    prompt: string, 
    modelId: string, 
    userId: number,
    user?: User
  ): Promise<OpenRouterResponse & { success: boolean }> {
    try {
      const systemMessage = this.createSystemMessage(user);
      
      // Map model to Groq equivalent
      const groqModels = {
        'deepseek/deepseek-chat-v3-0324:free': 'llama3-8b-8192',
        'qwen/qwen3-32b:free': 'mixtral-8x7b-32768',
        'meta-llama/llama-3.3-70b-instruct:free': 'llama3-70b-8192',
        'mistralai/mistral-nemo:free': 'mixtral-8x7b-32768'
      };

      const groqModel = groqModels[modelId as keyof typeof groqModels] || 'llama3-8b-8192';

      logger.ai('Trying Groq API', { 
        user_id: userId, 
        model: groqModel,
        prompt_length: prompt.length
      });

      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: groqModel,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1000,
          temperature: 0.7,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY || 'gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const completion = response.data.choices[0].message.content;
      const tokens = response.data.usage?.total_tokens || 100;

      logger.success('Groq API response received', { 
        user_id: userId,
        model: groqModel,
        tokens,
        response_length: completion.length
      });

      return {
        success: true,
        text: TelegramFormatter.toHTML(completion),
        tokens
      };

    } catch (error: any) {
      logger.warning('Groq API failed', { 
        error: error.response?.data || error.message,
        user_id: userId
      });
      return { success: false, text: '', tokens: 0 };
    }
  },

  /**
   * Try Hugging Face API
   */
  async tryHuggingFaceAPI(
    prompt: string, 
    modelId: string, 
    userId: number,
    user?: User
  ): Promise<OpenRouterResponse & { success: boolean }> {
    try {
      const systemMessage = this.createSystemMessage(user);
      const fullPrompt = `${systemMessage}\n\nUser: ${prompt}\nAssistant:`;

      logger.ai('Trying Hugging Face API', { 
        user_id: userId,
        prompt_length: fullPrompt.length
      });

      const response = await axios.post(
        'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
        {
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7,
            do_sample: true,
            return_full_text: false
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY || 'hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const completion = response.data[0]?.generated_text || response.data.generated_text || 'Kechirasiz, javob berish imkonsiz.';
      const tokens = Math.floor(completion.length / 4); // Estimate tokens

      logger.success('Hugging Face API response received', { 
        user_id: userId,
        tokens,
        response_length: completion.length
      });

      return {
        success: true,
        text: TelegramFormatter.toHTML(completion),
        tokens
      };

    } catch (error: any) {
      logger.warning('Hugging Face API failed', { 
        error: error.response?.data || error.message,
        user_id: userId
      });
      return { success: false, text: '', tokens: 0 };
    }
  },

  /**
   * Generate response using OpenRouter (fallback)
   */
  async generateWithOpenRouter(
    prompt: string, 
    modelId: string, 
    userId: number,
    user: User | undefined,
    model: any,
    userPlan: any,
    isPro: boolean,
    rateLimit: any
  ): Promise<OpenRouterResponse> {
    try {
      const systemMessage = this.createSystemMessage(user);

      logger.ai('Using OpenRouter API', { 
        model: model.name, 
        model_type: model.model_type,
        user_id: userId, 
        user_plan: userPlan?.name || 'FREE',
        is_pro: isPro,
        prompt_length: prompt.length,
        max_tokens: Math.min(model.max_tokens, model.model_type === 'PRO' && !isPro ? 1000 : model.max_tokens),
        remaining_requests: rateLimit.remainingRequests
      });

      // PRO users get faster processing
      if (!isPro) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: modelId,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt }
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
          timeout: isPro ? 45000 : 30000
        }
      );

      const completion = response.data.choices[0].message.content;
      const tokens = response.data.usage?.total_tokens || 100;

      // Increment PRO model usage if applicable
      if (model.model_type === 'PRO' && !isPro) {
        await proService.incrementProModelUsage(userId, modelId);
      }

      logger.success('OpenRouter response received', { 
        user_id: userId, 
        model_type: model.model_type,
        user_plan: userPlan?.name || 'FREE',
        is_pro: isPro,
        tokens, 
        response_length: completion.length
      });

      return {
        text: TelegramFormatter.toHTML(completion),
        tokens
      };

    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorData = error.response?.data || errorMessage;
      
      logger.error('OpenRouter API Error', { 
        error: errorData,
        model_id: modelId,
        user_id: userId,
        status: error.response?.status
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
  },

  /**
   * Create system message
   */
  createSystemMessage(user?: User): string {
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

    return systemMessage;
  }
};