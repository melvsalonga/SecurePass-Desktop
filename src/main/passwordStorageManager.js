/**
 * Password Storage Manager
 * Handles encrypted storage and retrieval of password entries
 */

const crypto = require('node:crypto');

class PasswordStorageManager {
  constructor(databaseManager, encryptionManager) {
    this.databaseManager = databaseManager;
    this.encryptionManager = encryptionManager;
    this.passwords = [];
    this.categories = new Set(['General', 'Social Media', 'Banking', 'Work', 'Shopping', 'Email']);
    this.loadPasswords();
  }

  /**
   * Load passwords from storage
   */
  loadPasswords() {
    try {
      // For now, use in-memory storage
      // In a real implementation, this would load from encrypted database
      this.passwords = [];
    } catch (error) {
      console.error('Error loading passwords:', error);
      this.passwords = [];
    }
  }

  /**
   * Save passwords to storage
   */
  savePasswords() {
    try {
      // For now, just log that we're saving
      // In a real implementation, this would save to encrypted database
      console.log(`Saving ${this.passwords.length} password entries`);
    } catch (error) {
      console.error('Error saving passwords:', error);
    }
  }

  /**
   * Add a new password entry
   * @param {Object} entry - Password entry
   * @returns {Promise<Object>} Created entry with ID
   */
  async addPassword(entry) {
    try {
      // Validate entry
      this.validatePasswordEntry(entry);

      // Generate unique ID
      const id = this.generateId();

      // Encrypt sensitive fields
      const encryptedEntry = await this.encryptPasswordEntry({
        ...entry,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Add to storage
      this.passwords.push(encryptedEntry);
      this.savePasswords();

      console.log(`Password entry added: ${entry.title}`);

      return {
        id,
        title: entry.title,
        username: entry.username,
        url: entry.url,
        category: entry.category,
        tags: entry.tags,
        createdAt: encryptedEntry.createdAt,
        updatedAt: encryptedEntry.updatedAt
      };
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
      const decryptedPasswords = [];

      for (const encryptedEntry of this.passwords) {
        const decryptedEntry = await this.decryptPasswordEntry(encryptedEntry);
        decryptedPasswords.push(decryptedEntry);
      }

      return decryptedPasswords;
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
      const encryptedEntry = this.passwords.find(entry => entry.id === id);
      
      if (!encryptedEntry) {
        return null;
      }

      return await this.decryptPasswordEntry(encryptedEntry);
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
      const index = this.passwords.findIndex(entry => entry.id === id);
      
      if (index === -1) {
        throw new Error('Password entry not found');
      }

      // Get current entry and decrypt
      const currentEntry = await this.decryptPasswordEntry(this.passwords[index]);
      
      // Merge updates
      const updatedEntry = {
        ...currentEntry,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString()
      };

      // Validate updated entry
      this.validatePasswordEntry(updatedEntry);

      // Encrypt and store
      const encryptedEntry = await this.encryptPasswordEntry(updatedEntry);
      this.passwords[index] = encryptedEntry;
      this.savePasswords();

      console.log(`Password entry updated: ${updatedEntry.title}`);

      return {
        id: updatedEntry.id,
        title: updatedEntry.title,
        username: updatedEntry.username,
        url: updatedEntry.url,
        category: updatedEntry.category,
        tags: updatedEntry.tags,
        createdAt: updatedEntry.createdAt,
        updatedAt: updatedEntry.updatedAt
      };
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
      const index = this.passwords.findIndex(entry => entry.id === id);
      
      if (index === -1) {
        throw new Error('Password entry not found');
      }

      const entry = this.passwords[index];
      this.passwords.splice(index, 1);
      this.savePasswords();

      console.log(`Password entry deleted: ${id}`);
      return true;
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
      let allPasswords = await this.getAllPasswords();

      // Apply text search
      if (query && query.trim()) {
        const searchTerm = query.toLowerCase().trim();
        allPasswords = allPasswords.filter(entry => {
          return (
            entry.title.toLowerCase().includes(searchTerm) ||
            entry.username.toLowerCase().includes(searchTerm) ||
            entry.url.toLowerCase().includes(searchTerm) ||
            entry.notes.toLowerCase().includes(searchTerm) ||
            entry.tags.some(tag => tag.toLowerCase().includes(searchTerm))
          );
        });
      }

      // Apply filters
      if (filters.category) {
        allPasswords = allPasswords.filter(entry => entry.category === filters.category);
      }

      if (filters.tags && filters.tags.length > 0) {
        allPasswords = allPasswords.filter(entry => 
          filters.tags.some(tag => entry.tags.includes(tag))
        );
      }

      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        allPasswords = allPasswords.filter(entry => 
          new Date(entry.createdAt) >= startDate
        );
      }

      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        allPasswords = allPasswords.filter(entry => 
          new Date(entry.createdAt) <= endDate
        );
      }

      return allPasswords;
    } catch (error) {
      throw new Error(`Failed to search passwords: ${error.message}`);
    }
  }

  /**
   * Get available categories
   * @returns {Array} Array of categories
   */
  getCategories() {
    return Array.from(this.categories);
  }

  /**
   * Add new category
   * @param {string} category - Category name
   */
  addCategory(category) {
    if (category && category.trim()) {
      this.categories.add(category.trim());
    }
  }

  /**
   * Get password statistics
   * @returns {Promise<Object>} Password statistics
   */
  async getStatistics() {
    try {
      const allPasswords = await this.getAllPasswords();
      
      const stats = {
        totalPasswords: allPasswords.length,
        categoryCounts: {},
        averagePasswordAge: 0,
        weakPasswords: 0,
        duplicatePasswords: 0,
        oldestPassword: null,
        newestPassword: null
      };

      if (allPasswords.length === 0) {
        return stats;
      }

      // Category counts
      allPasswords.forEach(entry => {
        stats.categoryCounts[entry.category] = (stats.categoryCounts[entry.category] || 0) + 1;
      });

      // Password age analysis
      const now = Date.now();
      let totalAge = 0;
      let oldestDate = now;
      let newestDate = 0;

      allPasswords.forEach(entry => {
        const createdAt = new Date(entry.createdAt).getTime();
        totalAge += now - createdAt;
        
        if (createdAt < oldestDate) {
          oldestDate = createdAt;
          stats.oldestPassword = entry.title;
        }
        
        if (createdAt > newestDate) {
          newestDate = createdAt;
          stats.newestPassword = entry.title;
        }
      });

      stats.averagePasswordAge = Math.floor(totalAge / allPasswords.length / (1000 * 60 * 60 * 24)); // Days

      // TODO: Implement weak password detection
      // TODO: Implement duplicate password detection

      return stats;
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
}

module.exports = PasswordStorageManager;
