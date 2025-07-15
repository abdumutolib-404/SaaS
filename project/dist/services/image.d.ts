export interface ImageGenerationResponse {
    success: boolean;
    imageUrl?: string;
    error?: string;
}
export declare const imageService: {
    /**
     * Get current month year key
     */
    getCurrentMonthYear(): string;
    /**
     * Get image usage key
     */
    getUsageKey(userId: number): string;
    /**
     * Check image usage limit
     */
    checkImageUsage(userId: number): Promise<{
        allowed: boolean;
        remaining: number;
        limit: number;
    }>;
    /**
     * Increment image usage
     */
    incrementImageUsage(userId: number): Promise<void>;
    /**
     * Generate image using Pollinations API (100% FREE)
     */
    generateImage(prompt: string, userId: number): Promise<ImageGenerationResponse>;
    /**
     * Fallback image generation using Hugging Face
     */
    generateImageFallback(prompt: string, userId: number): Promise<ImageGenerationResponse>;
    /**
     * Last resort placeholder image
     */
    generateImagePlaceholder(prompt: string, userId: number): Promise<ImageGenerationResponse>;
    /**
     * Get image generation statistics for user
     */
    getImageStats(userId: number): Promise<any>;
};
