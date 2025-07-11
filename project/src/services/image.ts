import axios from 'axios';
import { OPENROUTER_API_KEY } from '../config/constants.js';
import { proService } from './pro.js';
import { logger } from '../utils/logger.js';

export interface ImageGenerationResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export const imageService = {
  /**
   * Generate image using OpenRouter/DALL-E
   */
  async generateImage(prompt: string, userId: number): Promise<ImageGenerationResponse> {
    try {
      // Check usage limit
      const usageCheck = await proService.checkImageUsage(userId);
      if (!usageCheck.allowed) {
        const isPro = await proService.isUserPro(userId);
        return {
          success: false,
          error: `Oylik limit tugagan! ${isPro ? 'PRO' : 'FREE'} foydalanuvchilar uchun limit: ${usageCheck.limit} rasm/oy. Qolgan: ${usageCheck.remaining}`
        };
      }

      logger.ai('Generating image', { 
        user_id: userId, 
        prompt_length: prompt.length,
        remaining_usage: usageCheck.remaining
      });

      // Call OpenRouter API for image generation
      const response = await axios.post(
        'https://openrouter.ai/api/v1/images/generations',
        {
          model: 'openai/dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard'
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'X-Title': 'Telegram AI Bot Image Generation'
          },
          timeout: 60000 // 60 second timeout for image generation
        }
      );

      const imageUrl = response.data.data[0]?.url;
      
      if (!imageUrl) {
        throw new Error('No image URL received from API');
      }

      // Increment usage
      await proService.incrementImageUsage(userId);

      logger.success('Image generated successfully', { 
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
          error: 'Rasm yaratish xizmati band. Iltimos, bir oz kutib qayta urinib ko\'ring.'
        };
      } else if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Rasm yaratish vaqti tugadi. Iltimos, qayta urinib ko\'ring.'
        };
      } else if (error.response?.status >= 500) {
        return {
          success: false,
          error: 'Rasm yaratish xizmati vaqtincha ishlamayapti. Keyinroq qayta urinib ko\'ring.'
        };
      } else {
        return {
          success: false,
          error: 'Rasm yaratishda xatolik yuz berdi. Iltimos, boshqa matn bilan urinib ko\'ring.'
        };
      }
    }
  },

  /**
   * Get image generation statistics for user
   */
  async getImageStats(userId: number): Promise<any> {
    try {
      const usageCheck = await proService.checkImageUsage(userId);
      const isPro = await proService.isUserPro(userId);

      return {
        current_usage: usageCheck.limit - usageCheck.remaining,
        remaining: usageCheck.remaining,
        limit: usageCheck.limit,
        is_pro: isPro,
        month_year: proService.getCurrentMonthYear()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting image stats', { error: errorMessage, user_id: userId });
      return {
        current_usage: 0,
        remaining: 0,
        limit: 0,
        is_pro: false,
        month_year: proService.getCurrentMonthYear()
      };
    }
  }
};