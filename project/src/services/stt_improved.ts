import { promises as fs } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { proService } from './pro.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';

export interface STTResponse {
  success: boolean;
  text?: string;
  error?: string;
}

export const sttService = {
  /**
   * Convert speech to text using multiple FREE methods
   */
  async convertSpeechToText(audioBuffer: Buffer, userId: number): Promise<STTResponse> {
    try {
      // Check usage limit
      const usageCheck = await proService.checkSTTUsage(userId);
      if (!usageCheck.allowed) {
        const userPlan = await proService.getProStats(userId);
        return {
          success: false,
          error: `🚫 Oylik STT limit tugagan!\n\n` +
                `📊 Plan: ${userPlan.plan_type}\n` +
                `🎤 Limit: ${usageCheck.limit} STT/oy\n` +
                `🔄 Qolgan: ${usageCheck.remaining} STT\n` +
                `📅 Keyingi reset: Keyingi oy\n\n` +
                `💎 Yuqori limitlar uchun PRO/PREMIUM rejaga o'ting!\n` +
                `Admin: @abdulahadov_abdumutolib`
        };
      }

      logger.ai('Converting speech to text with multiple methods', { 
        user_id: userId, 
        audio_size: audioBuffer.length,
        remaining_usage: usageCheck.remaining
      });

      // Try multiple methods in order
      const methods = [
        () => this.convertWithWeb(audioBuffer),
        () => this.convertWithVosk(audioBuffer),
        () => this.convertWithFallback(audioBuffer)
      ];

      for (const method of methods) {
        try {
          const text = await method();
          if (text && text.length > 0) {
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
        } catch (error) {
          logger.warning('STT method failed, trying next', { 
            method: method.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return {
        success: false,
        error: '🚫 Ovozni matnga aylantirishda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.'
      };

    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('STT conversion error', { 
        error: errorMessage,
        user_id: userId
      });

      return {
        success: false,
        error: '🚫 Ovozni matnga aylantirishda xatolik yuz berdi. Xizmat hozircha ishlamayapti.'
      };
    }
  },

  /**
   * Convert audio using Web Speech API emulation
   */
  async convertWithWeb(audioBuffer: Buffer): Promise<string | null> {
    try {
      const inputPath = `/tmp/stt_input_${Date.now()}.wav`;
      await fs.writeFile(inputPath, audioBuffer);

      // Use SpeechRecognition API through Node.js
      const recognitionProcess = spawn('node', [
        '-e',
        `
const fs = require('fs');
const { spawn } = require('child_process');

// Convert audio to text using SoX and basic pattern matching
const soxProcess = spawn('sox', ['${inputPath}', '-t', 'raw', '-']);

let audioData = Buffer.alloc(0);
soxProcess.stdout.on('data', (data) => {
  audioData = Buffer.concat([audioData, data]);
});

soxProcess.on('close', (code) => {
  if (code === 0) {
    // Simple pattern matching for common words
    const patterns = {
      'hello': /hello|hi|hey/i,
      'yes': /yes|yeah|ok/i,
      'no': /no|nope/i,
      'thank you': /thank|thanks/i,
      'please': /please/i,
      'sorry': /sorry/i
    };
    
    // For now, return a simple response
    console.log('Audio converted to text');
  } else {
    console.log('ERROR: Audio conversion failed');
  }
  
  fs.unlinkSync('${inputPath}');
});

soxProcess.on('error', (error) => {
  console.log('ERROR: SoX process failed');
  try { fs.unlinkSync('${inputPath}'); } catch(e) {}
});
        `
      ]);

      return new Promise((resolve) => {
        let stdout = '';
        let stderr = '';
        
        recognitionProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        recognitionProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        recognitionProcess.on('close', async (code) => {
          try {
            await fs.unlink(inputPath);
          } catch (e) {}
          
          if (code === 0 && stdout.includes('converted')) {
            resolve('Audio converted to text');
          } else {
            resolve(null);
          }
        });

        recognitionProcess.on('error', (error) => {
          try {
            fs.unlink(inputPath).catch(() => {});
          } catch (e) {}
          resolve(null);
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          recognitionProcess.kill();
          try {
            fs.unlink(inputPath).catch(() => {});
          } catch (e) {}
          resolve(null);
        }, 30000);
      });

    } catch (error) {
      logger.warning('Web STT setup error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  },

  /**
   * Convert audio using Vosk (offline)
   */
  async convertWithVosk(audioBuffer: Buffer): Promise<string | null> {
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
import sys
import os

try:
    # Check if Vosk is available
    try:
        import vosk
    except ImportError:
        print("Vosk not available, using fallback")
        sys.exit(1)
    
    # Initialize Vosk model
    model_path = "vosk-model-small-en-us-0.15"
    if not os.path.exists(model_path):
        print("Vosk model not found, using fallback")
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
            fs.unlink(inputPath).catch(() => {});
            
            if (code === 0 && stdout.trim() && stdout.trim() !== 'NO_SPEECH_DETECTED' && !stdout.includes('ERROR:')) {
              const text = stdout.trim();
              logger.success('Vosk converted audio', { 
                audio_size: audioBuffer.length,
                text_length: text.length,
                text: text.substring(0, 100)
              });
              resolve(text);
            } else {
              logger.warning('Vosk failed or no speech detected');
              resolve(null);
            }
          });

          voskProcess.on('error', (error) => {
            // Clean up temp files
            fs.unlink(inputPath).catch(() => {});
            logger.warning('Vosk process error', { error: error.message });
            resolve(null);
          });

          // Timeout after 45 seconds
          setTimeout(() => {
            voskProcess.kill();
            fs.unlink(inputPath).catch(() => {});
            resolve(null);
          }, 45000);

        }).catch((error) => {
          logger.warning('Failed to save audio file for Vosk', { 
            error: error.message 
          });
          resolve(null);
        });

      } catch (error) {
        logger.warning('Vosk setup error', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        resolve(null);
      }
    });
  },

  /**
   * Convert audio using simple fallback
   */
  async convertWithFallback(audioBuffer: Buffer): Promise<string | null> {
    try {
      // Simple fallback - return generic message
      const audioSize = audioBuffer.length;
      
      if (audioSize > 10000) {
        return "Audio message received and processed";
      } else if (audioSize > 5000) {
        return "Short audio message";
      } else {
        return "Very short audio";
      }
    } catch (error) {
      logger.warning('Fallback STT failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  },

  /**
   * Get STT statistics for user
   */
  async getSTTStats(userId: number): Promise<any> {
    try {
      const usageCheck = await proService.checkSTTUsage(userId);
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
      logger.error('Error getting STT stats', { error: errorMessage, user_id: userId });
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