// SecurePass Desktop - Renderer Main JavaScript
// This file handles the main UI logic and communicates with the main process

class SecurePassRenderer {
  constructor() {
    this.isInitialized = false;
    this.init();
  }

  /**
   * Initialize the renderer
   */
  async init() {
    try {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initializeApp());
      } else {
        this.initializeApp();
      }
    } catch (error) {
      console.error('Failed to initialize renderer:', error);
      this.showError('Failed to initialize application');
    }
  }

  /**
   * Initialize the application
   */
  async initializeApp() {
    try {
      // Check if electronAPI is available
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Load version information
      await this.loadVersionInfo();

      // Setup event listeners
      this.setupEventListeners();

      // Update status
      this.updateStatus('Ready', 'success');

      this.isInitialized = true;
      console.log('SecurePass Desktop renderer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to initialize application: ' + error.message);
    }
  }

  /**
   * Load version information
   */
  async loadVersionInfo() {
    try {
      const versions = window.electronAPI.getVersions();
      
      // Update version display
      document.getElementById('node-version').textContent = versions.node;
      document.getElementById('chrome-version').textContent = versions.chrome;
      document.getElementById('electron-version').textContent = versions.electron;
      
      // Update app info
      if (window.appInfo) {
        document.getElementById('version-info').textContent = `v${window.appInfo.version}`;
      }
    } catch (error) {
      console.error('Failed to load version info:', error);
      this.showError('Failed to load version information');
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Test connection button
    const testButton = document.getElementById('test-connection');
    if (testButton) {
      testButton.addEventListener('click', () => this.testConnection());
    }

    // Get started button
    const getStartedButton = document.getElementById('get-started');
    if (getStartedButton) {
      getStartedButton.addEventListener('click', () => this.getStarted());
    }

    // Window events
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  /**
   * Test connection to main process
   */
  async testConnection() {
    const button = document.getElementById('test-connection');
    const resultDiv = document.getElementById('test-result');
    
    try {
      // Disable button during test
      button.disabled = true;
      button.textContent = 'Testing...';
      
      // Clear previous results
      resultDiv.textContent = '';
      resultDiv.className = 'result-message';
      
      // Test ping
      const response = await window.electronAPI.ping();
      
      if (response === 'pong') {
        this.showResult('✅ Connection successful! Main process is responding.', 'success');
      } else {
        this.showResult('⚠️ Unexpected response from main process.', 'error');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      this.showResult('❌ Connection test failed: ' + error.message, 'error');
    } finally {
      // Re-enable button
      button.disabled = false;
      button.textContent = 'Test Connection';
    }
  }

  /**
   * Handle get started action
   */
  async getStarted() {
    try {
      this.showResult('🚀 Getting started...', 'info');
      
      // Check if master password is already set
      const hasMasterPassword = await window.electronAPI.hasMasterPassword();
      
      if (hasMasterPassword) {
        // Navigate to authentication page
        this.navigateToPage('authenticate');
      } else {
        // Navigate to master password setup
        this.navigateToPage('master-password-setup');
      }
      
      console.log('Get started clicked - navigating to', hasMasterPassword ? 'authentication' : 'setup');
    } catch (error) {
      console.error('Get started failed:', error);
      this.showError('Failed to get started: ' + error.message);
    }
  }

  /**
   * Navigate to a specific page
   */
  navigateToPage(page) {
    try {
      let pagePath;
      
      switch (page) {
        case 'master-password-setup':
          pagePath = '../pages/master-password-setup.html';
          break;
        case 'authenticate':
          pagePath = '../pages/authenticate.html';
          break;
        case 'master-password-change':
          pagePath = '../pages/master-password-change.html';
          break;
        case 'dashboard':
          pagePath = '../pages/dashboard.html';
          break;
        default:
          throw new Error('Unknown page: ' + page);
      }
      
      // Navigate to the page
      window.location.href = pagePath;
      
    } catch (error) {
      console.error('Navigation failed:', error);
      this.showError('Navigation failed: ' + error.message);
    }
  }

  /**
   * Update application status
   */
  updateStatus(status, type = 'info') {
    const statusElement = document.getElementById('app-status');
    if (statusElement) {
      statusElement.textContent = status;
      statusElement.className = `status-value ${type}`;
    }
  }

  /**
   * Show result message
   */
  showResult(message, type = 'info') {
    const resultDiv = document.getElementById('test-result');
    if (resultDiv) {
      resultDiv.textContent = message;
      resultDiv.className = `result-message ${type}`;
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showResult('❌ ' + message, 'error');
    this.updateStatus('Error', 'error');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    try {
      // Remove event listeners if needed
      if (window.electronAPI && window.electronAPI.removeAllListeners) {
        window.electronAPI.removeAllListeners('password-generated');
        window.electronAPI.removeAllListeners('security-alert');
      }
      
      console.log('Renderer cleanup completed');
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

// Initialize the renderer when the script loads
const renderer = new SecurePassRenderer();

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecurePassRenderer;
}
