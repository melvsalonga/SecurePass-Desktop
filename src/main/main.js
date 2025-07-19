const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const PasswordGenerator = require('../shared/password-generator');
const EncryptionManager = require('./encryption');
const SimpleDatabaseManager = require('./simpleDatabaseManager');
const AutoLockManager = require('./autoLockManager');
const PasswordStorageManager = require('./passwordStorageManager');

// Function to create main application window
const createMainWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile('index.html');
};

// Initialize password generator
const passwordGenerator = new PasswordGenerator();

// Initialize encryption and database managers
const encryptionManager = new EncryptionManager();
const databaseManager = new SimpleDatabaseManager();
const autoLockManager = new AutoLockManager();
let passwordStorageManager = null;

// Handle app ready event
app.whenReady().then(async () => {
  await databaseManager.initialize();

  // Basic IPC handlers
  ipcMain.handle('ping', () => 'pong');
  
  // Check if master password exists
  ipcMain.handle('has-master-password', async () => {
    try {
      const result = await databaseManager.hasMasterPassword();
      return { success: true, data: result };
    } catch (error) {
      console.error('Check master password error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Master password setup
  ipcMain.handle('set-master-password', async (event, username, password) => {
    try {
      const result = await databaseManager.createUser(username, password);
      return { success: true, data: result };
    } catch (error) {
      console.error('Master password setup error:', error);
      return { success: false, error: error.message };
    }
  });

  // Authentication
  ipcMain.handle('authenticate', async (event, username, password) => {
    try {
      const result = await databaseManager.authenticateUser(username, password);
      
      // Initialize password storage manager with database key
      if (result.authenticated && databaseManager.databaseKey) {
        await passwordStorageManager.initialize(databaseManager.databaseKey);
        console.log('Password storage initialized after successful authentication');
      }
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: error.message };
    }
  });

  // Password generation handlers
  ipcMain.handle('generate-password', async (event, options) => {
    try {
      const result = passwordGenerator.generatePassword(options);
      return { success: true, data: result };
    } catch (error) {
      console.error('Password generation error:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('generate-passphrase', async (event, options) => {
    try {
      const result = passwordGenerator.generatePassphrase(options);
      return { success: true, data: result };
    } catch (error) {
      console.error('Passphrase generation error:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('generate-batch', async (event, count, options) => {
    try {
      const result = passwordGenerator.generateBatch(count, options);
      return { success: true, data: result };
    } catch (error) {
      console.error('Batch generation error:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('get-generator-options', async () => {
    try {
      return {
        success: true,
        data: {
          defaultOptions: passwordGenerator.getDefaultOptions(),
          characterSets: passwordGenerator.getCharacterSets()
        }
      };
    } catch (error) {
      console.error('Get options error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Password strength analysis handler
  ipcMain.handle('analyze-password-strength', async (event, password) => {
    try {
      // Use the password generator's strength analysis
      const options = passwordGenerator.getDefaultOptions();
      const analysis = passwordGenerator.calculatePasswordStrength(password, options);
      
      return {
        success: true,
        data: {
          ...analysis,
          length: password.length,
          characterTypes: passwordGenerator.getCharacterTypes(password),
          uniqueCharacters: [...new Set(password)].length,
          patterns: passwordGenerator.detectPatterns(password)
        }
      };
    } catch (error) {
      console.error('Password analysis error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Change master password handler
  ipcMain.handle('change-master-password', async (event, oldPassword, newPassword) => {
    try {
      const result = await databaseManager.changeMasterPassword(oldPassword, newPassword);
      return { success: true, data: result };
    } catch (error) {
      console.error('Change master password error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Auto-lock handlers
  ipcMain.handle('auto-lock-status', async () => {
    try {
      return { success: true, data: autoLockManager.getStatus() };
    } catch (error) {
      console.error('Auto-lock status error:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('set-auto-lock-timeout', async (event, timeoutMinutes) => {
    try {
      autoLockManager.setLockTimeout(timeoutMinutes);
      return { success: true, data: { timeoutMinutes } };
    } catch (error) {
      console.error('Set auto-lock timeout error:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('set-auto-lock-enabled', async (event, enabled) => {
    try {
      autoLockManager.setEnabled(enabled);
      return { success: true, data: { enabled } };
    } catch (error) {
      console.error('Set auto-lock enabled error:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('force-lock', async () => {
    try {
      autoLockManager.forceLock();
      return { success: true, data: { locked: true } };
    } catch (error) {
      console.error('Force lock error:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('unlock-application', async (event, password) => {
    try {
      const result = await autoLockManager.unlockApplication(password);
      return { success: true, data: { unlocked: result } };
    } catch (error) {
      console.error('Unlock application error:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('register-activity', async () => {
    try {
      autoLockManager.registerActivity();
      return { success: true };
    } catch (error) {
      console.error('Register activity error:', error);
      return { success: false, error: error.message };
    }
  });
  
// Initialize password storage manager
  passwordStorageManager = new PasswordStorageManager(databaseManager, encryptionManager);

   // Password storage handlers
  ipcMain.handle('add-password', async (event, entry) => {
    try {
      const result = await passwordStorageManager.addPassword(entry);
      return { success: true, data: result };
    } catch (error) {
      console.error('Add password error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-password', async (event, id, entry) => {
    try {
      const result = await passwordStorageManager.updatePassword(id, entry);
      return { success: true, data: result };
    } catch (error) {
      console.error('Update password error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-password', async (event, id) => {
    try {
      const result = await passwordStorageManager.deletePassword(id);
      return { success: true, data: result };
    } catch (error) {
      console.error('Delete password error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-passwords', async () => {
    try {
      const result = await passwordStorageManager.getAllPasswords();
      return { success: true, data: result };
    } catch (error) {
      console.error('Get passwords error:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('search-passwords', async (event, query, filters) => {
    try {
      const result = await passwordStorageManager.searchPasswords(query, filters);
      return { success: true, data: result };
    } catch (error) {
      console.error('Search passwords error:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('get-password-categories', async () => {
    try {
      const result = passwordStorageManager.getCategories();
      return { success: true, data: result };
    } catch (error) {
      console.error('Get categories error:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('add-password-category', async (event, category) => {
    try {
      passwordStorageManager.addCategory(category);
      return { success: true, data: { category } };
    } catch (error) {
      console.error('Add category error:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('get-password-statistics', async () => {
    try {
      const result = await passwordStorageManager.getStatistics();
      return { success: true, data: result };
    } catch (error) {
      console.error('Get statistics error:', error);
      return { success: false, error: error.message };
    }
  });

  // Enhanced categorization and tagging handlers
  ipcMain.handle('get-all-tags', async () => {
    try {
      const result = await passwordStorageManager.getAllTags();
      return { success: true, data: result };
    } catch (error) {
      console.error('Get all tags error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-tag-statistics', async () => {
    try {
      const result = await passwordStorageManager.getTagStatistics();
      return { success: true, data: result };
    } catch (error) {
      console.error('Get tag statistics error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-entries-by-category', async (event, category) => {
    try {
      const result = await passwordStorageManager.getEntriesByCategory(category);
      return { success: true, data: result };
    } catch (error) {
      console.error('Get entries by category error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-entries-by-tag', async (event, tag) => {
    try {
      const result = await passwordStorageManager.getEntriesByTag(tag);
      return { success: true, data: result };
    } catch (error) {
      console.error('Get entries by tag error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-entries-by-tags', async (event, tags) => {
    try {
      const result = await passwordStorageManager.getEntriesByTags(tags);
      return { success: true, data: result };
    } catch (error) {
      console.error('Get entries by tags error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-category-for-entries', async (event, oldCategory, newCategory) => {
    try {
      const result = await passwordStorageManager.updateCategoryForEntries(oldCategory, newCategory);
      return { success: true, data: result };
    } catch (error) {
      console.error('Update category for entries error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('replace-tag-for-entries', async (event, oldTag, newTag) => {
    try {
      const result = await passwordStorageManager.replaceTagForEntries(oldTag, newTag);
      return { success: true, data: result };
    } catch (error) {
      console.error('Replace tag for entries error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('remove-tag-from-entries', async (event, tagToRemove) => {
    try {
      const result = await passwordStorageManager.removeTagFromEntries(tagToRemove);
      return { success: true, data: result };
    } catch (error) {
      console.error('Remove tag from entries error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-category-statistics', async () => {
    try {
      const result = await passwordStorageManager.getCategoryStatistics();
      return { success: true, data: result };
    } catch (error) {
      console.error('Get category statistics error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-organizational-insights', async () => {
    try {
      const result = await passwordStorageManager.getOrganizationalInsights();
      return { success: true, data: result };
    } catch (error) {
      console.error('Get organizational insights error:', error);
      return { success: false, error: error.message };
    }
  });

  // Advanced search and filter handlers
  ipcMain.handle('advanced-search', async (event, searchCriteria) => {
    try {
      const result = await passwordStorageManager.advancedSearch(searchCriteria);
      return { success: true, data: result };
    } catch (error) {
      console.error('Advanced search error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-search-suggestions', async (event, input, limit) => {
    try {
      const result = await passwordStorageManager.getSearchSuggestions(input, limit);
      return { success: true, data: result };
    } catch (error) {
      console.error('Get search suggestions error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-duplicate-passwords', async () => {
    try {
      const result = await passwordStorageManager.getDuplicatePasswords();
      return { success: true, data: result };
    } catch (error) {
      console.error('Get duplicate passwords error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-old-entries', async (event, daysThreshold) => {
    try {
      const result = await passwordStorageManager.getOldEntries(daysThreshold);
      return { success: true, data: result };
    } catch (error) {
      console.error('Get old entries error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-security-analysis', async () => {
    try {
      const result = await passwordStorageManager.getSecurityAnalysis();
      return { success: true, data: result };
    } catch (error) {
      console.error('Get security analysis error:', error);
      return { success: false, error: error.message };
    }
  });

  // Password import/export handlers
  ipcMain.handle('export-passwords', async (event, format, options) => {
    try {
      const result = await passwordStorageManager.exportPasswords(format, options);
      return { success: true, data: result };
    } catch (error) {
      console.error('Export passwords error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('import-passwords', async (event, data, format, options) => {
    try {
      const result = await passwordStorageManager.importPasswords(data, format, options);
      return { success: true, data: result };
    } catch (error) {
      console.error('Import passwords error:', error);
      return { success: false, error: error.message };
    }
  });

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

