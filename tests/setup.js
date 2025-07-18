/**
 * Jest setup file for test configuration
 * This file runs before each test suite
 */

// Mock Electron modules for testing
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/path'),
    quit: jest.fn(),
    on: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve())
  },
  BrowserWindow: jest.fn(() => ({
    loadFile: jest.fn(),
    on: jest.fn(),
    webContents: {
      openDevTools: jest.fn()
    }
  })),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  contextBridge: {
    exposeInMainWorld: jest.fn()
  }
}));

// Mock crypto for Node.js environment
const crypto = require('crypto');
global.crypto = {
  getRandomValues: (arr) => {
    return crypto.randomFillSync(arr);
  }
};

// Global test timeout
jest.setTimeout(30000);

// Console suppression for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Restore console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});
