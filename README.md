# SecurePass Desktop

A secure, cross-platform password manager desktop application built with Electron and modern web technologies.

## 🔒 Security Features

- **Zero-knowledge architecture** - Master password never stored
- **AES-256 encryption** for all sensitive data
- **Argon2 password hashing** for master password
- **Secure IPC communication** with contextBridge and contextIsolation
- **Sandboxed renderer processes** for enhanced security
- **Content Security Policy** implementation
- **Automatic clipboard clearing** for copied passwords

## 🚀 Features

### Core Features
- **Advanced Password Generation** - Customizable with multiple character sets, batch generation, and passphrase support
- **Real-time Strength Analysis** - Entropy calculation, pattern detection, and time-to-crack estimation
- **Secure Encrypted Storage** - AES-256 encrypted local database with comprehensive search and filtering
- **Password Organization** - Categories, tags, and advanced search with duplicate detection
- **Import/Export Support** - Multiple formats (JSON, CSV, XML) with data validation

### Advanced Features
- **Dark/Light Theme System** - Automatic theme switching with system preference detection
- **Comprehensive Keyboard Shortcuts** - Global and local shortcuts with customizable mapping
- **System Tray Integration** - Quick access menu with authentication-aware features
- **Auto-lock Security** - Configurable inactivity detection with secure session cleanup
- **Master Password Management** - Secure setup, authentication, and password change functionality

### Technical Features
- **Cross-platform Support** - Windows, macOS, and Linux compatibility
- **Modern UI/UX** - Responsive design with smooth animations and accessibility support
- **Secure Architecture** - Sandboxed processes, context isolation, and zero-knowledge design

## 📋 Requirements

- Node.js 18.x or higher
- npm 8.x or higher
- Supported Operating Systems:
  - Windows 10 or later
  - macOS 10.14 or later
  - Linux (Ubuntu 18.04+, Fedora 32+, CentOS 8+)

## 🛠️ Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/melvsalonga/SecurePass-Desktop.git
   cd SecurePass-Desktop
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm start
   ```

## 🔧 Development

### Available Scripts

- `npm start` - Start the application
- `npm run dev` - Start with developer tools
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run build` - Build for production
- `npm run build:win` - Build for Windows
- `npm run build:mac` - Build for macOS
- `npm run build:linux` - Build for Linux

### Project Structure

```
src/
├── main/                   # Main process (Electron)
│   ├── main.js            # Application entry point with IPC handlers
│   ├── preload.js         # Secure preload script with contextBridge
│   ├── trayManager.js     # System tray integration
│   ├── autoLockManager.js # Auto-lock and session management
│   ├── encryption.js      # AES-256 encryption utilities
│   ├── simpleDatabaseManager.js # SQLite database operations
│   └── passwordStorageManager.js # Encrypted password storage
├── renderer/              # Renderer process (UI)
│   ├── components/        # Reusable UI components
│   │   └── keyboard-shortcuts-modal.html
│   ├── js/                # JavaScript files
│   │   ├── main.js        # Main renderer logic
│   │   ├── theme-manager.js # Theme switching system
│   │   ├── keyboard-shortcuts-manager.js # Shortcuts management
│   │   ├── generator.js   # Password generator UI
│   │   ├── vault.js       # Password vault UI
│   │   └── settings.js    # Settings management
│   ├── pages/             # Application pages
│   │   ├── home.html      # Main dashboard
│   │   ├── generator.html # Password generator
│   │   ├── vault.html     # Password vault
│   │   └── settings.html  # Application settings
│   └── styles/            # CSS files
│       ├── themes.css     # Theme system
│       ├── main.css       # Base styles
│       └── generator.css  # Generator-specific styles
├── shared/                # Shared utilities
│   └── password-generator.js # Core password generation logic
└── assets/                # Static assets
```

### Code Quality

The project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **Jest** for testing
- **Electron Security** best practices

## 🧪 Testing

Run tests with:
```bash
npm test
```

Generate coverage report:
```bash
npm run test:coverage
```

## 📚 Documentation

- [Requirements](requirements.md) - Detailed project requirements
- [Design](design.md) - Architecture and design decisions
- [Tasks](tasks.md) - Implementation roadmap
- [Getting Started](getting-started.md) - Solo developer guide

## 🔐 Security

This application follows security best practices:

1. **Modern Electron Security**:
   - Context isolation enabled
   - Node integration disabled
   - Sandbox enabled for renderer processes
   - Secure preload scripts with contextBridge

2. **Cryptography**:
   - Industry-standard AES-256 encryption
   - Argon2 password hashing
   - Secure random number generation

3. **Data Protection**:
   - All sensitive data encrypted at rest
   - Secure memory handling
   - Zero-knowledge architecture

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Electron](https://electronjs.org/)
- Database powered by [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- Security implementations following [OWASP guidelines](https://owasp.org/)
- UI inspired by modern design principles

## 📊 Development Status

**Current Status:** Phase 4 - Advanced Features (75% Complete)  
**Overall Progress:** ~85% Complete  

See the [tasks document](tasks.md) for detailed progress and upcoming features.

### Phase 1: Foundation ✅ (100%)
- [x] Electron app setup with secure architecture
- [x] IPC communication with contextBridge
- [x] SQLite database integration
- [x] Development tools and testing framework

### Phase 2: Core Features ✅ (100%)
- [x] Advanced password generation engine
- [x] Real-time strength analysis with entropy calculation
- [x] Batch generation and passphrase support
- [x] Interactive UI components with responsive design

### Phase 3: Security & Storage ✅ (100%)
- [x] AES-256 encryption implementation
- [x] Argon2 master password system with authentication
- [x] Encrypted password storage with categorization
- [x] Auto-lock mechanism and session management
- [x] Import/export functionality with data validation

### Phase 4: Advanced Features 🔄 (75%)
- [x] **Theme Switching System** - Dark/light themes with persistence
- [x] **Keyboard Shortcuts** - Global and local shortcuts with customization
- [x] **System Tray Integration** - Quick access menu with notifications
- [ ] **Accessibility Improvements** - ARIA labels and keyboard navigation

### Phase 5: Testing & Deployment ⏳ (Planned)
- [ ] Comprehensive testing suite
- [ ] Security auditing
- [ ] Cross-platform builds
- [ ] Distribution packages

---

**Version:** 1.0.0  
**Status:** Development
