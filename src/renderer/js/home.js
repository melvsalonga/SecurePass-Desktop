/**
 * Home Page JavaScript Controller
 * Handles the main dashboard functionality and navigation
 */

class HomePageController {
  constructor() {
    this.themeManager = null;
    this.isInitialized = false;
    this.isAuthenticated = false;
    this.currentUser = null;
    this.initializeTheme();
    this.initializeEventListeners();
    this.setupLoginForm();
    this.checkAuthenticationStatus();
  }

  /**
   * Check current authentication status
   */
  async checkAuthenticationStatus() {
    try {
      // Check if master password exists first
      if (window.electronAPI) {
        const hasPassword = await window.electronAPI.hasMasterPassword();
        
        if (hasPassword.success && hasPassword.data) {
          // Master password exists, show authentication required
          this.isAuthenticated = false;
          this.updateUIBasedOnAuth();
          this.loadApplicationStatus();
        } else {
          // No master password, redirect to setup
          this.showSetupPrompt();
        }
      } else {
        // Demo mode
        this.isAuthenticated = false;
        this.updateUIBasedOnAuth();
        this.loadApplicationStatus();
      }
    } catch (error) {
      console.error('Failed to check authentication status:', error);
      this.showResult('Failed to check authentication status', 'error');
    }
  }

  /**
   * Update UI based on authentication status
   */
  updateUIBasedOnAuth() {
    const authSection = document.getElementById('auth-required');
    const dashboardSection = document.getElementById('main-dashboard');
    const userDisplay = document.getElementById('current-user');

    if (this.isAuthenticated) {
      authSection.style.display = 'none';
      dashboardSection.style.display = 'block';
      if (userDisplay && this.currentUser) {
        userDisplay.textContent = this.currentUser.username || 'User';
      }
    } else {
      authSection.style.display = 'block';
      dashboardSection.style.display = 'none';
    }
  }

  /**
   * Setup login form actions
   */
  setupLoginForm() {
    // Show login button
    const showLoginBtn = document.getElementById('show-login');
    if (showLoginBtn) {
      showLoginBtn.addEventListener('click', () => {
        this.showLoginForm();
      });
    }

    // Show setup button
    const showSetupBtn = document.getElementById('show-setup');
    if (showSetupBtn) {
      showSetupBtn.addEventListener('click', () => {
        this.navigateToPage('master-password-setup.html');
      });
    }

    // Cancel login button
    const cancelLoginBtn = document.getElementById('cancel-login');
    if (cancelLoginBtn) {
      cancelLoginBtn.addEventListener('click', () => {
        this.hideLoginForm();
      });
    }

    // Login form submission
    const authForm = document.getElementById('auth-form');
    if (authForm) {
      authForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        await this.processLogin(username, password);
      });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.logout();
      });
    }
  }

  /**
   * Show login form
   */
  showLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.style.display = 'block';
    }
  }

  /**
   * Hide login form
   */
  hideLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.style.display = 'none';
      // Clear form
      document.getElementById('username').value = '';
      document.getElementById('password').value = '';
      document.getElementById('auth-result').textContent = '';
    }
  }

  /**
   * Show setup prompt
   */
  showSetupPrompt() {
    this.showResult('No master password found. Please set up your master password first.', 'info');
    document.getElementById('show-setup').style.display = 'block';
    document.getElementById('show-login').style.display = 'none';
  }

  /**
   * Process login form submission
   */
  async processLogin(username, password) {
    try {
      if (!window.electronAPI) {
        this.showAuthResult('Authentication requires full application mode', 'error');
        return;
      }

      const response = await window.electronAPI.authenticate(username, password);

      if (response.success) {
        this.isAuthenticated = true;
        this.currentUser = { username: username };
        this.hideLoginForm();
        this.updateUIBasedOnAuth();
        this.showResult('Login successful!', 'success');
        this.loadApplicationStatus();
      } else {
        this.showAuthResult('Login failed: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('Login failed:', error);
      this.showAuthResult('Login process failed: ' + error.message, 'error');
    }
  }

  /**
   * Logout user
   */
  logout() {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.updateUIBasedOnAuth();
    this.showResult('Logged out successfully', 'info');
  }

  /**
   * Show authentication result
   */
  showAuthResult(message, type = 'info') {
    const authResult = document.getElementById('auth-result');
    if (authResult) {
      authResult.textContent = message;
      authResult.className = `result-message ${type}`;
    }
  }

  /**
   * Initialize theme manager
   */
  initializeTheme() {
    if (window.ThemeManager) {
      this.themeManager = new window.ThemeManager();
      
      // Add theme toggle to header
      const header = document.querySelector('.app-header');
      if (header && this.themeManager) {
        this.themeManager.createThemeToggle(header);
      }
    }
  }

  /**
   * Initialize all event listeners
   */
  initializeEventListeners() {
    // Main navigation buttons (safely add listeners)
    const passwordGeneratorBtn = document.getElementById('password-generator');
    if (passwordGeneratorBtn) {
      passwordGeneratorBtn.addEventListener('click', () => {
        this.navigateToPage('generator.html');
      });
    }

    const passwordVaultBtn = document.getElementById('password-vault');
    if (passwordVaultBtn) {
      passwordVaultBtn.addEventListener('click', () => {
        this.navigateToPage('vault.html');
      });
    }

    const appSettingsBtn = document.getElementById('app-settings');
    if (appSettingsBtn) {
      appSettingsBtn.addEventListener('click', () => {
        this.navigateToPage('settings.html');
      });
    }

    // Quick action buttons (safely add listeners)
    const generateQuickBtn = document.getElementById('generate-quick');
    if (generateQuickBtn) {
      generateQuickBtn.addEventListener('click', () => {
        this.quickGeneratePassword();
      });
    }

    const checkStrengthBtn = document.getElementById('check-strength');
    if (checkStrengthBtn) {
      checkStrengthBtn.addEventListener('click', () => {
        this.quickCheckStrength();
      });
    }

    const importPasswordsBtn = document.getElementById('import-passwords');
    if (importPasswordsBtn) {
      importPasswordsBtn.addEventListener('click', () => {
        this.navigateToPage('settings.html#import');
      });
    }

    const backupDataBtn = document.getElementById('backup-data');
    if (backupDataBtn) {
      backupDataBtn.addEventListener('click', () => {
        this.quickBackupData();
      });
    }
  }

  /**
   * Navigate to a specific page
   * @param {string} page - Page filename to navigate to
   */
  navigateToPage(page) {
    try {
      window.location.href = page;
    } catch (error) {
      console.error('Navigation error:', error);
      this.showResult('Navigation failed: ' + error.message, 'error');
    }
  }

  /**
   * Load and display application status
   */
  async loadApplicationStatus() {
    try {
      // Update version info
      document.getElementById('version-info').textContent = 'v1.0.0';
      
      // Check database status
      if (window.electronAPI) {
        const hasPassword = await window.electronAPI.hasMasterPassword();
        document.getElementById('db-status').textContent = hasPassword.success ? 'Connected' : 'Not Setup';
        
        // Update security status
        document.getElementById('security-status').textContent = 'Active';
        document.getElementById('app-status').textContent = 'Ready';
      } else {
        document.getElementById('db-status').textContent = 'Offline Mode';
        document.getElementById('security-status').textContent = 'Limited';
        document.getElementById('app-status').textContent = 'Demo Mode';
      }
    } catch (error) {
      console.error('Failed to load application status:', error);
      document.getElementById('app-status').textContent = 'Error';
    }
  }

  /**
   * Quick generate password action
   */
  async quickGeneratePassword() {
    try {
      if (!window.electronAPI) {
        this.showResult('Password generation requires full application mode', 'info');
        return;
      }

      const options = {
        length: 16,
        includeLowercase: true,
        includeUppercase: true,
        includeNumbers: true,
        includeSymbols: true,
        excludeAmbiguous: true,
        enforceComplexity: true
      };

      const response = await window.electronAPI.generatePassword(options);
      
      if (response.success) {
        // Copy to clipboard
        await navigator.clipboard.writeText(response.data.password);
        this.showResult(`Generated password copied to clipboard! (Strength: ${response.data.strength.level})`, 'success');
      } else {
        this.showResult('Failed to generate password: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('Quick password generation failed:', error);
      this.showResult('Password generation failed: ' + error.message, 'error');
    }
  }

  /**
   * Quick check strength action
   */
  quickCheckStrength() {
    const password = prompt('Enter a password to check its strength:');
    if (!password) return;

    try {
      // Simple client-side strength check
      const analysis = this.analyzePasswordStrength(password);
      this.showResult(`Password Strength: ${analysis.level} (Score: ${analysis.score}/100)`, analysis.level === 'Strong' || analysis.level === 'Very Strong' ? 'success' : 'info');
    } catch (error) {
      this.showResult('Strength analysis failed: ' + error.message, 'error');
    }
  }

  /**
   * Quick backup data action
   */
  async quickBackupData() {
    try {
      if (!window.electronAPI) {
        this.showResult('Backup requires full application mode', 'info');
        return;
      }

      // For now, redirect to settings page
      this.navigateToPage('settings.html#export');
    } catch (error) {
      console.error('Quick backup failed:', error);
      this.showResult('Backup failed: ' + error.message, 'error');
    }
  }

  /**
   * Simple password strength analysis (client-side)
   * @param {string} password - Password to analyze
   * @returns {Object} Analysis result
   */
  analyzePasswordStrength(password) {
    let score = 0;
    let level = 'Very Weak';

    // Length scoring
    if (password.length >= 12) score += 25;
    else if (password.length >= 8) score += 15;
    else if (password.length >= 6) score += 10;

    // Character variety
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^a-zA-Z0-9]/.test(password)) score += 20;

    // Penalties
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
    if (/123|abc|qwe/i.test(password)) score -= 15; // Common patterns

    // Determine level
    if (score >= 80) level = 'Very Strong';
    else if (score >= 60) level = 'Strong';
    else if (score >= 40) level = 'Moderate';
    else if (score >= 20) level = 'Weak';

    return {
      score: Math.max(0, Math.min(100, score)),
      level: level
    };
  }

  /**
   * Show result message to user
   * @param {string} message - Message to display
   * @param {string} type - Message type (success, error, info)
   */
  showResult(message, type = 'info') {
    const resultDiv = document.getElementById('result-message');
    if (resultDiv) {
      resultDiv.textContent = message;
      resultDiv.className = `result-message ${type}`;
      
      // Clear message after 5 seconds
      setTimeout(() => {
        resultDiv.textContent = '';
        resultDiv.className = 'result-message';
      }, 5000);
    }
  }
}

// Initialize the home page controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const homeController = new HomePageController();
  console.log('Home page controller initialized');
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HomePageController;
}
