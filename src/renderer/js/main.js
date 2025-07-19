
// SecurePass Desktop - Renderer Main JavaScript
// This file handles the main UI logic and communicates with the main process

  /**
   * Register IPC event listeners
   */
  registerIPCListeners() {
    if (!window.electronAPI) return;
    
    // Keyboard shortcut handlers
    window.electronAPI.onShowShortcutsHelp(() => {
      this.showKeyboardShortcutsHelp();
    });

    window.electronAPI.onNavigateTo(page => {
      this.navigateToPage(page);
    });

    window.electronAPI.onQuickPasswordGenerated(password => {
      this.handleQuickPasswordGenerated(password);
    });

    window.electronAPI.onForceLock(() => {
      this.handleForceLock();
    });
  }

  /**
   * Setup keyboard shortcut handlers (local shortcuts)
   */
  setupKeyboardShortcutHandlers() {
    // Add local keyboard shortcuts that work within the page
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case '/':
            event.preventDefault();
            this.showKeyboardShortcutsHelp();
            break;
          case 'f':
            if (event.shiftKey) {
              event.preventDefault();
              this.focusSearchField();
            }
            break;
        }
      }
    });
  }

  /**
   * Show keyboard shortcuts help dialog
   */
  showKeyboardShortcutsHelp() {
    const shortcuts = [
      { key: 'Ctrl+G', action: 'Open Password Generator' },
      { key: 'Ctrl+V', action: 'Open Password Vault' },
      { key: 'Ctrl+D', action: 'Open Dashboard' },
      { key: 'Ctrl+S', action: 'Open Settings' },
      { key: 'Ctrl+L', action: 'Lock Application' },
      { key: 'Ctrl+Shift+G', action: 'Generate Quick Password' },
      { key: 'Ctrl+H', action: 'Show This Help' },
      { key: 'Ctrl+Q', action: 'Quit Application' },
      { key: 'F1', action: 'Show Application Help' },
      { key: 'Ctrl+/', action: 'Show Shortcuts (Local)' },
      { key: 'Ctrl+Shift+F', action: 'Focus Search Field (Local)' }
    ];

    const helpContent = shortcuts
      .map(s => `${s.key.padEnd(15)} - ${s.action}`)
      .join('\n');

    const message = `Keyboard Shortcuts:\n\n${helpContent}\n\nNote: Global shortcuts work from anywhere, local shortcuts work within the application.`;
    
    // For now, use alert. In a production app, you'd want a proper modal
    alert(message);
  }

  /**
   * Handle quick password generated event
   */
  handleQuickPasswordGenerated(password) {
    console.log('Quick password generated:', password);
    this.showResult(`🔑 Quick password generated and copied to clipboard!`, 'success');
  }

  /**
   * Handle force lock event
   */
  handleForceLock() {
    console.log('Application locked via keyboard shortcut');
    this.showResult('🔒 Application locked', 'info');
  }

  /**
   * Focus search field if available
   */
  focusSearchField() {
    const searchField = document.querySelector('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]');
    if (searchField) {
      searchField.focus();
      searchField.select();
    }
  }

class SecurePassRenderer {
  constructor() {
    this.isInitialized = false;
    this.themeManager = null;
    this.shortcutsManager = null;
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
   * Initialize theme based on system preference or stored preference
   */
  loadThemePreference() {
    try {
      const storedTheme = localStorage.getItem('theme');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      if (storedTheme) {
        document.documentElement.setAttribute('data-theme', storedTheme);
      } else if (systemPrefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  }

  /**
   * Initialize the application
   */
  async initializeApp() {
    // Initialize theme manager
    if (window.ThemeManager) {
      this.themeManager = new window.ThemeManager();
    }
    
    // Initialize keyboard shortcuts manager
    if (window.KeyboardShortcutsManager) {
      this.shortcutsManager = new window.KeyboardShortcutsManager();
    }
    
    this.loadThemePreference();
    try {
      // Check if electronAPI is available
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Load version information
      await this.loadVersionInfo();

      // Setup event listeners
      this.setupEventListeners();

      // Register IPC event listeners (if shortcuts manager wasn't initialized)
      if (!this.shortcutsManager) {
        this.registerIPCListeners();
      }

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

    // Theme toggle integration
    const header = document.querySelector('.app-header');
    if (header && this.themeManager) {
      this.themeManager.createThemeToggle(header);
    }

    // Window events
    window.addEventListener('beforeunload', () => this.cleanup());
    
    // Setup keyboard shortcut handlers (if shortcuts manager not available)
    if (!this.shortcutsManager) {
      this.setupKeyboardShortcutHandlers();
    }
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
      const response = await window.electronAPI.hasMasterPassword();
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to check master password status');
      }
      
      const hasMasterPassword = response.data;
      
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
          pagePath = 'src/renderer/pages/master-password-setup.html';
          break;
        case 'authenticate':
          pagePath = 'src/renderer/pages/authenticate.html';
          break;
        case 'master-password-change':
          pagePath = 'src/renderer/pages/change-master-password.html';
          break;
        case 'dashboard':
          pagePath = 'src/renderer/pages/dashboard.html';
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
