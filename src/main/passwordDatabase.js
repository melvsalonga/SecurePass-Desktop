/**
 * Password Database Manager
 * Handles encrypted storage and retrieval of password entries with data integrity
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { app } = require('electron');

class PasswordDatabase {
  constructor(encryptionManager, databaseKey) {
    this.encryptionManager = encryptionManager;
    this.databaseKey = databaseKey;
    this.dbPath = this.getDatabasePath();
    this.passwords = new Map();
    this.categories = new Set(['General', 'Social Media', 'Banking', 'Work', 'Shopping', 'Email', 'Entertainment']);
    this.metadata = {
      version: '1.0',
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      entryCount: 0
    };
    this.loadDatabase();
  }

  /**
   * Get encrypted database file path
   * @returns {string} Database file path
   */
  getDatabasePath() {
    const userDataPath = app.getPath('userData');
    const dbDir = path.join(userDataPath, 'secure_storage');
    
    // Ensure directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    return path.join(dbDir, 'passwords.enc');
  }

  /**
   * Load encrypted database from file
   */
  async loadDatabase() {
    try {
      if (!fs.existsSync(this.dbPath)) {
        // Initialize empty database
        await this.saveDatabase();
        console.log('Initialized new password database');
        return;
      }

      const encryptedData = fs.readFileSync(this.dbPath);
      const decryptedData = await this.decryptDatabase(encryptedData);
      
      const parsedData = JSON.parse(decryptedData);
      
      // Validate database structure
      this.validateDatabaseStructure(parsedData);
      
      // Load data
      this.passwords = new Map(parsedData.passwords || []);
      this.categories = new Set(parsedData.categories || this.categories);
      this.metadata = { ...this.metadata, ...parsedData.metadata };
      
      console.log(`Loaded ${this.passwords.size} password entries from encrypted database`);
    } catch (error) {
      console.error('Error loading password database:', error);
      // Initialize empty database on error
      this.passwords = new Map();
      this.categories = new Set(['General', 'Social Media', 'Banking', 'Work', 'Shopping', 'Email', 'Entertainment']);
    }
  }

  /**
   * Save encrypted database to file
   */
  async saveDatabase() {
    try {
      // Update metadata
      this.metadata.lastModified = new Date().toISOString();
      this.metadata.entryCount = this.passwords.size;
      
      const databaseData = {
        version: this.metadata.version,
        metadata: this.metadata,
        passwords: Array.from(this.passwords.entries()),
        categories: Array.from(this.categories)
      };
      
      const jsonData = JSON.stringify(databaseData, null, 2);
      const encryptedData = await this.encryptDatabase(jsonData);
      
      // Write to temporary file first, then rename (atomic operation)
      const tempPath = this.dbPath + '.tmp';
      fs.writeFileSync(tempPath, encryptedData);
      fs.renameSync(tempPath, this.dbPath);
      
      console.log(`Saved ${this.passwords.size} password entries to encrypted database`);
    } catch (error) {
      console.error('Error saving password database:', error);
      throw new Error(`Failed to save database: ${error.message}`);
    }
  }

  /**
   * Encrypt database content
   * @param {string} data - Data to encrypt
   * @returns {Buffer} Encrypted data
   */
  async encryptDatabase(data) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', this.databaseKey, iv);
      
      let encrypted = cipher.update(data, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      const authTag = cipher.getAuthTag();
      
      // Create encrypted package with integrity check
      const encryptedPackage = {
        version: '1.0',
        algorithm: 'aes-256-gcm',
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        encrypted: encrypted.toString('base64'),
        checksum: crypto.createHash('sha256').update(data).digest('base64')
      };
      
      return Buffer.from(JSON.stringify(encryptedPackage));
    } catch (error) {
      throw new Error(`Database encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt database content
   * @param {Buffer} encryptedData - Encrypted data
   * @returns {string} Decrypted data
   */
  async decryptDatabase(encryptedData) {
    try {
      const encryptedPackage = JSON.parse(encryptedData.toString());
      
      // Validate package structure
      if (!encryptedPackage.version || !encryptedPackage.encrypted || !encryptedPackage.iv || !encryptedPackage.authTag) {
        throw new Error('Invalid encrypted database format');
      }
      
      const iv = Buffer.from(encryptedPackage.iv, 'base64');
      const authTag = Buffer.from(encryptedPackage.authTag, 'base64');
      const encrypted = Buffer.from(encryptedPackage.encrypted, 'base64');
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.databaseKey, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      const decryptedData = decrypted.toString('utf8');
      
      // Verify data integrity
      if (encryptedPackage.checksum) {
        const calculatedChecksum = crypto.createHash('sha256').update(decryptedData).digest('base64');
        if (calculatedChecksum !== encryptedPackage.checksum) {
          throw new Error('Database integrity check failed');
        }
      }
      
      return decryptedData;
    } catch (error) {
      throw new Error(`Database decryption failed: ${error.message}`);
    }
  }

  /**
   * Validate database structure
   * @param {Object} data - Database data
   */
  validateDatabaseStructure(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid database structure');
    }
    
    if (data.version && data.version !== '1.0') {
      throw new Error('Unsupported database version');
    }
    
    if (data.passwords && !Array.isArray(data.passwords)) {
      throw new Error('Invalid passwords data structure');
    }
    
    if (data.categories && !Array.isArray(data.categories)) {
      throw new Error('Invalid categories data structure');
    }
  }

  /**
   * Add a new password entry
   * @param {Object} entry - Password entry
   * @returns {Promise<Object>} Created entry with ID
   */
  async addEntry(entry) {
    try {
      // Validate entry
      this.validateEntry(entry);
      
      // Generate unique ID
      const id = this.generateId();
      
      // Create entry with metadata
      const passwordEntryDetails = {...entry};
      passwordEntryDetails.category = this.validateAndAddCategory(passwordEntryDetails.category);
      passwordEntryDetails.tags = (passwordEntryDetails.tags || []).map(tag => tag.trim()).filter(tag => tag !== '');
      
      const passwordEntry = {
        id,
        title: passwordEntryDetails.title.trim(),
        username: passwordEntryDetails.username ? passwordEntryDetails.username.trim() : '',
        password: passwordEntryDetails.password,
        url: passwordEntryDetails.url ? passwordEntryDetails.url.trim() : '',
        notes: passwordEntryDetails.notes ? passwordEntryDetails.notes.trim() : '',
        category: passwordEntryDetails.category,
        tags: passwordEntryDetails.tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      };
      
      // Encrypt sensitive fields
      const encryptedEntry = await this.encryptEntry(passwordEntry);
      
      // Store in memory
      this.passwords.set(id, encryptedEntry);
      
      // Save to disk
      await this.saveDatabase();
      
      console.log(`Password entry added: ${entry.title}`);
      
      return {
        id,
        title: passwordEntry.title,
        username: passwordEntry.username,
        url: passwordEntry.url,
        category: passwordEntry.category,
        tags: passwordEntry.tags,
        createdAt: passwordEntry.createdAt,
        updatedAt: passwordEntry.updatedAt
      };
    } catch (error) {
      throw new Error(`Failed to add password entry: ${error.message}`);
    }
  }

  /**
   * Validate and add category if new
   * @param {string} category - Category name
   * @returns {string} Validated category
   */
  validateAndAddCategory(category) {
    category = category ? category.trim() : 'General';
    if (!this.categories.has(category)) {
      this.categories.add(category);
      this.saveDatabase();
    }
    return category;
  }

  /**
   * Get all password entries (decrypted)
   * @returns {Promise<Array>} Array of decrypted password entries
   */
  async getAllEntries() {
    try {
      const decryptedEntries = [];
      
      for (const [id, encryptedEntry] of this.passwords) {
        const decryptedEntry = await this.decryptEntry(encryptedEntry);
        decryptedEntries.push(decryptedEntry);
      }
      
      // Sort by title
      decryptedEntries.sort((a, b) => a.title.localeCompare(b.title));
      
      return decryptedEntries;
    } catch (error) {
      throw new Error(`Failed to retrieve password entries: ${error.message}`);
    }
  }

  /**
   * Get password entry by ID
   * @param {string} id - Entry ID
   * @returns {Promise<Object|null>} Decrypted password entry or null
   */
  async getEntryById(id) {
    try {
      const encryptedEntry = this.passwords.get(id);
      
      if (!encryptedEntry) {
        return null;
      }
      
      return await this.decryptEntry(encryptedEntry);
    } catch (error) {
      throw new Error(`Failed to retrieve password entry: ${error.message}`);
    }
  }

  /**
   * Update password entry
   * @param {string} id - Entry ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated entry
   */
  async updateEntry(id, updates) {
    try {
      const encryptedEntry = this.passwords.get(id);
      
      if (!encryptedEntry) {
        throw new Error('Password entry not found');
      }
      
      // Decrypt current entry
      const currentEntry = await this.decryptEntry(encryptedEntry);
      
      // Merge updates
      const updatedEntry = {
        ...currentEntry,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString(),
        version: currentEntry.version + 1
      };
      
      // Validate updated entry
      this.validateEntry(updatedEntry);
      
      // Encrypt and store
      const newEncryptedEntry = await this.encryptEntry(updatedEntry);
      this.passwords.set(id, newEncryptedEntry);
      
      // Save to disk
      await this.saveDatabase();
      
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
      throw new Error(`Failed to update password entry: ${error.message}`);
    }
  }

  /**
   * Delete password entry
   * @param {string} id - Entry ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteEntry(id) {
    try {
      const encryptedEntry = this.passwords.get(id);
      
      if (!encryptedEntry) {
        throw new Error('Password entry not found');
      }
      
      // Remove from memory
      this.passwords.delete(id);
      
      // Save to disk
      await this.saveDatabase();
      
      console.log(`Password entry deleted: ${id}`);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete password entry: ${error.message}`);
    }
  }

  /**
   * Search password entries
   * @param {string} query - Search query
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} Matching entries
   */
  async searchEntries(query, filters = {}) {
    try {
      const allEntries = await this.getAllEntries();
      const searchQuery = query.toLowerCase();
      
      let filteredEntries = allEntries;
      
      // Apply text search
      if (query) {
        filteredEntries = filteredEntries.filter(entry => 
          entry.title.toLowerCase().includes(searchQuery) ||
          entry.username.toLowerCase().includes(searchQuery) ||
          entry.url.toLowerCase().includes(searchQuery) ||
          entry.notes.toLowerCase().includes(searchQuery) ||
          (entry.tags || []).some(tag => tag.toLowerCase().includes(searchQuery))
        );
      }
      
      // Apply category filter
      if (filters.category && filters.category !== 'All') {
        filteredEntries = filteredEntries.filter(entry => 
          entry.category === filters.category
        );
      }
      
      // Apply tags filter
      if (filters.tags && filters.tags.length > 0) {
        filteredEntries = filteredEntries.filter(entry => 
          filters.tags.some(tag => entry.tags.includes(tag))
        );
      }
      
      // Apply date range filter
      if (filters.dateFrom || filters.dateTo) {
        filteredEntries = filteredEntries.filter(entry => {
          const entryDate = new Date(entry.createdAt);
          const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
          const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
          
          if (fromDate && entryDate < fromDate) return false;
          if (toDate && entryDate > toDate) return false;
          
          return true;
        });
      }
      
      return filteredEntries;
    } catch (error) {
      throw new Error(`Failed to search password entries: ${error.message}`);
    }
  }

  /**
   * Get database statistics
   * @returns {Promise<Object>} Database statistics
   */
  async getStatistics() {
    try {
      const entries = await this.getAllEntries();
      const categoryStats = {};
      
      for (const category of this.categories) {
        categoryStats[category] = entries.filter(entry => entry.category === category).length;
      }
      
      return {
        totalEntries: entries.length,
        categories: Array.from(this.categories),
        categoryStats,
        lastModified: this.metadata.lastModified,
        databaseSize: fs.existsSync(this.dbPath) ? fs.statSync(this.dbPath).size : 0
      };
    } catch (error) {
      throw new Error(`Failed to get database statistics: ${error.message}`);
    }
  }

  /**
   * Encrypt password entry
   * @param {Object} entry - Password entry
   * @returns {Promise<Object>} Encrypted entry
   */
  async encryptEntry(entry) {
    try {
      const encryptedEntry = { ...entry };
      
      // Encrypt sensitive fields
      encryptedEntry.password = await this.encryptionManager.encryptText(
        entry.password, 
        this.databaseKey.toString('base64')
      );
      
      if (entry.notes) {
        encryptedEntry.notes = await this.encryptionManager.encryptText(
          entry.notes, 
          this.databaseKey.toString('base64')
        );
      }
      
      return encryptedEntry;
    } catch (error) {
      throw new Error(`Entry encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt password entry
   * @param {Object} encryptedEntry - Encrypted password entry
   * @returns {Promise<Object>} Decrypted entry
   */
  async decryptEntry(encryptedEntry) {
    try {
      const decryptedEntry = { ...encryptedEntry };
      
      // Decrypt sensitive fields
      if (encryptedEntry.password) {
        decryptedEntry.password = await this.encryptionManager.decryptText(
          encryptedEntry.password, 
          this.databaseKey.toString('base64')
        );
      }
      
      if (encryptedEntry.notes) {
        decryptedEntry.notes = await this.encryptionManager.decryptText(
          encryptedEntry.notes, 
          this.databaseKey.toString('base64')
        );
      }
      
      return decryptedEntry;
    } catch (error) {
      throw new Error(`Entry decryption failed: ${error.message}`);
    }
  }

  /**
   * Validate password entry
   * @param {Object} entry - Entry to validate
   */
  validateEntry(entry) {
    if (!entry.title || !entry.title.trim()) {
      throw new Error('Title is required');
    }
    
    if (!entry.password || !entry.password.trim()) {
      throw new Error('Password is required');
    }
    
    if (entry.url && !this.isValidUrl(entry.url)) {
      throw new Error('Invalid URL format');
    }
    
    if (entry.category && !this.categories.has(entry.category)) {
      // Add new category if it doesn't exist
      this.categories.add(entry.category);
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
   * Get all categories
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
   * Remove category
   * @param {string} category - Category name
   */
  removeCategory(category) {
    if (category !== 'General') { // Protect default category
      this.categories.delete(category);
    }
  }

  /**
   * Get all tags used in password entries
   * @returns {Promise<Array>} Array of unique tags
   */
  async getAllTags() {
    try {
      const entries = await this.getAllEntries();
      const tagsSet = new Set();
      
      entries.forEach(entry => {
        (entry.tags || []).forEach(tag => {
          if (tag && tag.trim()) {
            tagsSet.add(tag.trim());
          }
        });
      });
      
      return Array.from(tagsSet).sort();
    } catch (error) {
      throw new Error(`Failed to get tags: ${error.message}`);
    }
  }

  /**
   * Get tag statistics with usage counts
   * @returns {Promise<Object>} Object with tag names as keys and counts as values
   */
  async getTagStatistics() {
    try {
      const entries = await this.getAllEntries();
      const tagCounts = {};
      
      entries.forEach(entry => {
        (entry.tags || []).forEach(tag => {
          if (tag && tag.trim()) {
            const trimmedTag = tag.trim();
            tagCounts[trimmedTag] = (tagCounts[trimmedTag] || 0) + 1;
          }
        });
      });
      
      return tagCounts;
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
      const entries = await this.getAllEntries();
      return entries.filter(entry => entry.category === category);
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
      const entries = await this.getAllEntries();
      return entries.filter(entry => entry.tags.includes(tag));
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
      const entries = await this.getAllEntries();
      return entries.filter(entry => 
        tags.every(tag => entry.tags.includes(tag))
      );
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
      const entries = await this.getAllEntries();
      let updatedCount = 0;
      
      for (const entry of entries) {
        if (entry.category === oldCategory) {
          await this.updateEntry(entry.id, { category: newCategory });
          updatedCount++;
        }
      }
      
      return updatedCount;
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
      const entries = await this.getAllEntries();
      let updatedCount = 0;
      
      for (const entry of entries) {
        if (entry.tags.includes(oldTag)) {
          const updatedTags = entry.tags.map(tag => tag === oldTag ? newTag : tag);
          await this.updateEntry(entry.id, { tags: updatedTags });
          updatedCount++;
        }
      }
      
      return updatedCount;
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
      const entries = await this.getAllEntries();
      let updatedCount = 0;
      
      for (const entry of entries) {
        if (entry.tags.includes(tagToRemove)) {
          const updatedTags = entry.tags.filter(tag => tag !== tagToRemove);
          await this.updateEntry(entry.id, { tags: updatedTags });
          updatedCount++;
        }
      }
      
      return updatedCount;
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
      const entries = await this.getAllEntries();
      const categoryStats = {};
      
      // Initialize all categories with 0 count
      for (const category of this.categories) {
        categoryStats[category] = {
          count: 0,
          percentage: 0,
          lastUsed: null,
          averagePasswordAge: 0
        };
      }
      
      // Calculate statistics
      entries.forEach(entry => {
        if (categoryStats[entry.category]) {
          categoryStats[entry.category].count++;
          
          const entryDate = new Date(entry.createdAt);
          if (!categoryStats[entry.category].lastUsed || 
              entryDate > new Date(categoryStats[entry.category].lastUsed)) {
            categoryStats[entry.category].lastUsed = entry.createdAt;
          }
        }
      });
      
      // Calculate percentages
      const totalEntries = entries.length;
      if (totalEntries > 0) {
        Object.keys(categoryStats).forEach(category => {
          categoryStats[category].percentage = 
            Math.round((categoryStats[category].count / totalEntries) * 100);
        });
      }
      
      return categoryStats;
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
      const entries = await this.getAllEntries();
      const categoryStats = await this.getCategoryStatistics();
      const tagStats = await this.getTagStatistics();
      const allTags = await this.getAllTags();
      
      const insights = {
        totalEntries: entries.length,
        totalCategories: this.categories.size,
        totalTags: allTags.length,
        categoryDistribution: categoryStats,
        tagDistribution: tagStats,
        mostUsedCategory: null,
        mostUsedTag: null,
        untaggedEntries: 0,
        recommendations: []
      };
      
      // Find most used category
      let maxCategoryCount = 0;
      Object.keys(categoryStats).forEach(category => {
        if (categoryStats[category].count > maxCategoryCount) {
          maxCategoryCount = categoryStats[category].count;
          insights.mostUsedCategory = category;
        }
      });
      
      // Find most used tag
      let maxTagCount = 0;
      Object.keys(tagStats).forEach(tag => {
        if (tagStats[tag] > maxTagCount) {
          maxTagCount = tagStats[tag];
          insights.mostUsedTag = tag;
        }
      });
      
      // Count untagged entries
      insights.untaggedEntries = entries.filter(entry => !entry.tags || entry.tags.length === 0).length;
      
      // Generate recommendations
      if (insights.untaggedEntries > 0) {
        insights.recommendations.push(
          `Consider adding tags to ${insights.untaggedEntries} entries for better organization`
        );
      }
      
      if (insights.totalCategories > 10) {
        insights.recommendations.push(
          'You have many categories. Consider consolidating similar categories for better organization'
        );
      }
      
      if (insights.totalTags > 50) {
        insights.recommendations.push(
          'You have many tags. Consider reviewing and consolidating similar tags'
        );
      }
      
      return insights;
    } catch (error) {
      throw new Error(`Failed to get organizational insights: ${error.message}`);
    }
  }
}

module.exports = PasswordDatabase;
