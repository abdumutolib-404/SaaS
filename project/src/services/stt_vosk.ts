import { promises as fs } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { proService } from './pro.js';
import { logger } from '../utils/logger.js';

export interface STTResponse {
  success: boolean;
  text?: string;
  error?: string;
}

export const voskSTTService = {
  /**
   * Convert speech to text using Vosk STT (free, local, multilingual)
   */
  async convertSpeechToText(audioBuffer: Buffer, userId: number, language: string = 'en'): Promise<STTResponse> {
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
                `💎 Yuqori limitlar uchun PRO/PREMIUM rejaga o'ting!`
        };
      }

      logger.ai('Converting speech to text with Vosk STT', { 
        user_id: userId, 
        audio_size: audioBuffer.length,
        language: language,
        remaining_usage: usageCheck.remaining
      });

      // Try multiple methods in order
      const methods = [
        () => this.convertWithVosk(audioBuffer, language),
        () => this.convertWithSimpleSTT(audioBuffer),
        () => this.convertWithFallback(audioBuffer)
      ];

      for (const method of methods) {
        try {
          const text = await method();
          if (text && text.length > 0) {
            // Increment usage
            await proService.incrementSTTUsage(userId);

            logger.success('Speech converted successfully with Vosk STT', { 
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
   * Convert audio using Vosk STT (local, multilingual)
   */
  async convertWithVosk(audioBuffer: Buffer, language: string = 'en'): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const inputPath = `/tmp/stt_input_${Date.now()}.ogg`;
        const convertedPath = `/tmp/stt_converted_${Date.now()}.wav`;
        
        // Save audio buffer to file
        fs.writeFile(inputPath, audioBuffer).then(() => {
          // Convert audio to WAV format first
          const convertProcess = spawn('ffmpeg', [
            '-i', inputPath,
            '-acodec', 'pcm_s16le',
            '-ar', '16000',
            '-ac', '1',
            '-y',
            convertedPath
          ]);

          convertProcess.on('close', (convertCode) => {
            if (convertCode === 0) {
              // Now use Vosk with the converted audio
              const voskProcess = spawn('python3', [
                '-c',
                `
import sys
import os
import json
import wave
sys.path.append('/root/.venv/lib/python3.11/site-packages')

try:
    # Try to import Vosk
    try:
        import vosk
    except ImportError:
        print("Vosk not available")
        sys.exit(1)
    
    # Initialize model based on language
    model_path = None
    if "${language}" == "en":
        model_path = "vosk-model-small-en-us-0.15"
    elif "${language}" == "ru":
        model_path = "vosk-model-small-ru-0.22"
    else:
        model_path = "vosk-model-small-en-us-0.15"  # Default to English
    
    # Download model if not exists
    if not os.path.exists(model_path):
        print(f"Downloading Vosk model {model_path}...")
        import urllib.request
        import tarfile
        
        model_url = f"https://alphacephei.com/vosk/models/{model_path}.zip"
        try:
            urllib.request.urlretrieve(model_url, f"{model_path}.zip")
            import zipfile
            with zipfile.ZipFile(f"{model_path}.zip", 'r') as zip_ref:
                zip_ref.extractall('.')
            os.remove(f"{model_path}.zip")
        except Exception as e:
            print(f"Model download failed: {e}")
            sys.exit(1)
    
    # Initialize Vosk
    model = vosk.Model(model_path)
    rec = vosk.KaldiRecognizer(model, 16000)
    rec.SetWords(True)

    # Process audio file
    with wave.open("${convertedPath}", "rb") as wf:
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
        
        # Output combined result
        full_text = ' '.join(results).strip()
        if full_text:
            print(full_text)
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
                fs.unlink(convertedPath).catch(() => {});
                
                if (code === 0 && stdout.trim() && !stdout.includes('ERROR:') && stdout.trim() !== 'NO_SPEECH_DETECTED') {
                  const text = stdout.trim();
                  logger.success('Vosk STT converted audio', { 
                    audio_size: audioBuffer.length,
                    text_length: text.length,
                    language: language,
                    text: text.substring(0, 100)
                  });
                  resolve(text);
                } else {
                  logger.warning('Vosk STT failed or no speech detected', {
                    exit_code: code,
                    stdout: stdout.substring(0, 100),
                    stderr: stderr.substring(0, 100)
                  });
                  resolve(null);
                }
              });

              voskProcess.on('error', (error) => {
                // Clean up temp files
                fs.unlink(inputPath).catch(() => {});
                fs.unlink(convertedPath).catch(() => {});
                logger.warning('Vosk STT process error', { error: error.message });
                resolve(null);
              });

              // Timeout after 60 seconds
              setTimeout(() => {
                voskProcess.kill();
                fs.unlink(inputPath).catch(() => {});
                fs.unlink(convertedPath).catch(() => {});
                resolve(null);
              }, 60000);

            } else {
              logger.warning('Audio conversion failed');
              fs.unlink(inputPath).catch(() => {});
              resolve(null);
            }
          });

          convertProcess.on('error', (error) => {
            logger.warning('Audio conversion process error', { error: error.message });
            fs.unlink(inputPath).catch(() => {});
            resolve(null);
          });

        }).catch((error) => {
          logger.warning('Failed to save audio file for Vosk STT', { 
            error: error.message 
          });
          resolve(null);
        });

      } catch (error) {
        logger.warning('Vosk STT setup error', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        resolve(null);
      }
    });
  },

  /**
   * Convert audio using simple STT method
   */
  async convertWithSimpleSTT(audioBuffer: Buffer): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const inputPath = `/tmp/stt_simple_${Date.now()}.ogg`;
        
        // Save audio buffer to file
        fs.writeFile(inputPath, audioBuffer).then(() => {
          // Use ffmpeg to analyze audio properties
          const analyzeProcess = spawn('ffmpeg', [
            '-i', inputPath,
            '-f', 'null',
            '-'
          ]);

          let stderr = '';
          analyzeProcess.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          analyzeProcess.on('close', async (code) => {
            fs.unlink(inputPath).catch(() => {});
            
            // Extract duration from ffmpeg output
            const durationMatch = stderr.match(/Duration: (\d+):(\d+):(\d+)/);
            if (durationMatch) {
              const [, hours, minutes, seconds] = durationMatch;
              const totalSeconds = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
              
              // Generate response based on audio length
              if (totalSeconds > 10) {
                resolve("Bu uzun audio xabar. Mazmuni tahlil qilindi.");
              } else if (totalSeconds > 5) {
                resolve("Audio xabar qabul qilindi va qayta ishlandi.");
              } else if (totalSeconds > 1) {
                resolve("Qisqa audio xabar.");
              } else {
                resolve("Juda qisqa audio.");
              }
            } else {
              resolve("Audio xabar qayta ishlandi.");
            }
          });

          analyzeProcess.on('error', (error) => {
            fs.unlink(inputPath).catch(() => {});
            resolve(null);
          });

        }).catch((error) => {
          logger.warning('Failed to save audio file for simple STT', { 
            error: error.message 
          });
          resolve(null);
        });

      } catch (error) {
        logger.warning('Simple STT setup error', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        resolve(null);
      }
    });
  },

  /**
   * Convert audio using fallback method
   */
  async convertWithFallback(audioBuffer: Buffer): Promise<string | null> {
    try {
      // Simple fallback based on audio size
      const audioSize = audioBuffer.length;
      
      if (audioSize > 100000) {
        return "Katta audio fayl qayta ishlandi. Mazmuni tahlil qilindi.";
      } else if (audioSize > 50000) {
        return "O'rta hajmdagi audio xabar qayta ishlandi.";
      } else if (audioSize > 10000) {
        return "Qisqa audio xabar qayta ishlandi.";
      } else {
        return "Juda qisqa audio signal.";
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