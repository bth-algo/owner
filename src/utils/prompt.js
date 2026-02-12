import readline from 'readline';
import chalk from 'chalk';

/**
 * Interactive prompt utility
 */
export class PromptManager {
  constructor() {
    this.rl = null;
  }

  /**
   * Initialize readline interface
   */
  init() {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }
  }

  /**
   * Close readline interface
   */
  close() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  /**
   * Ask a yes/no question
   * @param {string} question - Question to ask
   * @returns {Promise<boolean>} True if yes, false if no
   */
  async confirm(question) {
    this.init();
    
    return new Promise((resolve) => {
      this.rl.question(`${question} ${chalk.gray('(Y/n)')} `, (answer) => {
        const normalized = answer.trim().toLowerCase();
        resolve(normalized !== 'n' && normalized !== 'no');
      });
    });
  }

  /**
   * Display a setting change and ask for confirmation
   * @param {string} settingName - Name of the setting
   * @param {any} currentValue - Current value
   * @param {any} newValue - New value
   * @returns {Promise<boolean>} True if user confirms change
   */
  async confirmChange(settingName, currentValue, newValue) {
    console.log(chalk.blue(`\n📝 Setting: ${chalk.bold(settingName)}`));
    console.log(chalk.red(`   Current: ${this.formatValue(currentValue)}`));
    console.log(chalk.green(`   New:     ${this.formatValue(newValue)}`));
    
    return await this.confirm(chalk.yellow('Apply this change?'));
  }

  /**
   * Format a value for display
   * @param {any} value - Value to format
   * @returns {string} Formatted value
   */
  formatValue(value) {
    if (value === null || value === undefined) {
      return chalk.gray('(not set)');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }
}
