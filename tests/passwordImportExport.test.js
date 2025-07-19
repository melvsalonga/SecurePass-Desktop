/**
 * Unit Tests for Password Import/Export Functionality
 * Tests the password storage manager's import and export capabilities
 */

const PasswordStorageManager = require('../src/main/passwordStorageManager');
const EncryptionManager = require('../src/main/encryption');
const SimpleDatabaseManager = require('../src/main/simpleDatabaseManager');
const crypto = require('node:crypto');
const fs = require('node:fs').promises;
const path = require('node:path');

describe('Password Import/Export', () => {
  let passwordStorageManager;
  let encryptionManager;
  let databaseManager;
  let testDbPath;

  beforeEach(async () => {
    // Create unique test database path and user
    const testId = Math.random().toString(36).substring(7);
    testDbPath = path.join(__dirname, `test-import-export-${testId}.db`);
    const testUsername = `testuser_${testId}`;
    
    // Initialize managers
    encryptionManager = new EncryptionManager();
    databaseManager = new SimpleDatabaseManager();
    databaseManager.databasePath = testDbPath;
    
    // Initialize database
    await databaseManager.initialize();
    
    // Create test user with unique username
    await databaseManager.createUser(testUsername, 'testpassword123');
    await databaseManager.authenticateUser(testUsername, 'testpassword123'); // Correct this
    
    // Initialize password storage manager
    passwordStorageManager = new PasswordStorageManager(databaseManager, encryptionManager);
    await passwordStorageManager.initialize(databaseManager.databaseKey);
  });

  afterEach(async () => {
    // Clean up test database
    try {
      await fs.unlink(testDbPath);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Password Export', () => {
    beforeEach(async () => {
      // Add test passwords
      const testPasswords = [
        {
          title: 'Gmail Account',
          username: 'test@gmail.com',
          password: 'SecurePass123!',
          url: 'https://gmail.com',
          notes: 'Personal email account',
          category: 'Email',
          tags: ['personal', 'email']
        },
        {
          title: 'Bank Login',
          username: 'testuser',
          password: 'BankPass456$',
          url: 'https://mybank.com',
          notes: 'Main bank account',
          category: 'Banking',
          tags: ['financial', 'important']
        },
        {
          title: 'Work Portal',
          username: 'john.doe',
          password: 'WorkSecret789%',
          url: 'https://company.com/login',
          notes: 'Work system access',
          category: 'Work',
          tags: ['work', 'professional']
        }
      ];

      for (const password of testPasswords) {
        await passwordStorageManager.addPassword(password);
      }
    });

    test('should export passwords in JSON format', async () => {
      const result = await passwordStorageManager.exportPasswords('json', { includePasswords: true });
      
      expect(result).toBeTruthy();
      const exportData = JSON.parse(result);
      
      expect(exportData).toHaveProperty('exported');
      expect(exportData).toHaveProperty('version', '1.0');
      expect(exportData).toHaveProperty('count', 3);
      expect(exportData).toHaveProperty('passwords');
      expect(Array.isArray(exportData.passwords)).toBe(true);
      expect(exportData.passwords).toHaveLength(3);
      
      // Check first password entry
      const firstPassword = exportData.passwords[0];
      expect(firstPassword).toHaveProperty('title');
      expect(firstPassword).toHaveProperty('username');
      expect(firstPassword).toHaveProperty('password');
      expect(firstPassword).toHaveProperty('url');
      expect(firstPassword).toHaveProperty('category');
    });

    test('should export passwords in CSV format', async () => {
      const result = await passwordStorageManager.exportPasswords('csv', { includePasswords: true });
      
      expect(result).toBeTruthy();
      const lines = result.split('\n').filter(line => line.trim());
      
      // Should have header + 3 data lines
      expect(lines).toHaveLength(4);
      
      // Check header
      expect(lines[0]).toContain('Title,Username,Password,URL,Notes,Category,Tags');
      
      // Check data rows (order may vary due to sorting)
      const dataContent = lines.slice(1).join('\n');
      expect(dataContent).toContain('Gmail Account');
      expect(dataContent).toContain('Bank Login');
      expect(dataContent).toContain('Work Portal');
    });

    test('should export passwords in XML format', async () => {
      const result = await passwordStorageManager.exportPasswords('xml', { includePasswords: true });
      
      expect(result).toBeTruthy();
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<securepass_export>');
      expect(result).toContain('<metadata>');
      expect(result).toContain('<passwords>');
      expect(result).toContain('<password>');
      expect(result).toContain('Gmail Account');
      expect(result).toContain('Bank Login');
      expect(result).toContain('Work Portal');
    });

    test('should export passwords without passwords when includePasswords is false', async () => {
      const result = await passwordStorageManager.exportPasswords('json', { includePasswords: false });
      
      const exportData = JSON.parse(result);
      const firstPassword = exportData.passwords[0];
      
      expect(firstPassword.password).toBe('[HIDDEN]');
    });

    test('should handle empty password vault export', async () => {
      // Create a fresh password storage manager with no passwords
      const emptyTestId = Math.random().toString(36).substring(7);
      const freshDbPath = path.join(__dirname, `test-empty-export-${emptyTestId}.db`);
      const freshDatabaseManager = new SimpleDatabaseManager();
      freshDatabaseManager.databasePath = freshDbPath;
      
      await freshDatabaseManager.initialize();
      await freshDatabaseManager.createUser(`testuser_empty_${emptyTestId}`, 'testpassword123');
      await freshDatabaseManager.authenticateUser(`testuser_empty_${emptyTestId}`, 'testpassword123');
      
      const freshPasswordManager = new PasswordStorageManager(freshDatabaseManager, encryptionManager);
      await freshPasswordManager.initialize(freshDatabaseManager.databaseKey);
      
      const result = await freshPasswordManager.exportPasswords('json');
      const exportData = JSON.parse(result);
      
      expect(exportData.count).toBe(0);
      expect(exportData.passwords).toHaveLength(0);
      
      // Cleanup
      try {
        await fs.unlink(freshDbPath);
      } catch (error) {
        // Ignore cleanup errors for in-memory databases
      }
    });

    test('should throw error for unsupported export format', async () => {
      await expect(
        passwordStorageManager.exportPasswords('unsupported')
      ).rejects.toThrow('Unsupported export format: unsupported');
    });
  });

  describe('Password Import', () => {
    test('should import passwords from JSON format', async () => {
      const testData = {
        passwords: [
          {
            title: 'Imported Gmail',
            username: 'import@gmail.com',
            password: 'ImportedPass123!',
            url: 'https://gmail.com',
            notes: 'Imported email account',
            category: 'Email',
            tags: 'imported, email'
          },
          {
            title: 'Imported Bank',
            username: 'importuser',
            password: 'ImportedBank456$',
            url: 'https://bank.com',
            notes: 'Imported bank account',
            category: 'Banking',
            tags: 'imported, financial'
          }
        ]
      };

      const result = await passwordStorageManager.importPasswords(
        JSON.stringify(testData), 
        'json', 
        { checkDuplicates: false }
      );

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify passwords were actually imported
      const allPasswords = await passwordStorageManager.getAllPasswords();
      expect(allPasswords).toHaveLength(2);
      
      const importedGmail = allPasswords.find(p => p.title === 'Imported Gmail');
      expect(importedGmail).toBeTruthy();
      expect(importedGmail.password).toBe('ImportedPass123!');
    });

    test('should import passwords from CSV format', async () => {
      const csvData = `Title,Username,Password,URL,Notes,Category,Tags
"Test Site 1","user1","pass1","https://site1.com","Notes 1","Web","test"
"Test Site 2","user2","pass2","https://site2.com","Notes 2","Social","test"`;

      const result = await passwordStorageManager.importPasswords(
        csvData,
        'csv',
        { checkDuplicates: false }
      );

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify passwords were imported
      const allPasswords = await passwordStorageManager.getAllPasswords();
      expect(allPasswords).toHaveLength(2);
      
      const testSite1 = allPasswords.find(p => p.title === 'Test Site 1');
      expect(testSite1).toBeTruthy();
      expect(testSite1.username).toBe('user1');
      expect(testSite1.password).toBe('pass1');
    });

    test('should handle CSV with quoted values containing commas', async () => {
      const csvData = `Title,Username,Password,URL,Notes,Category
"Test, Site","user@email.com","pass,word","https://test.com","Notes, with commas","Web"`;

      const result = await passwordStorageManager.importPasswords(
        csvData,
        'csv',
        { checkDuplicates: false }
      );

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);

      const allPasswords = await passwordStorageManager.getAllPasswords();
      const importedPassword = allPasswords[0];
      
      expect(importedPassword.title).toBe('Test, Site');
      expect(importedPassword.username).toBe('user@email.com');
      expect(importedPassword.password).toBe('pass,word');
      expect(importedPassword.notes).toBe('Notes, with commas');
    });

    test('should skip duplicate passwords when configured', async () => {
      // Add initial password
      await passwordStorageManager.addPassword({
        title: 'Existing Site',
        username: 'existing@user.com',
        password: 'ExistingPass123!',
        url: 'https://existing.com',
        category: 'Web'
      });

      // Import with duplicate
      const testData = {
        passwords: [
          {
            title: 'Existing Site',
            username: 'existing@user.com',
            password: 'UpdatedPass456!',
            url: 'https://existing.com',
            category: 'Web'
          },
          {
            title: 'New Site',
            username: 'new@user.com',
            password: 'NewPass789!',
            url: 'https://newsite.com',
            category: 'Web'
          }
        ]
      };

      const result = await passwordStorageManager.importPasswords(
        JSON.stringify(testData),
        'json',
        { checkDuplicates: true, skipDuplicates: true }
      );

      expect(result.imported).toBe(1); // Only new site
      expect(result.duplicates).toBe(1); // Existing site skipped
      expect(result.errors).toHaveLength(0);

      const allPasswords = await passwordStorageManager.getAllPasswords();
      expect(allPasswords).toHaveLength(2);
    });

    test('should update duplicate passwords when configured', async () => {
      // Add initial password
      await passwordStorageManager.addPassword({
        title: 'Update Site',
        username: 'update@user.com',
        password: 'OldPass123!',
        url: 'https://update.com',
        category: 'Web'
      });

      // Import with duplicate (should update)
      const testData = {
        passwords: [
          {
            title: 'Update Site',
            username: 'update@user.com',
            password: 'NewPass456!',
            url: 'https://update.com',
            category: 'Updated',
            notes: 'Updated notes'
          }
        ]
      };

      const result = await passwordStorageManager.importPasswords(
        JSON.stringify(testData),
        'json',
        { checkDuplicates: true, skipDuplicates: false }
      );

      expect(result.imported).toBe(1);
      expect(result.duplicates).toBe(0);

      const allPasswords = await passwordStorageManager.getAllPasswords();
      expect(allPasswords).toHaveLength(1);
      
      const updatedPassword = allPasswords[0];
      expect(updatedPassword.password).toBe('NewPass456!');
      expect(updatedPassword.category).toBe('Updated');
      expect(updatedPassword.notes).toBe('Updated notes');
    });

    test('should skip entries with insufficient data', async () => {
      const testData = {
        passwords: [
          { title: 'Valid Entry', username: 'user', password: 'pass' },
          { title: '', username: '', password: '' }, // Should be skipped
          { username: 'user2', password: 'pass2' } // No title, but has user/pass
        ]
      };

      const result = await passwordStorageManager.importPasswords(
        JSON.stringify(testData),
        'json',
        { checkDuplicates: false }
      );

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(1);
    });

    test('should handle malformed JSON gracefully', async () => {
      await expect(
        passwordStorageManager.importPasswords('invalid json', 'json')
      ).rejects.toThrow('Import failed');
    });

    test('should handle empty CSV gracefully', async () => {
      await expect(
        passwordStorageManager.importPasswords('', 'csv')
      ).rejects.toThrow('CSV file must contain headers and at least one data row');
    });

    test('should throw error for unsupported import format', async () => {
      await expect(
        passwordStorageManager.importPasswords('data', 'unsupported')
      ).rejects.toThrow('Unsupported import format: unsupported');
    });
  });

  describe('CSV Parsing', () => {
    test('should parse simple CSV line correctly', () => {
      const line = 'title,username,password,url';
      const result = passwordStorageManager.parseCSVLine(line);
      
      expect(result).toEqual(['title', 'username', 'password', 'url']);
    });

    test('should handle quoted values with commas', () => {
      const line = '"title, with comma","username","password","url"';
      const result = passwordStorageManager.parseCSVLine(line);
      
      expect(result).toEqual(['title, with comma', 'username', 'password', 'url']);
    });

    test('should handle escaped quotes', () => {
      const line = '"title with ""quotes""","username","password","url"';
      const result = passwordStorageManager.parseCSVLine(line);
      
      expect(result).toEqual(['title with "quotes"', 'username', 'password', 'url']);
    });

    test('should handle empty fields', () => {
      const line = 'title,,password,';
      const result = passwordStorageManager.parseCSVLine(line);
      
      expect(result).toEqual(['title', '', 'password', '']);
    });
  });

  describe('Round-trip Import/Export', () => {
    test('should maintain data integrity through export and import cycle', async () => {
      // Add test passwords
      const originalPasswords = [
        {
          title: 'Round Trip Test 1',
          username: 'roundtrip1@test.com',
          password: 'TestPass123!',
          url: 'https://test1.com',
          notes: 'Round trip test notes',
          category: 'Test',
          tags: ['test', 'roundtrip']
        },
        {
          title: 'Round Trip Test 2',
          username: 'roundtrip2@test.com',
          password: 'TestPass456!',
          url: 'https://test2.com',
          notes: 'Another test entry',
          category: 'Test',
          tags: ['test', 'verification']
        }
      ];

      for (const password of originalPasswords) {
        await passwordStorageManager.addPassword(password);
      }

      // Export passwords
      const exportedData = await passwordStorageManager.exportPasswords('json', { includePasswords: true });
      
      // Clear database and import back
      const allPasswords = await passwordStorageManager.getAllPasswords();
      for (const password of allPasswords) {
        await passwordStorageManager.deletePassword(password.id);
      }

      // Import the exported data
      const importResult = await passwordStorageManager.importPasswords(exportedData, 'json');
      
      expect(importResult.imported).toBe(2);
      expect(importResult.errors).toHaveLength(0);

      // Verify imported data matches original
      const importedPasswords = await passwordStorageManager.getAllPasswords();
      expect(importedPasswords).toHaveLength(2);

      // Sort both arrays by title for comparison
      const sortedOriginal = originalPasswords.sort((a, b) => a.title.localeCompare(b.title));
      const sortedImported = importedPasswords.sort((a, b) => a.title.localeCompare(b.title));

      for (let i = 0; i < sortedOriginal.length; i++) {
        expect(sortedImported[i].title).toBe(sortedOriginal[i].title);
        expect(sortedImported[i].username).toBe(sortedOriginal[i].username);
        expect(sortedImported[i].password).toBe(sortedOriginal[i].password);
        expect(sortedImported[i].url).toBe(sortedOriginal[i].url);
        expect(sortedImported[i].notes).toBe(sortedOriginal[i].notes);
        expect(sortedImported[i].category).toBe(sortedOriginal[i].category);
      }
    });
  });
});
