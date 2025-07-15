import { promises as fs } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { proService } from './pro.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';

export interface TTSResponse {
  success: boolean;
  audioUrl?: string;
  audioBuffer?: Buffer;
  error?: string;
}

export const ttsService = {
  /**
   * Generate speech using multiple FREE methods
   */
  async generateSpeech(text: string, userId: number): Promise<TTSResponse> {
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
                `💎 Yuqori limitlar uchun PRO/PREMIUM rejaga o'ting!\n` +
                `Admin: @abdulahadov_abdumutolib`
        };
      }

      // Limit text length
      if (text.length > 1000) {
        return {
          success: false,
          error: '📝 Matn juda uzun! Maksimal 1000 belgi ruxsat etiladi.'
        };
      }

      logger.ai('Generating speech with multiple methods', { 
        user_id: userId, 
        text_length: text.length,
        remaining_usage: usageCheck.remaining
      });

      // Try multiple methods in order
      const methods = [
        () => this.generateWithESpeak(text),
        () => this.generateWithFreeAPI(text),
        () => this.generateWithGTTS(text),
        () => this.generateWithFallback(text)
      ];

      for (const method of methods) {
        try {
          const audioBuffer = await method();
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
        } catch (error) {
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

    } catch (error: any) {
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
   * Generate audio using eSpeak (local, fast, free)
   */
  async generateWithESpeak(text: string): Promise<Buffer | null> {
    return new Promise((resolve) => {
      try {
        const outputPath = `/tmp/tts_espeak_${Date.now()}.wav`;
        
        // Clean text for eSpeak
        const cleanText = text.replace(/[^\w\s\.\,\!\?\-]/g, ' ').trim();
        
        // Use eSpeak - very fast local TTS
        const espeakProcess = spawn('espeak', [
          '-s', '150',           // Speed
          '-p', '50',            // Pitch
          '-a', '100',           // Amplitude
          '-v', 'en+f3',         // Voice (female)
          '-w', outputPath,      // Output file
          cleanText
        ]);

        espeakProcess.on('close', async (code) => {
          if (code === 0) {
            try {
              const audioBuffer = await fs.readFile(outputPath);
              fs.unlink(outputPath).catch(() => {});
              logger.success('eSpeak generated audio', { 
                text_length: text.length,
                audio_size: audioBuffer.length
              });
              resolve(audioBuffer);
            } catch (error) {
              logger.warning('Failed to read eSpeak output');
              resolve(null);
            }
          } else {
            logger.warning('eSpeak failed', { exit_code: code });
            resolve(null);
          }
        });

        espeakProcess.on('error', (error) => {
          logger.warning('eSpeak process error', { error: error.message });
          resolve(null);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          espeakProcess.kill();
          resolve(null);
        }, 10000);

      } catch (error) {
        logger.warning('eSpeak setup error', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        resolve(null);
      }
    });
  },

  /**
   * Generate audio using free online API
   */
  async generateWithFreeAPI(text: string): Promise<Buffer | null> {
    try {
      // Use a free TTS API
      const response = await axios.post(
        'https://api.voicerss.org/',
        null,
        {
          params: {
            key: process.env.VOICERSS_API_KEY || 'demo_key',
            src: text,
            hl: 'en-us',
            r: '0',
            c: 'mp3',
            f: '44khz_16bit_stereo'
          },
          responseType: 'arraybuffer',
          timeout: 15000
        }
      );

      if (response.data && response.data.byteLength > 1000) {
        const audioBuffer = Buffer.from(response.data);
        logger.success('Free API generated audio', { 
          text_length: text.length,
          audio_size: audioBuffer.length
        });
        return audioBuffer;
      }

      return null;
    } catch (error) {
      logger.warning('Free API TTS failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  },

  /**
   * Generate audio using gTTS (Google Text-to-Speech)
   */
  async generateWithGTTS(text: string): Promise<Buffer | null> {
    return new Promise((resolve) => {
      try {
        const outputPath = `/tmp/tts_gtts_${Date.now()}.mp3`;
        
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
              fs.unlink(outputPath).catch(() => {});
              logger.success('gTTS generated audio', { 
                text_length: text.length,
                audio_size: audioBuffer.length
              });
              resolve(audioBuffer);
            } catch (error) {
              logger.warning('Failed to read gTTS output');
              resolve(null);
            }
          } else {
            logger.warning('gTTS failed', { exit_code: code });
            resolve(null);
          }
        });

        gttsProcess.on('error', (error) => {
          logger.warning('gTTS process error', { error: error.message });
          resolve(null);
        });

        // Timeout after 20 seconds
        setTimeout(() => {
          gttsProcess.kill();
          resolve(null);
        }, 20000);

      } catch (error) {
        logger.warning('gTTS setup error', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        resolve(null);
      }
    });
  },

  /**
   * Generate audio using simple fallback (beep sound)
   */
  async generateWithFallback(text: string): Promise<Buffer | null> {
    try {
      // Generate a simple beep sound as fallback
      const beepBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x26, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6D, 0x74, 0x20,
        0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x44, 0xAC, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00,
        0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00
      ]);

      logger.info('Generated fallback beep sound', { text_length: text.length });
      return beepBuffer;
    } catch (error) {
      logger.warning('Fallback generation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  },

  /**
   * Get TTS statistics for user
   */
  async getTTSStats(userId: number): Promise<any> {
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
    } catch (error) {
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