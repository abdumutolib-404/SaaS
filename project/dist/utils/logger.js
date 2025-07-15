import chalk from 'chalk';
class Logger {
    formatTimestamp() {
        const now = new Date();
        const date = now.toLocaleDateString('uz-UZ');
        const time = now.toLocaleTimeString('uz-UZ');
        return chalk.gray(`[${date} ${time}]`);
    }
    formatData(data) {
        if (!data)
            return '';
        const formatted = Object.entries(data)
            .map(([key, value]) => {
            const coloredKey = chalk.cyan(key);
            let coloredValue;
            if (typeof value === 'string') {
                coloredValue = chalk.yellow(`"${value}"`);
            }
            else if (typeof value === 'number') {
                coloredValue = chalk.magenta(value.toString());
            }
            else if (typeof value === 'boolean') {
                coloredValue = value ? chalk.green('true') : chalk.red('false');
            }
            else {
                coloredValue = chalk.white(JSON.stringify(value));
            }
            return `${coloredKey}: ${coloredValue}`;
        })
            .join(', ');
        return chalk.gray(`{${formatted}}`);
    }
    info(message, data) {
        const timestamp = this.formatTimestamp();
        const icon = chalk.blue('ℹ');
        const msg = chalk.white(message);
        const dataStr = this.formatData(data);
        console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
    }
    success(message, data) {
        const timestamp = this.formatTimestamp();
        const icon = chalk.green('✓');
        const msg = chalk.green(message);
        const dataStr = this.formatData(data);
        console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
    }
    warning(message, data) {
        const timestamp = this.formatTimestamp();
        const icon = chalk.yellow('⚠');
        const msg = chalk.yellow(message);
        const dataStr = this.formatData(data);
        console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
    }
    error(message, data) {
        const timestamp = this.formatTimestamp();
        const icon = chalk.red('✗');
        const msg = chalk.red(message);
        const dataStr = this.formatData(data);
        // Log callback data errors with more detail
        if (data?.error && data.error.includes('BUTTON_DATA_INVALID')) {
            console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
            console.log(chalk.red('💡 Hint: Check callback_data length (max 64 bytes) and invalid characters'));
        }
        else {
            console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
        }
    }
    user(message, data) {
        const timestamp = this.formatTimestamp();
        const icon = chalk.blue('👤');
        const msg = chalk.blue(message);
        const dataStr = this.formatData(data);
        console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
    }
    admin(message, data) {
        const timestamp = this.formatTimestamp();
        const icon = chalk.magenta('👑');
        const msg = chalk.magenta(message);
        const dataStr = this.formatData(data);
        console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
    }
    ai(message, data) {
        const timestamp = this.formatTimestamp();
        const icon = chalk.cyan('🤖');
        const msg = chalk.cyan(message);
        const dataStr = this.formatData(data);
        console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
    }
    broadcast(message, data) {
        const timestamp = this.formatTimestamp();
        const icon = chalk.yellow('📢');
        const msg = chalk.yellow(message);
        const dataStr = this.formatData(data);
        console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
    }
    database(message, data) {
        const timestamp = this.formatTimestamp();
        const icon = chalk.green('💾');
        const msg = chalk.green(message);
        const dataStr = this.formatData(data);
        console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
    }
    system(message, data) {
        const timestamp = this.formatTimestamp();
        const icon = chalk.gray('⚙️');
        const msg = chalk.gray(message);
        const dataStr = this.formatData(data);
        console.log(`${timestamp} ${icon} ${msg} ${dataStr}`.trim());
    }
    // Startup banner
    banner() {
        console.log('\n' + chalk.cyan('═'.repeat(60)));
        console.log(chalk.cyan.bold('🤖 TELEGRAM AI CHATBOT'));
        console.log(chalk.gray('Professional AI Assistant with OpenRouter Integration'));
        console.log(chalk.cyan('═'.repeat(60)) + '\n');
    }
    // Separator
    separator() {
        console.log(chalk.gray('─'.repeat(60)));
    }
}
export const logger = new Logger();
//# sourceMappingURL=logger.js.map