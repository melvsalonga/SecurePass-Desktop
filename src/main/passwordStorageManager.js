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
      
      // Process entry to ensure tags are in array format
      const processedEntry = { ...entry };
      
      // Convert string tags to array format
      if (processedEntry.tags) {
        if (typeof processedEntry.tags === 'string') {
          processedEntry.tags = processedEntry.tags
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag !== '');
        } else if (!Array.isArray(processedEntry.tags)) {
          processedEntry.tags = [];
        }
      } else {
        processedEntry.tags = [];
      }
      
      return await this.passwordDatabase.addEntry(processedEntry);
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
   * Export all passwords to various formats
   * @param {string} format - Export format ('json', 'csv', 'xml')
   * @param {Object} options - Export options
   * @returns {Promise<string>} Exported data as string
   */
  async exportPasswords(format = 'json', options = {}) {
    try {
      this.ensureReady();
      
      const passwords = await this.getAllPasswords();
      const exportData = {
        exported: new Date().toISOString(),
        version: '1.0',
        count: passwords.length,
        passwords: passwords.map(entry => ({
          title: entry.title || '',
          username: entry.username || '',
          password: options.includePasswords ? entry.password : '[HIDDEN]',
          url: entry.url || '',
          notes: entry.notes || '',
          category: entry.category || 'General',
          tags: entry.tags || '',
          strength_score: entry.strength_score || 0,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
          last_used: entry.last_used
        }))
      };

      switch (format.toLowerCase()) {
        case 'json':
          return JSON.stringify(exportData, null, 2);
        
        case 'csv':
          const headers = ['Title', 'Username', 'Password', 'URL', 'Notes', 'Category', 'Tags', 'Strength Score', 'Created', 'Updated', 'Last Used'];
          let csv = headers.join(',') + '\n';
          
          exportData.passwords.forEach(entry => {
            const row = [
              `"${(entry.title || '').replace(/"/g, '""')}"`,
              `"${(entry.username || '').replace(/"/g, '""')}"`,
              `"${(entry.password || '').replace(/"/g, '""')}"`,
              `"${(entry.url || '').replace(/"/g, '""')}"`,
              `"${(entry.notes || '').replace(/"/g, '""')}"`,
              `"${(entry.category || '').replace(/"/g, '""')}"`,
              `"${(entry.tags || '').replace(/"/g, '""')}"`,
              entry.strength_score || 0,
              `"${entry.created_at || ''}"`,
              `"${entry.updated_at || ''}"`,
              `"${entry.last_used || ''}"`
            ];
            csv += row.join(',') + '\n';
          });
          
          return csv;
        
        case 'xml':
          let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
          xml += '<securepass_export>\n';
          xml += `  <metadata>\n`;
          xml += `    <exported>${exportData.exported}</exported>\n`;
          xml += `    <version>${exportData.version}</version>\n`;
          xml += `    <count>${exportData.count}</count>\n`;
          xml += `  </metadata>\n`;
          xml += '  <passwords>\n';
          
          exportData.passwords.forEach(entry => {
            xml += '    <password>\n';
            xml += `      <title><![CDATA[${entry.title || ''}]]></title>\n`;
            xml += `      <username><![CDATA[${entry.username || ''}]]></username>\n`;
            xml += `      <password><![CDATA[${entry.password || ''}]]></password>\n`;
            xml += `      <url><![CDATA[${entry.url || ''}]]></url>\n`;
            xml += `      <notes><![CDATA[${entry.notes || ''}]]></notes>\n`;
            xml += `      <category><![CDATA[${entry.category || ''}]]></category>\n`;
            xml += `      <tags><![CDATA[${entry.tags || ''}]]></tags>\n`;
            xml += `      <strength_score>${entry.strength_score || 0}</strength_score>\n`;
            xml += `      <created_at>${entry.created_at || ''}</created_at>\n`;
            xml += `      <updated_at>${entry.updated_at || ''}</updated_at>\n`;
            xml += `      <last_used>${entry.last_used || ''}</last_used>\n`;
            xml += '    </password>\n';
          });
          
          xml += '  </passwords>\n';
          xml += '</securepass_export>\n';
          
          return xml;
        
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  /**
   * Import passwords from various formats
   * @param {string} data - Import data
   * @param {string} format - Import format ('json', 'csv')
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Import results
   */
  async importPasswords(data, format = 'json', options = {}) {
    try {
      this.ensureReady();
      
      let passwords = [];
      const results = {
        imported: 0,
        skipped: 0,
        errors: [],
        duplicates: 0
      };

      switch (format.toLowerCase()) {
        case 'json':
          const jsonData = JSON.parse(data);
          passwords = jsonData.passwords || jsonData || [];
          break;
        
        case 'csv':
          const lines = data.split('\n').filter(line => line.trim());
          if (lines.length < 2) {
            throw new Error('CSV file must contain headers and at least one data row');
          }
          
          const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
          const titleIndex = headers.findIndex(h => h.includes('title') || h.includes('name'));
          const usernameIndex = headers.findIndex(h => h.includes('username') || h.includes('user') || h.includes('email'));
          const passwordIndex = headers.findIndex(h => h.includes('password'));
          const urlIndex = headers.findIndex(h => h.includes('url') || h.includes('website') || h.includes('site'));
          const notesIndex = headers.findIndex(h => h.includes('notes') || h.includes('description'));
          const categoryIndex = headers.findIndex(h => h.includes('category') || h.includes('folder') || h.includes('group'));
          
          for (let i = 1; i < lines.length; i++) {
            try {
              const values = this.parseCSVLine(lines[i]);
              if (values.length > 0) {
                const entry = {
                  title: titleIndex >= 0 ? values[titleIndex] || `Imported Entry ${i}` : `Imported Entry ${i}`,
                  username: usernameIndex >= 0 ? values[usernameIndex] || '' : '',
                  password: passwordIndex >= 0 ? values[passwordIndex] || '' : '',
                  url: urlIndex >= 0 ? values[urlIndex] || '' : '',
                  notes: notesIndex >= 0 ? values[notesIndex] || '' : '',
                  category: categoryIndex >= 0 ? values[categoryIndex] || 'Imported' : 'Imported',
                  tags: 'imported'
                };
                passwords.push(entry);
              }
            } catch (lineError) {
              results.errors.push(`Line ${i + 1}: ${lineError.message}`);
            }
          }
          break;
        
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }

      // Process each password
      for (const entry of passwords) {
        try {
          // Validate required fields
          if (!entry.title && !entry.username && !entry.password) {
            results.skipped++;
            continue;
          }

          // Check for duplicates if option is enabled
          if (options.checkDuplicates) {
            const existing = await this.searchPasswords(entry.title || entry.username);
            if (existing.length > 0) {
              const duplicate = existing.find(e => 
                e.title === entry.title && 
                e.username === entry.username && 
                e.url === entry.url
              );
              if (duplicate) {
                if (options.skipDuplicates) {
                  results.duplicates++;
                  continue;
                }
                // Update existing entry if not skipping duplicates
                await this.updatePassword(duplicate.id, {
                  ...entry,
                  updated_at: new Date().toISOString()
                });
                results.imported++;
                continue;
              }
            }
          }

          // Add new entry
          const newEntry = {
            title: entry.title || 'Untitled',
            username: entry.username || '',
            password: entry.password || '',
            url: entry.url || '',
            notes: entry.notes || '',
            category: entry.category || 'Imported',
            tags: entry.tags || 'imported',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          await this.addPassword(newEntry);
          results.imported++;
        } catch (entryError) {
          results.errors.push(`Entry "${entry.title || 'Unknown'}": ${entryError.message}`);
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  /**
   * Parse CSV line handling quoted values with commas
   * @param {string} line - CSV line to parse
   * @returns {Array<string>} Array of values
   */
  parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        values.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add the last value
    values.push(current);
    return values;
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

  /**
   * Advanced search with multiple criteria and ranking
   * @param {Object} searchCriteria - Comprehensive search criteria
   * @returns {Promise<Array>} Ranked search results
   */
  async advancedSearch(searchCriteria) {
    try {
      this.ensureReady();
      return await this.passwordDatabase.advancedSearch(searchCriteria);
    } catch (error) {
      throw new Error(`Failed to perform advanced search: ${error.message}`);
    }
  }

  /**
   * Get search suggestions based on partial input
   * @param {string} input - Partial search input
   * @param {number} limit - Maximum number of suggestions
   * @returns {Promise<Array>} Array of search suggestions
   */
  async getSearchSuggestions(input, limit = 10) {
    try {
      this.ensureReady();
      return await this.passwordDatabase.getSearchSuggestions(input, limit);
    } catch (error) {
      throw new Error(`Failed to get search suggestions: ${error.message}`);
    }
  }

  /**
   * Get entries with duplicate passwords
   * @returns {Promise<Array>} Array of entries with duplicate passwords
   */
  async getDuplicatePasswords() {
    try {
      this.ensureReady();
      return await this.passwordDatabase.getDuplicatePasswords();
    } catch (error) {
      throw new Error(`Failed to get duplicate passwords: ${error.message}`);
    }
  }

  /**
   * Get entries that haven't been updated recently
   * @param {number} daysThreshold - Number of days to consider as "old"
   * @returns {Promise<Array>} Array of old entries
   */
  async getOldEntries(daysThreshold = 90) {
    try {
      this.ensureReady();
      return await this.passwordDatabase.getOldEntries(daysThreshold);
    } catch (error) {
      throw new Error(`Failed to get old entries: ${error.message}`);
    }
  }

  /**
   * Get comprehensive security analysis of all passwords
   * @returns {Promise<Object>} Security analysis report
   */
  async getSecurityAnalysis() {
    try {
      this.ensureReady();
      return await this.passwordDatabase.getSecurityAnalysis();
    } catch (error) {
      throw new Error(`Failed to get security analysis: ${error.message}`);
    }
  }
}

module.exports = PasswordStorageManager;
