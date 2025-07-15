import { database } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
export const chatFeaturesService = {
    /**
     * Create new chat session
     */
    async createSession(userId, title) {
        try {
            const sessionId = uuidv4();
            const defaultTitle = title || `Chat ${new Date().toLocaleDateString()}`;
            database.run(`
        INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at, message_count, is_active)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 1)
      `, [sessionId, userId, defaultTitle]);
            logger.info('Chat session created', { user_id: userId, session_id: sessionId });
            return sessionId;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error creating chat session', { error: errorMessage, user_id: userId });
            throw error;
        }
    },
    /**
     * Get user's chat sessions
     */
    async getUserSessions(userId) {
        try {
            const sessions = database.all(`
        SELECT id, user_id, title, created_at, updated_at, message_count, is_active
        FROM chat_sessions
        WHERE user_id = ?
        ORDER BY updated_at DESC
        LIMIT 20
      `, [userId]);
            return sessions.map(session => ({
                ...session,
                created_at: new Date(session.created_at),
                updated_at: new Date(session.updated_at),
                is_active: Boolean(session.is_active)
            }));
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error getting user sessions', { error: errorMessage, user_id: userId });
            return [];
        }
    },
    /**
     * Add message to session
     */
    async addMessage(sessionId, userId, role, content, tokensUsed = 0, modelUsed) {
        try {
            const messageId = uuidv4();
            database.run(`
        INSERT INTO chat_messages (id, session_id, user_id, role, content, tokens_used, model_used, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [messageId, sessionId, userId, role, content, tokensUsed, modelUsed]);
            // Update session message count and timestamp
            database.run(`
        UPDATE chat_sessions SET 
          message_count = message_count + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [sessionId]);
            logger.info('Message added to session', {
                session_id: sessionId,
                user_id: userId,
                role,
                content_length: content.length
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error adding message to session', {
                error: errorMessage,
                session_id: sessionId,
                user_id: userId
            });
            throw error;
        }
    },
    /**
     * Get session messages
     */
    async getSessionMessages(sessionId, limit = 50) {
        try {
            const messages = database.all(`
        SELECT id, user_id, session_id, role, content, tokens_used, model_used, created_at
        FROM chat_messages
        WHERE session_id = ?
        ORDER BY created_at ASC
        LIMIT ?
      `, [sessionId, limit]);
            return messages.map(msg => ({
                ...msg,
                timestamp: new Date(msg.created_at)
            }));
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error getting session messages', {
                error: errorMessage,
                session_id: sessionId
            });
            return [];
        }
    },
    /**
     * Delete session
     */
    async deleteSession(sessionId, userId) {
        try {
            // Delete messages first
            database.run('DELETE FROM chat_messages WHERE session_id = ? AND user_id = ?', [sessionId, userId]);
            // Delete session
            const result = database.run('DELETE FROM chat_sessions WHERE id = ? AND user_id = ?', [sessionId, userId]);
            logger.info('Session deleted', { session_id: sessionId, user_id: userId });
            return result.changes > 0;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error deleting session', {
                error: errorMessage,
                session_id: sessionId,
                user_id: userId
            });
            return false;
        }
    },
    /**
     * Update session title
     */
    async updateSessionTitle(sessionId, userId, newTitle) {
        try {
            const result = database.run(`
        UPDATE chat_sessions 
        SET title = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `, [newTitle, sessionId, userId]);
            logger.info('Session title updated', {
                session_id: sessionId,
                user_id: userId,
                new_title: newTitle
            });
            return result.changes > 0;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error updating session title', {
                error: errorMessage,
                session_id: sessionId,
                user_id: userId
            });
            return false;
        }
    },
    /**
     * Get conversation context for AI
     */
    async getConversationContext(sessionId, limit = 10) {
        try {
            const messages = await this.getSessionMessages(sessionId, limit);
            return messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error getting conversation context', {
                error: errorMessage,
                session_id: sessionId
            });
            return [];
        }
    },
    /**
     * Clean up old sessions (admin function)
     */
    async cleanupOldSessions(daysOld = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            // Delete old messages
            database.run(`
        DELETE FROM chat_messages 
        WHERE created_at < ?
      `, [cutoffDate.toISOString()]);
            // Delete old sessions
            const result = database.run(`
        DELETE FROM chat_sessions 
        WHERE updated_at < ?
      `, [cutoffDate.toISOString()]);
            logger.success('Old sessions cleaned up', {
                deleted_sessions: result.changes,
                cutoff_date: cutoffDate
            });
            return result.changes;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error cleaning up old sessions', { error: errorMessage });
            return 0;
        }
    },
    /**
     * Export user's chat history
     */
    async exportUserHistory(userId) {
        try {
            const sessions = await this.getUserSessions(userId);
            const exportData = [];
            for (const session of sessions) {
                const messages = await this.getSessionMessages(session.id);
                exportData.push({
                    session: {
                        id: session.id,
                        title: session.title,
                        created_at: session.created_at,
                        message_count: session.message_count
                    },
                    messages: messages.map(msg => ({
                        role: msg.role,
                        content: msg.content,
                        timestamp: msg.timestamp,
                        tokens_used: msg.tokens_used,
                        model_used: msg.model_used
                    }))
                });
            }
            return JSON.stringify(exportData, null, 2);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error exporting user history', { error: errorMessage, user_id: userId });
            return JSON.stringify({ error: 'Export failed' });
        }
    }
};
//# sourceMappingURL=chat_features.js.map