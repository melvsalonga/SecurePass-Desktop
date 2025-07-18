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

- **Password Generation** - Customizable with multiple character sets
- **Strength Analysis** - Real-time entropy calculation and pattern detection
- **Secure Storage** - Encrypted local database with better-sqlite3
- **Cross-platform** - Windows, macOS, and Linux support
- **Modern UI** - Responsive design with dark/light themes
- **Import/Export** - Multiple format support
- **Password Categorization** - Organize with tags and folders

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
│   ├── main.js            # Application entry point
│   ├── preload.js         # Secure preload script
│   ├── database.js        # Database operations (coming soon)
│   ├── encryption.js      # Encryption utilities (coming soon)
│   └── security.js        # Security utilities (coming soon)
├── renderer/              # Renderer process (UI)
│   ├── js/                # JavaScript files
│   │   └── main.js        # Main renderer logic
│   └── styles/            # CSS files
│       └── main.css       # Main styles
├── shared/                # Shared utilities (coming soon)
└── assets/                # Static assets (coming soon)
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

This project is in active development. See the [tasks document](tasks.md) for current progress and upcoming features.

### Phase 1: Foundation ✅
- [x] Electron app setup
- [x] Secure architecture implementation
- [x] Basic UI framework
- [x] Development tools configuration

### Phase 2: Core Features (In Progress)
- [ ] Password generation engine
- [ ] Strength analysis
- [ ] Basic UI components

### Phase 3: Security & Storage (Planned)
- [ ] Encryption implementation
- [ ] Master password system
- [ ] Secure storage

---

**Version:** 1.0.0  
**Status:** Development  
**Last Updated:** 2025-01-18
