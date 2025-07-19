const { Tray, Menu, nativeImage, app, shell } = require('electron');
const path = require('node:path');

/**
 * TrayManager - Manages system tray functionality
 * Provides quick access to SecurePass features from system tray
 */
class TrayManager {
    constructor(mainWindow, passwordGenerator, autoLockManager) {
        this.mainWindow = mainWindow;
        this.passwordGenerator = passwordGenerator;
        this.autoLockManager = autoLockManager;
        this.tray = null;
        this.isAuthenticated = false;
        this.contextMenu = null;
        
        this.init();
    }

    /**
     * Initialize the system tray
     */
    init() {
        try {
            // Create tray icon
            this.createTrayIcon();
            
            // Build initial context menu
            this.buildContextMenu();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('System tray initialized successfully');
        } catch (error) {
            console.error('Failed to initialize system tray:', error);
        }
    }

    /**
     * Create the tray icon
     */
    createTrayIcon() {
        // Create icon path - try different formats based on platform
        let iconPath;
        if (process.platform === 'win32') {
            iconPath = path.join(__dirname, '../../assets/icons/tray-icon.ico');
        } else if (process.platform === 'darwin') {
            iconPath = path.join(__dirname, '../../assets/icons/tray-iconTemplate.png');
        } else {
            iconPath = path.join(__dirname, '../../assets/icons/tray-icon.png');
        }

        // Fallback to a simple icon if custom icons don't exist
        try {
            const icon = nativeImage.createFromPath(iconPath);
            if (icon.isEmpty()) {
                // Create a simple programmatic icon as fallback
                this.tray = new Tray(this.createFallbackIcon());
            } else {
                this.tray = new Tray(icon);
            }
        } catch (error) {
            console.warn('Custom tray icon not found, using fallback:', error.message);
            this.tray = new Tray(this.createFallbackIcon());
        }

        // Set tray tooltip
        this.tray.setToolTip('SecurePass Desktop - Password Manager');
        
        // Set tray title for macOS
        if (process.platform === 'darwin') {
            this.tray.setTitle('SecurePass');
        }
    }

    /**
     * Create a fallback icon programmatically
     */
    createFallbackIcon() {
        try {
            // Try to create a simple icon using nativeImage
            const iconBuffer = this.createSimpleIconBuffer();
            return nativeImage.createFromBuffer(iconBuffer);
        } catch (error) {
            console.warn('Failed to create programmatic icon, using empty image:', error);
            // Create minimal 16x16 icon as last resort
            return nativeImage.createEmpty();
        }
    }

    /**
     * Build the context menu
     */
    buildContextMenu() {
        const template = [
            {
                label: 'SecurePass Desktop',
                type: 'normal',
                enabled: false,
                icon: this.createSmallIcon()
            },
            {
                type: 'separator'
            }
        ];

        if (this.isAuthenticated) {
            // Authenticated menu items
            template.push(
                {
                    label: '🔐 Generate Password',
                    type: 'normal',
                    accelerator: 'CommandOrControl+Shift+G',
                    click: () => this.generateQuickPassword()
                },
                {
                    label: '🗂️ Open Vault',
                    type: 'normal',
                    accelerator: 'CommandOrControl+V',
                    click: () => this.openVault()
                },
                {
                    label: '⚙️ Settings',
                    type: 'normal',
                    accelerator: 'CommandOrControl+S',
                    click: () => this.openSettings()
                },
                {
                    type: 'separator'
                },
                {
                    label: '🔒 Lock Application',
                    type: 'normal',
                    accelerator: 'CommandOrControl+L',
                    click: () => this.lockApplication()
                }
            );
        } else {
            // Unauthenticated menu items
            template.push(
                {
                    label: '🔑 Sign In',
                    type: 'normal',
                    click: () => this.showMainWindow()
                },
                {
                    label: '🆕 Setup Master Password',
                    type: 'normal',
                    click: () => this.showSetupPage()
                }
            );
        }

        // Common menu items
        template.push(
            {
                type: 'separator'
            },
            {
                label: '📊 Show Dashboard',
                type: 'normal',
                accelerator: 'CommandOrControl+D',
                click: () => this.showMainWindow()
            },
            {
                label: '❓ Keyboard Shortcuts',
                type: 'normal',
                accelerator: 'CommandOrControl+H',
                click: () => this.showKeyboardShortcuts()
            },
            {
                type: 'separator'
            },
            {
                label: 'About SecurePass',
                type: 'normal',
                click: () => this.showAbout()
            },
            {
                label: 'Check for Updates',
                type: 'normal',
                click: () => this.checkForUpdates()
            },
            {
                type: 'separator'
            },
            {
                label: 'Quit SecurePass',
                type: 'normal',
                accelerator: 'CommandOrControl+Q',
                click: () => app.quit()
            }
        );

        this.contextMenu = Menu.buildFromTemplate(template);
        this.tray.setContextMenu(this.contextMenu);
    }

    /**
     * Create a simple icon buffer using raw pixel data
     */
    createSimpleIconBuffer() {
        // Create a 16x16 RGBA buffer (4 bytes per pixel)
        const size = 16;
        const buffer = Buffer.alloc(size * size * 4);
        
        // Fill with a simple lock pattern
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const offset = (y * size + x) * 4;
                
                // Create a simple pattern - background, border, and center
                if (x === 0 || x === size - 1 || y === 0 || y === size - 1) {
                    // Border - blue
                    buffer[offset] = 0x00;     // R
                    buffer[offset + 1] = 0x66; // G
                    buffer[offset + 2] = 0xCC; // B
                    buffer[offset + 3] = 0xFF; // A
                } else if (x >= 6 && x <= 9 && y >= 6 && y <= 9) {
                    // Center - white
                    buffer[offset] = 0xFF;     // R
                    buffer[offset + 1] = 0xFF; // G
                    buffer[offset + 2] = 0xFF; // B
                    buffer[offset + 3] = 0xFF; // A
                } else {
                    // Background - dark blue
                    buffer[offset] = 0x00;     // R
                    buffer[offset + 1] = 0x33; // G
                    buffer[offset + 2] = 0x66; // B
                    buffer[offset + 3] = 0xFF; // A
                }
            }
        }
        
        return buffer;
    }

    /**
     * Create a small icon for menu items
     */
    createSmallIcon() {
        try {
            return this.createFallbackIcon();
        } catch (error) {
            console.warn('Failed to create small icon:', error);
            return null;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Double-click to show main window
        this.tray.on('double-click', () => {
            this.showMainWindow();
        });

        // Right-click shows context menu (handled automatically)
        // Left-click on Windows/Linux shows context menu too
        this.tray.on('click', () => {
            if (process.platform !== 'darwin') {
                this.showMainWindow();
            }
        });

        // Listen for authentication state changes
        if (this.mainWindow) {
            this.mainWindow.webContents.on('ipc-message', (event, channel, ...args) => {
                if (channel === 'auth-state-changed') {
                    this.updateAuthenticationState(args[0]);
                }
            });
        }
    }

    /**
     * Update authentication state
     */
    updateAuthenticationState(isAuthenticated) {
        this.isAuthenticated = isAuthenticated;
        this.buildContextMenu(); // Rebuild menu with new state
        
        // Update tooltip
        if (isAuthenticated) {
            this.tray.setToolTip('SecurePass Desktop - Authenticated');
        } else {
            this.tray.setToolTip('SecurePass Desktop - Not Authenticated');
        }
        
        console.log('Tray authentication state updated:', isAuthenticated);
    }

    /**
     * Show main window
     */
    showMainWindow() {
        if (this.mainWindow) {
            if (this.mainWindow.isMinimized()) {
                this.mainWindow.restore();
            }
            this.mainWindow.show();
            this.mainWindow.focus();
        }
    }

    /**
     * Show setup page
     */
    showSetupPage() {
        this.showMainWindow();
        // Navigate to setup page
        if (this.mainWindow) {
            this.mainWindow.webContents.send('navigate-to', 'master-password-setup');
        }
    }

    /**
     * Generate quick password
     */
    async generateQuickPassword() {
        try {
            const password = this.passwordGenerator.generatePassword({
                length: 16,
                includeUppercase: true,
                includeLowercase: true,
                includeNumbers: true,
                includeSymbols: true,
                excludeAmbiguous: true
            });

            // Copy to clipboard
            const { clipboard } = require('electron');
            clipboard.writeText(password.password);

            // Show notification
            this.showNotification('Quick Password Generated', 
                `Password copied to clipboard!\nStrength: ${password.strength.level}`);

            // Optional: Show main window
            if (this.mainWindow && !this.mainWindow.isVisible()) {
                this.showMainWindow();
            }

        } catch (error) {
            console.error('Quick password generation failed:', error);
            this.showNotification('Password Generation Failed', 
                'Unable to generate password. Please check the application.');
        }
    }

    /**
     * Open vault
     */
    openVault() {
        this.showMainWindow();
        if (this.mainWindow) {
            this.mainWindow.webContents.send('navigate-to', 'vault');
        }
    }

    /**
     * Open settings
     */
    openSettings() {
        this.showMainWindow();
        if (this.mainWindow) {
            this.mainWindow.webContents.send('navigate-to', 'settings');
        }
    }

    /**
     * Lock application
     */
    async lockApplication() {
        try {
            if (this.autoLockManager) {
                await this.autoLockManager.forceLock();
                this.updateAuthenticationState(false);
                this.showNotification('Application Locked', 'SecurePass has been locked for security.');
            }
        } catch (error) {
            console.error('Failed to lock application:', error);
        }
    }

    /**
     * Show keyboard shortcuts
     */
    showKeyboardShortcuts() {
        this.showMainWindow();
        if (this.mainWindow) {
            this.mainWindow.webContents.send('show-shortcuts-help');
        }
    }

    /**
     * Show about dialog
     */
    showAbout() {
        const { dialog } = require('electron');
        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'About SecurePass Desktop',
            message: 'SecurePass Desktop',
            detail: `Version: 1.0.0\nElectron Version: ${process.versions.electron}\nNode.js Version: ${process.versions.node}\nChrome Version: ${process.versions.chrome}\n\nA secure, cross-platform password manager built with Electron.\n\n© 2025 SecurePass Desktop. All rights reserved.`,
            buttons: ['OK', 'Visit Website'],
            defaultId: 0
        }).then((result) => {
            if (result.response === 1) {
                shell.openExternal('https://github.com/SecurePass-Desktop/SecurePass-Desktop');
            }
        });
    }

    /**
     * Check for updates
     */
    checkForUpdates() {
        // This is a placeholder for future update checking functionality
        this.showNotification('Check for Updates', 'Update checking is not yet implemented.');
        
        // In a real application, you would:
        // 1. Check GitHub releases or your update server
        // 2. Compare versions
        // 3. Download and install updates
        // 4. Show update dialog if available
    }

    /**
     * Show notification
     */
    showNotification(title, body, options = {}) {
        const { Notification } = require('electron');
        
        if (Notification.isSupported()) {
            const notification = new Notification({
                title,
                body,
                icon: this.tray.getImage(),
                silent: options.silent || false,
                urgency: options.urgency || 'normal'
            });
            
            notification.show();
            
            // Optional click handler
            if (options.onClick) {
                notification.on('click', options.onClick);
            } else {
                notification.on('click', () => this.showMainWindow());
            }
        } else {
            console.log('Notification not supported, falling back to console log:');
            console.log(`${title}: ${body}`);
        }
    }

    /**
     * Update tray menu when window state changes
     */
    onWindowStateChange(isVisible, isMinimized) {
        // Update context menu based on window state
        // This can be used to show/hide certain menu items
        if (this.contextMenu) {
            // Refresh the context menu
            this.buildContextMenu();
        }
    }

    /**
     * Enable/disable tray features based on authentication
     */
    setFeatureEnabled(featureName, enabled) {
        if (this.contextMenu) {
            const menuItems = this.contextMenu.items;
            const item = menuItems.find(item => item.label.includes(featureName));
            if (item) {
                item.enabled = enabled;
            }
        }
    }

    /**
     * Destroy the tray
     */
    destroy() {
        if (this.tray) {
            this.tray.destroy();
            this.tray = null;
            console.log('System tray destroyed');
        }
    }

    /**
     * Check if tray is supported on current platform
     */
    static isSupported() {
        return Tray.isSupported();
    }

    /**
     * Get tray bounds (useful for positioning windows relative to tray)
     */
    getBounds() {
        return this.tray ? this.tray.getBounds() : null;
    }
}

module.exports = TrayManager;
