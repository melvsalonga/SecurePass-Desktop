const crypto = require('node:crypto')

/**
 * SecurePass Password Generator
 * 
 * Provides cryptographically secure password generation with customizable options
 * Following security best practices and NIST guidelines
 */
class PasswordGenerator {
  constructor() {
    // Character sets for different password types
    this.characterSets = {
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      numbers: '0123456789',
      symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
      ambiguous: 'il1Lo0O', // Characters that can be easily confused
      similar: 'il1Lo0O(){}[]|`~',
      // Special character sets
      symbolsBasic: '!@#$%^&*',
      symbolsExtended: '!@#$%^&*()_+-=[]{}|;:,.<>?~`',
    }

    // Default password generation options
    this.defaultOptions = {
      length: 16,
      includeLowercase: true,
      includeUppercase: true,
      includeNumbers: true,
      includeSymbols: true,
      excludeAmbiguous: true,
      excludeSimilar: false,
      customCharacters: '',
      excludeCharacters: '',
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
      enforceComplexity: true
    }

    // Diceware word list for passphrase generation (sample - full list would be larger)
    this.dicewareWords = [
      'able', 'about', 'account', 'acid', 'across', 'action', 'activity', 'actually',
      'add', 'address', 'administration', 'admit', 'adult', 'affect', 'after', 'again',
      'against', 'age', 'agency', 'agent', 'ago', 'agree', 'agreement', 'ahead',
      'air', 'all', 'allow', 'almost', 'alone', 'along', 'already', 'also',
      'although', 'always', 'among', 'amount', 'analysis', 'and', 'animal', 'another',
      'answer', 'any', 'anyone', 'anything', 'appear', 'apply', 'approach', 'area',
      'argue', 'arm', 'around', 'arrive', 'art', 'article', 'artist', 'ask'
    ]
  }

  /**
   * Generate a secure password with given options
   * @param {Object} options - Password generation options
   * @returns {Object} Generated password with metadata
   */
  generatePassword(options = {}) {
    try {
      // Merge with default options
      const opts = { ...this.defaultOptions, ...options }
      
      // Validate options
      this.validateOptions(opts)
      
      // Build character set
      const charset = this.buildCharacterSet(opts)
      
      if (charset.length === 0) {
        throw new Error('No valid characters available for password generation')
      }
      
      // Generate password
      let password = ''
      let attempts = 0
      const maxAttempts = 100
      
      do {
        password = this.generateRandomString(opts.length, charset)
        attempts++
        
        if (attempts > maxAttempts) {
          throw new Error('Failed to generate password meeting complexity requirements')
        }
      } while (opts.enforceComplexity && !this.validateComplexity(password, opts))
      
      // Calculate strength metrics
      const strength = this.calculatePasswordStrength(password, opts)
      
      return {
        password,
        strength,
        entropy: this.calculateEntropy(password, charset.length),
        charset: charset.length,
        options: opts,
        generated: new Date().toISOString()
      }
    } catch (error) {
      throw new Error(`Password generation failed: ${error.message}`)
    }
  }

  /**
   * Generate a passphrase using diceware method
   * @param {Object} options - Passphrase options
   * @returns {Object} Generated passphrase with metadata
   */
  generatePassphrase(options = {}) {
    try {
      const opts = {
        wordCount: 6,
        separator: '-',
        capitalize: false,
        includeNumber: false,
        includeSymbol: false,
        minLength: 0,
        maxLength: 100,
        ...options
      }

      if (opts.wordCount < 3 || opts.wordCount > 12) {
        throw new Error('Word count must be between 3 and 12')
      }

      const words = []
      
      // Generate random words
      for (let i = 0; i < opts.wordCount; i++) {
        const randomIndex = this.getSecureRandomInt(0, this.dicewareWords.length - 1)
        let word = this.dicewareWords[randomIndex]
        
        if (opts.capitalize) {
          word = word.charAt(0).toUpperCase() + word.slice(1)
        }
        
        words.push(word)
      }

      // Join words with separator
      let passphrase = words.join(opts.separator)
      
      // Add number if requested
      if (opts.includeNumber) {
        const number = this.getSecureRandomInt(0, 9999).toString().padStart(4, '0')
        passphrase += opts.separator + number
      }
      
      // Add symbol if requested
      if (opts.includeSymbol) {
        const symbols = '!@#$%^&*'
        const randomSymbol = symbols[this.getSecureRandomInt(0, symbols.length - 1)]
        passphrase += randomSymbol
      }

      // Check length constraints
      if (passphrase.length < opts.minLength || passphrase.length > opts.maxLength) {
        throw new Error(`Passphrase length ${passphrase.length} is outside acceptable range`)
      }

      // Calculate strength
      const strength = this.calculatePassphraseStrength(words.length, opts)

      return {
        passphrase,
        words,
        strength,
        entropy: this.calculatePassphraseEntropy(words.length),
        wordCount: words.length,
        options: opts,
        generated: new Date().toISOString()
      }
    } catch (error) {
      throw new Error(`Passphrase generation failed: ${error.message}`)
    }
  }

  /**
   * Generate multiple passwords at once
   * @param {number} count - Number of passwords to generate
   * @param {Object} options - Password generation options
   * @returns {Array} Array of generated passwords
   */
  generateBatch(count, options = {}) {
    if (count < 1 || count > 100) {
      throw new Error('Batch count must be between 1 and 100')
    }

    const passwords = []
    for (let i = 0; i < count; i++) {
      passwords.push(this.generatePassword(options))
    }

    return passwords
  }

  /**
   * Build character set based on options
   * @param {Object} opts - Password options
   * @returns {string} Character set string
   */
  buildCharacterSet(opts) {
    let charset = ''
    
    if (opts.includeLowercase) {
      charset += this.characterSets.lowercase
    }
    
    if (opts.includeUppercase) {
      charset += this.characterSets.uppercase
    }
    
    if (opts.includeNumbers) {
      charset += this.characterSets.numbers
    }
    
    if (opts.includeSymbols) {
      charset += this.characterSets.symbols
    }
    
    // Add custom characters
    if (opts.customCharacters) {
      charset += opts.customCharacters
    }
    
    // Remove excluded characters
    if (opts.excludeAmbiguous) {
      charset = this.removeCharacters(charset, this.characterSets.ambiguous)
    }
    
    if (opts.excludeSimilar) {
      charset = this.removeCharacters(charset, this.characterSets.similar)
    }
    
    if (opts.excludeCharacters) {
      charset = this.removeCharacters(charset, opts.excludeCharacters)
    }
    
    // Remove duplicates
    charset = [...new Set(charset)].join('')
    
    return charset
  }

  /**
   * Generate cryptographically secure random string
   * @param {number} length - Length of string to generate
   * @param {string} charset - Character set to use
   * @returns {string} Generated random string
   */
  generateRandomString(length, charset) {
    const randomBytes = crypto.randomBytes(length * 2) // Extra bytes for bias rejection
    let result = ''
    let byteIndex = 0
    
    while (result.length < length && byteIndex < randomBytes.length) {
      const byte = randomBytes[byteIndex]
      // Reject biased values to ensure uniform distribution
      if (byte < Math.floor(256 / charset.length) * charset.length) {
        result += charset[byte % charset.length]
      }
      byteIndex++
    }
    
    // If we need more bytes, generate them
    if (result.length < length) {
      const additionalBytes = crypto.randomBytes((length - result.length) * 2)
      let additionalIndex = 0
      
      while (result.length < length && additionalIndex < additionalBytes.length) {
        const byte = additionalBytes[additionalIndex]
        if (byte < Math.floor(256 / charset.length) * charset.length) {
          result += charset[byte % charset.length]
        }
        additionalIndex++
      }
    }
    
    return result
  }

  /**
   * Get secure random integer in range
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (inclusive)
   * @returns {number} Random integer
   */
  getSecureRandomInt(min, max) {
    const range = max - min + 1
    const bytesNeeded = Math.ceil(Math.log2(range) / 8)
    const maxValid = Math.floor(256 ** bytesNeeded / range) * range
    
    let randomValue
    do {
      const randomBytes = crypto.randomBytes(bytesNeeded)
      randomValue = randomBytes.reduce((acc, byte, index) => acc + byte * (256 ** index), 0)
    } while (randomValue >= maxValid)
    
    return min + (randomValue % range)
  }

  /**
   * Remove characters from string
   * @param {string} str - Source string
   * @param {string} toRemove - Characters to remove
   * @returns {string} String with characters removed
   */
  removeCharacters(str, toRemove) {
    return str.split('').filter(char => !toRemove.includes(char)).join('')
  }

  /**
   * Validate password generation options
   * @param {Object} opts - Options to validate
   * @throws {Error} If options are invalid
   */
  validateOptions(opts) {
    if (opts.length < 4 || opts.length > 128) {
      throw new Error('Password length must be between 4 and 128 characters')
    }

    if (!opts.includeLowercase && !opts.includeUppercase && !opts.includeNumbers && !opts.includeSymbols && !opts.customCharacters) {
      throw new Error('At least one character type must be included')
    }

    const totalMinimum = (opts.minLowercase || 0) + (opts.minUppercase || 0) + (opts.minNumbers || 0) + (opts.minSymbols || 0)
    if (totalMinimum > opts.length) {
      throw new Error('Sum of minimum character requirements exceeds password length')
    }
  }

  /**
   * Validate password complexity
   * @param {string} password - Password to validate
   * @param {Object} opts - Generation options
   * @returns {boolean} Whether password meets complexity requirements
   */
  validateComplexity(password, opts) {
    if (!opts.enforceComplexity) return true

    const counts = {
      lowercase: (password.match(/[a-z]/g) || []).length,
      uppercase: (password.match(/[A-Z]/g) || []).length,
      numbers: (password.match(/[0-9]/g) || []).length,
      symbols: (password.match(/[^a-zA-Z0-9]/g) || []).length
    }

    return counts.lowercase >= (opts.minLowercase || 0) &&
           counts.uppercase >= (opts.minUppercase || 0) &&
           counts.numbers >= (opts.minNumbers || 0) &&
           counts.symbols >= (opts.minSymbols || 0)
  }

  /**
   * Calculate password strength score
   * @param {string} password - Password to analyze
   * @param {Object} opts - Generation options
   * @returns {Object} Strength analysis
   */
  calculatePasswordStrength(password, opts) {
    const length = password.length
    const charset = this.buildCharacterSet(opts).length
    const entropy = this.calculateEntropy(password, charset)
    
    let score = 0
    let feedback = []
    
    // Length scoring
    if (length >= 16) score += 25
    else if (length >= 12) score += 20
    else if (length >= 8) score += 15
    else if (length >= 6) score += 10
    else score += 5
    
    // Character variety scoring
    if (charset >= 95) score += 25
    else if (charset >= 70) score += 20
    else if (charset >= 50) score += 15
    else if (charset >= 30) score += 10
    else score += 5
    
    // Entropy scoring
    if (entropy >= 80) score += 25
    else if (entropy >= 60) score += 20
    else if (entropy >= 40) score += 15
    else if (entropy >= 25) score += 10
    else score += 5
    
    // Pattern detection (basic)
    const hasRepeats = /(.)\1{2,}/.test(password)
    const hasSequence = this.hasSequentialChars(password)
    
    if (hasRepeats) {
      score -= 10
      feedback.push('Contains repeated characters')
    }
    
    if (hasSequence) {
      score -= 10
      feedback.push('Contains sequential characters')
    }
    
    // Determine strength level
    let level = 'Very Weak'
    if (score >= 85) level = 'Very Strong'
    else if (score >= 70) level = 'Strong'
    else if (score >= 50) level = 'Moderate'
    else if (score >= 30) level = 'Weak'
    
    return {
      score: Math.max(0, Math.min(100, score)),
      level,
      entropy,
      feedback,
      timeToCrack: this.calculateTimeToCrack(entropy)
    }
  }

  /**
   * Calculate entropy of password
   * @param {string} password - Password to analyze
   * @param {number} charsetSize - Size of character set
   * @returns {number} Entropy in bits
   */
  calculateEntropy(password, charsetSize) {
    return password.length * Math.log2(charsetSize)
  }

  /**
   * Calculate passphrase entropy
   * @param {number} wordCount - Number of words
   * @returns {number} Entropy in bits
   */
  calculatePassphraseEntropy(wordCount) {
    // Assuming 7776 words in full diceware list
    const dicewareWords = 7776
    return wordCount * Math.log2(dicewareWords)
  }

  /**
   * Calculate passphrase strength
   * @param {number} wordCount - Number of words
   * @param {Object} opts - Generation options
   * @returns {Object} Strength analysis
   */
  calculatePassphraseStrength(wordCount, opts) {
    const entropy = this.calculatePassphraseEntropy(wordCount)
    
    let score = 0
    let feedback = []
    
    // Word count scoring
    if (wordCount >= 8) score += 30
    else if (wordCount >= 6) score += 25
    else if (wordCount >= 5) score += 20
    else if (wordCount >= 4) score += 15
    else score += 10
    
    // Entropy scoring
    if (entropy >= 80) score += 30
    else if (entropy >= 60) score += 25
    else if (entropy >= 40) score += 20
    else score += 15
    
    // Additional features
    if (opts.includeNumber) {
      score += 10
      feedback.push('Includes numbers')
    }
    
    if (opts.includeSymbol) {
      score += 10
      feedback.push('Includes symbols')
    }
    
    if (opts.capitalize) {
      score += 5
      feedback.push('Capitalized words')
    }
    
    let level = 'Weak'
    if (score >= 75) level = 'Very Strong'
    else if (score >= 60) level = 'Strong'
    else if (score >= 45) level = 'Moderate'
    
    return {
      score: Math.max(0, Math.min(100, score)),
      level,
      entropy,
      feedback,
      timeToCrack: this.calculateTimeToCrack(entropy)
    }
  }

  /**
   * Calculate time to crack password
   * @param {number} entropy - Password entropy in bits
   * @returns {string} Human-readable time estimate
   */
  calculateTimeToCrack(entropy) {
    // Assuming 1 trillion guesses per second (modern GPU)
    const guessesPerSecond = 1e12
    const totalCombinations = Math.pow(2, entropy)
    const averageTime = totalCombinations / (2 * guessesPerSecond)
    
    return this.formatTime(averageTime)
  }

  /**
   * Format time in human-readable format
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time string
   */
  formatTime(seconds) {
    if (seconds < 1) return 'Instant'
    if (seconds < 60) return `${Math.round(seconds)} seconds`
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`
    if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`
    if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`
    if (seconds < 31536000000) return `${Math.round(seconds / 31536000)} years`
    return 'Centuries'
  }

  /**
   * Check for sequential characters
   * @param {string} password - Password to check
   * @returns {boolean} Whether password contains sequences
   */
  hasSequentialChars(password) {
    for (let i = 0; i < password.length - 2; i++) {
      const char1 = password.charCodeAt(i)
      const char2 = password.charCodeAt(i + 1)
      const char3 = password.charCodeAt(i + 2)
      
      if (char2 === char1 + 1 && char3 === char2 + 1) {
        return true
      }
    }
    return false
  }

  /**
   * Get available character sets
   * @returns {Object} Available character sets
   */
  getCharacterSets() {
    return { ...this.characterSets }
  }

  /**
   * Get default options
   * @returns {Object} Default generation options
   */
  getDefaultOptions() {
    return { ...this.defaultOptions }
  }

  /**
   * Get character types present in a password
   * @param {string} password - Password to analyze
   * @returns {number} Number of different character types
   */
  getCharacterTypes(password) {
    let types = 0
    if (/[a-z]/.test(password)) types++
    if (/[A-Z]/.test(password)) types++
    if (/[0-9]/.test(password)) types++
    if (/[^a-zA-Z0-9]/.test(password)) types++
    return types
  }

  /**
   * Detect patterns in password
   * @param {string} password - Password to analyze
   * @returns {Array} Array of detected patterns
   */
  detectPatterns(password) {
    const patterns = []
    
    // Check for repeated characters
    if (/(.)\1{2,}/.test(password)) {
      patterns.push('repeated_characters')
    }
    
    // Check for sequential characters
    if (this.hasSequentialChars(password)) {
      patterns.push('sequential_characters')
    }
    
    // Check for common dictionary words
    if (this.hasCommonWords(password)) {
      patterns.push('dictionary_words')
    }
    
    // Check for keyboard patterns
    if (this.hasKeyboardPatterns(password)) {
      patterns.push('keyboard_patterns')
    }
    
    // Check for date patterns
    if (this.hasDatePatterns(password)) {
      patterns.push('date_patterns')
    }
    
    return patterns
  }

  /**
   * Check for common words in password
   * @param {string} password - Password to check
   * @returns {boolean} Whether password contains common words
   */
  hasCommonWords(password) {
    const commonWords = [
      'password', 'admin', 'user', 'login', 'welcome', 'secret', 'master',
      'qwerty', 'asdfgh', 'zxcvbn', '123456', 'abcdef', 'letmein',
      'monkey', 'shadow', 'sunshine', 'princess', 'dragon', 'football',
      'baseball', 'superman', 'batman', 'computer', 'internet'
    ]
    
    const lowerPassword = password.toLowerCase()
    return commonWords.some(word => lowerPassword.includes(word))
  }

  /**
   * Check for keyboard patterns
   * @param {string} password - Password to check
   * @returns {boolean} Whether password contains keyboard patterns
   */
  hasKeyboardPatterns(password) {
    const keyboardPatterns = [
      'qwerty', 'asdfgh', 'zxcvbn', '123456', '654321',
      'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
      'abcdef', 'fedcba', '987654'
    ]
    
    const lowerPassword = password.toLowerCase()
    return keyboardPatterns.some(pattern => 
      lowerPassword.includes(pattern) || 
      lowerPassword.includes(pattern.split('').reverse().join(''))
    )
  }

  /**
   * Check for date patterns
   * @param {string} password - Password to check
   * @returns {boolean} Whether password contains date patterns
   */
  hasDatePatterns(password) {
    // Check for common date patterns
    const datePatterns = [
      /\d{4}/, // year
      /\d{2}\d{2}/, // mmdd, ddmm, etc.
      /\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/, // date formats
      /19\d{2}/, // 19xx years
      /20\d{2}/, // 20xx years
    ]
    
    return datePatterns.some(pattern => pattern.test(password))
  }
}

module.exports = PasswordGenerator
