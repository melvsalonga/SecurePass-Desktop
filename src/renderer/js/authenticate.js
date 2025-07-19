/**
 * Authentication Page JavaScript
 * Handles user authentication for existing users
 */

class AuthenticationUI {
  constructor() {
    this.isAuthenticating = false;
    this.themeManager = null;
    this.initializeTheme();
    this.initializeEventListeners();
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
   * Initialize event listeners
   */
  initializeEventListeners() {
    // Authentication form
    const authForm = document.getElementById('auth-form');
    if (authForm) {
      authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAuthentication();
      });
    }

    // Back to home button
    const backButton = document.getElementById('back-home');
    if (backButton) {
      backButton.addEventListener('click', () => {
        window.location.href = 'home.html';
      });
    }

    // Enter key handling
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !this.isAuthenticating) {
        this.handleAuthentication();
      }
    });
  }

  /**
   * Handle authentication
   */
  async handleAuthentication() {
    if (this.isAuthenticating) return;

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const submitButton = document.querySelector('button[type="submit"]');
    const resultDiv = document.getElementById('auth-result');

    // Validate input
    if (!username || !password) {
      this.showResult('Please enter both username and password', 'error');
      return;
    }

    try {
      this.isAuthenticating = true;
      
      // Update UI
      submitButton.disabled = true;
      submitButton.textContent = 'Authenticating...';
      resultDiv.textContent = '';
      resultDiv.className = 'result-message';

      // Authenticate with main process
      const response = await window.electronAPI.authenticate(username, password);

      if (response.success) {
        this.showResult('✅ Authentication successful! Redirecting...', 'success');
        
        // Wait a moment then redirect to dashboard
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1500);
      } else {
        this.showResult('❌ Authentication failed: ' + (response.error || 'Invalid credentials'), 'error');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      this.showResult('❌ Authentication failed: ' + error.message, 'error');
    } finally {
      this.isAuthenticating = false;
      submitButton.disabled = false;
      submitButton.textContent = 'Sign In';
    }
  }

  /**
   * Show result message
   */
  showResult(message, type = 'info') {
    const resultDiv = document.getElementById('auth-result');
    if (resultDiv) {
      resultDiv.textContent = message;
      resultDiv.className = `result-message ${type}`;
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (notification) {
      notification.textContent = message;
      notification.className = `notification ${type} show`;
      
      // Hide notification after 3 seconds
      setTimeout(() => {
        notification.classList.remove('show');
      }, 3000);
    }
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  const authUI = new AuthenticationUI();
  console.log('Authentication UI initialized');
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthenticationUI;
}
