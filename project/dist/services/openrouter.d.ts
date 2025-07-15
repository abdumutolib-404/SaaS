import { OpenRouterResponse, User } from '../types/bot.js';
export declare const openRouterService: {
    /**
     * Generate response using free APIs first, fallback to OpenRouter
     */
    generateResponse(prompt: string, modelId: string, userId: number, user?: User): Promise<OpenRouterResponse>;
    /**
     * Generate response using free APIs (Groq, Hugging Face)
     */
    generateWithFreeAPI(prompt: string, modelId: string, userId: number, user?: User): Promise<OpenRouterResponse & {
        success: boolean;
    }>;
    /**
     * Try Groq API (fastest free API)
     */
    tryGroqAPI(prompt: string, modelId: string, userId: number, user?: User): Promise<OpenRouterResponse & {
        success: boolean;
    }>;
    /**
     * Try Hugging Face API
     */
    tryHuggingFaceAPI(prompt: string, modelId: string, userId: number, user?: User): Promise<OpenRouterResponse & {
        success: boolean;
    }>;
    /**
     * Generate response using OpenRouter (fallback)
     */
    generateWithOpenRouter(prompt: string, modelId: string, userId: number, user: User | undefined, model: any, userPlan: any, isPro: boolean, rateLimit: any): Promise<OpenRouterResponse>;
    /**
     * Create system message
     */
    createSystemMessage(user?: User): string;
};
