import { Model } from '../types/bot.js';
export declare const modelService: {
    modelIdMap: Map<string, string>;
    getShortModelId(fullModelId: string): string;
    getModelByShortId(shortId: string): Promise<Model | null>;
    getActiveModels(): Promise<Model[]>;
    getFreeModels(): Promise<Model[]>;
    getProModels(): Promise<Model[]>;
    getModelsByCategory(category: string): Promise<Model[]>;
    getCategories(): Promise<string[]>;
    getAllModels(): Promise<Model[]>;
    getModel(id: string): Promise<Model | null>;
    createModel(model: Omit<Model, "created_at">): Promise<Model>;
    updateModel(id: string, updates: Partial<Model>): Promise<void>;
    deleteModel(id: string): Promise<void>;
    getModelsByType(modelType: "FREE" | "PRO"): Promise<Model[]>;
    getDefaultModel(): Promise<Model | null>;
};
