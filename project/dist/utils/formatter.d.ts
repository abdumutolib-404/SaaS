/**
 * Telegram formatter utility
 * Supports HTML, Markdown V2, and plain text formatting
 */
export declare class TelegramFormatter {
    /**
     * Escape special characters for HTML
     */
    static escapeHTML(text: string): string;
    /**
     * Escape special characters for Markdown V2
     */
    static escapeMarkdown(text: string): string;
    /**
     * Convert text to HTML format
     */
    static toHTML(text: string): string;
    /**
     * Convert text to Markdown V2 format
     */
    static toMarkdownV2(text: string): string;
    /**
     * Format text as bold (HTML)
     */
    static bold(text: string): string;
    /**
     * Format text as italic (HTML)
     */
    static italic(text: string): string;
    /**
     * Format text as code (HTML)
     */
    static code(text: string): string;
    /**
     * Format text as code block (HTML)
     */
    static codeBlock(text: string): string;
    /**
     * Format text as strikethrough (HTML)
     */
    static strikethrough(text: string): string;
    /**
     * Format text as underline (HTML)
     */
    static underline(text: string): string;
    /**
     * Create a link (HTML)
     */
    static link(text: string, url: string): string;
    /**
     * Create formatted welcome message for new users
     */
    static formatWelcomeNew(firstName: string): string;
    /**
     * Create formatted welcome message
     */
    static formatWelcome(firstName: string, userId: number): string;
    /**
     * Create formatted referral welcome message
     */
    static formatReferralWelcome(firstName: string, userId: number, referrerName: string): string;
    /**
     * Format registration steps
     */
    static formatRegistrationStep(step: string): string;
    /**
     * Format registration completion
     */
    static formatRegistrationComplete(userId: number): string;
    /**
     * Format registration skipped
     */
    static formatRegistrationSkipped(userId: number): string;
    /**
     * Format chat mode start
     */
    static formatChatModeStart(modelName: string): string;
    /**
     * Format chat mode end
     */
    static formatChatModeEnd(): string;
    /**
     * Format model selected
     */
    static formatModelSelected(modelName: string, modelType?: string): string;
    /**
     * Format promocode input
     */
    static formatPromocodeInput(): string;
    /**
     * Format promocode usage instructions
     */
    static formatPromocodeUsage(): string;
    /**
     * Format available promocodes - Enhanced
     */
    static formatAvailablePromocodes(promocodes: any[]): string;
    /**
     * Format image generation result
     */
    static formatImageGenerated(prompt: string, remaining: number, limit: number): string;
    /**
     * Format admin promokod creation guide
     */
    static formatAdminPromocodeGuide(): string;
    /**
     * Format token limit message
     */
    static formatTokenLimit(userId: number): string;
    /**
     * Format admin token usage instructions
     */
    static formatAdminTokenUsage(operation: 'add' | 'remove'): string;
    /**
     * Create formatted stats message
     */
    static formatStats(stats: any): string;
    /**
     * Create formatted balance message
     */
    static formatBalance(user: any): string;
    /**
     * Create formatted admin stats message
     */
    static formatAdminStats(stats: any): string;
    /**
     * Create formatted help message
     */
    static formatHelp(user: any, isAdmin?: boolean): string;
    /**
     * Create formatted promocode success message
     */
    static formatPromocodeSuccess(message: string, dailyTokens: number, totalTokens: number): string;
    /**
     * Create formatted token operation message
     */
    static formatTokenOperation(userId: string, dailyTokens: number, totalTokens: number, operation: 'added' | 'removed'): string;
    /**
     * Format referral statistics
     */
    static formatReferralStats(stats: any): string;
    /**
     * Format referral notification for referrer
     */
    static formatReferralNotification(referredName: string): string;
    /**
     * Format admin referral stats
     */
    static formatAdminReferralStats(stats: any): string;
    /**
     * Format PRO statistics
     */
    static formatProStats(stats: any): string;
    /**
     * Format plans comparison
     */
    static formatPlansComparison(comparison: any): string;
    /**
     * Format plan change notification
     */
    static formatPlanChanged(planName: string, displayName: string): string;
    /**
     * Format TTS generation result
     */
    static formatTTSGenerated(remaining: number, limit: number): string;
    /**
     * Format STT conversion result
     */
    static formatSTTConverted(text: string, remaining: number, limit: number): string;
    /**
     * Format PRO model limit error
     */
    static formatProModelLimit(modelName: string, remaining: number, limit: number): string;
    /**
     * Create formatted error message
     */
    static formatError(message: string): string;
    /**
     * Create formatted success message
     */
    static formatSuccess(message: string): string;
    /**
     * Create formatted warning message
     */
    static formatWarning(message: string): string;
    /**
     * Create formatted info message
     */
    static formatInfo(message: string): string;
    /**
     * Create plain text version (fallback)
     */
    static toPlainText(text: string): string;
}
export default TelegramFormatter;
