document.addEventListener('DOMContentLoaded', () => {
  const notification = document.getElementById('notification');

  function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');

    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }

  // Back to Home navigation
  const backHomeBtn = document.getElementById('back-home');
  if (backHomeBtn) {
    backHomeBtn.addEventListener('click', () => {
      window.location.href = 'home.html';
    });
  }

  // Import passwords
  document.getElementById('import-passwords').addEventListener('click', async () => {
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
          showNotification(`Imported ${result.data.imported} passwords successfully!`, 'success');
        } catch (error) {
          showNotification('Failed to import passwords', 'error');
        }
      };

      reader.readAsText(file);
    };

    input.click();
  });

  // Export passwords
  document.getElementById('export-passwords').addEventListener('click', async () => {
    try {
      const format = 'json'; // Default export format
      const options = { includePasswords: false };
      const data = await window.electronAPI.exportPasswords(format, options);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = `password-vault-export.${format}`;
      a.click();

      URL.revokeObjectURL(url);
      showNotification('Passwords exported successfully!', 'success');

    } catch (error) {
      showNotification('Failed to export passwords', 'error');
    }
  });

});

