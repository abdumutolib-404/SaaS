export interface STTResponse {
    success: boolean;
    text?: string;
    error?: string;
}
export declare const sttService: {
    /**
     * Convert speech to text using Vosk
     */
    convertSpeechToText(audioBuffer: Buffer, userId: number): Promise<STTResponse>;
    /**
     * Convert audio using Vosk
     */
    convertWithVosk(audioBuffer: Buffer): Promise<string | null>;
    /**
     * Get STT statistics for user
     */
    getSTTStats(userId: number): Promise<any>;
};
