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
export declare const smartFeaturesService: {
    /**
     * Get smart suggestions based on user's message
     */
    getSmartSuggestions(userId: number, currentMessage: string): Promise<SmartSuggestion[]>;
    /**
     * Get quick reply suggestions
     */
    getQuickReplies(message: string): SmartSuggestion[];
    /**
     * Get command suggestions
     */
    getCommandSuggestions(message: string): SmartSuggestion[];
    /**
     * Get topic suggestions based on user history
     */
    getTopicSuggestions(userId: number, currentMessage: string): Promise<SmartSuggestion[]>;
    /**
     * Learn from user interaction
     */
    learnFromInteraction(userId: number, userMessage: string, botResponse: string): Promise<void>;
    /**
     * Extract topics from message
     */
    extractTopics(message: string): string[];
    /**
     * Detect language from message
     */
    detectLanguage(message: string): string | null;
    /**
     * Update user preference
     */
    updateUserPreference(userId: number, preferenceType: string, preferenceValue: string, confidenceIncrement: number): Promise<void>;
    /**
     * Get user's personality profile
     */
    getUserProfile(userId: number): Promise<any>;
    /**
     * Get personalized greeting
     */
    getPersonalizedGreeting(userId: number): Promise<string>;
};
