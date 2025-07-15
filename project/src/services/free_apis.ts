import axios from 'axios';
import { logger } from '../utils/logger.js';

export interface FreeAPIResponse {
  success: boolean;
  text?: string;
  error?: string;
  provider?: string;
  tokens?: number;
}

export const freeAPIsService = {
  /**
   * Get response from multiple free AI APIs
   */
  async getAIResponse(prompt: string, userId: number): Promise<FreeAPIResponse> {
    try {
      // Try APIs in order of preference (fastest first)
      const providers = [
        () => this.tryGroqAPI(prompt),
        () => this.tryTogetherAPI(prompt),
        () => this.tryHuggingFaceAPI(prompt),
        () => this.tryReplicateAPI(prompt),
        () => this.tryOllamaAPI(prompt)
      ];

      for (const provider of providers) {
        try {
          const response = await provider();
          if (response.success) {
            logger.success('Free API response received', { 
              provider: response.provider,
              user_id: userId,
              text_length: response.text?.length || 0
            });
            return response;
          }
        } catch (error) {
          logger.warning('Free API provider failed', { 
            provider: provider.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return {
        success: false,
        error: 'Barcha tekin API lardan javob olib bo\'lmadi'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Free APIs service error', { error: errorMessage, user_id: userId });
      return {
        success: false,
        error: 'API xizmatida xatolik yuz berdi'
      };
    }
  },

  /**
   * Try Groq API (fastest free API)
   */
  async tryGroqAPI(prompt: string): Promise<FreeAPIResponse> {
    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-8b-8192',
          messages: [
            { role: 'system', content: 'Siz foydali AI yordamchisiz. O\'zbek tilida javob bering.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1000,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY || 'gsk_demo_key'}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const completion = response.data.choices[0].message.content;
      const tokens = response.data.usage?.total_tokens || 100;

      return {
        success: true,
        text: completion,
        provider: 'Groq',
        tokens
      };
    } catch (error) {
      return {
        success: false,
        error: 'Groq API ishlamayapti',
        provider: 'Groq'
      };
    }
  },

  /**
   * Try Together AI API (free tier)
   */
  async tryTogetherAPI(prompt: string): Promise<FreeAPIResponse> {
    try {
      const response = await axios.post(
        'https://api.together.xyz/v1/chat/completions',
        {
          model: 'meta-llama/Llama-3.2-3B-Instruct-Turbo',
          messages: [
            { role: 'system', content: 'Siz foydali AI yordamchisiz. O\'zbek tilida javob bering.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1000,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.TOGETHER_API_KEY || 'demo_key'}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const completion = response.data.choices[0].message.content;
      const tokens = response.data.usage?.total_tokens || 100;

      return {
        success: true,
        text: completion,
        provider: 'Together',
        tokens
      };
    } catch (error) {
      return {
        success: false,
        error: 'Together API ishlamayapti',
        provider: 'Together'
      };
    }
  },

  /**
   * Try Hugging Face API (free inference)
   */
  async tryHuggingFaceAPI(prompt: string): Promise<FreeAPIResponse> {
    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large',
        {
          inputs: prompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7,
            do_sample: true,
            return_full_text: false
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY || 'hf_demo_key'}`,
            'Content-Type': 'application/json'
          },
          timeout: 20000
        }
      );

      const completion = response.data[0]?.generated_text || 'Javob olinmadi';
      const tokens = Math.floor(completion.length / 4);

      return {
        success: true,
        text: completion,
        provider: 'Hugging Face',
        tokens
      };
    } catch (error) {
      return {
        success: false,
        error: 'Hugging Face API ishlamayapti',
        provider: 'Hugging Face'
      };
    }
  },

  /**
   * Try Replicate API (free tier)
   */
  async tryReplicateAPI(prompt: string): Promise<FreeAPIResponse> {
    try {
      const response = await axios.post(
        'https://api.replicate.com/v1/predictions',
        {
          version: 'meta/llama-2-7b-chat',
          input: {
            prompt: prompt,
            max_new_tokens: 500,
            temperature: 0.7
          }
        },
        {
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_KEY || 'demo_key'}`,
            'Content-Type': 'application/json'
          },
          timeout: 25000
        }
      );

      // Replicate uses async processing, need to poll for result
      const predictionId = response.data.id;
      
      // Wait for completion (simplified)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const resultResponse = await axios.get(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_KEY || 'demo_key'}`
          }
        }
      );

      const completion = resultResponse.data.output || 'Javob olinmadi';
      const tokens = Math.floor(completion.length / 4);

      return {
        success: true,
        text: completion,
        provider: 'Replicate',
        tokens
      };
    } catch (error) {
      return {
        success: false,
        error: 'Replicate API ishlamayapti',
        provider: 'Replicate'
      };
    }
  },

  /**
   * Try Ollama API (local/free)
   */
  async tryOllamaAPI(prompt: string): Promise<FreeAPIResponse> {
    try {
      const response = await axios.post(
        'http://localhost:11434/api/generate',
        {
          model: 'llama3.2:3b',
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            max_tokens: 1000
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const completion = response.data.response || 'Javob olinmadi';
      const tokens = Math.floor(completion.length / 4);

      return {
        success: true,
        text: completion,
        provider: 'Ollama',
        tokens
      };
    } catch (error) {
      return {
        success: false,
        error: 'Ollama API ishlamayapti (local)',
        provider: 'Ollama'
      };
    }
  },

  /**
   * Get image from free APIs
   */
  async generateImageFree(prompt: string): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    try {
      // Try free image generation APIs
      const imageProviders = [
        () => this.tryPollinationsAPI(prompt),
        () => this.tryStableDiffusionAPI(prompt),
        () => this.tryHuggingFaceImageAPI(prompt)
      ];

      for (const provider of imageProviders) {
        try {
          const response = await provider();
          if (response.success) {
            return response;
          }
        } catch (error) {
          logger.warning('Free image API provider failed', { 
            provider: provider.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return {
        success: false,
        error: 'Barcha tekin rasm API lardan javob olib bo\'lmadi'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Rasm yaratish API xizmatida xatolik'
      };
    }
  },

  /**
   * Try Pollinations API (100% free)
   */
  async tryPollinationsAPI(prompt: string): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    try {
      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&seed=${seed}&enhance=true`;
      
      // Test if image is accessible
      const testResponse = await axios.head(imageUrl, { timeout: 5000 });
      if (testResponse.status === 200) {
        return {
          success: true,
          imageUrl
        };
      }

      return {
        success: false,
        error: 'Pollinations API javob bermadi'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Pollinations API ishlamayapti'
      };
    }
  },

  /**
   * Try Stable Diffusion API (free tier)
   */
  async tryStableDiffusionAPI(prompt: string): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1',
        {
          inputs: prompt
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY || 'hf_demo_key'}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer',
          timeout: 30000
        }
      );

      const imageBuffer = Buffer.from(response.data);
      const imageBase64 = imageBuffer.toString('base64');
      const imageUrl = `data:image/png;base64,${imageBase64}`;

      return {
        success: true,
        imageUrl
      };
    } catch (error) {
      return {
        success: false,
        error: 'Stable Diffusion API ishlamayapti'
      };
    }
  },

  /**
   * Try Hugging Face Image API
   */
  async tryHuggingFaceImageAPI(prompt: string): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5',
        {
          inputs: prompt
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY || 'hf_demo_key'}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer',
          timeout: 30000
        }
      );

      const imageBuffer = Buffer.from(response.data);
      const imageBase64 = imageBuffer.toString('base64');
      const imageUrl = `data:image/png;base64,${imageBase64}`;

      return {
        success: true,
        imageUrl
      };
    } catch (error) {
      return {
        success: false,
        error: 'Hugging Face Image API ishlamayapti'
      };
    }
  },

  /**
   * Get TTS from free APIs
   */
  async generateTTSFree(text: string): Promise<{ success: boolean; audioBuffer?: Buffer; error?: string }> {
    try {
      const ttsProviders = [
        () => this.tryGTTSAPI(text),
        () => this.tryVoiceRSSAPI(text),
        () => this.tryMicrosoftTTSAPI(text)
      ];

      for (const provider of ttsProviders) {
        try {
          const response = await provider();
          if (response.success) {
            return response;
          }
        } catch (error) {
          logger.warning('Free TTS API provider failed', { 
            provider: provider.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return {
        success: false,
        error: 'Barcha tekin TTS API lardan javob olib bo\'lmadi'
      };
    } catch (error) {
      return {
        success: false,
        error: 'TTS API xizmatida xatolik'
      };
    }
  },

  /**
   * Try Google TTS API (free tier)
   */
  async tryGTTSAPI(text: string): Promise<{ success: boolean; audioBuffer?: Buffer; error?: string }> {
    try {
      // This would use Google Cloud TTS free tier
      const response = await axios.post(
        'https://texttospeech.googleapis.com/v1/text:synthesize',
        {
          input: { text: text },
          voice: { languageCode: 'en-US', name: 'en-US-Wavenet-D' },
          audioConfig: { audioEncoding: 'MP3' }
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.GOOGLE_TTS_API_KEY || 'demo_key'}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const audioBuffer = Buffer.from(response.data.audioContent, 'base64');
      return {
        success: true,
        audioBuffer
      };
    } catch (error) {
      return {
        success: false,
        error: 'Google TTS API ishlamayapti'
      };
    }
  },

  /**
   * Try VoiceRSS API (free tier)
   */
  async tryVoiceRSSAPI(text: string): Promise<{ success: boolean; audioBuffer?: Buffer; error?: string }> {
    try {
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

      const audioBuffer = Buffer.from(response.data);
      return {
        success: true,
        audioBuffer
      };
    } catch (error) {
      return {
        success: false,
        error: 'VoiceRSS API ishlamayapti'
      };
    }
  },

  /**
   * Try Microsoft TTS API (free tier)
   */
  async tryMicrosoftTTSAPI(text: string): Promise<{ success: boolean; audioBuffer?: Buffer; error?: string }> {
    try {
      // This would use Microsoft Cognitive Services TTS free tier
      const response = await axios.post(
        'https://eastus.tts.speech.microsoft.com/cognitiveservices/v1',
        `<speak version='1.0' xml:lang='en-US'>
          <voice xml:lang='en-US' name='Microsoft Server Speech Text to Speech Voice (en-US, JennyNeural)'>
            ${text}
          </voice>
        </speak>`,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': process.env.MICROSOFT_TTS_API_KEY || 'demo_key',
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
          },
          responseType: 'arraybuffer',
          timeout: 15000
        }
      );

      const audioBuffer = Buffer.from(response.data);
      return {
        success: true,
        audioBuffer
      };
    } catch (error) {
      return {
        success: false,
        error: 'Microsoft TTS API ishlamayapti'
      };
    }
  }
};