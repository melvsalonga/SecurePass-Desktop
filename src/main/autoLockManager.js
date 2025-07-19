/**
 * Auto-Lock Manager
 * Handles automatic locking of the application after inactivity
 */

class AutoLockManager {
  constructor() {
    this.isLocked = false;
    this.lockTimeout = 15 * 60 * 1000; // 15 minutes default
    this.inactivityTimer = null;
    this.lastActivity = Date.now();
    this.isEnabled = true;
    this.listeners = new Set();
    
    // Bind methods
    this.resetTimer = this.resetTimer.bind(this);
    
    this.initializeActivityTracking();
  }

  /**
   * Initialize activity tracking
   */
  initializeActivityTracking() {
    // Track various user activities
    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'
    ];

    // Set up global activity listeners
    this.startActivityTracking();
  }

  /**
   * Start tracking user activity
   */
  startActivityTracking() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    
    this.resetTimer();
  }

  /**
   * Stop tracking user activity
   */
  stopActivityTracking() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  /**
   * Reset the inactivity timer
   */
  resetTimer() {
    if (!this.isEnabled || this.isLocked) {
      return;
    }

    // Clear existing timer
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    // Update last activity time
    this.lastActivity = Date.now();

    // Set new timer
    this.inactivityTimer = setTimeout(() => {
      this.lockApplication();
    }, this.lockTimeout);
  }

  /**
   * Register activity from main process
   */
  registerActivity() {
    this.resetTimer();
  }

  /**
   * Lock the application
   */
  lockApplication() {
    if (this.isLocked) {
      return;
    }

    this.isLocked = true;
    this.stopActivityTracking();

    console.log('Application locked due to inactivity');

    // Notify all listeners
    this.notifyListeners('locked');

    // Clear sensitive data from memory
    this.clearSensitiveData();
  }

  /**
   * Unlock the application
   * @param {string} password - Master password for verification
   * @returns {Promise<boolean>} True if unlock successful
   */
  async unlockApplication(password) {
    try {
      // Verify password with database manager
      // This would need to be passed in or accessed through dependency injection
      const isValid = await this.verifyPassword(password);
      
      if (isValid) {
        this.isLocked = false;
        this.startActivityTracking();
        
        console.log('Application unlocked successfully');
        this.notifyListeners('unlocked');
        
        return true;
      } else {
        console.log('Unlock failed: Invalid password');
        return false;
      }
    } catch (error) {
      console.error('Unlock error:', error);
      return false;
    }
  }

  /**
   * Check if application is locked
   * @returns {boolean} True if locked
   */
  isApplicationLocked() {
    return this.isLocked;
  }

  /**
   * Set lock timeout
   * @param {number} timeoutMinutes - Timeout in minutes
   */
  setLockTimeout(timeoutMinutes) {
    const timeoutMs = timeoutMinutes * 60 * 1000;
    
    if (timeoutMs < 60000) { // Minimum 1 minute
      throw new Error('Lock timeout must be at least 1 minute');
    }
    
    if (timeoutMs > 3600000) { // Maximum 1 hour
      throw new Error('Lock timeout cannot exceed 1 hour');
    }
    
    this.lockTimeout = timeoutMs;
    
    // Restart timer with new timeout
    if (!this.isLocked && this.isEnabled) {
      this.resetTimer();
    }
    
    console.log(`Auto-lock timeout set to ${timeoutMinutes} minutes`);
  }

  /**
   * Enable or disable auto-lock
   * @param {boolean} enabled - Whether to enable auto-lock
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    
    if (enabled && !this.isLocked) {
      this.startActivityTracking();
    } else {
      this.stopActivityTracking();
    }
    
    console.log(`Auto-lock ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get current lock status
   * @returns {Object} Lock status information
   */
  getStatus() {
    return {
      isLocked: this.isLocked,
      isEnabled: this.isEnabled,
      timeoutMinutes: this.lockTimeout / 60000,
      timeUntilLock: this.isLocked ? 0 : Math.max(0, this.lockTimeout - (Date.now() - this.lastActivity)),
      lastActivity: this.lastActivity
    };
  }

  /**
   * Add event listener for lock state changes
   * @param {Function} listener - Event listener function
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Remove event listener
   * @param {Function} listener - Event listener function
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   * @param {string} event - Event type ('locked' or 'unlocked')
   */
  notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event, this.getStatus());
      } catch (error) {
        console.error('Error notifying lock listener:', error);
      }
    });
  }

  /**
   * Clear sensitive data from memory
   */
  clearSensitiveData() {
    // This would clear any cached passwords, keys, etc.
    // Implementation depends on how sensitive data is stored
    console.log('Clearing sensitive data from memory');
  }

  /**
   * Verify password for unlock
   * @param {string} password - Password to verify
   * @returns {Promise<boolean>} True if valid
   */
  async verifyPassword(password) {
    // This is a placeholder - in real implementation, this would
    // verify against the actual master password
    // For now, return true if password is not empty
    return password && password.length > 0;
  }

  /**
   * Force immediate lock
   */
  forceLock() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    this.lockApplication();
  }

  /**
   * Get time remaining until auto-lock
   * @returns {number} Milliseconds until lock, or 0 if locked/disabled
   */
  getTimeUntilLock() {
    if (this.isLocked || !this.isEnabled) {
      return 0;
    }
    
    const elapsed = Date.now() - this.lastActivity;
    return Math.max(0, this.lockTimeout - elapsed);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopActivityTracking();
    this.listeners.clear();
    console.log('AutoLockManager destroyed');
  }
}

module.exports = AutoLockManager;
