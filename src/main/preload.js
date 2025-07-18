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
  
  // Master Password APIs
  setMasterPassword: (username, password) => ipcRenderer.invoke('set-master-password', username, password),
  authenticate: (username, password) => ipcRenderer.invoke('authenticate', username, password),
  
  // Password Management APIs (to be implemented)
  savePassword: (entry) => ipcRenderer.invoke('save-password', entry),
  getPasswords: () => ipcRenderer.invoke('get-passwords'),
  deletePassword: (id) => ipcRenderer.invoke('delete-password', id),
  
  // Event listeners
  onPasswordGenerated: (callback) => ipcRenderer.on('password-generated', (_event, password) => callback(password)),
  onSecurityAlert: (callback) => ipcRenderer.on('security-alert', (_event, alert) => callback(alert)),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
})

// Expose app information
contextBridge.exposeInMainWorld('appInfo', {
  name: 'SecurePass Desktop',
  version: '1.0.0',
  description: 'A secure, cross-platform password manager'
})
