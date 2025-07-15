export interface TTSResponse {
    success: boolean;
    audioUrl?: string;
    audioBuffer?: Buffer;
    error?: string;
}
export declare const ttsService: {
    /**
     * Generate speech using multiple FREE methods
     */
    generateSpeech(text: string, userId: number): Promise<TTSResponse>;
    /**
     * Generate audio using eSpeak (local, fast, free)
     */
    generateWithESpeak(text: string): Promise<Buffer | null>;
    /**
     * Generate audio using free online API
     */
    generateWithFreeAPI(text: string): Promise<Buffer | null>;
    /**
     * Generate audio using gTTS (Google Text-to-Speech)
     */
    generateWithGTTS(text: string): Promise<Buffer | null>;
    /**
     * Generate audio using simple fallback (beep sound)
     */
    generateWithFallback(text: string): Promise<Buffer | null>;
    /**
     * Get TTS statistics for user
     */
    getTTSStats(userId: number): Promise<any>;
};
