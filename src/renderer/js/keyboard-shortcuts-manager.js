/**
 * Keyboard Shortcuts Manager
 * Handles keyboard shortcuts configuration, customization, and help display
 */
class KeyboardShortcutsManager {
    constructor() {
        this.shortcuts = this.getDefaultShortcuts();
        this.customShortcuts = this.loadCustomShortcuts();
        this.isModalLoaded = false;
        this.modal = null;
        
        this.init();
    }

    /**
     * Initialize the shortcuts manager
     */
    init() {
        this.setupEventListeners();
        this.loadModalIfNeeded();
        console.log('Keyboard Shortcuts Manager initialized');
    }

    /**
     * Get default keyboard shortcuts configuration
     */
    getDefaultShortcuts() {
        return {
            global: {
                'CommandOrControl+G': {
                    id: 'open-password-generator',
                    name: 'Open Password Generator',
                    description: 'Open the password generator page',
                    category: 'Navigation',
                    icon: '🔐'
                },
                'CommandOrControl+V': {
                    id: 'open-vault',
                    name: 'Open Password Vault',
                    description: 'Open the password vault page',
                    category: 'Navigation',
                    icon: '🗂️'
                },
                'CommandOrControl+D': {
                    id: 'open-dashboard',
                    name: 'Open Dashboard',
                    description: 'Open the main dashboard',
                    category: 'Navigation',
                    icon: '📊'
                },
                'CommandOrControl+S': {
                    id: 'open-settings',
                    name: 'Open Settings',
                    description: 'Open application settings',
                    category: 'Navigation',
                    icon: '⚙️'
                },
                'CommandOrControl+L': {
                    id: 'force-lock-application',
                    name: 'Lock Application',
                    description: 'Lock the application immediately',
                    category: 'Security',
                    icon: '🔒'
                },
                'CommandOrControl+Shift+G': {
                    id: 'generate-quick-password',
                    name: 'Generate Quick Password',
                    description: 'Generate a password with default settings',
                    category: 'Generation',
                    icon: '⚡'
                },
                'CommandOrControl+H': {
                    id: 'show-keyboard-shortcuts',
                    name: 'Show Keyboard Shortcuts',
                    description: 'Display this help dialog',
                    category: 'Help',
                    icon: '❓'
                },
                'CommandOrControl+Q': {
                    id: 'quit-application',
                    name: 'Quit Application',
                    description: 'Close the application',
                    category: 'Application',
                    icon: '🚪'
                },
                'F1': {
                    id: 'show-help',
                    name: 'Show Application Help',
                    description: 'Display application help',
                    category: 'Help',
                    icon: '📖'
                }
            },
            local: {
                'CommandOrControl+/': {
                    id: 'show-shortcuts-local',
                    name: 'Show Keyboard Shortcuts',
                    description: 'Display keyboard shortcuts help',
                    category: 'Help',
                    icon: '⌨️'
                },
                'CommandOrControl+Shift+F': {
                    id: 'focus-search',
                    name: 'Focus Search Field',
                    description: 'Focus on the search input field',
                    category: 'Navigation',
                    icon: '🔍'
                },
                'Escape': {
                    id: 'close-modals',
                    name: 'Close Modals/Dialogs',
                    description: 'Close any open modals or dialogs',
                    category: 'Navigation',
                    icon: '❌'
                },
                'Enter': {
                    id: 'submit-forms',
                    name: 'Submit Forms',
                    description: 'Submit the current form',
                    category: 'Forms',
                    icon: '✅'
                },
                'Tab': {
                    id: 'navigate-fields',
                    name: 'Navigate Form Fields',
                    description: 'Move between form fields',
                    category: 'Forms',
                    icon: '🔄'
                }
            }
        };
    }

    /**
     * Load custom shortcuts from localStorage
     */
    loadCustomShortcuts() {
        try {
            const saved = localStorage.getItem('keyboard-shortcuts-custom');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Failed to load custom shortcuts:', error);
            return {};
        }
    }

    /**
     * Save custom shortcuts to localStorage
     */
    saveCustomShortcuts() {
        try {
            localStorage.setItem('keyboard-shortcuts-custom', JSON.stringify(this.customShortcuts));
        } catch (error) {
            console.error('Failed to save custom shortcuts:', error);
        }
    }

    /**
     * Get effective shortcut (custom override or default)
     */
    getEffectiveShortcut(type, defaultKey) {
        const customKey = this.customShortcuts[`${type}.${defaultKey}`];
        return customKey || defaultKey;
    }

    /**
     * Get all shortcuts in a format suitable for display
     */
    getShortcutsForDisplay() {
        const displayShortcuts = {
            global: [],
            local: []
        };

        // Process global shortcuts
        Object.entries(this.shortcuts.global).forEach(([key, config]) => {
            const effectiveKey = this.getEffectiveShortcut('global', key);
            displayShortcuts.global.push({
                key: this.formatKeyForDisplay(effectiveKey),
                ...config,
                originalKey: key,
                customized: effectiveKey !== key
            });
        });

        // Process local shortcuts
        Object.entries(this.shortcuts.local).forEach(([key, config]) => {
            const effectiveKey = this.getEffectiveShortcut('local', key);
            displayShortcuts.local.push({
                key: this.formatKeyForDisplay(effectiveKey),
                ...config,
                originalKey: key,
                customized: effectiveKey !== key
            });
        });

        return displayShortcuts;
    }

    /**
     * Format key combination for display (convert Electron format to user-friendly)
     */
    formatKeyForDisplay(key) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        
        let formatted = key
            .replace('CommandOrControl', isMac ? '⌘' : 'Ctrl')
            .replace('Command', '⌘')
            .replace('Control', 'Ctrl')
            .replace('Alt', isMac ? '⌥' : 'Alt')
            .replace('Shift', '⇧')
            .replace('Meta', isMac ? '⌘' : 'Win');
            
        return formatted;
    }

    /**
     * Setup event listeners for local shortcuts
     */
    setupEventListeners() {
        document.addEventListener('keydown', (event) => {
            this.handleLocalShortcut(event);
        });

        // Setup IPC listeners if available
        if (window.electronAPI) {
            window.electronAPI.onShowShortcutsHelp(() => {
                this.showShortcutsHelp();
            });
        }
    }

    /**
     * Handle local keyboard shortcuts
     */
    handleLocalShortcut(event) {
        const key = this.buildKeyString(event);
        const shortcut = this.findLocalShortcut(key);
        
        if (shortcut) {
            event.preventDefault();
            this.executeShortcutAction(shortcut.id, shortcut);
        }
    }

    /**
     * Build key string from keyboard event
     */
    buildKeyString(event) {
        const parts = [];
        
        if (event.ctrlKey || event.metaKey) {
            parts.push('CommandOrControl');
        }
        if (event.altKey) {
            parts.push('Alt');
        }
        if (event.shiftKey) {
            parts.push('Shift');
        }
        
        parts.push(event.key);
        
        return parts.join('+');
    }

    /**
     * Find local shortcut by key string
     */
    findLocalShortcut(keyString) {
        for (const [key, config] of Object.entries(this.shortcuts.local)) {
            const effectiveKey = this.getEffectiveShortcut('local', key);
            if (this.normalizeKeyString(effectiveKey) === this.normalizeKeyString(keyString)) {
                return config;
            }
        }
        return null;
    }

    /**
     * Normalize key string for comparison
     */
    normalizeKeyString(keyString) {
        return keyString.toLowerCase().replace(/\s+/g, '');
    }

    /**
     * Execute shortcut action
     */
    executeShortcutAction(actionId, shortcut) {
        console.log(`Executing shortcut action: ${actionId}`, shortcut);
        
        switch (actionId) {
            case 'show-shortcuts-local':
                this.showShortcutsHelp();
                break;
            case 'focus-search':
                this.focusSearchField();
                break;
            case 'close-modals':
                this.closeModals();
                break;
            default:
                console.log(`Unhandled local shortcut action: ${actionId}`);
        }
    }

    /**
     * Show keyboard shortcuts help modal
     */
    async showShortcutsHelp() {
        if (!this.isModalLoaded) {
            await this.loadModal();
        }
        
        if (this.modal) {
            // Update shortcuts in the modal
            this.updateModalShortcuts();
            this.modal.show();
        }
    }

    /**
     * Load the keyboard shortcuts modal
     */
    async loadModal() {
        try {
            // Create modal container if it doesn't exist
            if (!document.getElementById('shortcuts-modal-container')) {
                const container = document.createElement('div');
                container.id = 'shortcuts-modal-container';
                document.body.appendChild(container);
                
                // Load the modal HTML
                const response = await fetch('src/renderer/components/keyboard-shortcuts-modal.html');
                const modalHTML = await response.text();
                
                // Extract the modal div from the HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = modalHTML;
                const modalElement = tempDiv.querySelector('#shortcuts-modal');
                
                if (modalElement) {
                    container.appendChild(modalElement);
                    
                    // Initialize the modal
                    this.modal = window.KeyboardShortcutsModal || new KeyboardShortcutsModal();
                    this.isModalLoaded = true;
                }
            }
        } catch (error) {
            console.error('Failed to load shortcuts modal:', error);
            // Fallback to simple alert
            this.showSimpleShortcutsHelp();
        }
    }

    /**
     * Update shortcuts in the modal
     */
    updateModalShortcuts() {
        if (!this.modal) return;
        
        const shortcuts = this.getShortcutsForDisplay();
        
        // Update global shortcuts
        const globalContainer = document.getElementById('global-shortcuts');
        if (globalContainer) {
            this.renderShortcutsList(globalContainer, shortcuts.global);
        }
        
        // Update local shortcuts
        const localContainer = document.getElementById('local-shortcuts');
        if (localContainer) {
            this.renderShortcutsList(localContainer, shortcuts.local);
        }
    }

    /**
     * Render shortcuts list in container
     */
    renderShortcutsList(container, shortcuts) {
        container.innerHTML = shortcuts.map(shortcut => `
            <div class="shortcut-item ${shortcut.customized ? 'customized' : ''}">
                <span class="shortcut-key">${shortcut.key}</span>
                <span class="shortcut-description">
                    ${shortcut.icon} ${shortcut.name}
                    ${shortcut.customized ? ' <small>(Custom)</small>' : ''}
                </span>
            </div>
        `).join('');
    }

    /**
     * Fallback simple shortcuts help (using alert)
     */
    showSimpleShortcutsHelp() {
        const shortcuts = this.getShortcutsForDisplay();
        
        let message = "⌨️ Keyboard Shortcuts\n\n";
        message += "🌐 Global Shortcuts:\n";
        shortcuts.global.forEach(s => {
            message += `${s.key.padEnd(15)} - ${s.name}\n`;
        });
        
        message += "\n🏠 Local Shortcuts:\n";
        shortcuts.local.forEach(s => {
            message += `${s.key.padEnd(15)} - ${s.name}\n`;
        });
        
        alert(message);
    }

    /**
     * Focus search field if available
     */
    focusSearchField() {
        const searchFields = [
            'input[type="search"]',
            'input[placeholder*="search" i]',
            'input[placeholder*="Search"]',
            '.search-input',
            '#search'
        ];
        
        for (const selector of searchFields) {
            const field = document.querySelector(selector);
            if (field && field.offsetParent !== null) { // Check if visible
                field.focus();
                if (field.select) field.select();
                return true;
            }
        }
        
        console.log('No search field found to focus');
        return false;
    }

    /**
     * Close any open modals
     */
    closeModals() {
        // Close shortcuts modal
        if (this.modal) {
            this.modal.hide();
        }
        
        // Close other common modals
        const modalSelectors = [
            '.modal.active',
            '.modal.show',
            '.overlay.active',
            '.dialog[open]'
        ];
        
        modalSelectors.forEach(selector => {
            const modals = document.querySelectorAll(selector);
            modals.forEach(modal => {
                if (modal.classList.contains('active')) {
                    modal.classList.remove('active');
                } else if (modal.classList.contains('show')) {
                    modal.classList.remove('show');
                } else if (modal.hasAttribute('open')) {
                    modal.removeAttribute('open');
                }
            });
        });
    }

    /**
     * Customize a shortcut
     */
    customizeShortcut(type, originalKey, newKey) {
        try {
            // Validate the new key
            if (!this.isValidShortcut(newKey)) {
                throw new Error('Invalid shortcut key combination');
            }
            
            // Check for conflicts
            if (this.hasShortcutConflict(type, newKey, originalKey)) {
                throw new Error('Shortcut key combination already in use');
            }
            
            // Save the customization
            this.customShortcuts[`${type}.${originalKey}`] = newKey;
            this.saveCustomShortcuts();
            
            return { success: true, message: 'Shortcut updated successfully' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Reset a shortcut to default
     */
    resetShortcut(type, originalKey) {
        delete this.customShortcuts[`${type}.${originalKey}`];
        this.saveCustomShortcuts();
        return { success: true, message: 'Shortcut reset to default' };
    }

    /**
     * Reset all shortcuts to defaults
     */
    resetAllShortcuts() {
        this.customShortcuts = {};
        this.saveCustomShortcuts();
        return { success: true, message: 'All shortcuts reset to defaults' };
    }

    /**
     * Validate shortcut key combination
     */
    isValidShortcut(keyString) {
        // Basic validation - ensure it has a modifier key
        const hasModifier = keyString.includes('CommandOrControl') || 
                          keyString.includes('Control') || 
                          keyString.includes('Command') || 
                          keyString.includes('Alt');
        
        return hasModifier && keyString.length > 5;
    }

    /**
     * Check for shortcut conflicts
     */
    hasShortcutConflict(type, newKey, excludeOriginal) {
        const allShortcuts = { ...this.shortcuts.global, ...this.shortcuts.local };
        
        for (const [key, config] of Object.entries(allShortcuts)) {
            if (key === excludeOriginal) continue;
            
            const effectiveKey = this.getEffectiveShortcut(type, key);
            if (this.normalizeKeyString(effectiveKey) === this.normalizeKeyString(newKey)) {
                return true;
            }
        }
        
        return false;
    }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeyboardShortcutsManager;
} else {
    window.KeyboardShortcutsManager = KeyboardShortcutsManager;
}
