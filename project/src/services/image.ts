import axios from 'axios';
import { planService } from './plan.js';
import { logger } from '../utils/logger.js';

export interface ImageGenerationResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

// Image usage tracking
const imageUsageMap = new Map<string, number>();

export const imageService = {
  /**
   * Get current month year key
   */
  getCurrentMonthYear(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  },

  /**
   * Get image usage key
   */
  getUsageKey(userId: number): string {
    return `${userId}_${this.getCurrentMonthYear()}`;
  },

  /**
   * Check image usage limit
   */
  async checkImageUsage(userId: number): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    try {
      const userPlan = await planService.getUserPlan(userId);
      const plan = userPlan || { name: 'FREE', image_limit: 3 };
      
      let limit = 3; // Default FREE limit
      if (plan.name === 'PRO') limit = 10;
      else if (plan.name === 'PREMIUM') limit = 25;
      
      const usageKey = this.getUsageKey(userId);
      const currentUsage = imageUsageMap.get(usageKey) || 0;
      const remaining = Math.max(0, limit - currentUsage);
      
      return {
        allowed: remaining > 0,
        remaining,
        limit
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error checking image usage', { error: errorMessage, user_id: userId });
      return { allowed: false, remaining: 0, limit: 3 };
    }
  },

  /**
   * Increment image usage
   */
  async incrementImageUsage(userId: number): Promise<void> {
    const usageKey = this.getUsageKey(userId);
    const currentUsage = imageUsageMap.get(usageKey) || 0;
    imageUsageMap.set(usageKey, currentUsage + 1);
    
    logger.info('Image usage incremented', { 
      user_id: userId, 
      usage: currentUsage + 1,
      month: this.getCurrentMonthYear()
    });
  },

  /**
   * Generate image using DeepAI API (cheaper alternative)
   */
  async generateImage(prompt: string, userId: number): Promise<ImageGenerationResponse> {
    try {
      // Check usage limit
      const usageCheck = await this.checkImageUsage(userId);
      if (!usageCheck.allowed) {
        const userPlan = await planService.getUserPlan(userId);
        const planName = userPlan?.name || 'FREE';
        return {
          success: false,
          error: `🚫 Oylik limit tugagan!\n\n` +
                `📊 Plan: ${planName}\n` +
                `📷 Limit: ${usageCheck.limit} rasm/oy\n` +
                `🔄 Qolgan: ${usageCheck.remaining} rasm\n` +
                `📅 Keyingi reset: Keyingi oy\n\n` +
                `💎 Yuqori limitlar uchun PRO/PREMIUM rejaga o'ting!\n` +
                `Admin: @abdulahadov_abdumutolib`
        };
      }

      logger.ai('Generating image with DeepAI', { 
        user_id: userId, 
        prompt_length: prompt.length,
        remaining_usage: usageCheck.remaining
      });

      // Enhanced prompt for better results
      const enhancedPrompt = `${prompt}, high quality, detailed, professional, 8k resolution, vibrant colors`;

      // Call DeepAI API - much cheaper than OpenAI
      const response = await axios.post(
        'https://api.deepai.org/api/text2img',
        {
          text: enhancedPrompt,
          grid_size: "1",
          width: 512,
          height: 512,
          guidance_scale: 7.5,
          num_inference_steps: 20,
          seed: Math.floor(Math.random() * 999999)
        },
        {
          headers: {
            'Api-Key': process.env.DEEPAI_API_KEY || 'quickstart-QUdJIGlzIGNvbWluZy4uLi4K', // Free API key
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 second timeout
        }
      );

      const imageUrl = response.data.output_url;
      
      if (!imageUrl) {
        throw new Error('No image URL received from DeepAI API');
      }

      // Increment usage
      await this.incrementImageUsage(userId);

      logger.success('Image generated successfully with DeepAI', { 
        user_id: userId, 
        image_url: imageUrl.substring(0, 50) + '...',
        remaining_usage: usageCheck.remaining - 1
      });

      return {
        success: true,
        imageUrl
      };

    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorData = error.response?.data || errorMessage;
      
      logger.error('Image generation error', { 
        error: errorData,
        user_id: userId,
        status: error.response?.status,
        timeout: error.code === 'ECONNABORTED'
      });

      if (error.response?.status === 429) {
        return {
          success: false,
          error: '🚫 Rasm yaratish xizmati band. Iltimos, bir oz kutib qayta urinib ko\'ring.'
        };
      } else if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: '⏱️ Rasm yaratish vaqti tugadi. Iltimos, qayta urinib ko\'ring.'
        };
      } else if (error.response?.status >= 500) {
        return {
          success: false,
          error: '🔧 Rasm yaratish xizmati vaqtincha ishlamayapti. Keyinroq qayta urinib ko\'ring.'
        };
      } else {
        return {
          success: false,
          error: '❌ Rasm yaratishda xatolik yuz berdi. Iltimos, boshqa tavsif bilan urinib ko\'ring.'
        };
      }
    }
  },

  /**
   * Get image generation statistics for user
   */
  async getImageStats(userId: number): Promise<any> {
    try {
      const usageCheck = await this.checkImageUsage(userId);
      const userPlan = await planService.getUserPlan(userId);
      const planName = userPlan?.name || 'FREE';

      return {
        current_usage: usageCheck.limit - usageCheck.remaining,
        remaining: usageCheck.remaining,
        limit: usageCheck.limit,
        plan: planName,
        month_year: this.getCurrentMonthYear()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting image stats', { error: errorMessage, user_id: userId });
      return {
        current_usage: 0,
        remaining: 0,
        limit: 3,
        plan: 'FREE',
        month_year: this.getCurrentMonthYear()
      };
    }
  },

  /**
   * Alternative image generation using Stable Diffusion (fallback)
   */
  async generateImageStableDiffusion(prompt: string, userId: number): Promise<ImageGenerationResponse> {
    try {
      // Check usage limit first
      const usageCheck = await this.checkImageUsage(userId);
      if (!usageCheck.allowed) {
        return {
          success: false,
          error: `Oylik limit tugagan! Qolgan: ${usageCheck.remaining}/${usageCheck.limit}`
        };
      }

      const response = await axios.post(
        'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
        {
          text_prompts: [
            {
              text: prompt + ", high quality, detailed, professional",
              weight: 1
            }
          ],
          cfg_scale: 7,
          height: 512,
          width: 512,
          samples: 1,
          steps: 20,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 60000
        }
      );

      const imageBase64 = response.data.artifacts[0].base64;
      const imageUrl = `data:image/png;base64,${imageBase64}`;

      await this.incrementImageUsage(userId);

      return {
        success: true,
        imageUrl
      };

    } catch (error: any) {
      logger.error('Stable Diffusion API error', { 
        error: error.response?.data || error.message,
        user_id: userId
      });

      return {
        success: false,
        error: 'Stable Diffusion API xatolik yuz berdi.'
      };
    }
  }
};