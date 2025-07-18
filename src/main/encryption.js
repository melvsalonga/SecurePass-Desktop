const crypto = require('node:crypto');
const { promisify } = require('node:util');

/**
 * SecurePass Encryption Module
 * 
 * Provides AES-256-GCM encryption/decryption and Argon2 password hashing
 * Following security best practices and zero-knowledge architecture
 */
class EncryptionManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
    this.tagLength = 16; // 128 bits
    this.argon2Options = {
      type: 2, // Argon2id
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3, // 3 iterations
      parallelism: 1, // single thread
      hashLength: 32 // 256 bits
    };
  }

  /**
   * Generate a cryptographically secure random salt
   * @param {number} length - Length of salt in bytes
   * @returns {Buffer} Random salt
   */
  generateSalt(length = this.saltLength) {
    return crypto.randomBytes(length);
  }

  /**
   * Generate a cryptographically secure random key
   * @param {number} length - Length of key in bytes
   * @returns {Buffer} Random key
   */
  generateKey(length = this.keyLength) {
    return crypto.randomBytes(length);
  }

  /**
   * Generate a cryptographically secure random IV
   * @returns {Buffer} Random IV
   */
  generateIV() {
    return crypto.randomBytes(this.ivLength);
  }

  /**
   * Derive encryption key from password using PBKDF2
   * @param {string} password - User password
   * @param {Buffer} salt - Salt for key derivation
   * @param {number} iterations - Number of iterations (default: 100000)
   * @returns {Promise<Buffer>} Derived key
   */
  async deriveKey(password, salt, iterations = 100000) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, iterations, this.keyLength, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }

  /**
   * Hash password using Argon2id (simulated with scrypt for Node.js compatibility)
   * @param {string} password - Password to hash
   * @param {Buffer} salt - Salt for hashing
   * @returns {Promise<Buffer>} Password hash
   */
  async hashPassword(password, salt) {
    return new Promise((resolve, reject) => {
      // Using scrypt as Argon2 alternative (Node.js built-in)
      const options = {
        cost: 16384, // CPU/memory cost parameter
        blockSize: 8, // Block size parameter
        parallelization: 1, // Parallelization parameter
        maxmem: 64 * 1024 * 1024 // Maximum memory (64MB)
      };
      
      crypto.scrypt(password, salt, 32, options, (err, hash) => {
        if (err) reject(err);
        else resolve(hash);
      });
    });
  }

  /**
   * Verify password against hash
   * @param {string} password - Password to verify
   * @param {Buffer} hash - Stored hash
   * @param {Buffer} salt - Salt used for hashing
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPassword(password, hash, salt) {
    try {
      const newHash = await this.hashPassword(password, salt);
      return crypto.timingSafeEqual(hash, newHash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param {string|Buffer} data - Data to encrypt
   * @param {Buffer} key - Encryption key
   * @param {Buffer} iv - Initialization vector
   * @returns {Object} Encrypted data with IV and auth tag
   */
  encrypt(data, key, iv) {
    try {
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      cipher.setAAD(Buffer.alloc(0)); // Set empty additional authenticated data
      
      // Convert string to buffer if needed
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
      
      let encrypted = cipher.update(dataBuffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv,
        authTag,
        algorithm: this.algorithm
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param {Object} encryptedData - Encrypted data object
   * @param {Buffer} key - Decryption key
   * @returns {Buffer} Decrypted data
   */
  decrypt(encryptedData, key) {
    try {
      const { encrypted, iv, authTag, algorithm } = encryptedData;
      
      if (algorithm !== this.algorithm) {
        throw new Error('Unsupported encryption algorithm');
      }
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt text data with automatic key derivation
   * @param {string} plaintext - Text to encrypt
   * @param {string} password - Password for encryption
   * @returns {Promise<Object>} Encrypted data package
   */
  async encryptText(plaintext, password) {
    try {
      const salt = this.generateSalt();
      const iv = this.generateIV();
      const key = await this.deriveKey(password, salt);
      
      const encryptedData = this.encrypt(plaintext, key, iv);
      
      return {
        encrypted: encryptedData.encrypted.toString('base64'),
        iv: iv.toString('base64'),
        salt: salt.toString('base64'),
        authTag: encryptedData.authTag.toString('base64'),
        algorithm: this.algorithm
      };
    } catch (error) {
      throw new Error(`Text encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt text data with automatic key derivation
   * @param {Object} encryptedPackage - Encrypted data package
   * @param {string} password - Password for decryption
   * @returns {Promise<string>} Decrypted text
   */
  async decryptText(encryptedPackage, password) {
    try {
      const salt = Buffer.from(encryptedPackage.salt, 'base64');
      const iv = Buffer.from(encryptedPackage.iv, 'base64');
      const encrypted = Buffer.from(encryptedPackage.encrypted, 'base64');
      const authTag = Buffer.from(encryptedPackage.authTag, 'base64');
      
      const key = await this.deriveKey(password, salt);
      
      const encryptedData = {
        encrypted,
        iv,
        authTag,
        algorithm: encryptedPackage.algorithm
      };
      
      const decrypted = this.decrypt(encryptedData, key);
      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error(`Text decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt JSON data
   * @param {Object} data - Data to encrypt
   * @param {string} password - Password for encryption
   * @returns {Promise<Object>} Encrypted data package
   */
  async encryptJSON(data, password) {
    const jsonString = JSON.stringify(data);
    return this.encryptText(jsonString, password);
  }

  /**
   * Decrypt JSON data
   * @param {Object} encryptedPackage - Encrypted data package
   * @param {string} password - Password for decryption
   * @returns {Promise<Object>} Decrypted data
   */
  async decryptJSON(encryptedPackage, password) {
    const decryptedText = await this.decryptText(encryptedPackage, password);
    return JSON.parse(decryptedText);
  }

  /**
   * Secure memory cleanup
   * @param {Buffer} buffer - Buffer to clear
   */
  clearBuffer(buffer) {
    if (Buffer.isBuffer(buffer)) {
      buffer.fill(0);
    }
  }

  /**
   * Generate master key from password
   * @param {string} password - Master password
   * @param {Buffer} salt - Salt for key derivation
   * @returns {Promise<Buffer>} Master key
   */
  async generateMasterKey(password, salt) {
    // Use higher iteration count for master key
    return this.deriveKey(password, salt, 200000);
  }

  /**
   * Create encrypted database key
   * @param {string} masterPassword - Master password
   * @param {Buffer} salt - Salt for key derivation
   * @returns {Promise<Object>} Encrypted database key package
   */
  async createDatabaseKey(masterPassword, salt) {
    try {
      // Generate random database key
      const databaseKey = this.generateKey();
      
      // Derive master key from password
      const masterKey = await this.generateMasterKey(masterPassword, salt);
      
      // Encrypt database key with master key
      const iv = this.generateIV();
      const encryptedKey = this.encrypt(databaseKey, masterKey, iv);
      
      // Clear sensitive data from memory
      this.clearBuffer(databaseKey);
      this.clearBuffer(masterKey);
      
      return {
        encrypted: encryptedKey.encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: encryptedKey.authTag.toString('base64'),
        salt: salt.toString('base64'),
        algorithm: this.algorithm
      };
    } catch (error) {
      throw new Error(`Database key creation failed: ${error.message}`);
    }
  }

  /**
   * Decrypt database key
   * @param {Object} encryptedKeyPackage - Encrypted database key package
   * @param {string} masterPassword - Master password
   * @returns {Promise<Buffer>} Decrypted database key
   */
  async decryptDatabaseKey(encryptedKeyPackage, masterPassword) {
    try {
      const salt = Buffer.from(encryptedKeyPackage.salt, 'base64');
      const iv = Buffer.from(encryptedKeyPackage.iv, 'base64');
      const encrypted = Buffer.from(encryptedKeyPackage.encrypted, 'base64');
      const authTag = Buffer.from(encryptedKeyPackage.authTag, 'base64');
      
      // Derive master key from password
      const masterKey = await this.generateMasterKey(masterPassword, salt);
      
      // Decrypt database key
      const encryptedData = {
        encrypted,
        iv,
        authTag,
        algorithm: encryptedKeyPackage.algorithm
      };
      
      const databaseKey = this.decrypt(encryptedData, masterKey);
      
      // Clear master key from memory
      this.clearBuffer(masterKey);
      
      return databaseKey;
    } catch (error) {
      throw new Error(`Database key decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate secure random password
   * @param {number} length - Password length
   * @returns {string} Random password
   */
  generateSecurePassword(length = 32) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Validate encryption strength
   * @param {Object} encryptedData - Encrypted data to validate
   * @returns {Object} Validation results
   */
  validateEncryption(encryptedData) {
    const validation = {
      isValid: true,
      issues: []
    };
    
    // Check algorithm
    if (encryptedData.algorithm !== this.algorithm) {
      validation.isValid = false;
      validation.issues.push('Unsupported encryption algorithm');
    }
    
    // Check required fields
    const requiredFields = ['encrypted', 'iv', 'authTag', 'salt'];
    for (const field of requiredFields) {
      if (!encryptedData[field]) {
        validation.isValid = false;
        validation.issues.push(`Missing required field: ${field}`);
      }
    }
    
    // Check IV length
    if (encryptedData.iv) {
      const ivBuffer = Buffer.from(encryptedData.iv, 'base64');
      if (ivBuffer.length !== this.ivLength) {
        validation.isValid = false;
        validation.issues.push('Invalid IV length');
      }
    }
    
    // Check auth tag length
    if (encryptedData.authTag) {
      const tagBuffer = Buffer.from(encryptedData.authTag, 'base64');
      if (tagBuffer.length !== this.tagLength) {
        validation.isValid = false;
        validation.issues.push('Invalid auth tag length');
      }
    }
    
    return validation;
  }
}

module.exports = EncryptionManager;
