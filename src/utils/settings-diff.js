/**
 * Settings comparison and diff utility
 */
export class SettingsDiff {
  /**
   * Compare two setting objects and find differences
   * @param {object} current - Current settings
   * @param {object} desired - Desired settings
   * @returns {array} Array of changes
   */
  static compare(current, desired) {
    const changes = [];

    // Check for new or changed settings
    for (const [key, desiredValue] of Object.entries(desired)) {
      const currentValue = current[key];
      
      if (!this.isEqual(currentValue, desiredValue)) {
        changes.push({
          key,
          type: currentValue === undefined ? 'add' : 'update',
          currentValue,
          newValue: desiredValue
        });
      }
    }

    // Check for removed settings
    for (const key of Object.keys(current)) {
      if (!(key in desired)) {
        changes.push({
          key,
          type: 'remove',
          currentValue: current[key],
          newValue: undefined
        });
      }
    }

    return changes;
  }

  /**
   * Deep equality check for values
   * @param {any} a - First value
   * @param {any} b - Second value
   * @returns {boolean} True if equal
   */
  static isEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);

      if (aKeys.length !== bKeys.length) return false;

      for (const key of aKeys) {
        if (!bKeys.includes(key)) return false;
        if (!this.isEqual(a[key], b[key])) return false;
      }

      return true;
    }

    return false;
  }

  /**
   * Format changes for display
   * @param {array} changes - Array of changes
   * @returns {string} Formatted string
   */
  static format(changes) {
    if (changes.length === 0) {
      return 'No changes detected';
    }

    const lines = [];
    for (const change of changes) {
      switch (change.type) {
        case 'add':
          lines.push(`+ ${change.key}: ${JSON.stringify(change.newValue)}`);
          break;
        case 'update':
          lines.push(`~ ${change.key}:`);
          lines.push(`  - ${JSON.stringify(change.currentValue)}`);
          lines.push(`  + ${JSON.stringify(change.newValue)}`);
          break;
        case 'remove':
          lines.push(`- ${change.key}: ${JSON.stringify(change.currentValue)}`);
          break;
      }
    }

    return lines.join('\n');
  }

  /**
   * Group changes by category
   * @param {object} allChanges - All changes by category
   * @returns {array} Flattened array with category labels
   */
  static groupChanges(allChanges) {
    const grouped = [];

    for (const [category, changes] of Object.entries(allChanges)) {
      if (changes && changes.length > 0) {
        grouped.push({
          category,
          changes
        });
      }
    }

    return grouped;
  }
}
