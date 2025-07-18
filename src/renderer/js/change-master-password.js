document.addEventListener('DOMContentLoaded', () => {
  const currentPasswordInput = document.getElementById('current-password');
  const newPasswordInput = document.getElementById('new-password');
  const confirmNewPasswordInput = document.getElementById('confirm-new-password');
  const verifyButton = document.getElementById('btn-verify');
  const changeButton = document.getElementById('btn-change');
  const backButton = document.getElementById('btn-back');
  const notificationArea = document.getElementById('notification');

  const ipcRenderer = window.electronAPI;

  verifyButton.addEventListener('click', async (e) => {
    e.preventDefault();
    const currentPassword = currentPasswordInput.value;

    try {
      const isValid = await ipcRenderer.invoke('verify-current-password', currentPassword);
      if (isValid) {
        advanceToStep(2);
      } else {
        showNotification('Current password is incorrect. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying current password:', error);
    }
  });

  changeButton.addEventListener('click', async (e) => {
    e.preventDefault();
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmNewPasswordInput.value;

    if (newPassword !== confirmPassword) {
      return showNotification('Passwords do not match.');
    }

    try {
      await ipcRenderer.invoke('change-master-password', newPassword);
      advanceToStep(4);
    } catch (error) {
      console.error('Error changing master password:', error);
    }
  });

  backButton.addEventListener('click', (e) => {
    e.preventDefault();
    advanceToStep(1);
  });

  function advanceToStep(stepNumber) {
    const steps = document.querySelectorAll('.setup-step');
    steps.forEach((step, index) => {
      step.classList.toggle('active', index + 1 === stepNumber);
    });
  }

  function showNotification(message) {
    notificationArea.textContent = message;
    notificationArea.classList.add('visible');
    setTimeout(() => notificationArea.classList.remove('visible'), 3000);
  }
});

