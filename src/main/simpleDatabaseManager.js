const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');
const EncryptionManager = require('./encryption');

/**
 * Simple Database Manager for Testing
 * Uses JSON files instead of SQLite for simplicity
 */
class SimpleDatabaseManager {
  constructor() {
    this.encryptionManager = new EncryptionManager();
    this.databaseKey = null;
    this.isInitialized = false;
    this.dbPath = this.getDatabasePath();
    this.users = [];
    this.loadDatabase();
  }

  /**
   * Get database file path
   * @returns {string} Database file path
   */
  getDatabasePath() {
    const userDataPath = app.getPath('userData');
    const dbDir = path.join(userDataPath, 'data');
    
    // Ensure directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    return path.join(dbDir, 'users.json');
  }

  /**
   * Initialize database
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.loadDatabase();
      this.isInitialized = true;
      console.log('Simple Database initialized successfully');
    } catch (error) {
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  /**
   * Load database from file
   */
  loadDatabase() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const rawData = fs.readFileSync(this.dbPath, 'utf8');
        const data = JSON.parse(rawData);
        this.users = data.users || [];
      } else {
        this.users = [];
      }
    } catch (error) {
      console.error('Error loading database:', error);
      this.users = [];
    }
  }

  /**
   * Save database to file
   */
  saveDatabase() {
    try {
      const data = { users: this.users };
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }

  /**
   * Check if master password exists
   * @returns {boolean} True if master password exists
   */
  hasMasterPassword() {
    return this.users.length > 0;
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
      // Check if user already exists
      const existingUser = this.users.find(u => u.username === username);
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Generate salt for password hashing
      const salt = this.encryptionManager.generateSalt();
      
      // Hash the master password
      const masterPasswordHash = await this.encryptionManager.hashPassword(masterPassword, salt);
      
      // Create database key
      const databaseKeyPackage = await this.encryptionManager.createDatabaseKey(masterPassword, salt);
      
      // Create user object
      const user = {
        id: this.users.length + 1,
        username,
        masterPasswordHash: masterPasswordHash.toString('base64'),
        salt: salt.toString('base64'),
        keyData: JSON.stringify(databaseKeyPackage),
        createdAt: new Date().toISOString()
      };

      this.users.push(user);
      this.saveDatabase();
      
      console.log(`User created successfully: ${username}`);
      
      return {
        id: user.id,
        username: user.username,
        created_at: user.createdAt
      };
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
      // Find user
      const user = this.users.find(u => u.username === username);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify password
      const salt = Buffer.from(user.salt, 'base64');
      const storedHash = Buffer.from(user.masterPasswordHash, 'base64');
      
      const isValid = await this.encryptionManager.verifyPassword(masterPassword, storedHash, salt);
      
      if (!isValid) {
        throw new Error('Invalid password');
      }
      
      // Decrypt database key
      const keyPackage = JSON.parse(user.keyData);
      const databaseKey = await this.encryptionManager.decryptDatabaseKey(keyPackage, masterPassword);
      
      // Set database key for this session
      this.setDatabaseKey(databaseKey);
      
      console.log(`User authenticated successfully: ${username}`);
      
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
   * Log security event (simplified)
   * @param {number} userId - User ID
   * @param {string} eventType - Event type
   * @param {Object} eventData - Event data
   * @param {string} severity - Event severity
   * @returns {Promise<void>}
   */
  async logSecurityEvent(userId, eventType, eventData = {}, severity = 'info') {
    try {
      console.log(`Security Event [${severity}]: ${eventType}`, eventData);
      // In a real implementation, this would be stored in the database
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Close database connection
   * @returns {Promise<void>}
   */
  async close() {
    try {
      // Clear encryption key from memory
      if (this.databaseKey) {
        this.encryptionManager.clearBuffer(this.databaseKey);
        this.databaseKey = null;
      }
      
      this.isInitialized = false;
      console.log('Simple Database connection closed');
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }

  /**
   * Get all users (for testing purposes)
   * @returns {Array} Array of users
   */
  getAllUsers() {
    return this.users.map(user => ({
      id: user.id,
      username: user.username,
      createdAt: user.createdAt
    }));
  }
}

module.exports = SimpleDatabaseManager;
