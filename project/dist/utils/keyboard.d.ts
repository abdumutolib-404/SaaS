import { InlineKeyboardMarkup } from 'telegraf/typings/core/types/typegram';
export declare class KeyboardBuilder {
    private buttons;
    private currentRow;
    addButton(text: string, callbackData: string, newRow?: boolean): KeyboardBuilder;
    addUrl(text: string, url: string, newRow?: boolean): KeyboardBuilder;
    addRow(): KeyboardBuilder;
    build(): {
        reply_markup: InlineKeyboardMarkup;
    };
    static createMainMenu(isAdmin?: boolean, userPlan?: string): {
        reply_markup: InlineKeyboardMarkup;
    };
    static createRegistrationMenu(): {
        reply_markup: InlineKeyboardMarkup;
    };
    static createBackButton(): {
        reply_markup: InlineKeyboardMarkup;
    };
    static createAdminPanel(): {
        reply_markup: InlineKeyboardMarkup;
    };
    static createReferralMenu(): {
        reply_markup: InlineKeyboardMarkup;
    };
}
export declare function validateKeyboard(keyboard: any): boolean;
