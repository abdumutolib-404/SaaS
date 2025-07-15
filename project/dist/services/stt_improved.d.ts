export interface STTResponse {
    success: boolean;
    text?: string;
    error?: string;
}
export declare const sttService: {
    /**
     * Convert speech to text using multiple FREE methods
     */
    convertSpeechToText(audioBuffer: Buffer, userId: number): Promise<STTResponse>;
    /**
     * Convert audio using Web Speech API emulation
     */
    convertWithWeb(audioBuffer: Buffer): Promise<string | null>;
    /**
     * Convert audio using Vosk (offline)
     */
    convertWithVosk(audioBuffer: Buffer): Promise<string | null>;
    /**
     * Convert audio using simple fallback
     */
    convertWithFallback(audioBuffer: Buffer): Promise<string | null>;
    /**
     * Get STT statistics for user
     */
    getSTTStats(userId: number): Promise<any>;
};
