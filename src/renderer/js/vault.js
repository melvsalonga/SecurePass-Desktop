/**
 * Password Vault UI Controller
 * Handles all vault operations including CRUD, search, and modal management
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const notification = document.getElementById('notification');
  const searchInput = document.getElementById('search-passwords');
  const categoryFilter = document.getElementById('category-filter');
  const sortOptions = document.getElementById('sort-options');
  const clearSearchBtn = document.getElementById('clear-search');
  const vaultEntries = document.getElementById('vault-entries');
  const emptyState = document.getElementById('empty-state');
  const totalEntriesCount = document.getElementById('total-entries');
  const categoriesCount = document.getElementById('categories-count');
  const weakPasswordsCount = document.getElementById('weak-passwords');
  
  // Modal Elements
  const passwordModal = document.getElementById('password-modal');
  const modalTitle = document.getElementById('modal-title');
  const passwordForm = document.getElementById('password-form');
  const closeModalBtn = document.getElementById('close-modal');
  const cancelEntryBtn = document.getElementById('cancel-entry');
  
  // Form Elements
  const entryTitle = document.getElementById('entry-title');
  const entryUsername = document.getElementById('entry-username');
  const entryPassword = document.getElementById('entry-password');
  const entryUrl = document.getElementById('entry-url');
  const entryCategory = document.getElementById('entry-category');
  const entryTags = document.getElementById('entry-tags');
  const entryNotes = document.getElementById('entry-notes');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const generatePasswordBtn = document.getElementById('generate-new-password');
  
  // State Management
  let currentPasswords = [];
  let filteredPasswords = [];
  let currentEditingId = null;
  let searchTimeout = null;
  
  // Utility Functions
  function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }
  
  function formatDate(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  function getStrengthClass(strength) {
    if (strength >= 4) return 'very-strong';
    if (strength >= 3) return 'strong';
    if (strength >= 2) return 'moderate';
    if (strength >= 1) return 'weak';
    return 'very-weak';
  }
  
  function getStrengthText(strength) {
    if (strength >= 4) return 'Very Strong';
    if (strength >= 3) return 'Strong';
    if (strength >= 2) return 'Moderate';
    if (strength >= 1) return 'Weak';
    return 'Very Weak';
  }
  
  function copyToClipboard(text, itemType = 'text') {
    navigator.clipboard.writeText(text).then(() => {
      showNotification(`${itemType} copied to clipboard!`, 'success');
    }).catch(() => {
      showNotification(`Failed to copy ${itemType}`, 'error');
    });
  }
  
  // Modal Management
  function openModal(mode = 'add', passwordEntry = null) {
    currentEditingId = passwordEntry ? passwordEntry.id : null;
    modalTitle.textContent = mode === 'add' ? 'Add Password' : 'Edit Password';
    
    // Reset form
    passwordForm.reset();
    togglePasswordBtn.setAttribute('aria-pressed', 'false');
    entryPassword.type = 'password';
    togglePasswordBtn.textContent = '👁️';
    
    // Populate form for editing
    if (passwordEntry) {
      entryTitle.value = passwordEntry.title || '';
      entryUsername.value = passwordEntry.username || '';
      entryPassword.value = passwordEntry.password || '';
      entryUrl.value = passwordEntry.url || '';
      entryCategory.value = passwordEntry.category || '';
      entryTags.value = passwordEntry.tags ? passwordEntry.tags.join(', ') : '';
      entryNotes.value = passwordEntry.notes || '';
    }
    
    passwordModal.style.display = 'block';
    passwordModal.setAttribute('aria-hidden', 'false');
    entryTitle.focus();
    
    // Announce to screen readers
    if (window.accessibilityManager) {
      window.accessibilityManager.announce(mode === 'add' ? 'Add password dialog opened' : 'Edit password dialog opened');
    }
  }
  
  function closeModal() {
    passwordModal.style.display = 'none';
    passwordModal.setAttribute('aria-hidden', 'true');
    currentEditingId = null;
    
    // Announce to screen readers
    if (window.accessibilityManager) {
      window.accessibilityManager.announce('Password dialog closed');
    }
  }
  
  // Password Management Functions
  async function loadPasswords() {
    try {
      const result = await window.electronAPI.getPasswords();
      if (result.success) {
        currentPasswords = result.data || [];
        applyFilters();
        updateStatistics();
        await loadCategories();
      } else {
        showNotification('Failed to load passwords', 'error');
      }
    } catch (error) {
      console.error('Error loading passwords:', error);
      showNotification('Error loading passwords', 'error');
    }
  }
  
  async function savePassword() {
    const passwordData = {
      title: entryTitle.value.trim(),
      username: entryUsername.value.trim(),
      password: entryPassword.value,
      url: entryUrl.value.trim(),
      category: entryCategory.value.trim(),
      tags: entryTags.value.split(',').map(tag => tag.trim()).filter(tag => tag),
      notes: entryNotes.value.trim()
    };
    
    // Validation
    if (!passwordData.title) {
      showNotification('Title is required', 'error');
      entryTitle.focus();
      return false;
    }
    
    if (!passwordData.password) {
      showNotification('Password is required', 'error');
      entryPassword.focus();
      return false;
    }
    
    try {
      let result;
      if (currentEditingId) {
        result = await window.electronAPI.updatePassword(currentEditingId, passwordData);
        if (result.success) {
          showNotification('Password updated successfully!', 'success');
        }
      } else {
        result = await window.electronAPI.addPassword(passwordData);
        if (result.success) {
          showNotification('Password added successfully!', 'success');
        }
      }
      
      if (result.success) {
        closeModal();
        await loadPasswords();
        return true;
      } else {
        showNotification(result.error || 'Failed to save password', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error saving password:', error);
      showNotification('Error saving password', 'error');
      return false;
    }
  }
  
  async function deletePassword(id, title) {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const result = await window.electronAPI.deletePassword(id);
      if (result.success) {
        showNotification('Password deleted successfully!', 'success');
        await loadPasswords();
      } else {
        showNotification(result.error || 'Failed to delete password', 'error');
      }
    } catch (error) {
      console.error('Error deleting password:', error);
      showNotification('Error deleting password', 'error');
    }
  }
  
  // UI Rendering Functions
  function renderPasswordEntry(entry) {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'vault-entry';
    entryDiv.setAttribute('role', 'listitem');
    entryDiv.setAttribute('data-id', entry.id);
    
    const strength = entry.strength || 0;
    const strengthClass = getStrengthClass(strength);
    const strengthText = getStrengthText(strength);
    
    entryDiv.innerHTML = `
      <div class="entry-header">
        <div class="entry-info">
          <h3 class="entry-title">${escapeHtml(entry.title)}</h3>
          <div class="entry-meta">
            <span class="entry-username">${escapeHtml(entry.username || 'No username')}</span>
            ${entry.url ? `<span class="entry-url">${escapeHtml(entry.url)}</span>` : ''}
          </div>
        </div>
        <div class="entry-actions">
          <button class="btn btn-icon copy-username" title="Copy Username" aria-label="Copy username">
            👤
          </button>
          <button class="btn btn-icon copy-password" title="Copy Password" aria-label="Copy password">
            📋
          </button>
          <button class="btn btn-icon edit-entry" title="Edit Entry" aria-label="Edit password entry">
            ✏️
          </button>
          <button class="btn btn-icon delete-entry" title="Delete Entry" aria-label="Delete password entry">
            🗑️
          </button>
        </div>
      </div>
      <div class="entry-details">
        <div class="entry-strength">
          <span class="strength-label">Strength:</span>
          <span class="strength-indicator ${strengthClass}">${strengthText}</span>
        </div>
        ${entry.category ? `<div class="entry-category"><span class="category-badge">${escapeHtml(entry.category)}</span></div>` : ''}
        ${entry.tags && entry.tags.length ? `<div class="entry-tags">${entry.tags.map(tag => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        <div class="entry-dates">
          <small>Created: ${formatDate(entry.created_at)}</small>
          ${entry.updated_at !== entry.created_at ? `<small>Updated: ${formatDate(entry.updated_at)}</small>` : ''}
        </div>
      </div>
    `;
    
    // Add event listeners
    entryDiv.querySelector('.copy-username').addEventListener('click', (e) => {
      e.stopPropagation();
      copyToClipboard(entry.username || '', 'Username');
    });
    
    entryDiv.querySelector('.copy-password').addEventListener('click', (e) => {
      e.stopPropagation();
      copyToClipboard(entry.password || '', 'Password');
    });
    
    entryDiv.querySelector('.edit-entry').addEventListener('click', (e) => {
      e.stopPropagation();
      openModal('edit', entry);
    });
    
    entryDiv.querySelector('.delete-entry').addEventListener('click', (e) => {
      e.stopPropagation();
      deletePassword(entry.id, entry.title);
    });
    
    return entryDiv;
  }
  
  function renderPasswordList() {
    vaultEntries.innerHTML = '';
    
    if (filteredPasswords.length === 0) {
      if (currentPasswords.length === 0) {
        emptyState.style.display = 'block';
        vaultEntries.style.display = 'none';
      } else {
        vaultEntries.style.display = 'block';
        emptyState.style.display = 'none';
        vaultEntries.innerHTML = `
          <div class="no-results">
            <div class="no-results-icon">🔍</div>
            <h3>No passwords found</h3>
            <p>Try adjusting your search criteria or filters.</p>
          </div>
        `;
      }
      return;
    }
    
    emptyState.style.display = 'none';
    vaultEntries.style.display = 'block';
    
    filteredPasswords.forEach(entry => {
      vaultEntries.appendChild(renderPasswordEntry(entry));
    });
    
    // Announce results to screen readers
    if (window.accessibilityManager) {
      window.accessibilityManager.announce(`${filteredPasswords.length} password entries displayed`);
    }
  }
  
  async function loadCategories() {
    try {
      const result = await window.electronAPI.getPasswordCategories();
      if (result.success) {
        const categories = result.data || [];
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        categories.forEach(category => {
          const option = document.createElement('option');
          option.value = category;
          option.textContent = category;
          categoryFilter.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }
  
  async function updateStatistics() {
    try {
      const statsResult = await window.electronAPI.getPasswordStatistics();
      if (statsResult.success) {
        const stats = statsResult.data;
        totalEntriesCount.textContent = stats.totalEntries || currentPasswords.length;
        categoriesCount.textContent = stats.totalCategories || 0;
        weakPasswordsCount.textContent = stats.weakPasswords || 0;
      } else {
        // Fallback to basic counting
        totalEntriesCount.textContent = currentPasswords.length;
        const categories = [...new Set(currentPasswords.map(p => p.category).filter(c => c))];
        categoriesCount.textContent = categories.length;
        const weakPasswords = currentPasswords.filter(p => (p.strength || 0) < 2);
        weakPasswordsCount.textContent = weakPasswords.length;
      }
    } catch (error) {
      console.error('Error updating statistics:', error);
      // Fallback statistics
      totalEntriesCount.textContent = currentPasswords.length;
      categoriesCount.textContent = '0';
      weakPasswordsCount.textContent = '0';
    }
  }
  
  // Search and Filter Functions
  function applyFilters() {
    let filtered = [...currentPasswords];
    
    // Apply search filter
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter(entry => {
        return (
          (entry.title || '').toLowerCase().includes(searchTerm) ||
          (entry.username || '').toLowerCase().includes(searchTerm) ||
          (entry.url || '').toLowerCase().includes(searchTerm) ||
          (entry.category || '').toLowerCase().includes(searchTerm) ||
          (entry.notes || '').toLowerCase().includes(searchTerm) ||
          (entry.tags || []).some(tag => tag.toLowerCase().includes(searchTerm))
        );
      });
    }
    
    // Apply category filter
    const selectedCategory = categoryFilter.value;
    if (selectedCategory) {
      filtered = filtered.filter(entry => entry.category === selectedCategory);
    }
    
    // Apply sorting
    const sortOption = sortOptions.value;
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'title-desc':
          return (b.title || '').localeCompare(a.title || '');
        case 'date-desc':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        case 'date-asc':
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        default:
          return 0;
      }
    });
    
    filteredPasswords = filtered;
    renderPasswordList();
  }
  
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Generate Password Integration
  async function generateNewPassword() {
    try {
      const options = {
        length: 16,
        lowercase: true,
        uppercase: true,
        numbers: true,
        symbols: true,
        excludeAmbiguous: true
      };
      
      const result = await window.electronAPI.generatePassword(options);
      if (result.success) {
        entryPassword.value = result.password;
        showNotification('Password generated!', 'success');
      }
    } catch (error) {
      console.error('Error generating password:', error);
      showNotification('Failed to generate password', 'error');
    }
  }
  
  // Event Listeners
  
  // Navigation
  document.getElementById('back-home')?.addEventListener('click', () => {
    window.location.href = 'home.html';
  });
  
  // Add Password Buttons
  document.getElementById('add-password')?.addEventListener('click', () => {
    openModal('add');
  });
  
  document.getElementById('add-first-password')?.addEventListener('click', () => {
    openModal('add');
  });
  
  // Modal Controls
  closeModalBtn?.addEventListener('click', closeModal);
  cancelEntryBtn?.addEventListener('click', closeModal);
  
  // Close modal on outside click
  passwordModal?.addEventListener('click', (e) => {
    if (e.target === passwordModal) {
      closeModal();
    }
  });
  
  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && passwordModal.style.display === 'block') {
      closeModal();
    }
  });
  
  // Form Submission
  passwordForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await savePassword();
  });
  
  // Password Toggle
  togglePasswordBtn?.addEventListener('click', () => {
    const isPassword = entryPassword.type === 'password';
    entryPassword.type = isPassword ? 'text' : 'password';
    togglePasswordBtn.textContent = isPassword ? '🙈' : '👁️';
    togglePasswordBtn.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
  });
  
  // Generate Password
  generatePasswordBtn?.addEventListener('click', generateNewPassword);
  
  // Search and Filters
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(applyFilters, 300);
  });
  
  clearSearchBtn?.addEventListener('click', () => {
    searchInput.value = '';
    applyFilters();
    searchInput.focus();
  });
  
  categoryFilter?.addEventListener('change', applyFilters);
  sortOptions?.addEventListener('change', applyFilters);
  
  // Import/Export
  document.getElementById('import-passwords')?.addEventListener('click', async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json, .csv';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const format = file.name.endsWith('.csv') ? 'csv' : 'json';
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        const data = event.target.result;
        try {
          const options = { checkDuplicates: true, skipDuplicates: false };
          const result = await window.electronAPI.importPasswords(data, format, options);
          if (result.success) {
            showNotification(`Imported ${result.data.imported} passwords successfully!`, 'success');
            await loadPasswords();
          } else {
            showNotification(result.error || 'Failed to import passwords', 'error');
          }
        } catch (error) {
          console.error('Import error:', error);
          showNotification('Failed to import passwords', 'error');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  });
  
  document.getElementById('export-passwords')?.addEventListener('click', async () => {
    try {
      const format = 'json';
      const options = { includePasswords: true };
      const result = await window.electronAPI.exportPasswords(format, options);
      
      if (result.success) {
        const blob = new Blob([result.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `password-vault-export-${new Date().toISOString().split('T')[0]}.${format}`;
        a.click();
        
        URL.revokeObjectURL(url);
        showNotification('Passwords exported successfully!', 'success');
      } else {
        showNotification(result.error || 'Failed to export passwords', 'error');
      }
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Failed to export passwords', 'error');
    }
  });
  
  // Initialize Vault
  await loadPasswords();
  
  // Register activity for auto-lock
  document.addEventListener('click', () => {
    window.electronAPI.registerActivity?.();
  });
  
  document.addEventListener('keydown', () => {
    window.electronAPI.registerActivity?.();
  });
});

