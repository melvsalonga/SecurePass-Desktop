const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Application information
  getVersions: () => ({
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }),
  
  // IPC methods
  ping: () => ipcRenderer.invoke('ping'),
  
  // Password Generation APIs
  generatePassword: (options) => ipcRenderer.invoke('generate-password', options),
  generatePassphrase: (options) => ipcRenderer.invoke('generate-passphrase', options),
  generateBatch: (count, options) => ipcRenderer.invoke('generate-batch', count, options),
  getGeneratorOptions: () => ipcRenderer.invoke('get-generator-options'),
  analyzePasswordStrength: (password) => ipcRenderer.invoke('analyze-password-strength', password),
  
  // Master Password APIs
  hasMasterPassword: () => ipcRenderer.invoke('has-master-password'),
  setMasterPassword: (username, password) => ipcRenderer.invoke('set-master-password', username, password),
  authenticate: (username, password) => ipcRenderer.invoke('authenticate', username, password),
  changeMasterPassword: (oldPassword, newPassword) => ipcRenderer.invoke('change-master-password', oldPassword, newPassword),
  
  // Session Management APIs
  getSessionStatus: () => ipcRenderer.invoke('get-session-status'),
  logout: () => ipcRenderer.invoke('logout'),
  
  // Auto-lock APIs
  getAutoLockStatus: () => ipcRenderer.invoke('auto-lock-status'),
  setAutoLockTimeout: (timeoutMinutes) => ipcRenderer.invoke('set-auto-lock-timeout', timeoutMinutes),
  setAutoLockEnabled: (enabled) => ipcRenderer.invoke('set-auto-lock-enabled', enabled),
  forceLock: () => ipcRenderer.invoke('force-lock'),
  unlockApplication: (password) => ipcRenderer.invoke('unlock-application', password),
  registerActivity: () => ipcRenderer.invoke('register-activity'),
  
  // Password Storage APIs
  addPassword: (entry) => ipcRenderer.invoke('add-password', entry),
  savePassword: (entry) => ipcRenderer.invoke('add-password', entry), // Alias for addPassword
  updatePassword: (id, entry) => ipcRenderer.invoke('update-password', id, entry),
  deletePassword: (id) => ipcRenderer.invoke('delete-password', id),
  getPasswords: () => ipcRenderer.invoke('get-passwords'),
  searchPasswords: (query, filters) => ipcRenderer.invoke('search-passwords', query, filters),
  getPasswordCategories: () => ipcRenderer.invoke('get-password-categories'),
  addPasswordCategory: (category) => ipcRenderer.invoke('add-password-category', category),
  getPasswordStatistics: () => ipcRenderer.invoke('get-password-statistics'),
  
  // Enhanced categorization and tagging APIs
  getAllTags: () => ipcRenderer.invoke('get-all-tags'),
  getTagStatistics: () => ipcRenderer.invoke('get-tag-statistics'),
  getEntriesByCategory: (category) => ipcRenderer.invoke('get-entries-by-category', category),
  getEntriesByTag: (tag) => ipcRenderer.invoke('get-entries-by-tag', tag),
  getEntriesByTags: (tags) => ipcRenderer.invoke('get-entries-by-tags', tags),
  updateCategoryForEntries: (oldCategory, newCategory) => ipcRenderer.invoke('update-category-for-entries', oldCategory, newCategory),
  replaceTagForEntries: (oldTag, newTag) => ipcRenderer.invoke('replace-tag-for-entries', oldTag, newTag),
  removeTagFromEntries: (tagToRemove) => ipcRenderer.invoke('remove-tag-from-entries', tagToRemove),
  getCategoryStatistics: () => ipcRenderer.invoke('get-category-statistics'),
  getOrganizationalInsights: () => ipcRenderer.invoke('get-organizational-insights'),
  
  // Advanced search and security APIs
  advancedSearch: (searchCriteria) => ipcRenderer.invoke('advanced-search', searchCriteria),
  getSearchSuggestions: (input, limit) => ipcRenderer.invoke('get-search-suggestions', input, limit),
  getDuplicatePasswords: () => ipcRenderer.invoke('get-duplicate-passwords'),
  getOldEntries: (daysThreshold) => ipcRenderer.invoke('get-old-entries', daysThreshold),
  getSecurityAnalysis: () => ipcRenderer.invoke('get-security-analysis'),
  
  // Password import/export APIs
  exportPasswords: (format, options) => ipcRenderer.invoke('export-passwords', format, options),
  importPasswords: (data, format, options) => ipcRenderer.invoke('import-passwords', data, format, options),
  
  // Event listeners
  onPasswordGenerated: (callback) => ipcRenderer.on('password-generated', (_event, password) => callback(password)),
  onSecurityAlert: (callback) => ipcRenderer.on('security-alert', (_event, alert) => callback(alert)),
  
  // Keyboard shortcuts and navigation listeners
  onNavigateTo: (callback) => ipcRenderer.on('navigate-to', (_event, page) => callback(page)),
  onQuickPasswordGenerated: (callback) => ipcRenderer.on('quick-password-generated', (_event, password) => callback(password)),
  onShowShortcutsHelp: (callback) => ipcRenderer.on('show-shortcuts-help', (_event) => callback()),
  onShowHelp: (callback) => ipcRenderer.on('show-help', (_event) => callback()),
  onForceLock: (callback) => ipcRenderer.on('force-lock', (_event) => callback()),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
})

// Expose app information
contextBridge.exposeInMainWorld('appInfo', {
  name: 'SecurePass Desktop',
  version: '1.0.0',
  description: 'A secure, cross-platform password manager'
})
