export interface TTSResponse {
    success: boolean;
    audioUrl?: string;
    audioBuffer?: Buffer;
    error?: string;
}
export declare const coquiTTSService: {
    /**
     * Generate speech using Coqui TTS (free, local, high quality)
     */
    generateSpeech(text: string, userId: number, language?: string): Promise<TTSResponse>;
    /**
     * Generate audio using Coqui TTS (local, high quality)
     */
    generateWithCoquiTTS(text: string, language?: string): Promise<Buffer | null>;
    /**
     * Generate audio using eSpeak (fallback)
     */
    generateWithESpeak(text: string, language?: string): Promise<Buffer | null>;
    /**
     * Generate audio using simple fallback
     */
    generateWithFallback(text: string): Promise<Buffer | null>;
    /**
     * Create WAV buffer from audio data
     */
    createWAVBuffer(audioData: Float32Array, sampleRate: number): Buffer;
    /**
     * Get TTS statistics for user
     */
    getTTSStats(userId: number): Promise<any>;
};
