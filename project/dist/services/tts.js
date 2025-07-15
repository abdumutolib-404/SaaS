import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { proService } from './pro.js';
import { logger } from '../utils/logger.js';
export const ttsService = {
    /**
     * Generate speech using gTTS
     */
    async generateSpeech(text, userId) {
        try {
            // Check usage limit
            const usageCheck = await proService.checkTTSUsage(userId);
            if (!usageCheck.allowed) {
                const isPro = await proService.isUserPro(userId);
                return {
                    success: false,
                    error: `Oylik limit tugagan! ${isPro ? 'PRO' : 'FREE'} foydalanuvchilar uchun limit: ${usageCheck.limit} ovoz/oy. Qolgan: ${usageCheck.remaining}`
                };
            }
            // Limit text length
            if (text.length > 1000) {
                return {
                    success: false,
                    error: 'Matn juda uzun! Maksimal 1000 belgi ruxsat etiladi.'
                };
            }
            logger.ai('Generating speech with gTTS', {
                user_id: userId,
                text_length: text.length,
                remaining_usage: usageCheck.remaining
            });
            // Generate audio using gTTS
            const audioBuffer = await this.generateWithGTTS(text);
            if (audioBuffer) {
                // Increment usage
                await proService.incrementTTSUsage(userId);
                logger.success('Speech generated successfully', {
                    user_id: userId,
                    audio_size: audioBuffer.length,
                    remaining_usage: usageCheck.remaining - 1
                });
                return {
                    success: true,
                    audioBuffer
                };
            }
            else {
                return {
                    success: false,
                    error: 'Ovoz yaratishda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.'
                };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('TTS generation error', {
                error: errorMessage,
                user_id: userId
            });
            return {
                success: false,
                error: 'Ovoz yaratishda xatolik yuz berdi. Xizmat hozircha ishlamayapti.'
            };
        }
    },
    /**
     * Generate audio using gTTS (Google Text-to-Speech)
     */
    async generateWithGTTS(text) {
        return new Promise((resolve) => {
            try {
                const outputPath = `/tmp/tts_${Date.now()}.mp3`;
                // Use gTTS with Python
                const gttsProcess = spawn('python3', [
                    '-c',
                    `
import gtts
import sys
import os

try:
    text = """${text.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"""
    
    # Detect language - use Uzbek if contains Cyrillic, otherwise English
    if any(ord(char) > 127 for char in text):
        lang = 'uz'  # Uzbek
    else:
        lang = 'en'  # English
    
    tts = gtts.gTTS(text=text, lang=lang, slow=False)
    tts.save("${outputPath}")
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
          `
                ]);
                let stdout = '';
                let stderr = '';
                gttsProcess.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
                gttsProcess.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
                gttsProcess.on('close', async (code) => {
                    if (code === 0 && stdout.includes('SUCCESS')) {
                        try {
                            const audioBuffer = await fs.readFile(outputPath);
                            // Clean up temp file
                            fs.unlink(outputPath).catch(() => { });
                            logger.success('gTTS generated audio', {
                                text_length: text.length,
                                audio_size: audioBuffer.length
                            });
                            resolve(audioBuffer);
                        }
                        catch (error) {
                            logger.warning('Failed to read gTTS output');
                            resolve(null);
                        }
                    }
                    else {
                        logger.warning('gTTS failed', {
                            exit_code: code,
                            stderr: stderr.substring(0, 200),
                            stdout: stdout.substring(0, 100)
                        });
                        resolve(null);
                    }
                });
                gttsProcess.on('error', (error) => {
                    logger.warning('gTTS process error', {
                        error: error.message
                    });
                    resolve(null);
                });
                // Timeout after 30 seconds
                setTimeout(() => {
                    gttsProcess.kill();
                    logger.warning('gTTS timeout');
                    resolve(null);
                }, 30000);
            }
            catch (error) {
                logger.warning('gTTS setup error', {
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                resolve(null);
            }
        });
    },
    /**
     * Get TTS statistics for user
     */
    async getTTSStats(userId) {
        try {
            const usageCheck = await proService.checkTTSUsage(userId);
            const isPro = await proService.isUserPro(userId);
            return {
                current_usage: usageCheck.limit - usageCheck.remaining,
                remaining: usageCheck.remaining,
                limit: usageCheck.limit,
                is_pro: isPro,
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
                is_pro: false,
                month_year: proService.getCurrentMonthYear()
            };
        }
    }
};
//# sourceMappingURL=tts.js.map