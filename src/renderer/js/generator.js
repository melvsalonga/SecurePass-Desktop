/**
 * Password Generator UI Controller
 * Handles all UI interactions and communication with the main process
 */

class PasswordGeneratorUI {
  constructor() {
    this.initializeEventListeners();
    this.setupDefaults();
    this.currentPassword = '';
    this.currentPassphrase = '';
    this.passwordHistory = [];
    this.maxHistorySize = 50;
  }

  /**
   * Initialize all event listeners
   */
  initializeEventListeners() {
    // Password generation
    document.getElementById('generate-password').addEventListener('click', () => {
      this.generatePassword();
    });

    // Copy buttons
    document.getElementById('copy-password').addEventListener('click', () => {
      this.copyToClipboard('password');
    });

    document.getElementById('copy-passphrase').addEventListener('click', () => {
      this.copyToClipboard('passphrase');
    });

    // Passphrase generation
    document.getElementById('generate-passphrase').addEventListener('click', () => {
      this.generatePassphrase();
    });

    // Batch generation
    document.getElementById('generate-batch').addEventListener('click', () => {
      this.generateBatchPasswords();
    });

    // Length slider updates
    document.getElementById('password-length').addEventListener('input', (e) => {
      document.getElementById('length-value').textContent = e.target.value;
      this.showRegenerationSuggestion();
    });

    document.getElementById('word-count').addEventListener('input', (e) => {
      document.getElementById('word-count-value').textContent = e.target.value;
    });

    document.getElementById('batch-count').addEventListener('input', (e) => {
      document.getElementById('batch-count-value').textContent = e.target.value;
    });

    // Real-time strength analysis on password field
    document.getElementById('generated-password').addEventListener('input', (e) => {
      if (e.target.value) {
        this.analyzePasswordStrength(e.target.value);
      } else {
        this.resetStrengthMeter();
      }
    });

    // Option changes trigger regeneration suggestions
    this.setupOptionChangeListeners();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });
  }

  /**
   * Setup default values
   */
  setupDefaults() {
    document.getElementById('length').value = 16;
    document.getElementById('lengthValue').textContent = '16';
    document.getElementById('passphraseWords').value = 4;
    document.getElementById('passphraseWordsValue').textContent = '4';
    document.getElementById('batchCount').value = 10;
    
    // Set default options
    document.getElementById('uppercase').checked = true;
    document.getElementById('lowercase').checked = true;
    document.getElementById('numbers').checked = true;
    document.getElementById('symbols').checked = true;
    document.getElementById('excludeSimilar').checked = true;
    document.getElementById('excludeAmbiguous').checked = true;
    
    this.resetStrengthMeter();
  }

  /**
   * Setup listeners for option changes
   */
  setupOptionChangeListeners() {
    const options = [
      'uppercase', 'lowercase', 'numbers', 'symbols',
      'excludeSimilar', 'excludeAmbiguous', 'length'
    ];

    options.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', () => {
          this.showRegenerationSuggestion();
        });
      }
    });
  }

  /**
   * Generate a new password
   */
  async generatePassword() {
    try {
      this.setGeneratingState(true);
      
      const options = this.getPasswordOptions();
      const response = await ipcRenderer.invoke('generate-password', options);
      
      if (response.success) {
        this.currentPassword = response.password;
        document.getElementById('password').value = response.password;
        this.analyzePasswordStrength(response.password);
        this.addToHistory(response.password, 'password');
        this.hideRegenerationSuggestion();
        this.showNotification('Password generated successfully!', 'success');
      } else {
        this.showNotification(response.error || 'Failed to generate password', 'error');
      }
    } catch (error) {
      this.showNotification('Error generating password: ' + error.message, 'error');
    } finally {
      this.setGeneratingState(false);
    }
  }

  /**
   * Regenerate the current password with same options
   */
  async regeneratePassword() {
    if (!this.currentPassword) {
      await this.generatePassword();
      return;
    }
    await this.generatePassword();
  }

  /**
   * Generate a passphrase
   */
  async generatePassphrase() {
    try {
      this.setGeneratingState(true, 'passphrase');
      
      const options = this.getPassphraseOptions();
      const response = await ipcRenderer.invoke('generate-passphrase', options);
      
      if (response.success) {
        document.getElementById('passphrase').value = response.passphrase;
        this.addToHistory(response.passphrase, 'passphrase');
        this.showNotification('Passphrase generated successfully!', 'success');
      } else {
        this.showNotification(response.error || 'Failed to generate passphrase', 'error');
      }
    } catch (error) {
      this.showNotification('Error generating passphrase: ' + error.message, 'error');
    } finally {
      this.setGeneratingState(false, 'passphrase');
    }
  }

  /**
   * Regenerate passphrase
   */
  async regeneratePassphrase() {
    await this.generatePassphrase();
  }

  /**
   * Generate batch passwords
   */
  async generateBatchPasswords() {
    try {
      this.setGeneratingState(true, 'batch');
      
      const count = parseInt(document.getElementById('batchCount').value) || 10;
      const options = this.getPasswordOptions();
      
      const response = await ipcRenderer.invoke('generate-batch-passwords', {
        count: count,
        options: options
      });
      
      if (response.success) {
        this.displayBatchResults(response.passwords);
        this.showNotification(`Generated ${response.passwords.length} passwords!`, 'success');
      } else {
        this.showNotification(response.error || 'Failed to generate batch passwords', 'error');
      }
    } catch (error) {
      this.showNotification('Error generating batch passwords: ' + error.message, 'error');
    } finally {
      this.setGeneratingState(false, 'batch');
    }
  }

  /**
   * Display batch results
   */
  displayBatchResults(passwords) {
    const container = document.getElementById('batchResults');
    container.innerHTML = '';
    
    passwords.forEach((passwordData, index) => {
      const item = document.createElement('div');
      item.className = 'batch-item';
      item.innerHTML = `
        <div class="password">${passwordData.password}</div>
        <div class="strength ${passwordData.strength.level.toLowerCase().replace(' ', '-')}">${passwordData.strength.level}</div>
        <button class="copy-btn" onclick="passwordGeneratorUI.copyBatchPassword('${passwordData.password}', ${index})">
          Copy
        </button>
      `;
      container.appendChild(item);
    });
  }

  /**
   * Copy a specific batch password
   */
  async copyBatchPassword(password, index) {
    try {
      await navigator.clipboard.writeText(password);
      this.showNotification('Password copied to clipboard!', 'success');
      
      // Visual feedback
      const buttons = document.querySelectorAll('.batch-item .copy-btn');
      if (buttons[index]) {
        const originalText = buttons[index].textContent;
        buttons[index].textContent = 'Copied!';
        buttons[index].style.backgroundColor = '#2ecc71';
        buttons[index].style.color = 'white';
        
        setTimeout(() => {
          buttons[index].textContent = originalText;
          buttons[index].style.backgroundColor = '';
          buttons[index].style.color = '';
        }, 1000);
      }
    } catch (error) {
      this.showNotification('Failed to copy password', 'error');
    }
  }

  /**
   * Copy all batch passwords
   */
  async copyAllBatchPasswords() {
    const passwords = Array.from(document.querySelectorAll('.batch-item .password'))
      .map(el => el.textContent);
    
    if (passwords.length === 0) {
      this.showNotification('No passwords to copy', 'info');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(passwords.join('\n'));
      this.showNotification(`Copied ${passwords.length} passwords to clipboard!`, 'success');
    } catch (error) {
      this.showNotification('Failed to copy passwords', 'error');
    }
  }

  /**
   * Clear batch results
   */
  clearBatchResults() {
    document.getElementById('batchResults').innerHTML = '';
    this.showNotification('Batch results cleared', 'info');
  }

  /**
   * Get password generation options
   */
  getPasswordOptions() {
    return {
      length: parseInt(document.getElementById('length').value),
      includeUppercase: document.getElementById('uppercase').checked,
      includeLowercase: document.getElementById('lowercase').checked,
      includeNumbers: document.getElementById('numbers').checked,
      includeSymbols: document.getElementById('symbols').checked,
      excludeSimilar: document.getElementById('excludeSimilar').checked,
      excludeAmbiguous: document.getElementById('excludeAmbiguous').checked,
      customCharacters: document.getElementById('customCharacters').value || ''
    };
  }

  /**
   * Get passphrase generation options
   */
  getPassphraseOptions() {
    return {
      wordCount: parseInt(document.getElementById('passphraseWords').value),
      separator: document.getElementById('passphraseSeparator').value,
      capitalize: document.getElementById('passphraseCapitalize').checked,
      includeNumbers: document.getElementById('passphraseNumbers').checked
    };
  }

  /**
   * Analyze password strength
   */
  async analyzePasswordStrength(password) {
    try {
      const response = await ipcRenderer.invoke('analyze-password-strength', password);
      
      if (response.success) {
        this.updateStrengthMeter(response.analysis);
        this.updatePasswordDetails(response.analysis);
        this.updateSecurityFeedback(response.analysis);
      }
    } catch (error) {
      console.error('Error analyzing password strength:', error);
      this.resetStrengthMeter();
    }
  }

  /**
   * Update strength meter display
   */
  updateStrengthMeter(analysis) {
    const strengthFill = document.getElementById('strengthFill');
    const strengthLevel = document.getElementById('strengthLevel');
    const strengthScore = document.getElementById('strengthScore');
    
    const percentage = (analysis.score / 100) * 100;
    strengthFill.style.width = `${percentage}%`;
    strengthFill.className = `strength-fill ${analysis.level.toLowerCase().replace(' ', '-')}`;
    
    strengthLevel.textContent = analysis.level;
    strengthScore.textContent = `${analysis.score}/100`;
  }

  /**
   * Update password details display
   */
  updatePasswordDetails(analysis) {
    const details = [
      { label: 'Length', value: analysis.length },
      { label: 'Entropy', value: `${analysis.entropy.toFixed(1)} bits` },
      { label: 'Time to Crack', value: analysis.crackTime },
      { label: 'Character Types', value: analysis.characterTypes },
      { label: 'Unique Characters', value: analysis.uniqueCharacters },
      { label: 'Patterns Found', value: analysis.patterns || 0 }
    ];
    
    const container = document.getElementById('passwordDetails');
    container.innerHTML = '';
    
    details.forEach(detail => {
      const item = document.createElement('div');
      item.className = 'detail-item';
      item.innerHTML = `
        <span class="detail-label">${detail.label}:</span>
        <span>${detail.value}</span>
      `;
      container.appendChild(item);
    });
  }

  /**
   * Update security feedback
   */
  updateSecurityFeedback(analysis) {
    const container = document.getElementById('securityFeedback');
    container.innerHTML = '';
    
    if (analysis.feedback && analysis.feedback.length > 0) {
      const feedbackList = document.createElement('ul');
      
      analysis.feedback.forEach(feedback => {
        const item = document.createElement('li');
        item.className = feedback.type || 'info';
        item.textContent = feedback.message;
        feedbackList.appendChild(item);
      });
      
      container.appendChild(feedbackList);
    }
  }

  /**
   * Reset strength meter
   */
  resetStrengthMeter() {
    document.getElementById('strengthFill').style.width = '0%';
    document.getElementById('strengthLevel').textContent = 'None';
    document.getElementById('strengthScore').textContent = '0/100';
    document.getElementById('passwordDetails').innerHTML = '';
    document.getElementById('securityFeedback').innerHTML = '';
  }

  /**
   * Copy to clipboard
   */
  async copyToClipboard(type) {
    try {
      const elementId = type === 'password' ? 'password' : 'passphrase';
      const text = document.getElementById(elementId).value;
      
      if (!text) {
        this.showNotification(`No ${type} to copy`, 'info');
        return;
      }
      
      await navigator.clipboard.writeText(text);
      this.showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} copied to clipboard!`, 'success');
      
      // Visual feedback
      const button = document.getElementById(type === 'password' ? 'copyPassword' : 'copyPassphrase');
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      button.style.backgroundColor = '#2ecc71';
      
      setTimeout(() => {
        button.textContent = originalText;
        button.style.backgroundColor = '';
      }, 1000);
      
    } catch (error) {
      this.showNotification('Failed to copy to clipboard', 'error');
    }
  }

  /**
   * Set generating state
   */
  setGeneratingState(isGenerating, type = 'password') {
    const buttons = {
      password: ['generatePassword', 'regeneratePassword'],
      passphrase: ['generatePassphrase', 'regeneratePassphrase'],
      batch: ['generateBatch']
    };
    
    const targetButtons = buttons[type] || buttons.password;
    
    targetButtons.forEach(id => {
      const button = document.getElementById(id);
      if (button) {
        button.disabled = isGenerating;
        if (isGenerating) {
          button.textContent = 'Generating...';
          button.classList.add('generating');
        } else {
          button.classList.remove('generating');
          // Reset button text
          if (id === 'generatePassword') button.textContent = 'Generate Password';
          else if (id === 'regeneratePassword') button.textContent = '🔄';
          else if (id === 'generatePassphrase') button.textContent = 'Generate Passphrase';
          else if (id === 'regeneratePassphrase') button.textContent = '🔄';
          else if (id === 'generateBatch') button.textContent = 'Generate Batch';
        }
      }
    });
  }

  /**
   * Show regeneration suggestion
   */
  showRegenerationSuggestion() {
    if (this.currentPassword) {
      // Add visual indicator that options have changed
      const regenerateBtn = document.getElementById('regeneratePassword');
      if (regenerateBtn) {
        regenerateBtn.style.backgroundColor = '#f39c12';
        regenerateBtn.title = 'Options changed - click to regenerate';
      }
    }
  }

  /**
   * Hide regeneration suggestion
   */
  hideRegenerationSuggestion() {
    const regenerateBtn = document.getElementById('regeneratePassword');
    if (regenerateBtn) {
      regenerateBtn.style.backgroundColor = '';
      regenerateBtn.title = 'Regenerate password';
    }
  }

  /**
   * Add to history
   */
  addToHistory(password, type) {
    this.passwordHistory.unshift({
      password: password,
      type: type,
      timestamp: new Date().toISOString()
    });
    
    if (this.passwordHistory.length > this.maxHistorySize) {
      this.passwordHistory = this.passwordHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'g':
          e.preventDefault();
          this.generatePassword();
          break;
        case 'r':
          e.preventDefault();
          this.regeneratePassword();
          break;
        case 'c':
          if (e.shiftKey) {
            e.preventDefault();
            this.copyToClipboard('password');
          }
          break;
        case 'p':
          if (e.shiftKey) {
            e.preventDefault();
            this.generatePassphrase();
          }
          break;
        case 'b':
          if (e.shiftKey) {
            e.preventDefault();
            this.generateBatchPasswords();
          }
          break;
      }
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Remove notification after delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  /**
   * Validate options
   */
  validateOptions() {
    const options = this.getPasswordOptions();
    const errors = [];
    
    if (options.length < 4) {
      errors.push('Password length must be at least 4 characters');
    }
    
    if (options.length > 128) {
      errors.push('Password length cannot exceed 128 characters');
    }
    
    if (!options.includeUppercase && !options.includeLowercase && 
        !options.includeNumbers && !options.includeSymbols && 
        !options.customCharacters) {
      errors.push('At least one character type must be selected');
    }
    
    return errors;
  }

  /**
   * Initialize tooltips
   */
  initializeTooltips() {
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(element => {
      element.addEventListener('mouseenter', (e) => {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = e.target.dataset.tooltip;
        document.body.appendChild(tooltip);
        
        const rect = e.target.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
      });
      
      element.addEventListener('mouseleave', () => {
        const tooltip = document.querySelector('.tooltip');
        if (tooltip) {
          tooltip.remove();
        }
      });
    });
  }
}

// Initialize the password generator UI when the page loads
let passwordGeneratorUI;

document.addEventListener('DOMContentLoaded', () => {
  passwordGeneratorUI = new PasswordGeneratorUI();
  
  // Generate an initial password
  passwordGeneratorUI.generatePassword();
  
  console.log('Password Generator UI initialized');
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PasswordGeneratorUI;
}
