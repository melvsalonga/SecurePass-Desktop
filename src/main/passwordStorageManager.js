/**
 * Password Storage Manager
 * Handles encrypted storage and retrieval of password entries
 */

const crypto = require('node:crypto');
const PasswordDatabase = require('./passwordDatabase');

class PasswordStorageManager {
  constructor(databaseManager, encryptionManager) {
    this.databaseManager = databaseManager;
    this.encryptionManager = encryptionManager;
    this.passwordDatabase = null;
    this.isInitialized = false;
  }

  /**
   * Initialize password database with encryption key
   * @param {Buffer} databaseKey - Database encryption key
   */
  async initialize(databaseKey) {
    try {
      if (!databaseKey) {
        throw new Error('Database key is required');
      }
      
      this.passwordDatabase = new PasswordDatabase(this.encryptionManager, databaseKey);
      this.isInitialized = true;
      
      console.log('PasswordStorageManager initialized with encrypted database');
    } catch (error) {
      console.error('Error initializing password storage:', error);
      throw new Error(`Failed to initialize password storage: ${error.message}`);
    }
  }

  /**
   * Check if password storage is initialized
   * @returns {boolean} True if initialized
   */
  isReady() {
    return this.isInitialized && this.passwordDatabase !== null;
  }

  /**
   * Ensure database is ready for operations
   */
  ensureReady() {
    if (!this.isReady()) {
      throw new Error('Password storage not initialized. Please authenticate first.');
    }
  }

  /**
   * Add a new password entry
   * @param {Object} entry - Password entry
   * @returns {Promise<Object>} Created entry with ID
   */
  async addPassword(entry) {
    try {
      this.ensureReady();
      return await this.passwordDatabase.addEntry(entry);
    } catch (error) {
      throw new Error(`Failed to add password: ${error.message}`);
    }
  }

  /**
   * Get all password entries (decrypted)
   * @returns {Promise<Array>} Array of decrypted password entries
   */
  async getAllPasswords() {
    try {
      this.ensureReady();
      return await this.passwordDatabase.getAllEntries();
    } catch (error) {
      throw new Error(`Failed to get passwords: ${error.message}`);
    }
  }

  /**
   * Get password entry by ID
   * @param {string} id - Entry ID
   * @returns {Promise<Object|null>} Decrypted password entry or null
   */
  async getPasswordById(id) {
    try {
      this.ensureReady();
      return await this.passwordDatabase.getEntryById(id);
    } catch (error) {
      throw new Error(`Failed to get password: ${error.message}`);
    }
  }

  /**
   * Update password entry
   * @param {string} id - Entry ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated entry
   */
  async updatePassword(id, updates) {
    try {
      this.ensureReady();
      return await this.passwordDatabase.updateEntry(id, updates);
    } catch (error) {
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  /**
   * Delete password entry
   * @param {string} id - Entry ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deletePassword(id) {
    try {
      this.ensureReady();
      return await this.passwordDatabase.deleteEntry(id);
    } catch (error) {
      throw new Error(`Failed to delete password: ${error.message}`);
    }
  }

  /**
   * Search password entries
   * @param {string} query - Search query
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} Matching password entries
   */
  async searchPasswords(query, filters = {}) {
    try {
      this.ensureReady();
      return await this.passwordDatabase.searchEntries(query, filters);
    } catch (error) {
      throw new Error(`Failed to search passwords: ${error.message}`);
    }
  }

  /**
   * Get available categories
   * @returns {Array} Array of categories
   */
  getCategories() {
    if (!this.isReady()) {
      return ['General', 'Social Media', 'Banking', 'Work', 'Shopping', 'Email', 'Entertainment'];
    }
    return this.passwordDatabase.getCategories();
  }

  /**
   * Add new category
   * @param {string} category - Category name
   */
  addCategory(category) {
    if (this.isReady() && category && category.trim()) {
      this.passwordDatabase.addCategory(category.trim());
    }
  }

  /**
   * Get password statistics
   * @returns {Promise<Object>} Password statistics
   */
  async getStatistics() {
    try {
      this.ensureReady();
      return await this.passwordDatabase.getStatistics();
    } catch (error) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }

  /**
   * Encrypt password entry
   * @param {Object} entry - Password entry to encrypt
   * @returns {Promise<Object>} Encrypted entry
   */
  async encryptPasswordEntry(entry) {
    try {
      const databaseKey = this.databaseManager.databaseKey;
      
      if (!databaseKey) {
        throw new Error('Database key not available');
      }

      const encryptedEntry = { ...entry };

      // Encrypt sensitive fields
      if (entry.password) {
        encryptedEntry.password = await this.encryptionManager.encryptText(entry.password, databaseKey.toString('base64'));
      }

      if (entry.notes) {
        encryptedEntry.notes = await this.encryptionManager.encryptText(entry.notes, databaseKey.toString('base64'));
      }

      return encryptedEntry;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt password entry
   * @param {Object} encryptedEntry - Encrypted password entry
   * @returns {Promise<Object>} Decrypted entry
   */
  async decryptPasswordEntry(encryptedEntry) {
    try {
      const databaseKey = this.databaseManager.databaseKey;
      
      if (!databaseKey) {
        throw new Error('Database key not available');
      }

      const decryptedEntry = { ...encryptedEntry };

      // Decrypt sensitive fields
      if (encryptedEntry.password) {
        decryptedEntry.password = await this.encryptionManager.decryptText(encryptedEntry.password, databaseKey.toString('base64'));
      }

      if (encryptedEntry.notes) {
        decryptedEntry.notes = await this.encryptionManager.decryptText(encryptedEntry.notes, databaseKey.toString('base64'));
      }

      return decryptedEntry;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Validate password entry
   * @param {Object} entry - Entry to validate
   */
  validatePasswordEntry(entry) {
    if (!entry.title || !entry.title.trim()) {
      throw new Error('Title is required');
    }

    if (!entry.password || !entry.password.trim()) {
      throw new Error('Password is required');
    }

    if (entry.url && !this.isValidUrl(entry.url)) {
      throw new Error('Invalid URL format');
    }

    if (!entry.category) {
      entry.category = 'General';
    }

    if (!entry.tags) {
      entry.tags = [];
    }

    if (!entry.notes) {
      entry.notes = '';
    }
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Get all tags used in password entries
   * @returns {Promise<Array>} Array of unique tags
   */
  async getAllTags() {
    try {
      this.ensureReady();
      return await this.passwordDatabase.getAllTags();
    } catch (error) {
      throw new Error(`Failed to get all tags: ${error.message}`);
    }
  }

  /**
   * Get tag statistics with usage counts
   * @returns {Promise<Object>} Object with tag names as keys and counts as values
   */
  async getTagStatistics() {
    try {
      this.ensureReady();
      return await this.passwordDatabase.getTagStatistics();
    } catch (error) {
      throw new Error(`Failed to get tag statistics: ${error.message}`);
    }
  }

  /**
   * Get entries by category
   * @param {string} category - Category name
   * @returns {Promise<Array>} Array of entries in the specified category
   */
  async getEntriesByCategory(category) {
    try {
      this.ensureReady();
      return await this.passwordDatabase.getEntriesByCategory(category);
    } catch (error) {
      throw new Error(`Failed to get entries by category: ${error.message}`);
    }
  }

  /**
   * Get entries by tag
   * @param {string} tag - Tag name
   * @returns {Promise<Array>} Array of entries with the specified tag
   */
  async getEntriesByTag(tag) {
    try {
      this.ensureReady();
      return await this.passwordDatabase.getEntriesByTag(tag);
    } catch (error) {
      throw new Error(`Failed to get entries by tag: ${error.message}`);
    }
  }

  /**
   * Get entries by multiple tags (AND operation)
   * @param {Array} tags - Array of tag names
   * @returns {Promise<Array>} Array of entries containing all specified tags
   */
  async getEntriesByTags(tags) {
    try {
      this.ensureReady();
      return await this.passwordDatabase.getEntriesByTags(tags);
    } catch (error) {
      throw new Error(`Failed to get entries by tags: ${error.message}`);
    }
  }

  /**
   * Update category for all entries matching a condition
   * @param {string} oldCategory - Current category name
   * @param {string} newCategory - New category name
   * @returns {Promise<number>} Number of entries updated
   */
  async updateCategoryForEntries(oldCategory, newCategory) {
    try {
      this.ensureReady();
      return await this.passwordDatabase.updateCategoryForEntries(oldCategory, newCategory);
    } catch (error) {
      throw new Error(`Failed to update category for entries: ${error.message}`);
    }
  }

  /**
   * Replace tag across all entries
   * @param {string} oldTag - Current tag name
   * @param {string} newTag - New tag name
   * @returns {Promise<number>} Number of entries updated
   */
  async replaceTagForEntries(oldTag, newTag) {
    try {
      this.ensureReady();
      return await this.passwordDatabase.replaceTagForEntries(oldTag, newTag);
    } catch (error) {
      throw new Error(`Failed to replace tag for entries: ${error.message}`);
    }
  }

  /**
   * Remove tag from all entries
   * @param {string} tagToRemove - Tag name to remove
   * @returns {Promise<number>} Number of entries updated
   */
  async removeTagFromEntries(tagToRemove) {
    try {
      this.ensureReady();
      return await this.passwordDatabase.removeTagFromEntries(tagToRemove);
    } catch (error) {
      throw new Error(`Failed to remove tag from entries: ${error.message}`);
    }
  }

  /**
   * Get category usage statistics
   * @returns {Promise<Object>} Object with detailed category statistics
   */
  async getCategoryStatistics() {
    try {
      this.ensureReady();
      return await this.passwordDatabase.getCategoryStatistics();
    } catch (error) {
      throw new Error(`Failed to get category statistics: ${error.message}`);
    }
  }

  /**
   * Get organizational insights
   * @returns {Promise<Object>} Object with organizational statistics and recommendations
   */
  async getOrganizationalInsights() {
    try {
      this.ensureReady();
      return await this.passwordDatabase.getOrganizationalInsights();
    } catch (error) {
      throw new Error(`Failed to get organizational insights: ${error.message}`);
    }
  }
}

module.exports = PasswordStorageManager;
