export interface FreeAPIResponse {
    success: boolean;
    text?: string;
    error?: string;
    provider?: string;
    tokens?: number;
}
export declare const freeAPIsService: {
    /**
     * Get response from multiple free AI APIs
     */
    getAIResponse(prompt: string, userId: number): Promise<FreeAPIResponse>;
    /**
     * Try Groq API (fastest free API)
     */
    tryGroqAPI(prompt: string): Promise<FreeAPIResponse>;
    /**
     * Try Together AI API (free tier)
     */
    tryTogetherAPI(prompt: string): Promise<FreeAPIResponse>;
    /**
     * Try Hugging Face API (free inference)
     */
    tryHuggingFaceAPI(prompt: string): Promise<FreeAPIResponse>;
    /**
     * Try Replicate API (free tier)
     */
    tryReplicateAPI(prompt: string): Promise<FreeAPIResponse>;
    /**
     * Try Ollama API (local/free)
     */
    tryOllamaAPI(prompt: string): Promise<FreeAPIResponse>;
    /**
     * Get image from free APIs
     */
    generateImageFree(prompt: string): Promise<{
        success: boolean;
        imageUrl?: string;
        error?: string;
    }>;
    /**
     * Try Pollinations API (100% free)
     */
    tryPollinationsAPI(prompt: string): Promise<{
        success: boolean;
        imageUrl?: string;
        error?: string;
    }>;
    /**
     * Try Stable Diffusion API (free tier)
     */
    tryStableDiffusionAPI(prompt: string): Promise<{
        success: boolean;
        imageUrl?: string;
        error?: string;
    }>;
    /**
     * Try Hugging Face Image API
     */
    tryHuggingFaceImageAPI(prompt: string): Promise<{
        success: boolean;
        imageUrl?: string;
        error?: string;
    }>;
    /**
     * Get TTS from free APIs
     */
    generateTTSFree(text: string): Promise<{
        success: boolean;
        audioBuffer?: Buffer;
        error?: string;
    }>;
    /**
     * Try Google TTS API (free tier)
     */
    tryGTTSAPI(text: string): Promise<{
        success: boolean;
        audioBuffer?: Buffer;
        error?: string;
    }>;
    /**
     * Try VoiceRSS API (free tier)
     */
    tryVoiceRSSAPI(text: string): Promise<{
        success: boolean;
        audioBuffer?: Buffer;
        error?: string;
    }>;
    /**
     * Try Microsoft TTS API (free tier)
     */
    tryMicrosoftTTSAPI(text: string): Promise<{
        success: boolean;
        audioBuffer?: Buffer;
        error?: string;
    }>;
};
