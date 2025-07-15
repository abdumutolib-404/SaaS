export interface TTSResponse {
    success: boolean;
    audioUrl?: string;
    audioBuffer?: Buffer;
    error?: string;
}
export declare const ttsService: {
    /**
     * Generate speech using gTTS
     */
    generateSpeech(text: string, userId: number): Promise<TTSResponse>;
    /**
     * Generate audio using gTTS (Google Text-to-Speech)
     */
    generateWithGTTS(text: string): Promise<Buffer | null>;
    /**
     * Get TTS statistics for user
     */
    getTTSStats(userId: number): Promise<any>;
};
