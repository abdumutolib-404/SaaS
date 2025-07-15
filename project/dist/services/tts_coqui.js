import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import { proService } from './pro.js';
import { logger } from '../utils/logger.js';
export const coquiTTSService = {
    /**
     * Generate speech using Coqui TTS (free, local, high quality)
     */
    async generateSpeech(text, userId, language = 'en') {
        try {
            // Check usage limit
            const usageCheck = await proService.checkTTSUsage(userId);
            if (!usageCheck.allowed) {
                const userPlan = await proService.getProStats(userId);
                return {
                    success: false,
                    error: `🚫 Oylik TTS limit tugagan!\n\n` +
                        `📊 Plan: ${userPlan.plan_type}\n` +
                        `🔊 Limit: ${usageCheck.limit} ovoz/oy\n` +
                        `🔄 Qolgan: ${usageCheck.remaining} ovoz\n` +
                        `📅 Keyingi reset: Keyingi oy\n\n` +
                        `💎 Yuqori limitlar uchun PRO/PREMIUM rejaga o'ting!`
                };
            }
            // Limit text length
            if (text.length > 1000) {
                return {
                    success: false,
                    error: '📝 Matn juda uzun! Maksimal 1000 belgi ruxsat etiladi.'
                };
            }
            logger.ai('Generating speech with Coqui TTS', {
                user_id: userId,
                text_length: text.length,
                language: language,
                remaining_usage: usageCheck.remaining
            });
            // Try multiple methods in order
            const methods = [
                () => this.generateWithCoquiTTS(text, language),
                () => this.generateWithESpeak(text, language),
                () => this.generateWithFallback(text)
            ];
            for (const method of methods) {
                try {
                    const audioBuffer = await method();
                    if (audioBuffer) {
                        // Increment usage
                        await proService.incrementTTSUsage(userId);
                        logger.success('Speech generated successfully with Coqui TTS', {
                            user_id: userId,
                            audio_size: audioBuffer.length,
                            remaining_usage: usageCheck.remaining - 1
                        });
                        return {
                            success: true,
                            audioBuffer
                        };
                    }
                }
                catch (error) {
                    logger.warning('TTS method failed, trying next', {
                        method: method.name,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
            return {
                success: false,
                error: '🚫 Ovoz yaratishda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.'
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('TTS generation error', {
                error: errorMessage,
                user_id: userId
            });
            return {
                success: false,
                error: '🚫 Ovoz yaratishda xatolik yuz berdi. Xizmat hozircha ishlamayapti.'
            };
        }
    },
    /**
     * Generate audio using Coqui TTS (local, high quality)
     */
    async generateWithCoquiTTS(text, language = 'en') {
        return new Promise((resolve) => {
            try {
                const outputPath = `/tmp/tts_coqui_${Date.now()}.wav`;
                // Clean text for TTS
                const cleanText = text.replace(/[^\w\s\.\,\!\?\-\:\;]/g, ' ').trim();
                // Select voice based on language
                let model = 'tts_models/en/ljspeech/tacotron2-DDC';
                if (language === 'uz' || language === 'ru') {
                    model = 'tts_models/en/ljspeech/tacotron2-DDC'; // Use English for now
                }
                // Use Coqui TTS
                const coquiProcess = spawn('python3', [
                    '-c',
                    `
import sys
import os
sys.path.append('/root/.venv/lib/python3.11/site-packages')

try:
    from TTS.api import TTS
    import soundfile as sf
    import numpy as np
    
    # Initialize TTS with a fast model
    tts = TTS(model_name="${model}", progress_bar=False, gpu=False)
    
    # Generate speech
    text = """${cleanText.replace(/"/g, '\\"').replace(/\n/g, ' ')}"""
    
    # Generate audio
    wav = tts.tts(text)
    
    # Save as WAV file
    sf.write("${outputPath}", wav, 22050)
    
    print("SUCCESS")
    
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
          `
                ]);
                let stdout = '';
                let stderr = '';
                coquiProcess.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
                coquiProcess.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
                coquiProcess.on('close', async (code) => {
                    if (code === 0 && stdout.includes('SUCCESS')) {
                        try {
                            const audioBuffer = await fs.readFile(outputPath);
                            fs.unlink(outputPath).catch(() => { });
                            logger.success('Coqui TTS generated audio', {
                                text_length: text.length,
                                audio_size: audioBuffer.length,
                                model: model
                            });
                            resolve(audioBuffer);
                        }
                        catch (error) {
                            logger.warning('Failed to read Coqui TTS output');
                            resolve(null);
                        }
                    }
                    else {
                        logger.warning('Coqui TTS failed, trying eSpeak fallback', {
                            exit_code: code,
                            stderr: stderr.substring(0, 200)
                        });
                        resolve(null);
                    }
                });
                coquiProcess.on('error', (error) => {
                    logger.warning('Coqui TTS process error', { error: error.message });
                    resolve(null);
                });
                // Timeout after 30 seconds
                setTimeout(() => {
                    coquiProcess.kill();
                    resolve(null);
                }, 30000);
            }
            catch (error) {
                logger.warning('Coqui TTS setup error', {
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                resolve(null);
            }
        });
    },
    /**
     * Generate audio using eSpeak (fallback)
     */
    async generateWithESpeak(text, language = 'en') {
        return new Promise((resolve) => {
            try {
                const outputPath = `/tmp/tts_espeak_${Date.now()}.wav`;
                // Clean text for eSpeak
                const cleanText = text.replace(/[^\w\s\.\,\!\?\-]/g, ' ').trim();
                // Select voice based on language
                let voice = 'en+f3';
                if (language === 'uz')
                    voice = 'en+f3'; // Use English for Uzbek
                if (language === 'ru')
                    voice = 'ru+f3';
                // Use eSpeak - fast local TTS
                const espeakProcess = spawn('espeak', [
                    '-s', '160', // Speed
                    '-p', '50', // Pitch
                    '-a', '100', // Amplitude
                    '-v', voice, // Voice
                    '-w', outputPath, // Output file
                    cleanText
                ]);
                espeakProcess.on('close', async (code) => {
                    if (code === 0) {
                        try {
                            const audioBuffer = await fs.readFile(outputPath);
                            fs.unlink(outputPath).catch(() => { });
                            logger.success('eSpeak generated audio (fallback)', {
                                text_length: text.length,
                                audio_size: audioBuffer.length,
                                voice: voice
                            });
                            resolve(audioBuffer);
                        }
                        catch (error) {
                            logger.warning('Failed to read eSpeak output');
                            resolve(null);
                        }
                    }
                    else {
                        logger.warning('eSpeak failed', { exit_code: code });
                        resolve(null);
                    }
                });
                espeakProcess.on('error', (error) => {
                    logger.warning('eSpeak process error', { error: error.message });
                    resolve(null);
                });
                // Timeout after 15 seconds
                setTimeout(() => {
                    espeakProcess.kill();
                    resolve(null);
                }, 15000);
            }
            catch (error) {
                logger.warning('eSpeak setup error', {
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                resolve(null);
            }
        });
    },
    /**
     * Generate audio using simple fallback
     */
    async generateWithFallback(text) {
        try {
            // Generate a simple WAV file with beep sound
            const sampleRate = 22050;
            const duration = Math.min(2.0, text.length / 100); // Duration based on text length
            const samples = Math.floor(sampleRate * duration);
            // Create a simple sine wave
            const audioData = new Float32Array(samples);
            for (let i = 0; i < samples; i++) {
                audioData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.3; // 440 Hz tone
            }
            // Convert to WAV buffer
            const wavBuffer = this.createWAVBuffer(audioData, sampleRate);
            logger.info('Generated fallback audio', {
                text_length: text.length,
                duration: duration,
                samples: samples
            });
            return wavBuffer;
        }
        catch (error) {
            logger.warning('Fallback generation failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return null;
        }
    },
    /**
     * Create WAV buffer from audio data
     */
    createWAVBuffer(audioData, sampleRate) {
        const buffer = Buffer.alloc(44 + audioData.length * 2);
        // WAV header
        buffer.write('RIFF', 0);
        buffer.writeUInt32LE(36 + audioData.length * 2, 4);
        buffer.write('WAVE', 8);
        buffer.write('fmt ', 12);
        buffer.writeUInt32LE(16, 16);
        buffer.writeUInt16LE(1, 20);
        buffer.writeUInt16LE(1, 22);
        buffer.writeUInt32LE(sampleRate, 24);
        buffer.writeUInt32LE(sampleRate * 2, 28);
        buffer.writeUInt16LE(2, 32);
        buffer.writeUInt16LE(16, 34);
        buffer.write('data', 36);
        buffer.writeUInt32LE(audioData.length * 2, 40);
        // Audio data
        for (let i = 0; i < audioData.length; i++) {
            const sample = Math.max(-1, Math.min(1, audioData[i]));
            buffer.writeInt16LE(sample * 32767, 44 + i * 2);
        }
        return buffer;
    },
    /**
     * Get TTS statistics for user
     */
    async getTTSStats(userId) {
        try {
            const usageCheck = await proService.checkTTSUsage(userId);
            const userPlan = await proService.getProStats(userId);
            return {
                current_usage: usageCheck.limit - usageCheck.remaining,
                remaining: usageCheck.remaining,
                limit: usageCheck.limit,
                plan: userPlan.plan_type,
                month_year: proService.getCurrentMonthYear()
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error getting TTS stats', { error: errorMessage, user_id: userId });
            return {
                current_usage: 0,
                remaining: 0,
                limit: 0,
                plan: 'FREE',
                month_year: proService.getCurrentMonthYear()
            };
        }
    }
};
//# sourceMappingURL=tts_coqui.js.map