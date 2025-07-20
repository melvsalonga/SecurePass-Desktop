/**
 * Accessibility Manager - WCAG 2.1 AA Compliance
 * Manages keyboard navigation, ARIA labels, and screen reader support
 */

class AccessibilityManager {
  constructor() {
    this.focusStack = [];
    this.announcements = [];
    this.keyboardTrapActive = false;
    this.highContrastMode = false;
    this.reducedMotionMode = false;
    this.screenReaderMode = false;
    
    this.init();
  }

  /**
   * Initialize accessibility features
   */
  init() {
    this.setupKeyboardNavigation();
    this.setupAriaLiveRegion();
    this.setupFocusManagement();
    this.setupPreferenceDetection();
    this.setupShortcuts();
    this.addAccessibilityStyles();
  }

  /**
   * Setup keyboard navigation for the current page
   */
  setupKeyboardNavigation() {
    // Tab order management
    this.manageFocusOrder();
    
    // Skip links for main content
    this.addSkipLinks();
    
    // Custom keyboard handlers for interactive elements
    this.setupCustomKeyHandlers();
    
    // Focus visible indicators
    this.enhanceFocusIndicators();
  }

  /**
   * Manage focus order and tab navigation
   */
  manageFocusOrder() {
    const interactiveElements = this.getInteractiveElements();
    
    interactiveElements.forEach((element, index) => {
      // Ensure proper tab index
      if (!element.hasAttribute('tabindex') && !this.isNaturallyFocusable(element)) {
        element.setAttribute('tabindex', '0');
      }
      
      // Add keyboard event handlers
      element.addEventListener('keydown', (e) => this.handleElementKeydown(e, element));
    });
  }

  /**
   * Get all interactive elements on the page
   */
  getInteractiveElements() {
    const selectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="link"]',
      '[role="menuitem"]',
      '[role="option"]'
    ].join(', ');
    
    return Array.from(document.querySelectorAll(selectors));
  }

  /**
   * Check if element is naturally focusable
   */
  isNaturallyFocusable(element) {
    const focusableElements = ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'A'];
    return focusableElements.includes(element.tagName) || 
           element.hasAttribute('href') || 
           element.hasAttribute('contenteditable');
  }

  /**
   * Add skip links for better navigation
   */
  addSkipLinks() {
    const skipLinks = document.createElement('div');
    skipLinks.className = 'skip-links';
    skipLinks.setAttribute('aria-label', 'Skip navigation links');
    
    const mainContent = document.querySelector('main') || document.querySelector('.app-main');
    const nav = document.querySelector('nav') || document.querySelector('.app-nav');
    
    let skipLinksHTML = '';
    
    if (mainContent) {
      if (!mainContent.id) mainContent.id = 'main-content';
      skipLinksHTML += `<a href="#main-content" class="skip-link">Skip to main content</a>`;
    }
    
    if (nav) {
      if (!nav.id) nav.id = 'navigation';
      skipLinksHTML += `<a href="#navigation" class="skip-link">Skip to navigation</a>`;
    }
    
    skipLinks.innerHTML = skipLinksHTML;
    document.body.insertBefore(skipLinks, document.body.firstChild);
  }

  /**
   * Setup custom keyboard handlers for interactive elements
   */
  setupCustomKeyHandlers() {
    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Escape':
          this.handleEscapeKey(e);
          break;
        case 'Enter':
        case ' ':
          this.handleActivationKey(e);
          break;
        case 'Tab':
          this.handleTabKey(e);
          break;
        case 'ArrowDown':
        case 'ArrowUp':
        case 'ArrowLeft':
        case 'ArrowRight':
          this.handleArrowKeys(e);
          break;
      }
    });
  }

  /**
   * Handle escape key press
   */
  handleEscapeKey(e) {
    // Close modals
    const openModal = document.querySelector('.modal[style*="block"]');
    if (openModal) {
      const closeButton = openModal.querySelector('[id*="close"]');
      if (closeButton) closeButton.click();
      e.preventDefault();
      return;
    }
    
    // Clear search/filter fields
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.type === 'search' || activeElement.type === 'text')) {
      if (activeElement.value) {
        activeElement.value = '';
        activeElement.dispatchEvent(new Event('input'));
        e.preventDefault();
      }
    }
  }

  /**
   * Handle activation keys (Enter/Space)
   */
  handleActivationKey(e) {
    const element = e.target;
    
    // Handle custom buttons (divs with button role)
    if (element.getAttribute('role') === 'button' && element.tagName !== 'BUTTON') {
      element.click();
      e.preventDefault();
    }
    
    // Handle checkboxes with space
    if (e.key === ' ' && element.type === 'checkbox') {
      // Let default behavior handle this
      return;
    }
    
    // Handle other custom interactive elements
    if (e.key === 'Enter' && element.hasAttribute('data-action')) {
      element.click();
      e.preventDefault();
    }
  }

  /**
   * Handle tab key navigation
   */
  handleTabKey(e) {
    if (this.keyboardTrapActive) {
      const trapContainer = document.querySelector('.keyboard-trap-active');
      if (trapContainer) {
        this.trapFocusInContainer(e, trapContainer);
      }
    }
  }

  /**
   * Handle arrow key navigation for specific components
   */
  handleArrowKeys(e) {
    const element = e.target;
    
    // Handle dropdown/select-like custom components
    if (element.getAttribute('role') === 'listbox' || 
        element.getAttribute('role') === 'menu') {
      this.handleArrowNavigation(e, element);
    }
    
    // Handle tab-like navigation
    if (element.getAttribute('role') === 'tab') {
      this.handleTabNavigation(e, element);
    }
  }

  /**
   * Enhance focus indicators for better visibility
   */
  enhanceFocusIndicators() {
    const style = document.createElement('style');
    style.innerHTML = `
      /* Enhanced focus indicators for accessibility */
      *:focus {
        outline: 2px solid var(--focus-color, #007cba) !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 4px rgba(0, 124, 186, 0.3) !important;
      }
      
      /* High contrast focus for buttons */
      button:focus,
      .btn:focus,
      [role="button"]:focus {
        background-color: var(--focus-bg, #e6f3ff) !important;
        color: var(--focus-text, #001f3f) !important;
        border: 2px solid var(--focus-color, #007cba) !important;
      }
      
      /* Focus for form elements */
      input:focus,
      select:focus,
      textarea:focus {
        border: 2px solid var(--focus-color, #007cba) !important;
        background-color: var(--focus-bg, #f0f8ff) !important;
      }
      
      /* Skip links styling */
      .skip-links {
        position: absolute;
        top: -100px;
        left: 0;
        z-index: 10000;
      }
      
      .skip-link {
        position: absolute;
        left: -10000px;
        top: auto;
        width: 1px;
        height: 1px;
        overflow: hidden;
        background: var(--focus-color, #007cba);
        color: white;
        padding: 8px 16px;
        text-decoration: none;
        font-weight: bold;
        border-radius: 0 0 4px 0;
      }
      
      .skip-link:focus {
        position: static;
        left: auto;
        width: auto;
        height: auto;
        overflow: visible;
        outline: 2px solid white;
        outline-offset: 2px;
      }
      
      /* High contrast mode support */
      @media (prefers-contrast: high) {
        *:focus {
          outline: 3px solid HighlightText !important;
          background-color: Highlight !important;
          color: HighlightText !important;
        }
      }
      
      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Setup ARIA live region for announcements
   */
  setupAriaLiveRegion() {
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('id', 'accessibility-announcements');
    liveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      top: auto;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(liveRegion);
    
    this.liveRegion = liveRegion;
  }

  /**
   * Announce message to screen readers
   */
  announce(message, priority = 'polite') {
    if (!this.liveRegion) return;
    
    // Clear previous announcement
    this.liveRegion.textContent = '';
    
    // Set priority
    this.liveRegion.setAttribute('aria-live', priority);
    
    // Add announcement after short delay to ensure it's read
    setTimeout(() => {
      this.liveRegion.textContent = message;
    }, 100);
    
    // Clear after announcement
    setTimeout(() => {
      this.liveRegion.textContent = '';
    }, 5000);
  }

  /**
   * Setup focus management
   */
  setupFocusManagement() {
    // Store initial focus for restoration
    document.addEventListener('focusin', (e) => {
      if (!e.target.closest('.modal')) {
        this.lastFocusedElement = e.target;
      }
    });
    
    // Handle modal focus trapping
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const modal = document.querySelector('.modal[style*="block"]');
        if (modal) {
          this.trapFocusInModal(e, modal);
        }
      }
    });
  }

  /**
   * Trap focus within modal
   */
  trapFocusInModal(e, modal) {
    const focusableElements = modal.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  }

  /**
   * Setup preference detection for accessibility needs
   */
  setupPreferenceDetection() {
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.reducedMotionMode = true;
      document.body.classList.add('reduced-motion');
    }
    
    // Check for high contrast preference
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      this.highContrastMode = true;
      document.body.classList.add('high-contrast');
    }
    
    // Detect potential screen reader usage
    this.detectScreenReader();
  }

  /**
   * Detect screen reader usage (heuristic)
   */
  detectScreenReader() {
    // Check for common screen reader indicators
    if (navigator.userAgent.includes('JAWS') || 
        navigator.userAgent.includes('NVDA') || 
        navigator.userAgent.includes('VoiceOver') ||
        window.speechSynthesis) {
      this.screenReaderMode = true;
      document.body.classList.add('screen-reader-detected');
    }
  }

  /**
   * Setup accessibility-specific keyboard shortcuts
   */
  setupShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Alt + M: Skip to main content
      if (e.altKey && e.key.toLowerCase() === 'm') {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.focus();
          this.announce('Jumped to main content');
          e.preventDefault();
        }
      }
      
      // Alt + N: Skip to navigation
      if (e.altKey && e.key.toLowerCase() === 'n') {
        const navigation = document.getElementById('navigation');
        if (navigation) {
          navigation.focus();
          this.announce('Jumped to navigation');
          e.preventDefault();
        }
      }
      
      // Alt + H: Go to page heading
      if (e.altKey && e.key.toLowerCase() === 'h') {
        const heading = document.querySelector('h1, h2');
        if (heading) {
          heading.focus();
          this.announce(`Jumped to heading: ${heading.textContent}`);
          e.preventDefault();
        }
      }
    });
  }

  /**
   * Add comprehensive ARIA labels to page elements
   */
  addAriaLabels() {
    // Form elements
    this.labelFormElements();
    
    // Buttons and interactive elements
    this.labelInteractiveElements();
    
    // Navigation elements
    this.labelNavigationElements();
    
    // Status and informational elements
    this.labelStatusElements();
  }

  /**
   * Label form elements with proper descriptions
   */
  labelFormElements() {
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (!input.hasAttribute('aria-label') && !input.hasAttribute('aria-labelledby')) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (!label && input.placeholder) {
          input.setAttribute('aria-label', input.placeholder);
        }
        
        // Add descriptions for password fields
        if (input.type === 'password') {
          if (!input.hasAttribute('aria-describedby')) {
            const description = 'Enter your secure password';
            input.setAttribute('aria-label', 
              input.getAttribute('aria-label') || description);
          }
        }
        
        // Add required field indicators
        if (input.required && !input.hasAttribute('aria-required')) {
          input.setAttribute('aria-required', 'true');
        }
      }
    });
  }

  /**
   * Label interactive elements
   */
  labelInteractiveElements() {
    // Buttons without accessible names
    const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
    buttons.forEach(button => {
      if (!button.textContent.trim()) {
        // Icon buttons need labels
        if (button.innerHTML.includes('📋')) {
          button.setAttribute('aria-label', 'Copy to clipboard');
        } else if (button.innerHTML.includes('👁️')) {
          button.setAttribute('aria-label', 'Toggle password visibility');
        } else if (button.innerHTML.includes('✕')) {
          button.setAttribute('aria-label', 'Close');
        }
      }
    });
    
    // Links
    const links = document.querySelectorAll('a:not([aria-label]):not([aria-labelledby])');
    links.forEach(link => {
      if (!link.textContent.trim() && link.title) {
        link.setAttribute('aria-label', link.title);
      }
    });
  }

  /**
   * Label navigation elements
   */
  labelNavigationElements() {
    const nav = document.querySelector('nav');
    if (nav && !nav.hasAttribute('aria-label')) {
      nav.setAttribute('aria-label', 'Main navigation');
    }
    
    // Breadcrumbs
    const breadcrumbs = document.querySelector('.breadcrumbs');
    if (breadcrumbs && !breadcrumbs.hasAttribute('aria-label')) {
      breadcrumbs.setAttribute('aria-label', 'Breadcrumb navigation');
    }
  }

  /**
   * Label status and informational elements
   */
  labelStatusElements() {
    // Status indicators
    const statusElements = document.querySelectorAll('.status-value, .stat-number');
    statusElements.forEach(status => {
      if (!status.hasAttribute('aria-live')) {
        status.setAttribute('aria-live', 'polite');
      }
    });
    
    // Progress bars
    const progressBars = document.querySelectorAll('.strength-bar, .progress-bar');
    progressBars.forEach(bar => {
      if (!bar.hasAttribute('role')) {
        bar.setAttribute('role', 'progressbar');
        bar.setAttribute('aria-valuemin', '0');
        bar.setAttribute('aria-valuemax', '100');
      }
    });
  }

  /**
   * Add accessibility styles and CSS custom properties
   */
  addAccessibilityStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
      :root {
        --focus-color: #007cba;
        --focus-bg: #e6f3ff;
        --focus-text: #001f3f;
      }
      
      /* Screen reader only text */
      .sr-only {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }
      
      /* Screen reader only text that becomes visible on focus */
      .sr-only-focusable:focus {
        position: static !important;
        width: auto !important;
        height: auto !important;
        padding: 0.25rem 0.5rem !important;
        margin: 0 !important;
        overflow: visible !important;
        clip: auto !important;
        white-space: normal !important;
        background: var(--focus-color);
        color: white;
      }
      
      /* Ensure sufficient color contrast */
      .high-contrast button,
      .high-contrast .btn {
        border: 2px solid currentColor !important;
      }
      
      .high-contrast input,
      .high-contrast select,
      .high-contrast textarea {
        border: 2px solid currentColor !important;
        background: transparent !important;
      }
      
      /* Reduced motion animations */
      .reduced-motion * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
      
      /* Focus management for modals */
      .modal[aria-hidden="true"] {
        display: none !important;
      }
      
      .modal[aria-hidden="false"] {
        display: block !important;
      }
      
      /* Keyboard navigation helper */
      .keyboard-navigation-active *:focus {
        outline: 3px solid var(--focus-color) !important;
        outline-offset: 2px !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Handle element-specific keyboard interactions
   */
  handleElementKeydown(e, element) {
    const role = element.getAttribute('role');
    const tagName = element.tagName.toLowerCase();
    
    // Custom handling for different element types
    switch (role || tagName) {
      case 'button':
        if (e.key === 'Enter' || e.key === ' ') {
          element.click();
          e.preventDefault();
        }
        break;
      case 'tab':
        this.handleTabKeydown(e, element);
        break;
      case 'menuitem':
        this.handleMenuItemKeydown(e, element);
        break;
    }
  }

  /**
   * Initialize accessibility for current page
   */
  initPageAccessibility() {
    // Add ARIA labels
    this.addAriaLabels();
    
    // Set up page-specific keyboard navigation
    this.setupPageSpecificNavigation();
    
    // Announce page loaded
    setTimeout(() => {
      const pageTitle = document.title || 'Page loaded';
      this.announce(pageTitle + ' loaded');
    }, 1000);
  }

  /**
   * Setup page-specific navigation based on current page
   */
  setupPageSpecificNavigation() {
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    
    switch (currentPage) {
      case 'generator':
        this.setupGeneratorAccessibility();
        break;
      case 'vault':
        this.setupVaultAccessibility();
        break;
      case 'settings':
        this.setupSettingsAccessibility();
        break;
    }
  }

  /**
   * Setup accessibility for password generator page
   */
  setupGeneratorAccessibility() {
    // Label strength meter
    const strengthMeter = document.querySelector('.strength-bar');
    if (strengthMeter) {
      strengthMeter.setAttribute('role', 'progressbar');
      strengthMeter.setAttribute('aria-label', 'Password strength');
      strengthMeter.setAttribute('aria-valuemin', '0');
      strengthMeter.setAttribute('aria-valuemax', '5');
    }
    
    // Enhanced slider labels
    const lengthSlider = document.getElementById('password-length');
    if (lengthSlider) {
      lengthSlider.setAttribute('aria-label', 'Password length');
      lengthSlider.addEventListener('input', () => {
        this.announce(`Password length set to ${lengthSlider.value} characters`);
      });
    }
  }

  /**
   * Setup accessibility for vault page
   */
  setupVaultAccessibility() {
    // Label search field
    const searchField = document.getElementById('search-passwords');
    if (searchField) {
      searchField.setAttribute('aria-label', 'Search passwords');
      searchField.setAttribute('aria-describedby', 'search-help');
      
      // Add search help text
      if (!document.getElementById('search-help')) {
        const helpText = document.createElement('div');
        helpText.id = 'search-help';
        helpText.className = 'sr-only';
        helpText.textContent = 'Search by title, username, or category';
        searchField.parentNode.appendChild(helpText);
      }
    }
    
    // Label password entries list
    const entriesList = document.getElementById('vault-entries');
    if (entriesList) {
      entriesList.setAttribute('role', 'list');
      entriesList.setAttribute('aria-label', 'Password entries');
    }
  }

  /**
   * Setup accessibility for settings page
   */
  setupSettingsAccessibility() {
    // Group related settings
    const settingsGroups = document.querySelectorAll('.settings-group, .form-section');
    settingsGroups.forEach((group, index) => {
      group.setAttribute('role', 'group');
      const heading = group.querySelector('h3, h4');
      if (heading) {
        if (!heading.id) heading.id = `settings-group-${index}`;
        group.setAttribute('aria-labelledby', heading.id);
      }
    });
  }

  /**
   * Get accessibility status report
   */
  getAccessibilityStatus() {
    const report = {
      elementsWithoutLabels: [],
      missingAltText: [],
      lowContrastElements: [],
      keyboardInaccessible: [],
      missingHeadings: false,
      missingLandmarks: false
    };
    
    // Check for elements without proper labels
    const unlabeledInputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
    unlabeledInputs.forEach(input => {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (!label) {
        report.elementsWithoutLabels.push(input);
      }
    });
    
    // Check for images without alt text
    const images = document.querySelectorAll('img:not([alt])');
    report.missingAltText = Array.from(images);
    
    // Check for proper heading structure
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
      report.missingHeadings = true;
    }
    
    // Check for landmarks
    const landmarks = document.querySelectorAll('main, nav, header, footer, aside, section[aria-label]');
    if (landmarks.length === 0) {
      report.missingLandmarks = true;
    }
    
    return report;
  }
}

// Initialize accessibility manager when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.accessibilityManager = new AccessibilityManager();
    window.accessibilityManager.initPageAccessibility();
  });
} else {
  window.accessibilityManager = new AccessibilityManager();
  window.accessibilityManager.initPageAccessibility();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AccessibilityManager;
}
