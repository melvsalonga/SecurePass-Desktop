/**
 * Dashboard JavaScript Controller
 * Handles the main dashboard functionality after authentication
 */

class DashboardController {
  constructor() {
    this.themeManager = null;
    this.currentUser = null;
    this.stats = {
      totalPasswords: 0,
      weakPasswords: 0,
      recentActivity: 0
    };
    this.initializeTheme();
    this.initializeEventListeners();
    this.loadDashboardData();
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
    // Main action cards
    this.setupActionCard('password-generator', () => {
      this.navigateToPage('generator.html');
    });

    this.setupActionCard('password-vault', () => {
      this.navigateToPage('vault.html');
    });

    this.setupActionCard('security-center', () => {
      this.showSecurityCenter();
    });

    this.setupActionCard('app-settings', () => {
      this.navigateToPage('settings.html');
    });

    // Quick action buttons
    this.setupQuickAction('quick-generate', () => {
      this.quickGeneratePassword();
    });

    this.setupQuickAction('quick-strength', () => {
      this.quickCheckStrength();
    });

    this.setupQuickAction('quick-import', () => {
      this.navigateToPage('settings.html#import');
    });

    this.setupQuickAction('quick-backup', () => {
      this.navigateToPage('settings.html#export');
    });

    // Logout button
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.logout();
      });
    }
  }

  /**
   * Setup action card event listener
   */
  setupActionCard(cardId, action) {
    const card = document.getElementById(cardId);
    if (card) {
      // Add click to entire card
      card.addEventListener('click', action);
      
      // Add click to button inside card
      const button = card.querySelector('button');
      if (button) {
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          action();
        });
      }
    }
  }

  /**
   * Setup quick action button
   */
  setupQuickAction(buttonId, action) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener('click', action);
    }
  }

  /**
   * Load dashboard data and statistics
   */
  async loadDashboardData() {
    try {
      // Load user information
      await this.loadUserInfo();
      
      // Load password statistics
      await this.loadPasswordStats();
      
      // Load recent activity
      await this.loadRecentActivity();
      
      // Check for security alerts
      await this.checkSecurityAlerts();
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      this.showNotification('Failed to load dashboard data', 'error');
    }
  }

  /**
   * Load user information
   */
  async loadUserInfo() {
    try {
      // For now, we'll use a default user or get from authentication
      this.currentUser = { username: 'User' };
      
      const userDisplay = document.getElementById('current-user');
      if (userDisplay) {
        userDisplay.textContent = `Welcome, ${this.currentUser.username}`;
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
    }
  }

  /**
   * Load password statistics
   */
  async loadPasswordStats() {
    try {
      if (window.electronAPI) {
        // Get password statistics from the main process
        const response = await window.electronAPI.getPasswordStatistics();
        
        if (response.success) {
          this.stats = response.data;
          this.updateStatsDisplay();
        } else {
          // Show default stats if API call fails
          this.showDefaultStats();
        }
      } else {
        this.showDefaultStats();
      }
    } catch (error) {
      console.error('Failed to load password stats:', error);
      this.showDefaultStats();
    }
  }

  /**
   * Update statistics display
   */
  updateStatsDisplay() {
    const totalElement = document.getElementById('total-passwords');
    const weakElement = document.getElementById('weak-passwords');
    const activityElement = document.getElementById('recent-activity');

    if (totalElement) totalElement.textContent = this.stats.totalPasswords || 0;
    if (weakElement) weakElement.textContent = this.stats.weakPasswords || 0;
    if (activityElement) activityElement.textContent = this.stats.recentActivity || 0;
  }

  /**
   * Show default statistics when data is not available
   */
  showDefaultStats() {
    this.stats = {
      totalPasswords: 0,
      weakPasswords: 0,
      recentActivity: 0
    };
    this.updateStatsDisplay();
  }

  /**
   * Load recent activity
   */
  async loadRecentActivity() {
    try {
      const activityList = document.getElementById('recent-activity-list');
      if (activityList) {
        // For now, show placeholder activity
        activityList.innerHTML = `
          <div class="activity-item">
            <span class="activity-icon">🔐</span>
            <span class="activity-text">Welcome to SecurePass Desktop</span>
            <span class="activity-time">Just now</span>
          </div>
        `;
      }
    } catch (error) {
      console.error('Failed to load recent activity:', error);
    }
  }

  /**
   * Check for security alerts
   */
  async checkSecurityAlerts() {
    try {
      // For now, hide security alerts section
      const alertsSection = document.getElementById('security-alerts');
      if (alertsSection) {
        alertsSection.style.display = 'none';
      }
    } catch (error) {
      console.error('Failed to check security alerts:', error);
    }
  }

  /**
   * Quick generate password
   */
  async quickGeneratePassword() {
    try {
      if (!window.electronAPI) {
        this.showNotification('Password generation requires full application mode', 'info');
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
        this.showNotification(`Password generated and copied! (${response.data.strength.level})`, 'success');
      } else {
        this.showNotification('Failed to generate password: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('Quick password generation failed:', error);
      this.showNotification('Password generation failed: ' + error.message, 'error');
    }
  }

  /**
   * Quick check password strength
   */
  quickCheckStrength() {
    const password = prompt('Enter a password to check its strength:');
    if (!password) return;

    try {
      // Simple client-side strength check
      const analysis = this.analyzePasswordStrength(password);
      this.showNotification(`Strength: ${analysis.level} (${analysis.score}/100)`, 
        analysis.score >= 60 ? 'success' : 'info');
    } catch (error) {
      this.showNotification('Strength analysis failed: ' + error.message, 'error');
    }
  }

  /**
   * Simple password strength analysis
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
    if (/(.)\\1{2,}/.test(password)) score -= 10;
    if (/123|abc|qwe/i.test(password)) score -= 15;

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
   * Show security center (placeholder)
   */
  showSecurityCenter() {
    this.showNotification('Security Center feature coming soon!', 'info');
  }

  /**
   * Navigate to a specific page
   */
  navigateToPage(page) {
    try {
      window.location.href = page;
    } catch (error) {
      console.error('Navigation error:', error);
      this.showNotification('Navigation failed: ' + error.message, 'error');
    }
  }

  /**
   * Logout user
   */
  logout() {
    if (confirm('Are you sure you want to sign out?')) {
      // Redirect to home page
      window.location.href = 'home.html';
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

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const dashboard = new DashboardController();
  console.log('Dashboard controller initialized');
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardController;
}
