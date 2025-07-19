/**
 * Master Password Setup Controller
 * Handles the setup wizard for creating a master password
 */

class MasterPasswordSetup {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 4;
    this.masterPassword = '';
    this.username = '';
    this.isPasswordValid = false;
    this.isConfirmValid = false;
    this.themeManager = null;
    this.initializeTheme();
    this.initializeEventListeners();
    this.updateProgress();
  }

  /**
   * Initialize theme manager
   */
  initializeTheme() {
    if (window.ThemeManager) {
      this.themeManager = new window.ThemeManager();
    }
  }

  /**
   * Initialize all event listeners
   */
  initializeEventListeners() {
    // Step navigation buttons
    document.getElementById('btn-start-setup').addEventListener('click', () => {
      this.goToStep(2);
    });

    document.getElementById('btn-back-to-welcome').addEventListener('click', () => {
      this.goToStep(1);
    });

    document.getElementById('btn-back-to-password').addEventListener('click', () => {
      this.goToStep(2);
    });

    // Form submission
    document.getElementById('master-password-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handlePasswordSubmit();
    });

    // Password visibility toggles
    document.getElementById('toggle-password').addEventListener('click', () => {
      this.togglePasswordVisibility('master-password', 'toggle-password');
    });

    document.getElementById('toggle-confirm-password').addEventListener('click', () => {
      this.togglePasswordVisibility('confirm-password', 'toggle-confirm-password');
    });

    // Password input validation
    document.getElementById('master-password').addEventListener('input', (e) => {
      this.validateMasterPassword(e.target.value);
    });

    document.getElementById('confirm-password').addEventListener('input', (e) => {
      this.validatePasswordConfirmation(e.target.value);
    });

    // Security acknowledgment
    document.getElementById('security-acknowledgment').addEventListener('change', (e) => {
      document.getElementById('btn-complete-setup').disabled = !e.target.checked;
    });

    // Complete setup
    document.getElementById('btn-complete-setup').addEventListener('click', () => {
      this.completeSetup();
    });

    // Start using the application
    document.getElementById('btn-start-using').addEventListener('click', () => {
      this.startUsingApp();
    });
  }

  /**
   * Navigate to a specific step
   * @param {number} step - Step number to navigate to
   */
  goToStep(step) {
    if (step < 1 || step > this.totalSteps) {
      return;
    }

    // Hide current step
    document.querySelectorAll('.setup-step').forEach(stepEl => {
      stepEl.classList.remove('active');
    });

    // Show target step
    const targetStep = document.getElementById(`step-${this.getStepName(step)}`);
    targetStep.classList.add('active');

    // Update progress
    this.currentStep = step;
    this.updateProgress();
  }

  /**
   * Get step name by number
   * @param {number} stepNumber - Step number
   * @returns {string} Step name
   */
  getStepName(stepNumber) {
    const stepNames = {
      1: 'welcome',
      2: 'create-password',
      3: 'security-tips',
      4: 'complete'
    };
    return stepNames[stepNumber] || 'welcome';
  }

  /**
   * Update progress indicator
   */
  updateProgress() {
    const progressFill = document.getElementById('progress-fill');
    const progressSteps = document.querySelectorAll('.progress-step');
    
    // Update progress bar
    const progressPercent = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
    progressFill.style.width = `${progressPercent}%`;
    
    // Update step indicators
    progressSteps.forEach((step, index) => {
      if (index < this.currentStep) {
        step.classList.add('active');
        step.classList.add('completed');
      } else if (index === this.currentStep - 1) {
        step.classList.add('active');
        step.classList.remove('completed');
      } else {
        step.classList.remove('active');
        step.classList.remove('completed');
      }
    });
  }

  /**
   * Toggle password visibility
   * @param {string} inputId - Input element ID
   * @param {string} buttonId - Button element ID
   */
  togglePasswordVisibility(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    
    if (input.type === 'password') {
      input.type = 'text';
      button.textContent = '🙈';
    } else {
      input.type = 'password';
      button.textContent = '👁️';
    }
  }

  /**
   * Validate master password
   * @param {string} password - Password to validate
   */
  validateMasterPassword(password) {
    const requirements = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)
    };

    // Update requirement indicators
    Object.entries(requirements).forEach(([req, met]) => {
      const element = document.getElementById(`req-${req}`);
      if (met) {
        element.classList.add('met');
        element.classList.remove('unmet');
      } else {
        element.classList.add('unmet');
        element.classList.remove('met');
      }
    });

    // Calculate strength
    const strength = this.calculatePasswordStrength(password);
    this.updateStrengthMeter(strength);

    // Check if password is valid
    this.isPasswordValid = Object.values(requirements).every(Boolean) && password.length > 0;
    this.masterPassword = password;
    
    // Re-validate confirmation password when master password changes
    const confirmPasswordField = document.getElementById('confirm-password');
    if (confirmPasswordField.value) {
      this.validatePasswordConfirmation(confirmPasswordField.value);
    }
    
    this.validateForm();
  }

  /**
   * Validate password confirmation
   * @param {string} confirmPassword - Confirmation password
   */
  validatePasswordConfirmation(confirmPassword) {
    const statusElement = document.getElementById('password-match-status');
    const masterPasswordField = document.getElementById('master-password');
    const currentMasterPassword = masterPasswordField.value;
    
    if (confirmPassword === '') {
      statusElement.textContent = '';
      statusElement.className = 'password-status';
      this.isConfirmValid = false;
    } else if (confirmPassword === currentMasterPassword) {
      statusElement.textContent = '✓ Passwords match';
      statusElement.className = 'password-status match';
      this.isConfirmValid = true;
    } else {
      statusElement.textContent = '✗ Passwords do not match';
      statusElement.className = 'password-status no-match';
      this.isConfirmValid = false;
    }
    
    this.validateForm();
  }

  /**
   * Validate the entire form
   */
  validateForm() {
    const createButton = document.getElementById('btn-create-password');
    createButton.disabled = !(this.isPasswordValid && this.isConfirmValid);
  }

  /**
   * Calculate password strength
   * @param {string} password - Password to analyze
   * @returns {Object} Strength analysis
   */
  calculatePasswordStrength(password) {
    let score = 0;
    let feedback = [];

    // Length scoring
    if (password.length >= 20) score += 25;
    else if (password.length >= 16) score += 20;
    else if (password.length >= 12) score += 15;
    else if (password.length >= 8) score += 10;
    else score += 5;

    // Character variety
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

    const varietyCount = [hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length;
    score += varietyCount * 15;

    // Pattern detection
    const hasRepeats = /(.)\\1{2,}/.test(password);
    const hasSequence = this.hasSequentialChars(password);
    const hasCommonWords = this.hasCommonWords(password);

    if (hasRepeats) {
      score -= 10;
      feedback.push('Avoid repeated characters');
    }

    if (hasSequence) {
      score -= 10;
      feedback.push('Avoid sequential characters');
    }

    if (hasCommonWords) {
      score -= 15;
      feedback.push('Avoid common words');
    }

    // Determine strength level
    let level = 'Very Weak';
    if (score >= 90) level = 'Excellent';
    else if (score >= 75) level = 'Very Strong';
    else if (score >= 60) level = 'Strong';
    else if (score >= 45) level = 'Moderate';
    else if (score >= 30) level = 'Weak';

    return {
      score: Math.max(0, Math.min(100, score)),
      level,
      feedback
    };
  }

  /**
   * Update strength meter display
   * @param {Object} strength - Strength analysis
   */
  updateStrengthMeter(strength) {
    const strengthFill = document.getElementById('master-strength-fill');
    const strengthLevel = document.getElementById('master-strength-level');
    const strengthScore = document.getElementById('master-strength-score');

    strengthFill.style.width = `${strength.score}%`;
    strengthFill.className = `strength-fill ${strength.level.toLowerCase().replace(' ', '-')}`;
    
    strengthLevel.textContent = strength.level;
    strengthScore.textContent = `${strength.score}/100`;
  }

  /**
   * Check for sequential characters
   * @param {string} password - Password to check
   * @returns {boolean} Whether password contains sequences
   */
  hasSequentialChars(password) {
    for (let i = 0; i < password.length - 2; i++) {
      const char1 = password.charCodeAt(i);
      const char2 = password.charCodeAt(i + 1);
      const char3 = password.charCodeAt(i + 2);
      
      if (char2 === char1 + 1 && char3 === char2 + 1) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check for common words
   * @param {string} password - Password to check
   * @returns {boolean} Whether password contains common words
   */
  hasCommonWords(password) {
    const commonWords = [
      'password', 'admin', 'user', 'login', 'welcome', 'secret', 'master',
      'qwerty', 'asdfgh', 'zxcvbn', '123456', 'abcdef', 'letmein'
    ];
    
    const lowerPassword = password.toLowerCase();
    return commonWords.some(word => lowerPassword.includes(word));
  }

  /**
   * Handle password form submission
   */
  handlePasswordSubmit() {
    if (!this.isPasswordValid || !this.isConfirmValid) {
      this.showNotification('Please fix the password requirements', 'error');
      return;
    }

    this.username = document.getElementById('username').value || 'User';
    this.goToStep(3);
  }

  /**
   * Complete the setup process
   */
  async completeSetup() {
    try {
      this.showNotification('Creating master password...', 'info');
      
      // Call the main process to set up the master password
      const result = await window.electronAPI.setMasterPassword(this.username, this.masterPassword);
      
      if (result.success) {
        this.showNotification('Master password created successfully!', 'success');
        this.goToStep(4);
      } else {
        this.showNotification(`Setup failed: ${result.error}`, 'error');
      }
    } catch (error) {
      this.showNotification(`Setup error: ${error.message}`, 'error');
    }
  }

  /**
   * Start using the application
   */
  startUsingApp() {
    // Navigate to the main application
    window.location.href = 'dashboard.html';
  }

  /**
   * Show notification to user
   * @param {string} message - Message to display
   * @param {string} type - Notification type (info, success, error)
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
}

// Initialize the master password setup when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new MasterPasswordSetup();
  console.log('Master Password Setup initialized');
});
