import { database } from '../config/database.js';
export const modelService = {
    // Model ID mapping for short callback data
    modelIdMap: new Map(),
    getShortModelId(fullModelId) {
        // Check if we already have a mapping
        for (const [shortId, fullId] of this.modelIdMap.entries()) {
            if (fullId === fullModelId) {
                return shortId;
            }
        }
        // Create new short ID
        const hash = fullModelId.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        const shortId = Math.abs(hash).toString(36);
        this.modelIdMap.set(shortId, fullModelId);
        return shortId;
    },
    async getModelByShortId(shortId) {
        const fullId = this.modelIdMap.get(shortId);
        if (fullId) {
            return await this.getModel(fullId);
        }
        // If not in map, try to find by direct ID (for backward compatibility)
        return await this.getModel(shortId);
    },
    async getActiveModels() {
        return await database.all('SELECT * FROM models WHERE is_active = 1 ORDER BY model_type DESC, category, name');
    },
    async getFreeModels() {
        return await database.all('SELECT * FROM models WHERE is_active = 1 AND model_type = ? ORDER BY category, name', ['FREE']);
    },
    async getProModels() {
        return await database.all('SELECT * FROM models WHERE is_active = 1 AND model_type = ? ORDER BY category, name', ['PRO']);
    },
    async getModelsByCategory(category) {
        return database.all('SELECT * FROM models WHERE is_active = 1 AND category = ? ORDER BY model_type DESC, name', [category]);
    },
    async getCategories() {
        const result = await database.all('SELECT DISTINCT category FROM models WHERE is_active = 1 ORDER BY category');
        return result.map(row => row.category);
    },
    async getAllModels() {
        return await database.all('SELECT * FROM models ORDER BY model_type DESC, category, name');
    },
    async getModel(id) {
        return await database.get('SELECT * FROM models WHERE id = ?', [id]);
    },
    async createModel(model) {
        await database.run(`
      INSERT INTO models (id, name, provider, category, max_tokens, cost_per_token, is_active, model_type, monthly_limit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            model.id,
            model.name,
            model.provider,
            model.category || 'General',
            model.max_tokens,
            model.cost_per_token,
            model.is_active ? 1 : 0,
            model.model_type || 'FREE',
            model.monthly_limit || 0
        ]);
        return await database.get('SELECT * FROM models WHERE id = ?', [model.id]);
    },
    async updateModel(id, updates) {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(id);
        await database.run(`UPDATE models SET ${fields} WHERE id = ?`, values);
    },
    async deleteModel(id) {
        await database.run('DELETE FROM models WHERE id = ?', [id]);
    },
    async getModelsByType(modelType) {
        return await database.all('SELECT * FROM models WHERE is_active = 1 AND model_type = ? ORDER BY category, name', [modelType]);
    },
    async getDefaultModel() {
        // Return the most powerful free model (DeepSeek Chat V3)
        return await database.get('SELECT * FROM models WHERE id = ? AND is_active = 1', ['deepseek/deepseek-chat-v3-0324:free']);
    }
};
//# sourceMappingURL=model.js.map