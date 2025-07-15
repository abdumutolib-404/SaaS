export interface STTResponse {
    success: boolean;
    text?: string;
    error?: string;
}
export declare const voskSTTService: {
    /**
     * Convert speech to text using Vosk STT (free, local, multilingual)
     */
    convertSpeechToText(audioBuffer: Buffer, userId: number, language?: string): Promise<STTResponse>;
    /**
     * Convert audio using Vosk STT (local, multilingual)
     */
    convertWithVosk(audioBuffer: Buffer, language?: string): Promise<string | null>;
    /**
     * Convert audio using simple STT method
     */
    convertWithSimpleSTT(audioBuffer: Buffer): Promise<string | null>;
    /**
     * Convert audio using fallback method
     */
    convertWithFallback(audioBuffer: Buffer): Promise<string | null>;
    /**
     * Get STT statistics for user
     */
    getSTTStats(userId: number): Promise<any>;
};
