export interface ChatMessage {
    id: string;
    user_id: number;
    session_id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    tokens_used: number;
    model_used?: string;
}
export interface ChatSession {
    id: string;
    user_id: number;
    title: string;
    created_at: Date;
    updated_at: Date;
    message_count: number;
    is_active: boolean;
}
export declare const chatFeaturesService: {
    /**
     * Create new chat session
     */
    createSession(userId: number, title?: string): Promise<string>;
    /**
     * Get user's chat sessions
     */
    getUserSessions(userId: number): Promise<ChatSession[]>;
    /**
     * Add message to session
     */
    addMessage(sessionId: string, userId: number, role: "user" | "assistant", content: string, tokensUsed?: number, modelUsed?: string): Promise<void>;
    /**
     * Get session messages
     */
    getSessionMessages(sessionId: string, limit?: number): Promise<ChatMessage[]>;
    /**
     * Delete session
     */
    deleteSession(sessionId: string, userId: number): Promise<boolean>;
    /**
     * Update session title
     */
    updateSessionTitle(sessionId: string, userId: number, newTitle: string): Promise<boolean>;
    /**
     * Get conversation context for AI
     */
    getConversationContext(sessionId: string, limit?: number): Promise<{
        role: string;
        content: string;
    }[]>;
    /**
     * Clean up old sessions (admin function)
     */
    cleanupOldSessions(daysOld?: number): Promise<number>;
    /**
     * Export user's chat history
     */
    exportUserHistory(userId: number): Promise<string>;
};
