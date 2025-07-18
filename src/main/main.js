const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

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

// Handle app ready event
app.whenReady().then(() => {
  ipcMain.handle('ping', () => 'pong')
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

