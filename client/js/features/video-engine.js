/**
 * video-engine.js — CodeSphere Video Hub Logic
 * Handles video grid rendering, player view, hover previews, and local demo mode.
 */

import { API_BASE } from '../core/config.js';
import { escapeHtml } from '../core/utils.js';

// ── DOM References ───────────────────────────────────────────────
const videoGrid       = document.getElementById('video-grid');
const relatedGrid     = document.getElementById('related-grid');
const mainPlayer      = document.getElementById('main-player');
const playerTitle     = document.getElementById('player-title');
const playerDesc      = document.getElementById('player-description');
const playerViews     = document.getElementById('player-views');
const playerLikes     = document.getElementById('player-likes');
const playerCreatorName   = document.getElementById('player-creator-name');
const playerCreatorAvatar = document.getElementById('player-creator-avatar');
const playerCreatorSubs = document.getElementById('player-creator-subs');
const playerSubscribeBtn = document.getElementById('player-subscribe-btn');
const playerLikeBtn = document.getElementById('player-like-btn');
const playerLikeIcon = document.getElementById('player-like-icon');
const uploadDemoBtn   = document.getElementById('upload-demo-btn');
const localVideoInput = document.getElementById('local-video-input');

let currentVideoId = null;
let currentCreatorId = null;

let currentAbortController = null;

// ── Fetch Utility ────────────────────────────────────────────────

const secureFetch = async (url, options = {}) => {
  console.log(`[secureFetch] Starting: ${url}`);
  if (currentAbortController) {
    console.log(`[secureFetch] Aborting previous request`);
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();

  try {
    const token = localStorage.getItem('cs_token');
    const fetchOptions = { ...options, signal: currentAbortController.signal };
    if (token) {
      fetchOptions.headers = { ...fetchOptions.headers, 'Authorization': `Bearer ${token}` };
    }
    const response = await fetch(url, fetchOptions);
    console.log(`[secureFetch] Response status: ${response.status}`);
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`[secureFetch] Request aborted: ${url}`);
      return { aborted: true };
    }
    console.error('[secureFetch] Error:', error);
    return { success: false, message: error.message };
  }
};

// ── Format Duration ──────────────────────────────────────────────

const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// ── Grid View Logic ──────────────────────────────────────────────

const loadGridView = async (category = 'home') => {
  if (!videoGrid) return;
  videoGrid.innerHTML = '';
  const loader = document.getElementById('skeleton-loader');
  if (loader) loader.style.display = 'grid';

  const categoryMap = {
    'home': 'Home', 'java': 'Java', 'dsa': 'DSA',
    'webdev': 'WebDev', 'ai': 'AI', 'trending': 'trending',
    'subscriptions': 'Home', 'history': 'Home', 'recommended': 'Home'
  };

  const gridTitle = document.getElementById('grid-title');
  const titleMap = {
    'home': 'Recommended', 'trending': '🔥 Trending Now', 'java': '☕ Java Tutorials',
    'dsa': '🧮 Data Structures & Algorithms', 'webdev': '🌐 Web Development',
    'ai': '🤖 AI & Machine Learning', 'subscriptions': '📺 Subscriptions',
    'history': '📜 Watch History', 'recommended': '✅ Recommended for You'
  };
  if (gridTitle) gridTitle.textContent = titleMap[category] || 'Videos';

  const targetCategory = categoryMap[category.toLowerCase()] || (category.charAt(0).toUpperCase() + category.slice(1));
  const url = category === 'trending'
    ? `${API_BASE}/videos/trending`
    : `${API_BASE}/videos?category=${targetCategory}`;

  try {
    console.log(`[VideoEngine] Fetching: ${url}`);
    const result = await secureFetch(url);
    console.log(`[VideoEngine] Result:`, result);
    
    if (result.aborted) return;

    if (result.success && result.data?.length > 0) {
      console.log(`[VideoEngine] Rendering ${result.data.length} videos`);
      allVideos = result.data; // Cache for searching
      renderVideoGrid(result.data);
    } else {
      console.error(`[VideoEngine] Load Failed:`, result.message);
      allVideos = [];
      videoGrid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;text-align:center;padding:var(--space-16) 0;">
          <div style="font-size:3rem;margin-bottom:var(--space-4);">📹</div>
          <h3 style="color:var(--color-text-primary);font-size:var(--text-lg);font-weight:var(--font-bold);margin-bottom:var(--space-2);">No videos yet</h3>
          <p style="color:var(--color-text-muted);font-size:var(--text-sm);">Videos will appear here once content is uploaded. Check back soon!</p>
        </div>
      `;
    }
  } catch (err) {
    console.error('[VideoEngine] Critical Load Error:', err);
  } finally {
    if (loader) loader.style.display = 'none';
  }
};

const renderVideoGrid = (videos) => {
  if (!videoGrid) return;
  videoGrid.innerHTML = videos.map(video => `
    <div class="video-card" data-id="${video._id}">
      <div class="video-card__thumbnail">
        <img src="${video.thumbnailUrl}" alt="${escapeHtml(video.title)}" loading="lazy" />
        <video muted loop preload="none" src="${video.videoUrl}"></video>
        <span class="video-card__duration">${formatDuration(video.duration)}</span>
      </div>
      <div class="video-card__info">
        <img class="video-card__avatar" src="${video.creator?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(video.creator?.username || 'User')}&background=6366f1&color=fff&size=36`}" alt="" />
        <div class="video-card__meta">
          <h3 class="video-card__title">${escapeHtml(video.title)}</h3>
          <p class="video-card__channel">${escapeHtml(video.creator?.username || 'CodeSphere User')}</p>
          <p class="video-card__views">${(video.views || 0).toLocaleString()} views</p>
        </div>
      </div>
    </div>
  `).join('');

  // Event listeners
  videoGrid.querySelectorAll('.video-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.hash = `#player/${card.dataset.id}`;
    });

    // Hover preview
    const preview = card.querySelector('video');
    if (preview) {
      card.addEventListener('mouseenter', () => {
        preview.currentTime = 0;
        preview.play().catch(() => {});
      });
      card.addEventListener('mouseleave', () => {
        preview.pause();
      });
    }
  });

  // GSAP entrance animation
  if (typeof gsap !== 'undefined') {
    gsap.fromTo('.video-card',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out', clearProps: 'all' }
    );
  }
};

// ── Real-time Tracking ───────────────────────────────────────────

let trackingInterval = null;
let simulatedViewCount = 0;

const startRealtimeTracking = (initialViews) => {
  if (trackingInterval) clearInterval(trackingInterval);
  simulatedViewCount = initialViews;
  
  const watchingNowEl = document.getElementById('watching-now');
  const viewsEl = document.getElementById('player-views');
  
  // Initial simulation values
  let watchingCount = Math.floor(Math.random() * 50) + 1;
  if (watchingNowEl) watchingNowEl.textContent = `${watchingCount} Watching`;

  trackingInterval = setInterval(() => {
    // 1. Fluctuate "Watching Now"
    watchingCount += Math.random() > 0.5 ? 1 : -1;
    if (watchingCount < 1) watchingCount = 1;
    if (watchingNowEl) watchingNowEl.textContent = `${watchingCount} Watching`;

    // 2. Increment Views (Slowly)
    if (Math.random() > 0.8) {
      simulatedViewCount++;
      if (viewsEl) viewsEl.textContent = `${simulatedViewCount.toLocaleString()} views`;
    }
  }, 3000);
};

const stopRealtimeTracking = () => {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
};

// ── Player View Logic ────────────────────────────────────────────

const loadPlayerView = async (videoId) => {
  stopRealtimeTracking(); // Stop previous session
  currentVideoId = videoId;

  const result = await secureFetch(`${API_BASE}/videos/${videoId}`);
  if (result.aborted) return;

  if (result.success && mainPlayer) {
    const video = result.data;
    currentCreatorId = video.creator?._id;
    
    mainPlayer.src = video.videoUrl;
    if (playerTitle) playerTitle.textContent = video.title;
    if (playerDesc) playerDesc.textContent = video.description;
    if (playerCreatorName) playerCreatorName.textContent = video.creator?.username || 'CodeSphere User';
    if (playerCreatorAvatar) playerCreatorAvatar.src = video.creator?.avatarUrl || `https://ui-avatars.com/api/?name=User&background=6366f1&color=fff`;
    if (playerViews) playerViews.textContent = `${(video.views || 0).toLocaleString()} views`;
    if (playerLikes) playerLikes.textContent = (video.likes || 0).toLocaleString();

    // Fetch interactive state if logged in
    const token = localStorage.getItem('cs_token');
    if (token) {
      const stateResult = await secureFetch(`${API_BASE}/videos/${videoId}/state`);
      if (stateResult.success) {
        updateLikeUI(stateResult.isLiked, stateResult.likesCount);
        updateSubscribeUI(stateResult.isSubscribed);
      }
    } else {
      updateLikeUI(false, video.likes || 0);
      updateSubscribeUI(false);
    }

    // Subscribe Count (Temporary mock if not provided, but ideally from creator obj)
    if (playerCreatorSubs) playerCreatorSubs.textContent = `${video.creator?.subscribersCount || 0} subscribers`;

    mainPlayer.play().catch(() => console.warn('Autoplay prevented'));

    // Start Real-time Tracking Simulation
    startRealtimeTracking(video.views || 0);

    // Load related
    const related = await secureFetch(`${API_BASE}/videos/trending`);
    if (related.success) renderRelatedList(related.data);

    // Notify API of view
    secureFetch(`${API_BASE}/videos/${videoId}/view`, { method: 'POST' }).catch(() => {});
  }
};

const updateLikeUI = (isLiked, count) => {
  if (playerLikeIcon) {
    playerLikeIcon.setAttribute('fill', isLiked ? 'currentColor' : 'none');
  }
  if (playerLikes) {
    playerLikes.textContent = (count || 0).toLocaleString();
  }
  if (playerLikeBtn) {
    playerLikeBtn.dataset.liked = isLiked;
  }
};

const updateSubscribeUI = (isSubscribed) => {
  if (playerSubscribeBtn) {
    playerSubscribeBtn.textContent = isSubscribed ? 'Subscribed' : 'Subscribe';
    playerSubscribeBtn.className = isSubscribed 
      ? 'btn btn-secondary rounded-full px-6' 
      : 'btn btn-primary rounded-full px-6';
    playerSubscribeBtn.dataset.subscribed = isSubscribed;
  }
};

// Interaction Event Listeners
playerLikeBtn?.addEventListener('click', async () => {
  const token = localStorage.getItem('cs_token');
  if (!token) {
    showToast('Please log in to like videos', 'error');
    return;
  }
  if (!currentVideoId) return;

  const isCurrentlyLiked = playerLikeBtn.dataset.liked === 'true';
  const currentCount = parseInt(playerLikes.textContent.replace(/,/g, '')) || 0;
  
  // Optimistic UI update
  updateLikeUI(!isCurrentlyLiked, isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1);

  const res = await secureFetch(`${API_BASE}/videos/${currentVideoId}/like`, { method: 'POST' });
  if (!res.success) {
    // Revert on failure
    updateLikeUI(isCurrentlyLiked, currentCount);
    showToast(res.message || 'Action failed', 'error');
  }
});

playerSubscribeBtn?.addEventListener('click', async () => {
  const token = localStorage.getItem('cs_token');
  if (!token) {
    showToast('Please log in to subscribe', 'error');
    return;
  }
  if (!currentCreatorId) return;

  const isCurrentlySubscribed = playerSubscribeBtn.dataset.subscribed === 'true';
  
  // Optimistic UI update
  updateSubscribeUI(!isCurrentlySubscribed);

  const res = await secureFetch(`${API_BASE}/user/subscribe/${currentCreatorId}`, { method: 'POST' });
  if (!res.success) {
    // Revert on failure
    updateSubscribeUI(isCurrentlySubscribed);
    showToast(res.message || 'Action failed', 'error');
  } else if (res.subscribersCount !== undefined) {
    if (playerCreatorSubs) playerCreatorSubs.textContent = `${res.subscribersCount} subscribers`;
  }
});

const renderRelatedList = (videos) => {
  if (!relatedGrid) return;
  relatedGrid.innerHTML = videos.map(video => `
    <div class="related-card" onclick="window.location.hash='#player/${video._id}'">
      <div class="related-card__thumb"><img src="${video.thumbnailUrl}" alt="${escapeHtml(video.title)}" loading="lazy" /></div>
      <div class="related-card__info">
        <h4 class="related-card__title">${escapeHtml(video.title)}</h4>
        <p class="related-card__channel">${escapeHtml(video.creator?.username || 'User')}</p>
        <p class="related-card__views">${(video.views || 0).toLocaleString()} views</p>
      </div>
    </div>
  `).join('');
};

// ── Utilities ────────────────────────────────────────────────────

const showToast = (message, type = 'success') => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-${type} flex items-center gap-3`;
  
  const icon = type === 'success' 
    ? '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    : '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

  toast.innerHTML = `${icon} <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
};

// ── Search & Upload Functionality ──────────────────────────────────
// ... (rest of the code update alert to showToast)

const navUploadBtn = document.getElementById('nav-upload-btn');
const uploadModal = document.getElementById('upload-modal');
const uploadCloseBtn = document.getElementById('upload-modal-close');
const uploadCancelBtn = document.getElementById('upload-cancel-btn');
const uploadSubmitBtn = document.getElementById('upload-submit-btn');
const searchInput = document.getElementById('global-search');

let allVideos = []; // Cache for local searching

const openUploadModal = () => uploadModal?.classList.remove('hidden');
const closeUploadModal = () => uploadModal?.classList.add('hidden');

navUploadBtn?.addEventListener('click', openUploadModal);
uploadCloseBtn?.addEventListener('click', closeUploadModal);
uploadCancelBtn?.addEventListener('click', closeUploadModal);

uploadSubmitBtn?.addEventListener('click', async () => {
  const title = document.getElementById('upload-title')?.value;
  const tags = document.getElementById('upload-topic')?.value;
  const code = document.getElementById('upload-code')?.value;
  
  if (!title) {
    showToast('Please enter a title', 'error');
    return;
  }

  // Simulate upload
  uploadSubmitBtn.disabled = true;
  uploadSubmitBtn.textContent = 'Uploading...';
  
  setTimeout(() => {
    showToast('Successfully uploaded to community feed!');
    closeUploadModal();
    uploadSubmitBtn.disabled = false;
    uploadSubmitBtn.textContent = 'Upload Post';
    
    // Clear form
    document.getElementById('upload-title').value = '';
    document.getElementById('upload-topic').value = '';
    document.getElementById('upload-code').value = '';
  }, 1500);
});

// Search Logic
searchInput?.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    renderVideoGrid(allVideos);
    return;
  }

  const filtered = allVideos.filter(v => 
    v.title.toLowerCase().includes(query) || 
    (v.creator?.username || '').toLowerCase().includes(query) ||
    (v.category || '').toLowerCase().includes(query)
  );
  
  renderVideoGrid(filtered);
});

// ── Local Demo Mode ──────────────────────────────────────────────

uploadDemoBtn?.addEventListener('click', () => localVideoInput?.click());

localVideoInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && mainPlayer) {
    const blobUrl = URL.createObjectURL(file);
    window.location.hash = '#player';
    mainPlayer.src = blobUrl;
    if (playerTitle) playerTitle.textContent = `Local Preview: ${file.name}`;
    if (playerDesc) playerDesc.textContent = 'Local preview session.';
    if (playerCreatorName) playerCreatorName.textContent = 'Local User';
    mainPlayer.play().catch(() => {});
  }
});

// ── Global Exposure ──────────────────────────────────────────────

window.CodeSphere = window.CodeSphere || {};
window.CodeSphere.loadPlayerView = loadPlayerView;
window.CodeSphere.loadGridView = loadGridView;
