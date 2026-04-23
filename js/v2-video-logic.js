/**
 * v2-video-logic.js
 * CodeSphere v2 - Core SPA & Video Logic
 */

import { API_BASE } from './core/config.js';

// 1. DOM References
const appShell = document.getElementById('app-shell');
const viewContainers = document.querySelectorAll('.view-container');
const homeView = document.getElementById('home-view');
const playerView = document.getElementById('player-view');
const videoGrid = document.getElementById('video-grid');
const relatedGrid = document.getElementById('related-grid');
const sidebarLinks = document.querySelectorAll('.sidebar-link');

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
let activeVideos = [];

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
gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────────
// 2.5 Sidebar Toggle Logic
// ─────────────────────────────────────────────────────────────────
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('main-sidebar');

sidebarToggle?.addEventListener('click', () => {
  const isHidden = sidebar.classList.contains('hidden');
  if (isHidden) {
    sidebar.classList.remove('hidden');
    sidebar.classList.add('lg:block');
    appShell.classList.add('lg:ml-64');
  } else {
    sidebar.classList.add('hidden');
    sidebar.classList.remove('lg:block');
    appShell.classList.remove('lg:ml-64');
  }
});

// ─────────────────────────────────────────────────────────────────
// 3. View Switcher (GSAP SPA)
// ─────────────────────────────────────────────────────────────────

let currentViewId = null;
let currentCategory = null;

const switchView = async (route) => {
  const [viewId, param] = route.split('/');
  
  // Auth Guard: Only allow 'getting-started' if not logged in
  const isLoggedIn = sessionStorage.getItem('cs_user');
  if (!isLoggedIn && viewId !== 'getting-started') {
    window.location.hash = '#getting-started';
    return;
  }
  
  // Update sidebar active state
  sidebarLinks.forEach(link => {
    const linkRoute = link.getAttribute('data-route') || link.getAttribute('data-category')?.toLowerCase();
    link.classList.toggle('active', linkRoute === viewId);
  });

  // Prepare UI transition
  const outgoingView = document.querySelector('.view-container:not(.hidden)');
  let incomingViewId = 'home-view';
  
  if (viewId === 'player') incomingViewId = 'player-view';
  else if (viewId === 'getting-started') incomingViewId = 'getting-started-view';
  else if (viewId === 'profile') incomingViewId = 'profile-view';
  else if (viewId === 'settings') incomingViewId = 'settings-view';

  // Profile/Settings specific sidebar handling
  if (viewId === 'profile' || viewId === 'settings') {
    sidebar.classList.add('hidden');
    sidebar.classList.remove('lg:block');
    appShell.classList.remove('lg:ml-64');
  } else if (isLoggedIn) {
    sidebar.classList.remove('hidden');
    sidebar.classList.add('lg:block');
    appShell.classList.add('lg:ml-64');
  }

  const incomingView = document.getElementById(incomingViewId);

  // Trigger Dashboard Refresh if entering profile
  if (viewId === 'profile' && window.CodeSphere?.dashboard?.refreshData) {
     window.CodeSphere.dashboard.refreshData();
  }

  // REFIX: Only skip if the view AND category/param are identical to current state
  if (viewId === currentViewId && (viewId === 'player' ? param === currentCategory : viewId === currentCategory)) {
     return;
  }

  // Use GSAP for cross-fade
  const tl = gsap.timeline();
  
  if (outgoingView && outgoingView !== incomingView) {
    tl.to(outgoingView, { opacity: 0, duration: 0.2, onComplete: () => {
      outgoingView.classList.add('hidden');
    }});
  }

  // Load Content
  if (viewId === 'player') {
    await loadPlayerView(param);
  } else if (viewId !== 'getting-started') {
    await loadGridView(viewId);
  }

  currentViewId = viewId;
  currentCategory = (viewId === 'player') ? param : viewId;

  // Reveal Incoming
  if (incomingView.classList.contains('hidden') || incomingView.style.opacity === '0') {
    incomingView.classList.remove('hidden');
    tl.fromTo(incomingView, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
  }
  
  // Refresh ScrollTrigger after content load
  ScrollTrigger.refresh();
};

// ─────────────────────────────────────────────────────────────────
// 4. Grid View Logic
// ─────────────────────────────────────────────────────────────────

const loadGridView = async (category = 'home') => {
  videoGrid.innerHTML = ''; // Clear existing
  document.getElementById('skeleton-loader').classList.remove('hidden');

  // Mapping for proper category casing to match DB
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
  document.getElementById('skeleton-loader').classList.add('hidden');

  if (result.aborted) return;
  
  if (result.success) {
    activeVideos = result.data;
    renderVideoGrid(activeVideos);
    
    // GSAP REFINEMENT: Batch reveal for 100+ videos
    ScrollTrigger.batch(".video-card", {
      onEnter: (batch) => {
        gsap.from(batch, {
          opacity: 0,
          y: 50,
          stagger: {
            each: 0.15,
            grid: [Math.ceil(batch.length / 3), 3]
          },
          duration: 0.8,
          ease: "power3.out",
          overwrite: true
        });
      },
      start: "top 95%",
      once: true
    });
  }
};

const renderVideoGrid = (videos) => {
  videoGrid.innerHTML = videos.map(video => `
    <div class="video-card group cursor-pointer" data-id="${video._id}">
      <div class="relative aspect-video rounded-2xl overflow-hidden bg-white/5 border border-white/5 mb-3">
        <img src="${video.thumbnailUrl}" alt="${video.title}" class="video-thumbnail w-full h-full object-cover group-hover:opacity-0 transition-opacity duration-300" />
        <!-- Hover Autoplay Layer -->
        <video class="hover-preview absolute top-0 left-0 w-full h-full object-cover opacity-0 group-hover:opacity-100" muted loop src="${video.videoUrl}"></video>
        <span class="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs font-bold">${video.duration}</span>
      </div>
      <div class="flex gap-3">
        <div class="w-10 h-10 rounded-full glass shrink-0 overflow-hidden">
          <img src="${video.creator?.avatarUrl || 'https://ui-avatars.com/api/?name=User&background=random'}" class="w-full h-full" />
        </div>
        <div>
          <h3 class="font-bold leading-tight group-hover:text-accent transition-colors line-clamp-2">${video.title}</h3>
          <p class="text-sm text-white/50 mt-1">${video.creator?.username || 'CodeSphere User'}</p>
          <p class="text-xs text-white/30 uppercase mt-0.5 tracking-wider font-bold">${video.views.toLocaleString()} views • Oct 2026</p>
        </div>
      </div>
    </div>
  `).join('');

  // Attach Listeners
  document.querySelectorAll('.video-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.hash = `#player/${card.dataset.id}`;
    });

    // Hover-to-Play logic
    const preview = card.querySelector('.hover-preview');
    card.addEventListener('mouseenter', () => {
      preview.currentTime = 0;
      preview.play().catch(e => {});
    });
    card.addEventListener('mouseleave', () => {
      preview.pause();
    });
  });
};

// ─────────────────────────────────────────────────────────────────
// 5. Player View Logic
// ─────────────────────────────────────────────────────────────────

const loadPlayerView = async (videoId) => {
  const result = await secureFetch(`${API_BASE}/videos/${videoId}`);
  if (result.aborted) return;

  if (result.success) {
    const video = result.data;
    mainPlayer.src = video.videoUrl;
    playerTitle.textContent = video.title;
    playerDesc.textContent = video.description;
    playerCreatorName.textContent = video.creator?.username || 'CodeSphere User';
    playerCreatorAvatar.src = video.creator?.avatarUrl || 'https://ui-avatars.com/api/?name=User&background=random';
    
    // Animate Numbers
    gsap.to(playerViews, { 
      duration: 1, 
      text: `${video.views.toLocaleString()} views`,
      ease: "none"
    });
    playerLikes.textContent = video.likes.toLocaleString();

    mainPlayer.play();
    
    // Load Related (using trending for now)
    const related = await secureFetch(`${API_BASE}/videos/trending`);
    if (related.success) {
      renderRelatedList(related.data);
    }
  }
};

const renderRelatedList = (videos) => {
  relatedGrid.innerHTML = videos.map(video => `
    <div class="flex gap-3 group cursor-pointer" onclick="window.location.hash='#player/${video._id}'">
      <div class="relative w-40 aspect-video rounded-xl overflow-hidden shrink-0 bg-white/5">
        <img src="${video.thumbnailUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
      </div>
      <div>
        <h4 class="text-sm font-bold leading-tight line-clamp-2 group-hover:text-accent">${video.title}</h4>
        <p class="text-xs text-white/50 mt-1">${video.creator?.username || 'User'}</p>
        <p class="text-xs text-white/30">${video.views.toLocaleString()} views</p>
      </div>
    </div>
  `).join('');
};

// ─────────────────────────────────────────────────────────────────
// 6. Custom Player Controls
// ─────────────────────────────────────────────────────────────────

playerPlayPause.addEventListener('click', () => {
  if (mainPlayer.paused) {
    mainPlayer.play();
    playerPlayPause.innerHTML = '<svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>';
  } else {
    mainPlayer.pause();
    playerPlayPause.innerHTML = '<svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>';
  }
});

mainPlayer.addEventListener('timeupdate', () => {
  const percent = (mainPlayer.currentTime / mainPlayer.duration) * 100;
  playerProgress.style.width = `${percent}%`;
});

// ─────────────────────────────────────────────────────────────────
// 7. Local Demo Mode (Blob URL)
// ─────────────────────────────────────────────────────────────────

uploadDemoBtn.addEventListener('click', () => localVideoInput.click());

localVideoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const blobUrl = URL.createObjectURL(file);
    
    // Switch to player view manually for local demo
    switchView('player');
    mainPlayer.src = blobUrl;
    playerTitle.textContent = `Local Preview: ${file.name}`;
    playerDesc.textContent = "You are currently previewing a local video file. This file is not uploaded to the server and exists only in your browser session.";
    playerCreatorName.textContent = "Local User System";
    playerViews.textContent = "Private Preview";
    
    mainPlayer.play();
    
    // Revoke URL on next change to prevent leaks
    mainPlayer.addEventListener('loadeddata', () => {
      // Logic for revocation if needed later
    }, { once: true });
  }
});

// ─────────────────────────────────────────────────────────────────
// 8. Initialization & Routing
// ─────────────────────────────────────────────────────────────────

const handleHashChange = () => {
  const hash = window.location.hash.replace('#', '') || 'home';
  switchView(hash);
};

window.addEventListener('hashchange', handleHashChange);
document.addEventListener('DOMContentLoaded', handleHashChange);

// Global Exposure
window.CodeSphere = window.CodeSphere || {};
window.CodeSphere.switchView = switchView;
