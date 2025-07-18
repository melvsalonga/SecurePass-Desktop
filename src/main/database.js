// const Database = require('better-sqlite3'); // Commented out for now
const path = require('node:path');
const fs = require('node:fs');
const { app } = require('electron');
const EncryptionManager = require('./encryption');

/**
 * SecurePass Database Manager
 * 
 * Manages encrypted SQLite database with user data, passwords, and settings
 * Implements WAL mode for better performance and concurrent access
 */
class DatabaseManager {
  constructor() {
    this.db = null;
    this.encryptionManager = new EncryptionManager();
    this.databaseKey = null;
    this.isInitialized = false;
    this.dbPath = this.getDatabasePath();
    this.schema = this.getSchema();
  }

  /**
   * Get database file path
   * @returns {string} Database file path
   */
  getDatabasePath() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'securepass.db');
  }

  /**
   * Get database schema
   * @returns {Object} Database schema definitions
   */
  getSchema() {
    return {
      // Users table - stores master password hash and encryption metadata
      users: `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          master_password_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      
      // Encryption keys table - stores encrypted database keys
      encryption_keys: `
        CREATE TABLE IF NOT EXISTS encryption_keys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          key_data TEXT NOT NULL,
          key_version INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `,
      
      // Password entries table - stores encrypted password data
      password_entries: `
        CREATE TABLE IF NOT EXISTS password_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          username TEXT,
          password_encrypted TEXT NOT NULL,
          url TEXT,
          notes_encrypted TEXT,
          category TEXT,
          tags TEXT,
          strength_score INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_used DATETIME,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `,
      
      // Password history table - tracks password changes
      password_history: `
        CREATE TABLE IF NOT EXISTS password_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entry_id INTEGER NOT NULL,
          password_encrypted TEXT NOT NULL,
          changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (entry_id) REFERENCES password_entries (id) ON DELETE CASCADE
        )
      `,
      
      // Generation history table - tracks password generation
      generation_history: `
        CREATE TABLE IF NOT EXISTS generation_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          password_length INTEGER,
          character_types TEXT,
          strength_score INTEGER,
          entropy REAL,
          generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `,
      
      // Settings table - stores user preferences
      settings: `
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          setting_key TEXT NOT NULL,
          setting_value TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE(user_id, setting_key)
        )
      `,
      
      // Security events table - logs security-related events
      security_events: `
        CREATE TABLE IF NOT EXISTS security_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          event_type TEXT NOT NULL,
          event_data TEXT,
          severity TEXT DEFAULT 'info',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
        )
      `,
      
      // Backup metadata table - tracks backup information
      backup_metadata: `
        CREATE TABLE IF NOT EXISTS backup_metadata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          backup_path TEXT NOT NULL,
          backup_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `
    };
  }

  /**
   * Initialize database connection
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Ensure database directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Open database connection
      this.db = new Database(this.dbPath);
      
      // Configure database settings
      this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging
      this.db.pragma('synchronous = NORMAL'); // Good balance of speed and safety
      this.db.pragma('cache_size = 10000'); // 10MB cache
      this.db.pragma('temp_store = MEMORY'); // Store temp tables in memory
      this.db.pragma('mmap_size = 268435456'); // 256MB memory map
      
      // Create tables if they don't exist
      await this.createTables();
      
      // Create indexes for better performance
      await this.createIndexes();
      
      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  /**
   * Create database tables
   * @returns {Promise<void>}
   */
  async createTables() {
    try {
      // Create all tables
      for (const [tableName, sql] of Object.entries(this.schema)) {
        this.db.exec(sql);
      }
      
      console.log('Database tables created successfully');
    } catch (error) {
      throw new Error(`Table creation failed: ${error.message}`);
    }
  }

  /**
   * Create database indexes
   * @returns {Promise<void>}
   */
  async createIndexes() {
    try {
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_password_entries_user_id ON password_entries(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_password_entries_category ON password_entries(category)',
        'CREATE INDEX IF NOT EXISTS idx_password_entries_updated_at ON password_entries(updated_at)',
        'CREATE INDEX IF NOT EXISTS idx_password_history_entry_id ON password_history(entry_id)',
        'CREATE INDEX IF NOT EXISTS idx_generation_history_user_id ON generation_history(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_settings_user_id_key ON settings(user_id, setting_key)',
        'CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type)',
        'CREATE INDEX IF NOT EXISTS idx_backup_metadata_user_id ON backup_metadata(user_id)'
      ];
      
      for (const index of indexes) {
        this.db.exec(index);
      }
      
      console.log('Database indexes created successfully');
    } catch (error) {
      throw new Error(`Index creation failed: ${error.message}`);
    }
  }

  /**
   * Set database encryption key
   * @param {Buffer} key - Database encryption key
   */
  setDatabaseKey(key) {
    this.databaseKey = key;
  }

  /**
   * Create a new user
   * @param {string} username - Username
   * @param {string} masterPassword - Master password
   * @returns {Promise<Object>} Created user information
   */
  async createUser(username, masterPassword) {
    try {
      // Generate salt for password hashing
      const salt = this.encryptionManager.generateSalt();
      
      // Hash the master password
      const masterPasswordHash = await this.encryptionManager.hashPassword(masterPassword, salt);
      
      // Create database key
      const databaseKeyPackage = await this.encryptionManager.createDatabaseKey(masterPassword, salt);
      
      // Begin transaction
      const transaction = this.db.transaction(() => {
        // Insert user
        const userStmt = this.db.prepare(`
          INSERT INTO users (username, master_password_hash, salt)
          VALUES (?, ?, ?)
        `);
        
        const userResult = userStmt.run(
          username,
          masterPasswordHash.toString('base64'),
          salt.toString('base64')
        );
        
        // Insert encryption key
        const keyStmt = this.db.prepare(`
          INSERT INTO encryption_keys (user_id, key_data)
          VALUES (?, ?)
        `);
        
        keyStmt.run(userResult.lastInsertRowid, JSON.stringify(databaseKeyPackage));
        
        return {
          id: userResult.lastInsertRowid,
          username,
          created_at: new Date().toISOString()
        };
      });
      
      const result = transaction();
      
      // Log security event
      await this.logSecurityEvent(result.id, 'user_created', {
        username
      });
      
      return result;
    } catch (error) {
      throw new Error(`User creation failed: ${error.message}`);
    }
  }

  /**
   * Authenticate user with master password
   * @param {string} username - Username
   * @param {string} masterPassword - Master password
   * @returns {Promise<Object>} User information and database key
   */
  async authenticateUser(username, masterPassword) {
    try {
      // Get user from database
      const userStmt = this.db.prepare(`
        SELECT id, username, master_password_hash, salt
        FROM users
        WHERE username = ?
      `);
      
      const user = userStmt.get(username);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify password
      const salt = Buffer.from(user.salt, 'base64');
      const storedHash = Buffer.from(user.master_password_hash, 'base64');
      
      const isValid = await this.encryptionManager.verifyPassword(masterPassword, storedHash, salt);
      
      if (!isValid) {
        // Log failed authentication
        await this.logSecurityEvent(user.id, 'authentication_failed', {
          username
        });
        throw new Error('Invalid password');
      }
      
      // Get encryption key
      const keyStmt = this.db.prepare(`
        SELECT key_data
        FROM encryption_keys
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 1
      `);
      
      const keyRow = keyStmt.get(user.id);
      
      if (!keyRow) {
        throw new Error('Encryption key not found');
      }
      
      const keyPackage = JSON.parse(keyRow.key_data);
      const databaseKey = await this.encryptionManager.decryptDatabaseKey(keyPackage, masterPassword);
      
      // Set database key for this session
      this.setDatabaseKey(databaseKey);
      
      // Log successful authentication
      await this.logSecurityEvent(user.id, 'authentication_success', {
        username
      });
      
      return {
        id: user.id,
        username: user.username,
        authenticated: true
      };
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Save password entry
   * @param {number} userId - User ID
   * @param {Object} entryData - Password entry data
   * @returns {Promise<Object>} Saved entry information
   */
  async savePasswordEntry(userId, entryData) {
    try {
      if (!this.databaseKey) {
        throw new Error('Database not unlocked');
      }
      
      // Encrypt sensitive data
      const encryptedPassword = await this.encryptionManager.encryptText(
        entryData.password,
        this.databaseKey.toString('base64')
      );
      
      let encryptedNotes = null;
      if (entryData.notes) {
        encryptedNotes = await this.encryptionManager.encryptText(
          entryData.notes,
          this.databaseKey.toString('base64')
        );
      }
      
      // Insert password entry
      const stmt = this.db.prepare(`
        INSERT INTO password_entries (
          user_id, title, username, password_encrypted, url, notes_encrypted,
          category, tags, strength_score
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        userId,
        entryData.title,
        entryData.username || null,
        JSON.stringify(encryptedPassword),
        entryData.url || null,
        encryptedNotes ? JSON.stringify(encryptedNotes) : null,
        entryData.category || null,
        entryData.tags ? JSON.stringify(entryData.tags) : null,
        entryData.strengthScore || null
      );
      
      // Log security event
      await this.logSecurityEvent(userId, 'password_entry_created', {
        entryId: result.lastInsertRowid,
        title: entryData.title
      });
      
      return {
        id: result.lastInsertRowid,
        title: entryData.title,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Password entry save failed: ${error.message}`);
    }
  }

  /**
   * Get password entries for user
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of password entries
   */
  async getPasswordEntries(userId, options = {}) {
    try {
      if (!this.databaseKey) {
        throw new Error('Database not unlocked');
      }
      
      let query = `
        SELECT id, title, username, password_encrypted, url, notes_encrypted,
               category, tags, strength_score, created_at, updated_at, last_used
        FROM password_entries
        WHERE user_id = ?
      `;
      
      const params = [userId];
      
      // Add filtering
      if (options.category) {
        query += ' AND category = ?';
        params.push(options.category);
      }
      
      if (options.search) {
        query += ' AND (title LIKE ? OR username LIKE ? OR url LIKE ?)';
        const searchTerm = `%${options.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      // Add ordering
      query += ' ORDER BY updated_at DESC';
      
      // Add limit
      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
      }
      
      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params);
      
      // Decrypt sensitive data
      const entries = [];
      for (const row of rows) {
        try {
          const encryptedPassword = JSON.parse(row.password_encrypted);
          const password = await this.encryptionManager.decryptText(
            encryptedPassword,
            this.databaseKey.toString('base64')
          );
          
          let notes = null;
          if (row.notes_encrypted) {
            const encryptedNotes = JSON.parse(row.notes_encrypted);
            notes = await this.encryptionManager.decryptText(
              encryptedNotes,
              this.databaseKey.toString('base64')
            );
          }
          
          entries.push({
            id: row.id,
            title: row.title,
            username: row.username,
            password,
            url: row.url,
            notes,
            category: row.category,
            tags: row.tags ? JSON.parse(row.tags) : [],
            strengthScore: row.strength_score,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastUsed: row.last_used
          });
        } catch (decryptError) {
          console.error(`Failed to decrypt entry ${row.id}:`, decryptError);
          // Skip corrupted entries
        }
      }
      
      return entries;
    } catch (error) {
      throw new Error(`Password entries retrieval failed: ${error.message}`);
    }
  }

  /**
   * Update password entry
   * @param {number} userId - User ID
   * @param {number} entryId - Entry ID
   * @param {Object} updateData - Updated data
   * @returns {Promise<Object>} Updated entry information
   */
  async updatePasswordEntry(userId, entryId, updateData) {
    try {
      if (!this.databaseKey) {
        throw new Error('Database not unlocked');
      }
      
      // Get current entry for password history
      const currentEntry = await this.getPasswordEntry(userId, entryId);
      
      if (!currentEntry) {
        throw new Error('Entry not found');
      }
      
      // Encrypt sensitive data if provided
      let encryptedPassword = null;
      if (updateData.password) {
        encryptedPassword = await this.encryptionManager.encryptText(
          updateData.password,
          this.databaseKey.toString('base64')
        );
        
        // Save to password history if password changed
        if (updateData.password !== currentEntry.password) {
          const historyStmt = this.db.prepare(`
            INSERT INTO password_history (entry_id, password_encrypted)
            VALUES (?, ?)
          `);
          
          const oldPasswordEncrypted = await this.encryptionManager.encryptText(
            currentEntry.password,
            this.databaseKey.toString('base64')
          );
          
          historyStmt.run(entryId, JSON.stringify(oldPasswordEncrypted));
        }
      }
      
      let encryptedNotes = null;
      if (updateData.notes !== undefined) {
        if (updateData.notes) {
          encryptedNotes = await this.encryptionManager.encryptText(
            updateData.notes,
            this.databaseKey.toString('base64')
          );
        }
      }
      
      // Build update query
      const updates = [];
      const params = [];
      
      if (updateData.title !== undefined) {
        updates.push('title = ?');
        params.push(updateData.title);
      }
      
      if (updateData.username !== undefined) {
        updates.push('username = ?');
        params.push(updateData.username);
      }
      
      if (encryptedPassword) {
        updates.push('password_encrypted = ?');
        params.push(JSON.stringify(encryptedPassword));
      }
      
      if (updateData.url !== undefined) {
        updates.push('url = ?');
        params.push(updateData.url);
      }
      
      if (encryptedNotes !== null) {
        updates.push('notes_encrypted = ?');
        params.push(encryptedNotes ? JSON.stringify(encryptedNotes) : null);
      }
      
      if (updateData.category !== undefined) {
        updates.push('category = ?');
        params.push(updateData.category);
      }
      
      if (updateData.tags !== undefined) {
        updates.push('tags = ?');
        params.push(JSON.stringify(updateData.tags));
      }
      
      if (updateData.strengthScore !== undefined) {
        updates.push('strength_score = ?');
        params.push(updateData.strengthScore);
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      
      params.push(entryId, userId);
      
      const query = `
        UPDATE password_entries
        SET ${updates.join(', ')}
        WHERE id = ? AND user_id = ?
      `;
      
      const stmt = this.db.prepare(query);
      const result = stmt.run(...params);
      
      if (result.changes === 0) {
        throw new Error('Entry not found or no changes made');
      }
      
      // Log security event
      await this.logSecurityEvent(userId, 'password_entry_updated', {
        entryId,
        changes: Object.keys(updateData)
      });
      
      return {
        id: entryId,
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Password entry update failed: ${error.message}`);
    }
  }

  /**
   * Get single password entry
   * @param {number} userId - User ID
   * @param {number} entryId - Entry ID
   * @returns {Promise<Object>} Password entry
   */
  async getPasswordEntry(userId, entryId) {
    try {
      if (!this.databaseKey) {
        throw new Error('Database not unlocked');
      }
      
      const stmt = this.db.prepare(`
        SELECT id, title, username, password_encrypted, url, notes_encrypted,
               category, tags, strength_score, created_at, updated_at, last_used
        FROM password_entries
        WHERE id = ? AND user_id = ?
      `);
      
      const row = stmt.get(entryId, userId);
      
      if (!row) {
        return null;
      }
      
      // Decrypt sensitive data
      const encryptedPassword = JSON.parse(row.password_encrypted);
      const password = await this.encryptionManager.decryptText(
        encryptedPassword,
        this.databaseKey.toString('base64')
      );
      
      let notes = null;
      if (row.notes_encrypted) {
        const encryptedNotes = JSON.parse(row.notes_encrypted);
        notes = await this.encryptionManager.decryptText(
          encryptedNotes,
          this.databaseKey.toString('base64')
        );
      }
      
      return {
        id: row.id,
        title: row.title,
        username: row.username,
        password,
        url: row.url,
        notes,
        category: row.category,
        tags: row.tags ? JSON.parse(row.tags) : [],
        strengthScore: row.strength_score,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastUsed: row.last_used
      };
    } catch (error) {
      throw new Error(`Password entry retrieval failed: ${error.message}`);
    }
  }

  /**
   * Delete password entry
   * @param {number} userId - User ID
   * @param {number} entryId - Entry ID
   * @returns {Promise<boolean>} Success status
   */
  async deletePasswordEntry(userId, entryId) {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM password_entries
        WHERE id = ? AND user_id = ?
      `);
      
      const result = stmt.run(entryId, userId);
      
      if (result.changes === 0) {
        throw new Error('Entry not found');
      }
      
      // Log security event
      await this.logSecurityEvent(userId, 'password_entry_deleted', {
        entryId
      });
      
      return true;
    } catch (error) {
      throw new Error(`Password entry deletion failed: ${error.message}`);
    }
  }

  /**
   * Save user setting
   * @param {number} userId - User ID
   * @param {string} key - Setting key
   * @param {any} value - Setting value
   * @returns {Promise<void>}
   */
  async saveSetting(userId, key, value) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO settings (user_id, setting_key, setting_value, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      stmt.run(userId, key, JSON.stringify(value));
    } catch (error) {
      throw new Error(`Setting save failed: ${error.message}`);
    }
  }

  /**
   * Get user setting
   * @param {number} userId - User ID
   * @param {string} key - Setting key
   * @param {any} defaultValue - Default value if not found
   * @returns {Promise<any>} Setting value
   */
  async getSetting(userId, key, defaultValue = null) {
    try {
      const stmt = this.db.prepare(`
        SELECT setting_value
        FROM settings
        WHERE user_id = ? AND setting_key = ?
      `);
      
      const row = stmt.get(userId, key);
      
      if (!row) {
        return defaultValue;
      }
      
      return JSON.parse(row.setting_value);
    } catch (error) {
      return defaultValue;
    }
  }

  /**
   * Log security event
   * @param {number} userId - User ID
   * @param {string} eventType - Event type
   * @param {Object} eventData - Event data
   * @param {string} severity - Event severity
   * @returns {Promise<void>}
   */
  async logSecurityEvent(userId, eventType, eventData = {}, severity = 'info') {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO security_events (user_id, event_type, event_data, severity)
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run(userId, eventType, JSON.stringify(eventData), severity);
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Get security events
   * @param {number} userId - User ID
   * @param {number} limit - Maximum number of events
   * @returns {Promise<Array>} Array of security events
   */
  async getSecurityEvents(userId, limit = 100) {
    try {
      const stmt = this.db.prepare(`
        SELECT event_type, event_data, severity, created_at
        FROM security_events
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `);
      
      const rows = stmt.all(userId, limit);
      
      return rows.map(row => ({
        eventType: row.event_type,
        eventData: JSON.parse(row.event_data),
        severity: row.severity,
        createdAt: row.created_at
      }));
    } catch (error) {
      throw new Error(`Security events retrieval failed: ${error.message}`);
    }
  }

  /**
   * Close database connection
   * @returns {Promise<void>}
   */
  async close() {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      
      // Clear encryption key from memory
      if (this.databaseKey) {
        this.encryptionManager.clearBuffer(this.databaseKey);
        this.databaseKey = null;
      }
      
      this.isInitialized = false;
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }

  /**
   * Get database statistics
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Database statistics
   */
  async getStatistics(userId) {
    try {
      const stats = {};
      
      // Password entries count
      const entriesStmt = this.db.prepare('SELECT COUNT(*) as count FROM password_entries WHERE user_id = ?');
      stats.passwordEntries = entriesStmt.get(userId).count;
      
      // Categories count
      const categoriesStmt = this.db.prepare('SELECT COUNT(DISTINCT category) as count FROM password_entries WHERE user_id = ? AND category IS NOT NULL');
      stats.categories = categoriesStmt.get(userId).count;
      
      // Recent activity
      const recentStmt = this.db.prepare('SELECT COUNT(*) as count FROM password_entries WHERE user_id = ? AND updated_at > datetime("now", "-7 days")');
      stats.recentActivity = recentStmt.get(userId).count;
      
      // Generation history
      const generationStmt = this.db.prepare('SELECT COUNT(*) as count FROM generation_history WHERE user_id = ?');
      stats.generationHistory = generationStmt.get(userId).count;
      
      return stats;
    } catch (error) {
      throw new Error(`Statistics retrieval failed: ${error.message}`);
    }
  }
}

module.exports = DatabaseManager;
