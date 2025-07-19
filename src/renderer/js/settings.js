/**
 * Settings Page JavaScript
 * Handles user preference management
 */

class SettingsUI {
  constructor() {
    this.themeManager = null;
    this.initializeTheme();
    this.loadSettings();
    this.initializeEventListeners();
  }

  /**
   * Initialize theme manager
   */
  initializeTheme() {
    if (window.ThemeManager) {
      this.themeManager = new window.ThemeManager();
      
      // Add theme toggle to the nav section (next to back button)
      const appNav = document.querySelector('.app-nav');
      if (appNav && this.themeManager) {
        this.themeManager.createThemeToggle(appNav);
      }
    }
  }

  /**
   * Load settings from localStorage
   */
  loadSettings() {
    // General settings
    document.getElementById('theme-select').value = localStorage.getItem('theme') || 'system';
    document.getElementById('language-select').value = localStorage.getItem('language') || 'en';
    document.getElementById('start-minimized').checked = localStorage.getItem('startMinimized') === 'true';
    document.getElementById('minimize-to-tray').checked = localStorage.getItem('minimizeToTray') === 'true';

    // Security settings
    document.getElementById('auto-lock-timeout').value = localStorage.getItem('autoLockTimeout') || 15;
    document.getElementById('clipboard-timeout').value = localStorage.getItem('clipboardTimeout') || 30;
    document.getElementById('show-password-strength').checked = localStorage.getItem('showPasswordStrength') === 'true';
    document.getElementById('check-password-breaches').checked = localStorage.getItem('checkPasswordBreaches') === 'true';
    document.getElementById('secure-desktop').checked = localStorage.getItem('secureDesktop') === 'true';

    // Password generation defaults
    document.getElementById('default-length').value = localStorage.getItem('defaultLength') || 16;
    document.getElementById('default-uppercase').checked = localStorage.getItem('defaultUppercase') !== 'false';
    document.getElementById('default-lowercase').checked = localStorage.getItem('defaultLowercase') !== 'false';
    document.getElementById('default-numbers').checked = localStorage.getItem('defaultNumbers') !== 'false';
    document.getElementById('default-symbols').checked = localStorage.getItem('defaultSymbols') !== 'false';
    document.getElementById('default-exclude-ambiguous').checked = localStorage.getItem('defaultExcludeAmbiguous') === 'true';

    // Privacy settings
    document.getElementById('enable-analytics').checked = localStorage.getItem('enableAnalytics') === 'true';
    document.getElementById('crash-reporting').checked = localStorage.getItem('crashReporting') === 'true';
    document.getElementById('history-retention').value = localStorage.getItem('historyRetention') || 90;

    // Advanced settings
    document.getElementById('hardware-acceleration').checked = localStorage.getItem('hardwareAcceleration') === 'true';
    document.getElementById('debug-mode').checked = localStorage.getItem('debugMode') === 'true';
    document.getElementById('memory-limit').value = localStorage.getItem('memoryLimit') || 128;

    this.updateSliders();
  }

  /**
   * Initialize event listeners
   */
  initializeEventListeners() {
    const sliders = [
      { id: 'auto-lock-timeout', label: 'auto-lock-value', unit: 'minutes' },
      { id: 'clipboard-timeout', label: 'clipboard-value', unit: 'seconds' },
      { id: 'default-length', label: 'default-length-value', unit: 'characters' },
      { id: 'history-retention', label: 'history-retention-value', unit: 'days' },
      { id: 'memory-limit', label: 'memory-limit-value', unit: 'MB' },
    ];
    
    sliders.forEach(slider => {
      const sliderElement = document.getElementById(slider.id);
      const labelElement = document.getElementById(slider.label);
      
      if (sliderElement && labelElement) {
        sliderElement.addEventListener('input', (e) => {
          labelElement.textContent = e.target.value;
        });
      }
    });
    
    // Save settings button
    document.getElementById('save-settings').addEventListener('click', () => {
      this.saveSettings();
    });
    
    // Cancel settings button
    document.getElementById('cancel-settings').addEventListener('click', () => {
      this.loadSettings();
      this.showNotification('Settings cancelled', 'info');
    });
    
    // Reset settings button
    document.getElementById('reset-settings').addEventListener('click', () => {
      this.resetSettings();
    });
    
    // Export settings button
    document.getElementById('export-settings').addEventListener('click', () => {
      this.exportSettings();
    });
    
    // Import settings button
    document.getElementById('import-settings').addEventListener('click', () => {
      this.importSettings();
    });
    
    // Theme change
    document.getElementById('theme-select').addEventListener('change', (e) => {
      this.applyTheme(e.target.value);
    });
    
    // Password import/export functionality
    document.getElementById('export-passwords').addEventListener('click', async () => {
      await this.exportPasswords();
    });
    
    document.getElementById('import-passwords').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });
    
    document.getElementById('import-file').addEventListener('change', async (e) => {
      await this.importPasswords(e.target.files[0]);
    });
    
    // Navigation
    document.getElementById('back-home').addEventListener('click', () => {
      window.location.href = '../pages/home.html';
    });
  }
  
  /**
   * Update slider values
   */
  updateSliders() {
    document.getElementById('auto-lock-value').textContent = document.getElementById('auto-lock-timeout').value;
    document.getElementById('clipboard-value').textContent = document.getElementById('clipboard-timeout').value;
    document.getElementById('default-length-value').textContent = document.getElementById('default-length').value;
    document.getElementById('history-retention-value').textContent = document.getElementById('history-retention').value;
    document.getElementById('memory-limit-value').textContent = document.getElementById('memory-limit').value;
  }
  
  /**
   * Save settings to localStorage
   */
  saveSettings() {
    try {
      // General settings
      localStorage.setItem('theme', document.getElementById('theme-select').value);
      localStorage.setItem('language', document.getElementById('language-select').value);
      localStorage.setItem('startMinimized', document.getElementById('start-minimized').checked);
      localStorage.setItem('minimizeToTray', document.getElementById('minimize-to-tray').checked);
      
      // Security settings
      localStorage.setItem('autoLockTimeout', document.getElementById('auto-lock-timeout').value);
      localStorage.setItem('clipboardTimeout', document.getElementById('clipboard-timeout').value);
      localStorage.setItem('showPasswordStrength', document.getElementById('show-password-strength').checked);
      localStorage.setItem('checkPasswordBreaches', document.getElementById('check-password-breaches').checked);
      localStorage.setItem('secureDesktop', document.getElementById('secure-desktop').checked);
      
      // Password generation defaults
      localStorage.setItem('defaultLength', document.getElementById('default-length').value);
      localStorage.setItem('defaultUppercase', document.getElementById('default-uppercase').checked);
      localStorage.setItem('defaultLowercase', document.getElementById('default-lowercase').checked);
      localStorage.setItem('defaultNumbers', document.getElementById('default-numbers').checked);
      localStorage.setItem('defaultSymbols', document.getElementById('default-symbols').checked);
      localStorage.setItem('defaultExcludeAmbiguous', document.getElementById('default-exclude-ambiguous').checked);
      
      // Privacy settings
      localStorage.setItem('enableAnalytics', document.getElementById('enable-analytics').checked);
      localStorage.setItem('crashReporting', document.getElementById('crash-reporting').checked);
      localStorage.setItem('historyRetention', document.getElementById('history-retention').value);
      
      // Advanced settings
      localStorage.setItem('hardwareAcceleration', document.getElementById('hardware-acceleration').checked);
      localStorage.setItem('debugMode', document.getElementById('debug-mode').checked);
      localStorage.setItem('memoryLimit', document.getElementById('memory-limit').value);
      
      this.showNotification('Settings saved successfully!', 'success');
    } catch (error) {
      this.showNotification('Failed to save settings: ' + error.message, 'error');
    }
  }
  
  /**
   * Reset all settings to default
   */
  resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default? This action cannot be undone.')) {
      localStorage.clear();
      this.loadSettings();
      this.showNotification('Settings reset to default', 'info');
    }
  }
  
  /**
   * Export settings to JSON file
   */
  exportSettings() {
    try {
      const settings = {
        theme: localStorage.getItem('theme'),
        language: localStorage.getItem('language'),
        startMinimized: localStorage.getItem('startMinimized'),
        minimizeToTray: localStorage.getItem('minimizeToTray'),
        autoLockTimeout: localStorage.getItem('autoLockTimeout'),
        clipboardTimeout: localStorage.getItem('clipboardTimeout'),
        showPasswordStrength: localStorage.getItem('showPasswordStrength'),
        checkPasswordBreaches: localStorage.getItem('checkPasswordBreaches'),
        secureDesktop: localStorage.getItem('secureDesktop'),
        defaultLength: localStorage.getItem('defaultLength'),
        defaultUppercase: localStorage.getItem('defaultUppercase'),
        defaultLowercase: localStorage.getItem('defaultLowercase'),
        defaultNumbers: localStorage.getItem('defaultNumbers'),
        defaultSymbols: localStorage.getItem('defaultSymbols'),
        defaultExcludeAmbiguous: localStorage.getItem('defaultExcludeAmbiguous'),
        enableAnalytics: localStorage.getItem('enableAnalytics'),
        crashReporting: localStorage.getItem('crashReporting'),
        historyRetention: localStorage.getItem('historyRetention'),
        hardwareAcceleration: localStorage.getItem('hardwareAcceleration'),
        debugMode: localStorage.getItem('debugMode'),
        memoryLimit: localStorage.getItem('memoryLimit'),
        exported: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `securepass-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.showNotification('Settings exported successfully!', 'success');
    } catch (error) {
      this.showNotification('Failed to export settings: ' + error.message, 'error');
    }
  }
  
  /**
   * Import settings from JSON file
   */
  importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const settings = JSON.parse(e.target.result);
            
            // Apply imported settings
            Object.entries(settings).forEach(([key, value]) => {
              if (key !== 'exported' && value !== null) {
                localStorage.setItem(key, value);
              }
            });
            
            this.loadSettings();
            this.showNotification('Settings imported successfully!', 'success');
          } catch (error) {
            this.showNotification('Failed to import settings: Invalid file format', 'error');
          }
        };
        reader.readAsText(file);
      }
    };
    
    input.click();
  }
  
  /**
   * Apply theme
   */
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }
  
  /**
   * Export passwords to file
   */
  async exportPasswords() {
    try {
      // Get selected format
      const formatRadios = document.querySelectorAll('input[name="export-format"]');
      let format = 'json';
      for (const radio of formatRadios) {
        if (radio.checked) {
          format = radio.value;
          break;
        }
      }
      
      // Get export options
      const includePasswords = document.getElementById('include-passwords').checked;
      const options = { includePasswords };
      
      // Export passwords
      const result = await window.electronAPI.exportPasswords(format, options);
      
      if (result.success) {
        // Create download
        const blob = new Blob([result.data], { 
          type: format === 'json' ? 'application/json' : 
                format === 'csv' ? 'text/csv' : 
                'application/xml'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        a.href = url;
        a.download = `securepass-passwords-${timestamp}.${format}`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification(`Passwords exported successfully as ${format.toUpperCase()}!`, 'success');
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Password export error:', error);
      this.showNotification(`Failed to export passwords: ${error.message}`, 'error');
    }
  }
  
  /**
   * Import passwords from file
   */
  async importPasswords(file) {
    if (!file) return;
    
    try {
      // Determine format from file extension
      const format = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'json';
      
      // Get import options
      const checkDuplicates = document.getElementById('check-duplicates').checked;
      const skipDuplicates = document.getElementById('skip-duplicates').checked;
      const options = { checkDuplicates, skipDuplicates };
      
      // Read file content
      const data = await this.readFileAsText(file);
      
      // Import passwords
      const result = await window.electronAPI.importPasswords(data, format, options);
      
      if (result.success) {
        const { imported, skipped, duplicates, errors } = result.data;
        let message = `Import completed: ${imported} imported`;
        
        if (skipped > 0) message += `, ${skipped} skipped`;
        if (duplicates > 0) message += `, ${duplicates} duplicates found`;
        if (errors.length > 0) message += `, ${errors.length} errors`;
        
        this.showNotification(message, 'success');
        
        // Show detailed results if there are errors
        if (errors.length > 0) {
          console.warn('Import errors:', errors);
        }
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (error) {
      console.error('Password import error:', error);
      this.showNotification(`Failed to import passwords: ${error.message}`, 'error');
    } finally {
      // Clear the file input
      document.getElementById('import-file').value = '';
    }
  }
  
  /**
   * Read file as text
   */
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
  
  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (notification) {
      notification.textContent = message;
      notification.className = `notification ${type} show`;
      
      setTimeout(() => {
        notification.classList.remove('show');
      }, 3000);
    }
  }
}

// Initialize settings when page loads
document.addEventListener('DOMContentLoaded', () => {
  new SettingsUI();
  console.log('Settings UI initialized');
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SettingsUI;
}
