/**
 * Password Generator UI Controller
 * Handles all UI interactions and communication with the main process
 */

class PasswordGeneratorUI {
  constructor() {
    this.currentPassword = '';
    this.currentPassphrase = '';
    this.passwordHistory = [];
    this.maxHistorySize = 50;
    this.themeManager = null;
    this.initializeTheme();
    this.initializeEventListeners();
    this.initializeNavigation();
  }

  /**
   * Initialize the theme manager
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
    });

    document.getElementById('word-count').addEventListener('input', (e) => {
      document.getElementById('word-count-value').textContent = e.target.value;
    });

    document.getElementById('batch-count').addEventListener('input', (e) => {
      document.getElementById('batch-count-value').textContent = e.target.value;
    });

    // Option changes trigger regeneration suggestions
    this.setupOptionChangeListeners();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });
  }

  /**
   * Setup listeners for option changes
   */
  setupOptionChangeListeners() {
    const options = [
      'include-uppercase', 'include-lowercase', 'include-numbers', 'include-symbols',
      'exclude-ambiguous', 'enforce-complexity', 'password-length'
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
      const response = await window.electronAPI.generatePassword(options);
      
      if (response.success) {
        this.currentPassword = response.data.password;
        document.getElementById('generated-password').value = response.data.password;
        this.updateStrengthMeter(response.data.strength, 'password');
        this.updatePasswordDetails(response.data);
        this.addToHistory(response.data.password, 'password');
        this.showNotification('Password generated successfully!', 'success');
        
        // Analyze password strength
        await this.analyzePasswordStrength(response.data.password);
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
   * Generate a passphrase
   */
  async generatePassphrase() {
    try {
      this.setGeneratingState(true, 'passphrase');
      
      const options = this.getPassphraseOptions();
      const response = await window.electronAPI.generatePassphrase(options);
      
      if (response.success) {
        this.currentPassphrase = response.data.passphrase;
        document.getElementById('generated-passphrase').value = response.data.passphrase;
        this.updateStrengthMeter(response.data.strength, 'passphrase');
        this.addToHistory(response.data.passphrase, 'passphrase');
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
   * Generate batch passwords
   */
  async generateBatchPasswords() {
    try {
      this.setGeneratingState(true, 'batch');
      
      const count = parseInt(document.getElementById('batch-count').value) || 5;
      const options = this.getPasswordOptions();
      
      const response = await window.electronAPI.generateBatch(count, options);
      
      if (response.success) {
        this.displayBatchResults(response.data);
        this.showNotification(`Generated ${response.data.length} passwords!`, 'success');
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
    const container = document.getElementById('batch-results');
    container.innerHTML = '';
    
    // Add batch controls first
    this.addBatchControls();
    
    passwords.forEach((passwordData, index) => {
      const item = document.createElement('div');
      item.className = 'batch-item';
      item.innerHTML = `
        <div class="batch-password">
          <input type="text" value="${passwordData.password}" readonly>
          <button class="copy-btn" onclick="passwordGeneratorUI.copyBatchPassword('${passwordData.password}', ${index})">
            📋
          </button>
        </div>
        <div class="batch-strength">
          <div class="strength-indicator ${passwordData.strength.level.toLowerCase().replace(' ', '-')}">
            ${passwordData.strength.level}
          </div>
          <div class="strength-score">${passwordData.strength.score}/100</div>
        </div>
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
        buttons[index].textContent = '✓';
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
   * Get password generation options
   */
  getPasswordOptions() {
    return {
      length: parseInt(document.getElementById('password-length').value),
      includeLowercase: document.getElementById('include-lowercase').checked,
      includeUppercase: document.getElementById('include-uppercase').checked,
      includeNumbers: document.getElementById('include-numbers').checked,
      includeSymbols: document.getElementById('include-symbols').checked,
      excludeAmbiguous: document.getElementById('exclude-ambiguous').checked,
      enforceComplexity: document.getElementById('enforce-complexity').checked
    };
  }

  /**
   * Get passphrase generation options
   */
  getPassphraseOptions() {
    return {
      wordCount: parseInt(document.getElementById('word-count').value),
      separator: document.getElementById('word-separator').value,
      capitalize: document.getElementById('capitalize-words').checked,
      includeNumber: document.getElementById('include-number').checked,
      includeSymbol: document.getElementById('include-symbol').checked
    };
  }

  /**
   * Update strength meter display
   */
  updateStrengthMeter(strength, type = 'password') {
    const strengthFillId = type === 'password' ? 'strength-fill' : 'passphrase-strength-fill';
    const strengthLevelId = type === 'password' ? 'strength-level' : 'passphrase-strength-level';
    const strengthScoreId = type === 'password' ? 'strength-score' : 'passphrase-strength-score';
    
    const strengthFill = document.getElementById(strengthFillId);
    const strengthLevel = document.getElementById(strengthLevelId);
    const strengthScore = document.getElementById(strengthScoreId);
    
    if (strengthFill && strengthLevel && strengthScore) {
      const percentage = (strength.score / 100) * 100;
      strengthFill.style.width = `${percentage}%`;
      strengthFill.className = `strength-fill ${strength.level.toLowerCase().replace(' ', '-')}`;
      
      strengthLevel.textContent = strength.level;
      strengthScore.textContent = `${strength.score}/100`;
    }
  }

  /**
   * Update password details display
   */
  updatePasswordDetails(data) {
    const detailsSection = document.getElementById('password-details');
    if (detailsSection) {
      detailsSection.style.display = 'block';
      
      document.getElementById('password-entropy').textContent = `${data.entropy.toFixed(1)} bits`;
      document.getElementById('charset-size').textContent = data.charset;
      document.getElementById('time-to-crack').textContent = data.strength.timeToCrack;
      document.getElementById('generation-time').textContent = new Date(data.generated).toLocaleString();
      
      // Update security feedback
      const feedbackContainer = document.getElementById('security-feedback');
      feedbackContainer.innerHTML = '';
      
      if (data.strength.feedback && data.strength.feedback.length > 0) {
        data.strength.feedback.forEach(feedback => {
          const li = document.createElement('li');
          li.textContent = feedback;
          li.className = 'feedback-item';
          feedbackContainer.appendChild(li);
        });
      } else {
        const li = document.createElement('li');
        li.textContent = 'No security issues detected';
        li.className = 'feedback-item success';
        feedbackContainer.appendChild(li);
      }
    }
  }

  /**
   * Reset strength meter
   */
  resetStrengthMeter(type = 'password') {
    const strengthFillId = type === 'password' ? 'strength-fill' : 'passphrase-strength-fill';
    const strengthLevelId = type === 'password' ? 'strength-level' : 'passphrase-strength-level';
    const strengthScoreId = type === 'password' ? 'strength-score' : 'passphrase-strength-score';
    
    const strengthFill = document.getElementById(strengthFillId);
    const strengthLevel = document.getElementById(strengthLevelId);
    const strengthScore = document.getElementById(strengthScoreId);
    
    if (strengthFill && strengthLevel && strengthScore) {
      strengthFill.style.width = '0%';
      strengthLevel.textContent = type === 'password' ? 'No password generated' : 'No passphrase generated';
      strengthScore.textContent = '';
    }
  }

  /**
   * Copy to clipboard
   */
  async copyToClipboard(type) {
    try {
      const elementId = type === 'password' ? 'generated-password' : 'generated-passphrase';
      const text = document.getElementById(elementId).value;
      
      if (!text) {
        this.showNotification(`No ${type} to copy`, 'info');
        return;
      }
      
      await navigator.clipboard.writeText(text);
      this.showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} copied to clipboard!`, 'success');
      
      // Visual feedback
      const buttonId = type === 'password' ? 'copy-password' : 'copy-passphrase';
      const button = document.getElementById(buttonId);
      const originalText = button.textContent;
      button.textContent = '✓';
      button.style.backgroundColor = '#2ecc71';
      button.style.color = 'white';
      
      setTimeout(() => {
        button.textContent = originalText;
        button.style.backgroundColor = '';
        button.style.color = '';
      }, 1000);
      
    } catch (error) {
      this.showNotification('Failed to copy to clipboard', 'error');
    }
  }

  /**
   * Set generating state
   */
  setGeneratingState(isGenerating, type = 'password') {
    const buttonIds = {
      password: 'generate-password',
      passphrase: 'generate-passphrase',
      batch: 'generate-batch'
    };
    
    const buttonId = buttonIds[type];
    const button = document.getElementById(buttonId);
    
    if (button) {
      button.disabled = isGenerating;
      if (isGenerating) {
        button.textContent = 'Generating...';
        button.classList.add('generating');
      } else {
        button.classList.remove('generating');
        // Reset button text
        if (type === 'password') button.textContent = 'Generate';
        else if (type === 'passphrase') button.textContent = 'Generate';
        else if (type === 'batch') button.textContent = 'Generate Batch';
      }
    }
  }

  /**
   * Show regeneration suggestion
   */
  showRegenerationSuggestion() {
    if (this.currentPassword) {
      const generateBtn = document.getElementById('generate-password');
      if (generateBtn) {
        generateBtn.style.backgroundColor = '#f39c12';
        generateBtn.title = 'Options changed - click to regenerate';
      }
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
   * Analyze password strength
   */
  async analyzePasswordStrength(password) {
    try {
      const response = await window.electronAPI.analyzePasswordStrength(password);
      
      if (response.success) {
        this.updatePasswordDetails(response.data);
        this.updateSecurityFeedback(response.data);
      } else {
        console.error('Password analysis failed:', response.error);
      }
    } catch (error) {
      console.error('Error analyzing password strength:', error);
    }
  }

  /**
   * Update security feedback
   */
  updateSecurityFeedback(analysis) {
    const container = document.getElementById('security-feedback');
    container.innerHTML = '';
    
    if (analysis.feedback && analysis.feedback.length > 0) {
      analysis.feedback.forEach(feedback => {
        const li = document.createElement('li');
        li.className = 'feedback-item';
        li.textContent = feedback;
        container.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'No security issues detected';
      li.className = 'feedback-item success';
      container.appendChild(li);
    }
    
    // Update patterns if found
    if (analysis.patterns && analysis.patterns.length > 0) {
      const patternsLi = document.createElement('li');
      patternsLi.className = 'feedback-item warning';
      patternsLi.textContent = `Detected patterns: ${analysis.patterns.join(', ')}`;
      container.appendChild(patternsLi);
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    // Remove notification after delay
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }

  /**
   * Export batch passwords to file
   */
  async exportBatchPasswords(format = 'txt') {
    const passwords = Array.from(document.querySelectorAll('.batch-item'))
      .map(item => {
        const password = item.querySelector('.batch-password input').value;
        const strength = item.querySelector('.strength-indicator').textContent;
        const score = item.querySelector('.strength-score').textContent;
        return { password, strength, score };
      });
    
    if (passwords.length === 0) {
      this.showNotification('No passwords to export', 'info');
      return;
    }
    
    try {
      let content = '';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let filename = `passwords_${timestamp}`;
      
      switch (format) {
        case 'txt':
          content = passwords.map(p => p.password).join('\n');
          filename += '.txt';
          break;
        case 'csv':
          content = 'Password,Strength,Score\n' + 
                   passwords.map(p => `"${p.password}","${p.strength}","${p.score}"`).join('\n');
          filename += '.csv';
          break;
        case 'json':
          content = JSON.stringify({
            generated: new Date().toISOString(),
            count: passwords.length,
            passwords: passwords
          }, null, 2);
          filename += '.json';
          break;
      }
      
      // Create download link
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      this.showNotification(`Exported ${passwords.length} passwords as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      this.showNotification('Failed to export passwords', 'error');
    }
  }

  /**
   * Copy all batch passwords
   */
  async copyAllBatchPasswords() {
    const passwords = Array.from(document.querySelectorAll('.batch-item .batch-password input'))
      .map(input => input.value);
    
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
    document.getElementById('batch-results').innerHTML = '';
    this.showNotification('Batch results cleared', 'info');
  }

  /**
   * Add batch controls for export and management
   */
  addBatchControls() {
    const container = document.getElementById('batch-results');
    
    // Check if controls already exist
    if (container.querySelector('.batch-controls')) return;
    
    const controls = document.createElement('div');
    controls.className = 'batch-controls';
    controls.innerHTML = `
      <div class="batch-actions">
        <button class="btn btn-secondary" onclick="passwordGeneratorUI.copyAllBatchPasswords()">Copy All</button>
        <button class="btn btn-secondary" onclick="passwordGeneratorUI.exportBatchPasswords('txt')">Export TXT</button>
        <button class="btn btn-secondary" onclick="passwordGeneratorUI.exportBatchPasswords('csv')">Export CSV</button>
        <button class="btn btn-secondary" onclick="passwordGeneratorUI.exportBatchPasswords('json')">Export JSON</button>
        <button class="btn btn-secondary" onclick="passwordGeneratorUI.clearBatchResults()">Clear</button>
      </div>
    `;
    
    container.insertBefore(controls, container.firstChild);
  }

  /**
   * Create generation preset
   */
  createPreset() {
    const options = this.getPasswordOptions();
    const presetName = prompt('Enter a name for this preset:');
    
    if (!presetName) return;
    
    try {
      const presets = JSON.parse(localStorage.getItem('passwordPresets') || '{}');
      presets[presetName] = {
        ...options,
        created: new Date().toISOString()
      };
      localStorage.setItem('passwordPresets', JSON.stringify(presets));
      
      this.showNotification(`Preset "${presetName}" saved successfully`, 'success');
      this.updatePresetsList();
    } catch (error) {
      this.showNotification('Failed to save preset', 'error');
    }
  }

  /**
   * Load generation preset
   */
  loadPreset(presetName) {
    try {
      const presets = JSON.parse(localStorage.getItem('passwordPresets') || '{}');
      const preset = presets[presetName];
      
      if (!preset) {
        this.showNotification('Preset not found', 'error');
        return;
      }
      
      // Apply preset options
      document.getElementById('password-length').value = preset.length;
      document.getElementById('length-value').textContent = preset.length;
      document.getElementById('include-lowercase').checked = preset.includeLowercase;
      document.getElementById('include-uppercase').checked = preset.includeUppercase;
      document.getElementById('include-numbers').checked = preset.includeNumbers;
      document.getElementById('include-symbols').checked = preset.includeSymbols;
      document.getElementById('exclude-ambiguous').checked = preset.excludeAmbiguous;
      document.getElementById('enforce-complexity').checked = preset.enforceComplexity;
      
      this.showNotification(`Preset "${presetName}" loaded successfully`, 'success');
    } catch (error) {
      this.showNotification('Failed to load preset', 'error');
    }
  }

  /**
   * Initialize navigation
   */
  initializeNavigation() {
    const backButton = document.getElementById('back-home');
    if (backButton) {
      backButton.addEventListener('click', () => {
        window.location.href = 'home.html';
      });
    }
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
