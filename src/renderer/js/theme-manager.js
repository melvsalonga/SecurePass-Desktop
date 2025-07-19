/**
 * Theme Manager
 * Handles theme switching, persistence, and system preference detection
 */
class ThemeManager {
  constructor() {
    this.currentTheme = 'system';
    this.systemPreferenceListener = null;
    this.initialize();
  }

  /**
   * Initialize theme system
   */
  initialize() {
    try {
      // Load saved theme preference or default to system
      this.loadTheme();
      
      // Listen for system theme changes
      this.setupSystemThemeListener();
      
      // Apply initial theme
      this.applyTheme();
      
      console.log('Theme Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize theme manager:', error);
    }
  }

  /**
   * Load theme preference from storage
   */
  loadTheme() {
    try {
      const savedTheme = localStorage.getItem('theme-preference');
      this.currentTheme = savedTheme || 'system';
    } catch (error) {
      console.error('Failed to load theme preference:', error);
      this.currentTheme = 'system';
    }
  }

  /**
   * Save theme preference to storage
   */
  saveTheme() {
    try {
      localStorage.setItem('theme-preference', this.currentTheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }

  /**
   * Setup system theme preference listener
   */
  setupSystemThemeListener() {
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      this.systemPreferenceListener = (e) => {
        if (this.currentTheme === 'system') {
          this.applyTheme();
        }
      };
      
      mediaQuery.addEventListener('change', this.systemPreferenceListener);
    } catch (error) {
      console.error('Failed to setup system theme listener:', error);
    }
  }

  /**
   * Apply current theme to the document
   */
  applyTheme() {
    try {
      let themeToApply = this.currentTheme;
      
      // If system theme is selected, determine actual theme
      if (this.currentTheme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        themeToApply = systemPrefersDark ? 'dark' : 'light';
      }
      
      // Apply theme to document
      document.documentElement.setAttribute('data-theme', themeToApply);
      
      // Trigger theme change event
      this.dispatchThemeChangeEvent(themeToApply);
      
    } catch (error) {
      console.error('Failed to apply theme:', error);
    }
  }

  /**
   * Set theme programmatically
   * @param {string} theme - 'light', 'dark', or 'system'
   */
  setTheme(theme) {
    if (!['light', 'dark', 'system'].includes(theme)) {
      console.error('Invalid theme:', theme);
      return;
    }

    this.currentTheme = theme;
    this.saveTheme();
    this.applyTheme();
    
    console.log('Theme changed to:', theme);
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme() {
    const currentActualTheme = this.getCurrentActualTheme();
    const newTheme = currentActualTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  /**
   * Get current theme preference
   * @returns {string} Current theme preference
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Get the actual theme being applied (resolves 'system' to 'light' or 'dark')
   * @returns {string} Actual theme being applied
   */
  getCurrentActualTheme() {
    if (this.currentTheme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return systemPrefersDark ? 'dark' : 'light';
    }
    return this.currentTheme;
  }

  /**
   * Check if dark theme is currently active
   * @returns {boolean} True if dark theme is active
   */
  isDarkTheme() {
    return this.getCurrentActualTheme() === 'dark';
  }

  /**
   * Get theme icon based on current theme
   * @returns {string} Icon for current theme
   */
  getThemeIcon() {
    const actualTheme = this.getCurrentActualTheme();
    switch (actualTheme) {
      case 'light':
        return '☀️';
      case 'dark':
        return '🌙';
      default:
        return '🌓';
    }
  }

  /**
   * Get theme display name
   * @returns {string} Display name for current theme
   */
  getThemeDisplayName() {
    const actualTheme = this.getCurrentActualTheme();
    switch (this.currentTheme) {
      case 'system':
        return `System (${actualTheme === 'dark' ? 'Dark' : 'Light'})`;
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      default:
        return 'Unknown';
    }
  }

  /**
   * Dispatch theme change event
   * @param {string} actualTheme - The actual theme being applied
   */
  dispatchThemeChangeEvent(actualTheme) {
    try {
      const event = new CustomEvent('themeChanged', {
        detail: {
          theme: this.currentTheme,
          actualTheme: actualTheme,
          isDark: actualTheme === 'dark'
        }
      });
      
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Failed to dispatch theme change event:', error);
    }
  }

  /**
   * Create a theme toggle button
   * @param {HTMLElement} container - Container to append the button to
   * @returns {HTMLElement} The created button element
   */
  createThemeToggle(container) {
    try {
      // Create button container
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'theme-toggle-container';

      // Create button
      const button = document.createElement('button');
      button.className = 'btn-theme-toggle';
      button.title = `Switch to ${this.isDarkTheme() ? 'light' : 'dark'} theme`;
      
      // Update button content
      this.updateToggleButton(button);

      // Add click handler
      button.addEventListener('click', () => {
        this.toggleTheme();
        this.updateToggleButton(button);
      });

      // Listen for theme changes to update button
      window.addEventListener('themeChanged', () => {
        this.updateToggleButton(button);
      });

      buttonContainer.appendChild(button);
      
      if (container) {
        container.appendChild(buttonContainer);
      }
      
      return buttonContainer;
    } catch (error) {
      console.error('Failed to create theme toggle:', error);
      return null;
    }
  }

  /**
   * Update theme toggle button
   * @param {HTMLElement} button - Button element to update
   */
  updateToggleButton(button) {
    if (!button) return;

    const icon = this.getThemeIcon();
    const actualTheme = this.getCurrentActualTheme();
    const nextTheme = actualTheme === 'dark' ? 'light' : 'dark';
    
    button.innerHTML = `${icon} ${actualTheme === 'dark' ? 'Light' : 'Dark'} Mode`;
    button.title = `Switch to ${nextTheme} theme (Currently: ${this.getThemeDisplayName()})`;
  }

  /**
   * Cleanup theme manager
   */
  cleanup() {
    try {
      if (this.systemPreferenceListener) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.removeEventListener('change', this.systemPreferenceListener);
        this.systemPreferenceListener = null;
      }
      
      console.log('Theme Manager cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup theme manager:', error);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager;
}

// Make available globally
window.ThemeManager = ThemeManager;
