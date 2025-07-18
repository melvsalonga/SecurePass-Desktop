const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const PasswordGenerator = require('../shared/password-generator')

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
  })

  win.loadFile('index.html')
}

// Initialize password generator
const passwordGenerator = new PasswordGenerator()

// Handle app ready event
app.whenReady().then(() => {
  // Basic IPC handlers
  ipcMain.handle('ping', () => 'pong')
  
  // Password generation handlers
  ipcMain.handle('generate-password', async (event, options) => {
    try {
      const result = passwordGenerator.generatePassword(options)
      return { success: true, data: result }
    } catch (error) {
      console.error('Password generation error:', error)
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('generate-passphrase', async (event, options) => {
    try {
      const result = passwordGenerator.generatePassphrase(options)
      return { success: true, data: result }
    } catch (error) {
      console.error('Passphrase generation error:', error)
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('generate-batch', async (event, count, options) => {
    try {
      const result = passwordGenerator.generateBatch(count, options)
      return { success: true, data: result }
    } catch (error) {
      console.error('Batch generation error:', error)
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('get-generator-options', async () => {
    try {
      return {
        success: true,
        data: {
          defaultOptions: passwordGenerator.getDefaultOptions(),
          characterSets: passwordGenerator.getCharacterSets()
        }
      }
    } catch (error) {
      console.error('Get options error:', error)
      return { success: false, error: error.message }
    }
  })
  
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

