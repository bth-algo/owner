import fs from 'fs/promises';
import path from 'path';

/**
 * Backup utility for organization settings
 */
export class BackupManager {
  constructor(backupDir = 'org-settings/backups') {
    this.backupDir = backupDir;
  }

  /**
   * Create a timestamped backup of organization settings
   * @param {object} settings - Organization settings to backup
   * @returns {Promise<string>} Path to backup file
   */
  async createBackup(settings) {
    // Ensure backup directory exists
    await fs.mkdir(this.backupDir, { recursive: true });

    // Create timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('.')[0];

    const filename = `backup-${timestamp}.json`;
    const filepath = path.join(this.backupDir, filename);

    // Add metadata
    const backup = {
      timestamp: new Date().toISOString(),
      settings: settings
    };

    await fs.writeFile(filepath, JSON.stringify(backup, null, 2));
    return filepath;
  }

  /**
   * Read a backup file
   * @param {string} filepath - Path to backup file
   * @returns {Promise<object>} Backup data
   */
  async readBackup(filepath) {
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * List all backup files
   * @returns {Promise<string[]>} Array of backup file paths
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      return files
        .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
        .map(f => path.join(this.backupDir, f))
        .sort()
        .reverse(); // Most recent first
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
}
