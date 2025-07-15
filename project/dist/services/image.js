import axios from 'axios';
import { planService } from './plan.js';
import { logger } from '../utils/logger.js';
// Image usage tracking
const imageUsageMap = new Map();
export const imageService = {
    /**
     * Get current month year key
     */
    getCurrentMonthYear() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    },
    /**
     * Get image usage key
     */
    getUsageKey(userId) {
        return `${userId}_${this.getCurrentMonthYear()}`;
    },
    /**
     * Check image usage limit
     */
    async checkImageUsage(userId) {
        try {
            const userPlan = await planService.getUserPlan(userId);
            const plan = userPlan || { name: 'FREE', image_limit: 3 };
            let limit = 3; // Default FREE limit
            if (plan.name === 'PRO')
                limit = 10;
            else if (plan.name === 'PREMIUM')
                limit = 25;
            const usageKey = this.getUsageKey(userId);
            const currentUsage = imageUsageMap.get(usageKey) || 0;
            const remaining = Math.max(0, limit - currentUsage);
            return {
                allowed: remaining > 0,
                remaining,
                limit
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error checking image usage', { error: errorMessage, user_id: userId });
            return { allowed: false, remaining: 0, limit: 3 };
        }
    },
    /**
     * Increment image usage
     */
    async incrementImageUsage(userId) {
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
     * Generate image using Pollinations API (100% FREE)
     */
    async generateImage(prompt, userId) {
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
            logger.ai('Generating image with Pollinations API', {
                user_id: userId,
                prompt_length: prompt.length,
                remaining_usage: usageCheck.remaining
            });
            // Clean and enhance prompt
            const cleanPrompt = prompt.trim().replace(/[^a-zA-Z0-9\s,.-]/g, '');
            const enhancedPrompt = `${cleanPrompt}, high quality, detailed, professional, 8k, masterpiece`;
            // Pollinations API - 100% FREE and reliable
            const seed = Math.floor(Math.random() * 999999);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=512&height=512&seed=${seed}&enhance=true&model=flux`;
            // Test if image is accessible
            try {
                const testResponse = await axios.head(imageUrl, { timeout: 10000 });
                if (testResponse.status !== 200) {
                    throw new Error('Image not accessible');
                }
            }
            catch (testError) {
                logger.warning('Pollinations image test failed, trying fallback', { user_id: userId });
                return await this.generateImageFallback(prompt, userId);
            }
            // Increment usage
            await this.incrementImageUsage(userId);
            logger.success('Image generated successfully with Pollinations', {
                user_id: userId,
                image_url: imageUrl.substring(0, 80) + '...',
                remaining_usage: usageCheck.remaining - 1
            });
            return {
                success: true,
                imageUrl
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Primary image generation error', {
                error: errorMessage,
                user_id: userId
            });
            // Try fallback method
            return await this.generateImageFallback(prompt, userId);
        }
    },
    /**
     * Fallback image generation using Hugging Face
     */
    async generateImageFallback(prompt, userId) {
        try {
            logger.info('Using Hugging Face fallback for image generation', { user_id: userId });
            const response = await axios.post('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0', {
                inputs: `${prompt}, high quality, detailed, professional, 8k resolution`
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY || 'hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000,
                responseType: 'arraybuffer'
            });
            // Convert response to base64
            const imageBuffer = Buffer.from(response.data);
            const imageBase64 = imageBuffer.toString('base64');
            const imageUrl = `data:image/png;base64,${imageBase64}`;
            await this.incrementImageUsage(userId);
            logger.success('Image generated with Hugging Face fallback', {
                user_id: userId,
                image_size: imageBuffer.length
            });
            return {
                success: true,
                imageUrl
            };
        }
        catch (error) {
            logger.error('Fallback image generation failed', {
                error: error.message,
                user_id: userId
            });
            // Last resort: Placeholder service
            return await this.generateImagePlaceholder(prompt, userId);
        }
    },
    /**
     * Last resort placeholder image
     */
    async generateImagePlaceholder(prompt, userId) {
        try {
            const encodedPrompt = encodeURIComponent(prompt.substring(0, 50));
            const colors = ['4A90E2', 'F5A623', '7ED321', 'D0021B', '9013FE', '50E3C2'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            const imageUrl = `https://via.placeholder.com/512x512/${randomColor}/FFFFFF?text=${encodedPrompt}`;
            await this.incrementImageUsage(userId);
            logger.info('Generated placeholder image', {
                user_id: userId,
                image_url: imageUrl
            });
            return {
                success: true,
                imageUrl
            };
        }
        catch (error) {
            logger.error('Complete image generation failure', {
                error: error.message,
                user_id: userId
            });
            return {
                success: false,
                error: '❌ Rasm yaratishda xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko\'ring.'
            };
        }
    },
    /**
     * Get image generation statistics for user
     */
    async getImageStats(userId) {
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
        }
        catch (error) {
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
    }
};
//# sourceMappingURL=image.js.map