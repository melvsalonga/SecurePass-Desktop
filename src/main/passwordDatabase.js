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
      const passwordEntry = {
        id,
        title: entry.title.trim(),
        username: entry.username ? entry.username.trim() : '',
        password: entry.password,
        url: entry.url ? entry.url.trim() : '',
        notes: entry.notes ? entry.notes.trim() : '',
        category: entry.category || 'General',
        tags: Array.isArray(entry.tags) ? entry.tags : [],
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
          entry.tags.some(tag => tag.toLowerCase().includes(searchQuery))
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
}

module.exports = PasswordDatabase;
