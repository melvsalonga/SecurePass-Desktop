/**
 * Test suite for Password Database functionality
 * Tests encrypted storage, retrieval, and data integrity
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Mock electron module first
jest.mock('electron', () => ({
  app: {
    getPath: () => require('path').join(__dirname, 'test-data')
  }
}));

const PasswordDatabase = require('../src/main/passwordDatabase');
const EncryptionManager = require('../src/main/encryption');

describe('PasswordDatabase', () => {
  let encryptionManager;
  let databaseKey;
  let passwordDatabase;
  let testDataDir;

  beforeAll(() => {
    // Setup test data directory
    testDataDir = path.join(__dirname, 'test-data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
  });

  beforeEach(() => {
    // Create fresh instances for each test
    encryptionManager = new EncryptionManager();
    databaseKey = crypto.randomBytes(32);
    passwordDatabase = new PasswordDatabase(encryptionManager, databaseKey);
  });

  afterEach(() => {
    // Clean up test files
    const secureStorageDir = path.join(testDataDir, 'secure_storage');
    if (fs.existsSync(secureStorageDir)) {
      fs.rmSync(secureStorageDir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    // Clean up test data directory
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe('Database Initialization', () => {
    test('should initialize with default categories', () => {
      const categories = passwordDatabase.getCategories();
      expect(categories).toContain('General');
      expect(categories).toContain('Banking');
      expect(categories).toContain('Social Media');
      expect(categories.length).toBeGreaterThan(0);
    });

    test('should create database file path', () => {
      const dbPath = passwordDatabase.getDatabasePath();
      expect(dbPath).toContain('secure_storage');
      expect(dbPath).toContain('passwords.enc');
    });
  });

  describe('Password Entry Management', () => {
    const testEntry = {
      title: 'Test Account',
      username: 'testuser@example.com',
      password: 'SecurePassword123!',
      url: 'https://example.com',
      notes: 'Test notes for the account',
      category: 'General',
      tags: ['test', 'example']
    };

    test('should add password entry successfully', async () => {
      const result = await passwordDatabase.addEntry(testEntry);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe(testEntry.title);
      expect(result.username).toBe(testEntry.username);
      expect(result.url).toBe(testEntry.url);
      expect(result.category).toBe(testEntry.category);
      expect(result.tags).toEqual(testEntry.tags);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    test('should retrieve password entry by ID', async () => {
      const addedEntry = await passwordDatabase.addEntry(testEntry);
      const retrievedEntry = await passwordDatabase.getEntryById(addedEntry.id);
      
      expect(retrievedEntry).toBeDefined();
      expect(retrievedEntry.id).toBe(addedEntry.id);
      expect(retrievedEntry.title).toBe(testEntry.title);
      expect(retrievedEntry.password).toBe(testEntry.password);
      expect(retrievedEntry.notes).toBe(testEntry.notes);
    });

    test('should return null for non-existent entry', async () => {
      const result = await passwordDatabase.getEntryById('nonexistent-id');
      expect(result).toBeNull();
    });

    test('should get all password entries', async () => {
      await passwordDatabase.addEntry(testEntry);
      await passwordDatabase.addEntry({
        ...testEntry,
        title: 'Second Account',
        username: 'second@example.com'
      });
      
      const entries = await passwordDatabase.getAllEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].title).toBeDefined();
      expect(entries[1].title).toBeDefined();
    });

    test('should update password entry', async () => {
      const addedEntry = await passwordDatabase.addEntry(testEntry);
      const updates = {
        title: 'Updated Account',
        password: 'NewSecurePassword456!',
        notes: 'Updated notes'
      };
      
      const updatedEntry = await passwordDatabase.updateEntry(addedEntry.id, updates);
      
      expect(updatedEntry.title).toBe(updates.title);
      expect(updatedEntry.id).toBe(addedEntry.id);
      expect(updatedEntry.updatedAt).not.toBe(addedEntry.updatedAt);
      
      // Verify the update persisted
      const retrievedEntry = await passwordDatabase.getEntryById(addedEntry.id);
      expect(retrievedEntry.title).toBe(updates.title);
      expect(retrievedEntry.password).toBe(updates.password);
      expect(retrievedEntry.notes).toBe(updates.notes);
    });

    test('should delete password entry', async () => {
      const addedEntry = await passwordDatabase.addEntry(testEntry);
      
      const deleteResult = await passwordDatabase.deleteEntry(addedEntry.id);
      expect(deleteResult).toBe(true);
      
      const retrievedEntry = await passwordDatabase.getEntryById(addedEntry.id);
      expect(retrievedEntry).toBeNull();
    });

    test('should throw error when deleting non-existent entry', async () => {
      await expect(passwordDatabase.deleteEntry('nonexistent-id'))
        .rejects.toThrow('Password entry not found');
    });
  });

  describe('Search and Filter', () => {
    beforeEach(async () => {
      // Add test entries
      await passwordDatabase.addEntry({
        title: 'Gmail Account',
        username: 'user@gmail.com',
        password: 'pass123',
        url: 'https://gmail.com',
        category: 'Email',
        tags: ['google', 'email']
      });
      
      await passwordDatabase.addEntry({
        title: 'Facebook Account',
        username: 'user@facebook.com',
        password: 'pass456',
        url: 'https://facebook.com',
        category: 'Social Media',
        tags: ['facebook', 'social']
      });
      
      await passwordDatabase.addEntry({
        title: 'Bank Account',
        username: 'user@bank.com',
        password: 'pass789',
        url: 'https://bank.com',
        category: 'Banking',
        tags: ['bank', 'finance']
      });
    });

    test('should search by title', async () => {
      const results = await passwordDatabase.searchEntries('Gmail');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Gmail Account');
    });

    test('should search by username', async () => {
      const results = await passwordDatabase.searchEntries('facebook');
      expect(results).toHaveLength(1);
      expect(results[0].username).toBe('user@facebook.com');
    });

    test('should search by tags', async () => {
      const results = await passwordDatabase.searchEntries('google');
      expect(results).toHaveLength(1);
      expect(results[0].tags).toContain('google');
    });

    test('should filter by category', async () => {
      const results = await passwordDatabase.searchEntries('', { category: 'Banking' });
      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('Banking');
    });

    test('should filter by multiple tags', async () => {
      const results = await passwordDatabase.searchEntries('', { tags: ['email', 'social'] });
      expect(results).toHaveLength(2);
    });

    test('should return empty array for no matches', async () => {
      const results = await passwordDatabase.searchEntries('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('Category Management', () => {
    test('should return default categories', () => {
      const categories = passwordDatabase.getCategories();
      expect(categories).toContain('General');
      expect(categories).toContain('Banking');
      expect(categories).toContain('Social Media');
    });

    test('should add new category', () => {
      passwordDatabase.addCategory('Custom Category');
      const categories = passwordDatabase.getCategories();
      expect(categories).toContain('Custom Category');
    });

test('should not add empty category', () => {
      const beforeCount = passwordDatabase.getCategories().length;
      passwordDatabase.addCategory('');
      passwordDatabase.addCategory('   ');
      const afterCount = passwordDatabase.getCategories().length;
      expect(afterCount).toBe(beforeCount);
    });

    test('should handle duplicate categories', () => {
      passwordDatabase.addCategory('Duplicate Category');
      const beforeCount = passwordDatabase.getCategories().length;
      passwordDatabase.addCategory('Duplicate Category');
      const afterCount = passwordDatabase.getCategories().length;
      expect(afterCount).toBe(beforeCount);
    });

    test('should remove category (except General)', () => {
      passwordDatabase.addCategory('Removable Category');
      expect(passwordDatabase.getCategories()).toContain('Removable Category');
      
      passwordDatabase.removeCategory('Removable Category');
      expect(passwordDatabase.getCategories()).not.toContain('Removable Category');
    });

    test('should not remove General category', () => {
      passwordDatabase.removeCategory('General');
      expect(passwordDatabase.getCategories()).toContain('General');
    });
  });

  describe('Database Statistics', () => {
    beforeEach(async () => {
      await passwordDatabase.addEntry({
        title: 'Test Entry 1',
        username: 'user1@example.com',
        password: 'pass1',
        category: 'General'
      });
      
      await passwordDatabase.addEntry({
        title: 'Test Entry 2',
        username: 'user2@example.com',
        password: 'pass2',
        category: 'Banking'
      });
    });

    test('should return correct statistics', async () => {
      const stats = await passwordDatabase.getStatistics();
      
      expect(stats.totalEntries).toBe(2);
      expect(stats.categories).toContain('General');
      expect(stats.categories).toContain('Banking');
      expect(stats.categoryStats['General']).toBe(1);
      expect(stats.categoryStats['Banking']).toBe(1);
      expect(stats.lastModified).toBeDefined();
      expect(stats.databaseSize).toBeGreaterThan(0);
    });
  });

  describe('Data Encryption and Integrity', () => {
    test('should encrypt sensitive data', async () => {
      const testEntry = {
        title: 'Encryption Test',
        username: 'user@test.com',
        password: 'SecretPassword123!',
        notes: 'Secret notes'
      };
      
      const addedEntry = await passwordDatabase.addEntry(testEntry);
      
      // Check that the entry was encrypted by examining the stored data
      const encryptedEntry = passwordDatabase.passwords.get(addedEntry.id);
      expect(encryptedEntry.password).not.toBe(testEntry.password);
      expect(encryptedEntry.notes).not.toBe(testEntry.notes);
      expect(typeof encryptedEntry.password).toBe('object'); // Encrypted data structure
    });

    test('should maintain data integrity across save/load cycles', async () => {
      const testEntry = {
        title: 'Integrity Test',
        username: 'integrity@test.com',
        password: 'IntegrityPassword123!',
        notes: 'Integrity test notes',
        category: 'General',
        tags: ['integrity', 'test']
      };
      
      const addedEntry = await passwordDatabase.addEntry(testEntry);
      
      // Force save to disk
      await passwordDatabase.saveDatabase();
      
      // Create new instance and load from disk
      const newDatabase = new PasswordDatabase(encryptionManager, databaseKey);
      await newDatabase.loadDatabase();
      
      const retrievedEntry = await newDatabase.getEntryById(addedEntry.id);
      
      expect(retrievedEntry.title).toBe(testEntry.title);
      expect(retrievedEntry.password).toBe(testEntry.password);
      expect(retrievedEntry.notes).toBe(testEntry.notes);
      expect(retrievedEntry.category).toBe(testEntry.category);
      expect(retrievedEntry.tags).toEqual(testEntry.tags);
    });
  });

  describe('Error Handling', () => {
    test('should validate required fields', async () => {
      await expect(passwordDatabase.addEntry({}))
        .rejects.toThrow('Title is required');
      
      await expect(passwordDatabase.addEntry({ title: 'Test' }))
        .rejects.toThrow('Password is required');
    });

    test('should validate URL format', async () => {
      await expect(passwordDatabase.addEntry({
        title: 'Test',
        password: 'password',
        url: 'invalid-url'
      })).rejects.toThrow('Invalid URL format');
    });

    test('should handle update of non-existent entry', async () => {
      await expect(passwordDatabase.updateEntry('nonexistent-id', { title: 'Updated' }))
        .rejects.toThrow('Password entry not found');
    });
  });
});
