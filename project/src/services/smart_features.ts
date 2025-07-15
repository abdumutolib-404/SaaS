import { database } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { userService } from './user.js';

export interface SmartSuggestion {
  id: string;
  type: 'quick_reply' | 'command' | 'topic';
  content: string;
  confidence: number;
  usage_count: number;
}

export interface UserPreference {
  user_id: number;
  preference_type: string;
  preference_value: string;
  confidence: number;
  created_at: Date;
  updated_at: Date;
}

export const smartFeaturesService = {
  /**
   * Get smart suggestions based on user's message
   */
  async getSmartSuggestions(userId: number, currentMessage: string): Promise<SmartSuggestion[]> {
    try {
      const suggestions: SmartSuggestion[] = [];
      
      // Quick reply suggestions
      const quickReplies = this.getQuickReplies(currentMessage);
      suggestions.push(...quickReplies);

      // Command suggestions
      const commands = this.getCommandSuggestions(currentMessage);
      suggestions.push(...commands);

      // Topic suggestions based on user history
      const topics = await this.getTopicSuggestions(userId, currentMessage);
      suggestions.push(...topics);

      // Sort by confidence and usage
      return suggestions
        .sort((a, b) => b.confidence - a.confidence || b.usage_count - a.usage_count)
        .slice(0, 5);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting smart suggestions', { error: errorMessage, user_id: userId });
      return [];
    }
  },

  /**
   * Get quick reply suggestions
   */
  getQuickReplies(message: string): SmartSuggestion[] {
    const lowerMessage = message.toLowerCase();
    const quickReplies: SmartSuggestion[] = [];

    // Greeting responses
    if (lowerMessage.includes('salom') || lowerMessage.includes('hello')) {
      quickReplies.push({
        id: 'greeting_1',
        type: 'quick_reply',
        content: 'Salom! Qanday yordam bera olaman?',
        confidence: 0.9,
        usage_count: 100
      });
    }

    // Question responses
    if (lowerMessage.includes('?') || lowerMessage.includes('nima')) {
      quickReplies.push({
        id: 'question_1',
        type: 'quick_reply',
        content: 'Sizning savolingiz juda qiziq! Davom eting...',
        confidence: 0.8,
        usage_count: 80
      });
    }

    // Help responses
    if (lowerMessage.includes('yordam') || lowerMessage.includes('help')) {
      quickReplies.push({
        id: 'help_1',
        type: 'quick_reply',
        content: 'Albatta yordam beraman! Qanday masala bor?',
        confidence: 0.85,
        usage_count: 90
      });
    }

    // Thanks responses
    if (lowerMessage.includes('rahmat') || lowerMessage.includes('thank')) {
      quickReplies.push({
        id: 'thanks_1',
        type: 'quick_reply',
        content: 'Arzimaydi! Boshqa savollaringiz bormi?',
        confidence: 0.9,
        usage_count: 95
      });
    }

    return quickReplies;
  },

  /**
   * Get command suggestions
   */
  getCommandSuggestions(message: string): SmartSuggestion[] {
    const lowerMessage = message.toLowerCase();
    const commands: SmartSuggestion[] = [];

    // Model related
    if (lowerMessage.includes('model') || lowerMessage.includes('ai')) {
      commands.push({
        id: 'cmd_model',
        type: 'command',
        content: '/model - AI model tanlash',
        confidence: 0.8,
        usage_count: 70
      });
    }

    // Stats related
    if (lowerMessage.includes('statistika') || lowerMessage.includes('stats')) {
      commands.push({
        id: 'cmd_stats',
        type: 'command',
        content: '/stats - Statistikangizni ko\'rish',
        confidence: 0.8,
        usage_count: 60
      });
    }

    // Balance related
    if (lowerMessage.includes('balans') || lowerMessage.includes('token')) {
      commands.push({
        id: 'cmd_balance',
        type: 'command',
        content: '/balance - Token balansini tekshirish',
        confidence: 0.8,
        usage_count: 85
      });
    }

    // TTS related
    if (lowerMessage.includes('ovoz') || lowerMessage.includes('audio')) {
      commands.push({
        id: 'cmd_tts',
        type: 'command',
        content: '/tts - Matnni ovozga aylantirish',
        confidence: 0.7,
        usage_count: 40
      });
    }

    // Image related
    if (lowerMessage.includes('rasm') || lowerMessage.includes('image')) {
      commands.push({
        id: 'cmd_image',
        type: 'command',
        content: '/image - Rasm yaratish',
        confidence: 0.7,
        usage_count: 55
      });
    }

    return commands;
  },

  /**
   * Get topic suggestions based on user history
   */
  async getTopicSuggestions(userId: number, currentMessage: string): Promise<SmartSuggestion[]> {
    try {
      // Get user's recent interests from database
      const userInterests = database.all(`
        SELECT preference_value, confidence
        FROM user_preferences
        WHERE user_id = ? AND preference_type = 'topic_interest'
        ORDER BY confidence DESC, updated_at DESC
        LIMIT 10
      `, [userId]);

      const topics: SmartSuggestion[] = [];
      
      userInterests.forEach((interest, index) => {
        topics.push({
          id: `topic_${index}`,
          type: 'topic',
          content: `${interest.preference_value} haqida gapirishamizmi?`,
          confidence: interest.confidence * 0.6, // Lower confidence for topics
          usage_count: 30 - index
        });
      });

      return topics;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting topic suggestions', { error: errorMessage, user_id: userId });
      return [];
    }
  },

  /**
   * Learn from user interaction
   */
  async learnFromInteraction(userId: number, userMessage: string, botResponse: string): Promise<void> {
    try {
      // Extract topics from message
      const topics = this.extractTopics(userMessage);
      
      // Update user preferences
      for (const topic of topics) {
        await this.updateUserPreference(userId, 'topic_interest', topic, 0.1);
      }

      // Extract language preferences
      const language = this.detectLanguage(userMessage);
      if (language) {
        await this.updateUserPreference(userId, 'language', language, 0.2);
      }

      // Extract interaction patterns
      const messageLength = userMessage.length;
      const lengthCategory = messageLength < 50 ? 'short' : messageLength < 200 ? 'medium' : 'long';
      await this.updateUserPreference(userId, 'message_length', lengthCategory, 0.1);

      logger.info('Learned from user interaction', { 
        user_id: userId, 
        topics: topics.length, 
        language, 
        message_length: lengthCategory 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error learning from interaction', { error: errorMessage, user_id: userId });
    }
  },

  /**
   * Extract topics from message
   */
  extractTopics(message: string): string[] {
    const topics: string[] = [];
    const lowerMessage = message.toLowerCase();

    // Technology topics
    if (lowerMessage.includes('dasturlash') || lowerMessage.includes('kod')) {
      topics.push('dasturlash');
    }
    if (lowerMessage.includes('sun\'iy intellekt') || lowerMessage.includes('ai')) {
      topics.push('sun\'iy intellekt');
    }
    if (lowerMessage.includes('web') || lowerMessage.includes('sayt')) {
      topics.push('web dasturlash');
    }

    // Science topics
    if (lowerMessage.includes('fizika') || lowerMessage.includes('matematika')) {
      topics.push('fan');
    }
    if (lowerMessage.includes('tarix') || lowerMessage.includes('geografiya')) {
      topics.push('gumanitar fanlar');
    }

    // Entertainment topics
    if (lowerMessage.includes('film') || lowerMessage.includes('kino')) {
      topics.push('ko\'ngilochar');
    }
    if (lowerMessage.includes('sport') || lowerMessage.includes('futbol')) {
      topics.push('sport');
    }

    // Business topics
    if (lowerMessage.includes('biznes') || lowerMessage.includes('pul')) {
      topics.push('biznes');
    }
    if (lowerMessage.includes('ish') || lowerMessage.includes('martaba')) {
      topics.push('karyera');
    }

    return topics;
  },

  /**
   * Detect language from message
   */
  detectLanguage(message: string): string | null {
    const lowerMessage = message.toLowerCase();
    
    // Uzbek words
    const uzbekWords = ['salom', 'qanday', 'nima', 'qachon', 'qayerda', 'kim', 'rahmat', 'kechirasiz'];
    const uzbekCount = uzbekWords.filter(word => lowerMessage.includes(word)).length;

    // English words
    const englishWords = ['hello', 'what', 'when', 'where', 'who', 'thank', 'sorry', 'please'];
    const englishCount = englishWords.filter(word => lowerMessage.includes(word)).length;

    // Russian words
    const russianWords = ['привет', 'что', 'когда', 'где', 'кто', 'спасибо', 'извините'];
    const russianCount = russianWords.filter(word => lowerMessage.includes(word)).length;

    if (uzbekCount > englishCount && uzbekCount > russianCount) {
      return 'uzbek';
    } else if (englishCount > uzbekCount && englishCount > russianCount) {
      return 'english';
    } else if (russianCount > uzbekCount && russianCount > englishCount) {
      return 'russian';
    }

    return null;
  },

  /**
   * Update user preference
   */
  async updateUserPreference(
    userId: number, 
    preferenceType: string, 
    preferenceValue: string, 
    confidenceIncrement: number
  ): Promise<void> {
    try {
      // Check if preference exists
      const existing = database.get(`
        SELECT * FROM user_preferences
        WHERE user_id = ? AND preference_type = ? AND preference_value = ?
      `, [userId, preferenceType, preferenceValue]);

      if (existing) {
        // Update existing preference
        const newConfidence = Math.min(1.0, existing.confidence + confidenceIncrement);
        database.run(`
          UPDATE user_preferences SET 
            confidence = ?, 
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND preference_type = ? AND preference_value = ?
        `, [newConfidence, userId, preferenceType, preferenceValue]);
      } else {
        // Create new preference
        database.run(`
          INSERT INTO user_preferences (user_id, preference_type, preference_value, confidence, created_at, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [userId, preferenceType, preferenceValue, confidenceIncrement]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error updating user preference', { 
        error: errorMessage, 
        user_id: userId, 
        preference_type: preferenceType 
      });
    }
  },

  /**
   * Get user's personality profile
   */
  async getUserProfile(userId: number): Promise<any> {
    try {
      const preferences = database.all(`
        SELECT preference_type, preference_value, confidence
        FROM user_preferences
        WHERE user_id = ?
        ORDER BY confidence DESC
      `, [userId]);

      const profile = {
        user_id: userId,
        top_interests: [],
        language_preference: null,
        interaction_style: null,
        confidence_score: 0
      };

      const grouped = preferences.reduce((acc, pref) => {
        if (!acc[pref.preference_type]) {
          acc[pref.preference_type] = [];
        }
        acc[pref.preference_type].push(pref);
        return acc;
      }, {});

      // Top interests
      if (grouped.topic_interest) {
        profile.top_interests = grouped.topic_interest
          .slice(0, 5)
          .map(p => ({ topic: p.preference_value, confidence: p.confidence }));
      }

      // Language preference
      if (grouped.language && grouped.language.length > 0) {
        profile.language_preference = grouped.language[0].preference_value;
      }

      // Interaction style
      if (grouped.message_length && grouped.message_length.length > 0) {
        profile.interaction_style = grouped.message_length[0].preference_value;
      }

      // Overall confidence score
      if (preferences.length > 0) {
        profile.confidence_score = preferences.reduce((sum, p) => sum + p.confidence, 0) / preferences.length;
      }

      return profile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting user profile', { error: errorMessage, user_id: userId });
      return null;
    }
  },

  /**
   * Get personalized greeting
   */
  async getPersonalizedGreeting(userId: number): Promise<string> {
    try {
      const profile = await this.getUserProfile(userId);
      const user = await userService.getUser(userId);
      
      if (!profile || !user) {
        return 'Salom! Qanday yordam bera olaman?';
      }

      let greeting = `Salom, ${user.first_name}! `;

      // Add personalized element based on top interest
      if (profile.top_interests && profile.top_interests.length > 0) {
        const topInterest = profile.top_interests[0];
        greeting += `${topInterest.topic} haqida gapirishamizmi yoki boshqa narsa kerakmi?`;
      } else {
        greeting += 'Bugun qanday yordam bera olaman?';
      }

      return greeting;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting personalized greeting', { error: errorMessage, user_id: userId });
      return 'Salom! Qanday yordam bera olaman?';
    }
  }
};