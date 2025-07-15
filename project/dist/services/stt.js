import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { proService } from './pro.js';
import { logger } from '../utils/logger.js';
export const sttService = {
    /**
     * Convert speech to text using Vosk
     */
    async convertSpeechToText(audioBuffer, userId) {
        try {
            // Check usage limit
            const usageCheck = await proService.checkSTTUsage(userId);
            if (!usageCheck.allowed) {
                const isPro = await proService.isUserPro(userId);
                return {
                    success: false,
                    error: `Oylik limit tugagan! ${isPro ? 'PRO' : 'FREE'} foydalanuvchilar uchun limit: ${usageCheck.limit} STT/oy. Qolgan: ${usageCheck.remaining}`
                };
            }
            logger.ai('Converting speech to text with Vosk', {
                user_id: userId,
                audio_size: audioBuffer.length,
                remaining_usage: usageCheck.remaining
            });
            // Convert audio using Vosk
            const text = await this.convertWithVosk(audioBuffer);
            if (text) {
                // Increment usage
                await proService.incrementSTTUsage(userId);
                logger.success('Speech converted successfully', {
                    user_id: userId,
                    text_length: text.length,
                    remaining_usage: usageCheck.remaining - 1
                });
                return {
                    success: true,
                    text
                };
            }
            else {
                return {
                    success: false,
                    error: 'Ovozni matnga aylantirishda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.'
                };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('STT conversion error', {
                error: errorMessage,
                user_id: userId
            });
            return {
                success: false,
                error: 'Ovozni matnga aylantirishda xatolik yuz berdi. Xizmat hozircha ishlamayapti.'
            };
        }
    },
    /**
     * Convert audio using Vosk
     */
    async convertWithVosk(audioBuffer) {
        return new Promise((resolve) => {
            try {
                const inputPath = `/tmp/stt_input_${Date.now()}.wav`;
                // Save audio buffer to file
                fs.writeFile(inputPath, audioBuffer).then(() => {
                    // Use Vosk with Python
                    const voskProcess = spawn('python3', [
                        '-c',
                        `
import json
import wave
import vosk
import sys
import os

try:
    # Initialize Vosk model
    model_path = "vosk-model-small-en-us-0.15"
    if not os.path.exists(model_path):
        print("ERROR: Vosk model not found")
        sys.exit(1)
    
    model = vosk.Model(model_path)
    rec = vosk.KaldiRecognizer(model, 16000)

    # Open audio file
    wf = wave.open("${inputPath}", "rb")

    # Process audio
    results = []
    while True:
        data = wf.readframes(4000)
        if len(data) == 0:
            break
        if rec.AcceptWaveform(data):
            result = json.loads(rec.Result())
            if result.get('text'):
                results.append(result['text'])

    # Get final result
    final_result = json.loads(rec.FinalResult())
    if final_result.get('text'):
        results.append(final_result['text'])

    # Output result
    text = ' '.join(results).strip()
    if text:
        print(text)
    else:
        print("NO_SPEECH_DETECTED")
        
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
            `
                    ]);
                    let stdout = '';
                    let stderr = '';
                    voskProcess.stdout.on('data', (data) => {
                        stdout += data.toString();
                    });
                    voskProcess.stderr.on('data', (data) => {
                        stderr += data.toString();
                    });
                    voskProcess.on('close', async (code) => {
                        // Clean up temp files
                        fs.unlink(inputPath).catch(() => { });
                        if (code === 0 && stdout.trim() && stdout.trim() !== 'NO_SPEECH_DETECTED' && !stdout.includes('ERROR:')) {
                            const text = stdout.trim();
                            logger.success('Vosk converted audio', {
                                audio_size: audioBuffer.length,
                                text_length: text.length,
                                text: text.substring(0, 100)
                            });
                            resolve(text);
                        }
                        else {
                            logger.warning('Vosk failed or no speech detected', {
                                exit_code: code,
                                stderr: stderr.substring(0, 200),
                                stdout: stdout.substring(0, 100)
                            });
                            resolve(null);
                        }
                    });
                    voskProcess.on('error', (error) => {
                        // Clean up temp files
                        fs.unlink(inputPath).catch(() => { });
                        logger.warning('Vosk process error', {
                            error: error.message
                        });
                        resolve(null);
                    });
                    // Timeout after 60 seconds
                    setTimeout(() => {
                        voskProcess.kill();
                        fs.unlink(inputPath).catch(() => { });
                        logger.warning('Vosk timeout');
                        resolve(null);
                    }, 60000);
                }).catch((error) => {
                    logger.warning('Failed to save audio file for Vosk', {
                        error: error.message
                    });
                    resolve(null);
                });
            }
            catch (error) {
                logger.warning('Vosk setup error', {
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                resolve(null);
            }
        });
    },
    /**
     * Get STT statistics for user
     */
    async getSTTStats(userId) {
        try {
            const usageCheck = await proService.checkSTTUsage(userId);
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
            logger.error('Error getting STT stats', { error: errorMessage, user_id: userId });
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
//# sourceMappingURL=stt.js.map