import { API_BASE } from '../core/config.js';

const hubTabs = document.querySelectorAll('.hub-tab');
const hubPanes = document.querySelectorAll('.hub-pane');
const accountForm = document.getElementById('settings-account-form');
const leetcodeInput = document.getElementById('settings-leetcode');

/**
 * Get current user from sessionStorage
 */
const getCurrentUser = () => JSON.parse(sessionStorage.getItem('cs_user') || 'null');

// 1. Hub Tab Logic (Simplified and Robust)
hubTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetId = tab.dataset.target;
    if (!targetId) return;

    // 1. Update Tabs
    hubTabs.forEach(t => t.classList.toggle('active', t === tab));
    
    // 2. Update Panes
    hubPanes.forEach(pane => {
      if (pane.id === targetId) {
        pane.style.display = 'block';
        void pane.offsetWidth;
        pane.classList.add('active');
        pane.style.opacity = '1';
      } else {
        pane.classList.remove('active');
        pane.style.opacity = '0';
        setTimeout(() => {
          if (!pane.classList.contains('active')) {
            pane.style.display = 'none';
          }
        }, 300);
      }
    });

    // 3. Force LeetCode refresh
    const user = getCurrentUser();
    if (targetId === 'progress-view' && user) {
      if (window.CodeSphere?.dashboard?.syncAllPlatforms) {
        const handle = user.handles?.leetcode || leetcodeInput?.value.trim() || '';
        window.CodeSphere.dashboard.syncAllPlatforms(handle || null);
      }
    }
  });
});

// 2. Route Activation
document.addEventListener('routechange', async (e) => {
  if (e.detail.route === 'home' || e.detail.route === 'settings') {
    const user = getCurrentUser();
    if (!user) return;

    // Navigate to respective tab
    if (e.detail.route === 'settings') {
      document.querySelector('[data-target="settings-view"]')?.click();
    } else {
      document.querySelector('[data-target="progress-view"]')?.click();
    }

    // Load initial settings data from the user object
    if (leetcodeInput) {
      leetcodeInput.value = user.handles?.leetcode || '';
    }
  }
});

// 3. Settings Form Submission (Updated for Backend)
accountForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const user = getCurrentUser();
  if (!user) return;

  const newHandle = leetcodeInput?.value.trim() || '';
  const saveBtn = document.getElementById('settings-save-btn');
  const errorEl = document.getElementById('settings-error');
  const successEl = document.getElementById('settings-success');

  if (errorEl) errorEl.hidden = true;
  if (successEl) successEl.hidden = true;
  
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
  }

  try {
    // Call the same backend sync logic from config.js
    const response = await fetch(`${API_BASE}/user/handles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: user._id, 
        handles: { ...user.handles, leetcode: newHandle } 
      })
    });

    const result = await response.json();
    if (result.success) {
      // Update local session
      user.handles = result.data.handles;
      sessionStorage.setItem('cs_user', JSON.stringify(user));
      
      if (successEl) successEl.hidden = false;
      
      // Immediate API Sync
      if (window.CodeSphere?.dashboard?.syncAllPlatforms) {
        window.CodeSphere.dashboard.syncAllPlatforms(newHandle);
      }
    } else {
      throw new Error(result.message);
    }
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = 'Error updating profile. Try again.';
      errorEl.hidden = false;
    }
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  }
});

