/**
 * v2-video-logic.js
 * CodeSphere v2 - Core Video Hub Logic
 * Hardened with Null-Guards (Issue 24.1)
 */

import { API_BASE } from './core/config.js';
import { escapeHtml } from './core/utils.js';

// 1. DOM References (Safe Selection)
const appShell = document.getElementById('app-shell');
const videoGrid = document.getElementById('video-grid');
const relatedGrid = document.getElementById('related-grid');

// Player DOM
const mainPlayer = document.getElementById('main-player');
const playerTitle = document.getElementById('player-title');
const playerDesc = document.getElementById('player-description');
const playerViews = document.getElementById('player-views');
const playerLikes = document.getElementById('player-likes');
const playerCreatorName = document.getElementById('player-creator-name');
const playerCreatorAvatar = document.getElementById('player-creator-avatar');
const playerProgress = document.getElementById('player-progress');
const playerPlayPause = document.getElementById('player-play-pause');

// Local Demo
const uploadDemoBtn = document.getElementById('upload-demo-btn');
const localVideoInput = document.getElementById('local-video-input');

// State Management
let currentAbortController = null;

// ─────────────────────────────────────────────────────────────────
// 2. Fetch Utility (Abortable)
// ─────────────────────────────────────────────────────────────────

const secureFetch = async (url, options = {}) => {
  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: currentAbortController.signal
    });
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') return { aborted: true };
    throw error;
  }
};

// GSAP Plugin Registration
if (typeof gsap !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// ─────────────────────────────────────────────────────────────────
// 4. Grid View Logic
// ─────────────────────────────────────────────────────────────────

const loadGridView = async (category = 'home') => {
  if (!videoGrid) return;
  videoGrid.innerHTML = ''; 
  const loader = document.getElementById('skeleton-loader');
  loader?.classList.remove('hidden');

  const categoryMap = {
    'home': 'Home',
    'java': 'Java',
    'dsa': 'DSA',
    'webdev': 'WebDev',
    'ai': 'AI'
  };
  
  const targetCategory = categoryMap[category.toLowerCase()] || (category.charAt(0).toUpperCase() + category.slice(1));

  const url = category === 'trending' 
    ? `${API_BASE}/videos/trending` 
    : `${API_BASE}/videos?category=${targetCategory}`;
  
  const result = await secureFetch(url);
  loader?.classList.add('hidden');

  if (result.aborted) return;
  
  if (result.success) {
    renderVideoGrid(result.data);
    
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.batch(".video-card", {
        onEnter: (batch) => {
          gsap.from(batch, {
            opacity: 0,
            y: 50,
            stagger: 0.15,
            duration: 0.8,
            ease: "power3.out",
            overwrite: true
          });
        },
        start: "top 95%",
        once: true
      });
    }
  }
};

const renderVideoGrid = (videos) => {
  if (!videoGrid) return;
  videoGrid.innerHTML = videos.map(video => `
    <div class="video-card group cursor-pointer" data-id="${video._id}">
      <div class="relative aspect-video rounded-2xl overflow-hidden bg-white/5 border border-white/5 mb-3">
        <img src="${video.thumbnailUrl}" alt="${escapeHtml(video.title)}" class="video-thumbnail w-full h-full object-cover group-hover:opacity-0 transition-opacity duration-300" />
        <video class="hover-preview absolute top-0 left-0 w-full h-full object-cover opacity-0 group-hover:opacity-100" muted loop src="${video.videoUrl}"></video>
        <span class="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs font-bold">${video.duration}</span>
      </div>
      <div class="flex gap-3">
        <div class="w-10 h-10 rounded-full glass shrink-0 overflow-hidden">
          <img src="${video.creator?.avatarUrl || 'https://ui-avatars.com/api/?name=User&background=random'}" class="w-full h-full" />
        </div>
        <div>
          <h3 class="font-bold leading-tight group-hover:text-accent transition-colors line-clamp-2">${escapeHtml(video.title)}</h3>
          <p class="text-sm text-white/50 mt-1">${escapeHtml(video.creator?.username || 'CodeSphere User')}</p>
          <p class="text-xs text-white/30 uppercase mt-0.5 tracking-wider font-bold">${video.views.toLocaleString()} views</p>
        </div>
      </div>
    </div>
  `).join('');

  videoGrid.querySelectorAll('.video-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.hash = `#player/${card.dataset.id}`;
    });

    const preview = card.querySelector('.hover-preview');
    if (preview) {
      card.addEventListener('mouseenter', () => {
        preview.currentTime = 0;
        preview.play().catch(e => {});
      });
      card.addEventListener('mouseleave', () => {
        preview.pause();
      });
    }
  });
};

// ─────────────────────────────────────────────────────────────────
// 5. Player View Logic
// ─────────────────────────────────────────────────────────────────

const loadPlayerView = async (videoId) => {
  const result = await secureFetch(`${API_BASE}/videos/${videoId}`);
  if (result.aborted) return;

  if (result.success && mainPlayer) {
    const video = result.data;
    mainPlayer.src = video.videoUrl;
    if (playerTitle) playerTitle.textContent = video.title;
    if (playerDesc) playerDesc.textContent = video.description;
    if (playerCreatorName) playerCreatorName.textContent = video.creator?.username || 'CodeSphere User';
    if (playerCreatorAvatar) playerCreatorAvatar.src = video.creator?.avatarUrl || 'https://ui-avatars.com/api/?name=User&background=random';
    
    if (playerViews) playerViews.textContent = `${video.views.toLocaleString()} views`;
    if (playerLikes) playerLikes.textContent = video.likes.toLocaleString();

    mainPlayer.play().catch(e => console.warn('Autoplay prevented'));
    
    const related = await secureFetch(`${API_BASE}/videos/trending`);
    if (related.success) {
      renderRelatedList(related.data);
    }
  }
};

const renderRelatedList = (videos) => {
  if (!relatedGrid) return;
  relatedGrid.innerHTML = videos.map(video => `
    <div class="flex gap-3 group cursor-pointer" onclick="window.location.hash='#player/${video._id}'">
      <div class="relative w-40 aspect-video rounded-xl overflow-hidden shrink-0 bg-white/5">
        <img src="${video.thumbnailUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
      </div>
      <div>
        <h4 class="text-sm font-bold leading-tight line-clamp-2 group-hover:text-accent">${escapeHtml(video.title)}</h4>
        <p class="text-xs text-white/50 mt-1">${escapeHtml(video.creator?.username || 'User')}</p>
        <p class="text-xs text-white/30">${video.views.toLocaleString()} views</p>
      </div>
    </div>
  `).join('');
};

// ─────────────────────────────────────────────────────────────────
// 6. Custom Player Controls (Hardened)
// ─────────────────────────────────────────────────────────────────

playerPlayPause?.addEventListener('click', () => {
  if (!mainPlayer) return;
  if (mainPlayer.paused) {
    mainPlayer.play();
    playerPlayPause.innerHTML = '<svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>';
  } else {
    mainPlayer.pause();
    playerPlayPause.innerHTML = '<svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>';
  }
});

mainPlayer?.addEventListener('timeupdate', () => {
  if (!mainPlayer || !playerProgress) return;
  const percent = (mainPlayer.currentTime / mainPlayer.duration) * 100;
  playerProgress.style.width = `${percent}%`;
});

// ─────────────────────────────────────────────────────────────────
// 7. Local Demo Mode (Hardened)
// ─────────────────────────────────────────────────────────────────

uploadDemoBtn?.addEventListener('click', () => localVideoInput?.click());

localVideoInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && mainPlayer) {
    const blobUrl = URL.createObjectURL(file);
    window.location.hash = '#player';
    mainPlayer.src = blobUrl;
    if (playerTitle) playerTitle.textContent = `Local Preview: ${file.name}`;
    if (playerDesc) playerDesc.textContent = "Local preview session.";
    if (playerCreatorName) playerCreatorName.textContent = "Local User";
    mainPlayer.play().catch(e => {});
  }
});

// Global Exposure
window.CodeSphere = window.CodeSphere || {};
window.CodeSphere.loadPlayerView = loadPlayerView;
window.CodeSphere.loadGridView = loadGridView;
