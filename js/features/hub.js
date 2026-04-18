import { db, auth } from '../core/firebase.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';

const hubTabs = document.querySelectorAll('.hub-tab');
const hubPanes = document.querySelectorAll('.hub-pane');
const accountForm = document.getElementById('settings-account-form');
const leetcodeInput = document.getElementById('settings-leetcode');

// 1. Hub Tab Logic (with Opacity Animation)
hubTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // 1. Deactivate all tabs and hide panes
    hubTabs.forEach(t => t.classList.remove('active'));
    
    hubPanes.forEach(p => {
      p.classList.remove('active');
      p.style.opacity = '0';
      // Wait for opacity transition before setting display none
      setTimeout(() => {
        p.style.display = 'none';
      }, 200); 
    });

    // 2. Activate target pane
    tab.classList.add('active');
    const targetId = tab.dataset.target;
    const targetPane = document.getElementById(targetId);
    
    if (targetPane) {
      setTimeout(() => {
        targetPane.style.display = 'block';
        // Trigger reflow for fade in
        void targetPane.offsetWidth; 
        targetPane.style.opacity = '1';
        targetPane.classList.add('active');
      }, 200);
    }

    // 3. Force LeetCode refresh when entering Progress View
    if (targetId === 'progress-view' && auth.currentUser) {
      if (window.CodeSphere?.fetchLeetCodeStats && leetcodeInput?.value) {
        window.CodeSphere.fetchLeetCodeStats(leetcodeInput.value.trim());
      }
    }
  });
});

// 2. Route Activation
document.addEventListener('routechange', async (e) => {
  if (e.detail.route === 'home' || e.detail.route === 'settings') {
    if (!auth.currentUser) return;

    // Navigate to respective tab
    if (e.detail.route === 'settings') {
      document.querySelector('[data-target="settings-view"]')?.click();
    } else {
      document.querySelector('[data-target="progress-view"]')?.click();
    }

    // Load initial settings data
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && leetcodeInput) {
        leetcodeInput.value = docSnap.data().leetcodeUsername || '';
      }
    } catch (err) {
      console.error('Failed to load settings data into hub:', err);
    }
  }
});

// 3. Settings Form Submission
accountForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!auth.currentUser) return;
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
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, { leetcodeUsername: newHandle });
    if (successEl) successEl.hidden = false;
    
    // Immediate API Sync requirement
    if (window.CodeSphere?.api?.fetchLeetCodeStats) {
      window.CodeSphere.api.fetchLeetCodeStats(newHandle);
    } else if (window.CodeSphere?.fetchLeetCodeStats) {
      window.CodeSphere.fetchLeetCodeStats(newHandle);
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
