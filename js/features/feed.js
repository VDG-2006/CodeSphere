/**
 * feed.js — CodeSphere Social Feed Module (Legacy Migration)
 * Restored with mock data and custom UI components.
 */

// ─────────────────────────────────────────────────────────────────
// 1. DOM References
// ─────────────────────────────────────────────────────────────────

const feedContainer  = document.getElementById('feed-container') || document.getElementById('home-feed-grid');
const postForm       = document.getElementById('post-form');
const postContent    = document.getElementById('post-content');
const postSubmitBtn  = document.getElementById('post-submit-btn');
const postVideoInput = document.getElementById('post-video');
const videoFileName  = document.getElementById('video-file-name');
const postVideoUrlInput = document.getElementById('post-video-url');

// ─────────────────────────────────────────────────────────────────
// 2. Templates
// ─────────────────────────────────────────────────────────────────

/**
 * Renders a custom video player component.
 */
const videoPlayerTemplate = (postId, videoUrl) => {
  // Simple check for YouTube: if it's a watch or embed URL, convert to embed.
  let isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
  
  if (isYouTube) {
    let videoId = '';
    if (videoUrl.includes('v=')) {
      videoId = videoUrl.split('v=')[1].split('&')[0];
    } else if (videoUrl.includes('youtu.be/')) {
      videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
    }
    
    return `
      <div class="video-player video-player--youtube" data-post-id="${postId}" style="aspect-ratio: 16/9; width: 100%; border-radius: 8px; overflow: hidden; margin-top: 12px;">
        <iframe 
          width="100%" 
          height="100%" 
          src="https://www.youtube.com/embed/${videoId}" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      </div>
    `;
  }

  return `
    <div class="video-player" data-post-id="${postId}" style="margin-top: 12px;">
      <video class="video-player__el" src="${videoUrl}" style="width: 100%; border-radius: 8px;"></video>
      <div class="video-player__controls" style="display: flex; align-items: center; gap: 12px; margin-top: 8px;">
        <button class="video-player__play-btn" aria-label="Play video" style="background: none; border: none; cursor: pointer; color: var(--color-text-primary); font-size: 18px;">
          <span class="play-icon">▶</span>
        </button>
        <input type="range" class="video-player__progress" value="0" step="0.1" min="0" max="100" style="flex: 1;">
        <span class="video-player__time" style="font-size: 12px; font-family: var(--font-mono); color: var(--color-text-muted);">0:00</span>
      </div>
    </div>
  `;
};

/**
 * Renders a social feed post card.
 */
const postCardTemplate = (id, post, currentUid) => {
  const isLiked = post.likedBy?.includes(currentUid);
  const videoHtml = post.videoUrl ? videoPlayerTemplate(id, post.videoUrl) : '';
  
  return `
    <article class="post-card" id="post-${id}" style="margin-bottom: 24px;">
      <header class="post-card__header">
        <img class="post-card__avatar" src="${post.avatarUrl || 'https://ui-avatars.com/api/?name=' + post.authorName}" alt="${post.authorName}'s avatar">
        <div class="post-card__author-block">
          <span class="post-card__author">${escapeHtml(post.authorName)}</span>
          <span class="post-card__handle">@${post.authorName.toLowerCase().replace(/\s/g, '')}</span>
        </div>
        <span class="post-card__timestamp">${timeAgo(post.createdAt)}</span>
      </header>

      <div class="post-card__body">
        <p style="margin-bottom: 0;">${escapeHtml(post.content)}</p>
        ${videoHtml}
      </div>

      <footer class="post-card__footer">
        <button class="like-btn ${isLiked ? 'like-btn--active' : ''}" data-post-id="${id}">
          <span class="like-icon">${isLiked ? '❤️' : '🤍'}</span>
          <span class="like-btn__count">${post.likesCount || 0}</span>
        </button>
      </footer>
    </article>
  `;
};

// ─────────────────────────────────────────────────────────────────
// 3. Utilities
// ─────────────────────────────────────────────────────────────────

const escapeHtml = (str = '') =>
  String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');

const timeAgo = (date) => {
  if (!date) return 'Just now';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60)                  return 'Just now';
  if (seconds < 3600)               return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400)              return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
};

const formatVideoTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// ─────────────────────────────────────────────────────────────────
// 4. State & Data
// ─────────────────────────────────────────────────────────────────

let mockPosts = [
  {
    id: 'welcome-post',
    authorName: 'CodeSphere Team',
    avatarUrl: 'https://ui-avatars.com/api/?name=CS&background=0A0A0A&color=fff',
    content: 'Welcome to the restored local version of CodeSphere! The social feed is currently in read-only mode while we finalize the backend migration. You can still interact with posts locally.',
    likesCount: 12,
    likedBy: [],
    createdAt: new Date(Date.now() - 3600000), // 1h ago
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: 'dsa-tip',
    authorName: 'Alex Chen',
    content: 'Pro tip: When solving tree problems on LeetCode, always think about recursion first. It usually simplifies the complexity significantly!',
    likesCount: 45,
    likedBy: [],
    createdAt: new Date(Date.now() - 7200000), // 2h ago
    videoUrl: null
  }
];

// ─────────────────────────────────────────────────────────────────
// 5. Core Functions
// ─────────────────────────────────────────────────────────────────

const listenToFeed = () => {
  if (!feedContainer) return () => {};

  const userJson = sessionStorage.getItem('cs_user');
  const currentUser = userJson ? JSON.parse(userJson) : null;
  const currentUid = currentUser?.uid || 'guest';

  const render = () => {
    feedContainer.innerHTML = mockPosts
      .map(post => postCardTemplate(post.id, post, currentUid))
      .join('');
    
    // Wire up events for the newly rendered cards
    initLikeButtons();
    initVideoPlayers();
  };

  render();
  return () => {}; // Unsubscribe placeholder
};

const initLikeButtons = () => {
  document.querySelectorAll('.like-btn').forEach(btn => {
    // Avoid double listeners
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';

    btn.addEventListener('click', (e) => {
      const postId = btn.dataset.postId;
      const post = mockPosts.find(p => p.id === postId);
      if (!post) return;

      const userJson = sessionStorage.getItem('cs_user');
      const currentUser = userJson ? JSON.parse(userJson) : null;
      const currentUid = currentUser?.uid || 'guest';

      const isLiked = post.likedBy.includes(currentUid);
      
      if (isLiked) {
        post.likedBy = post.likedBy.filter(id => id !== currentUid);
        post.likesCount--;
      } else {
        post.likedBy.push(currentUid);
        post.likesCount++;
      }

      // Local UI update for responsiveness
      const countEl = btn.querySelector('.like-btn__count');
      const iconEl = btn.querySelector('.like-icon');
      
      if (countEl) countEl.textContent = post.likesCount;
      if (iconEl) iconEl.textContent = !isLiked ? '❤️' : '🤍';
      btn.classList.toggle('like-btn--active', !isLiked);
    });
  });
};

const initVideoPlayers = () => {
  document.querySelectorAll('.video-player:not(.video-player--youtube)').forEach(playerEl => {
    const videoEl    = playerEl.querySelector('.video-player__el');
    const playBtn    = playerEl.querySelector('.video-player__play-btn');
    const progressEl = playerEl.querySelector('.video-player__progress');
    const timeEl     = playerEl.querySelector('.video-player__time');

    if (!videoEl || !playBtn) return;
    if (videoEl.dataset.initialised === 'true') return;
    videoEl.dataset.initialised = 'true';

    playBtn.addEventListener('click', () => {
      if (videoEl.paused) {
        videoEl.play();
        playBtn.querySelector('.play-icon').textContent = '⏸';
      } else {
        videoEl.pause();
        playBtn.querySelector('.play-icon').textContent = '▶';
      }
    });

    videoEl.addEventListener('timeupdate', () => {
      if (!videoEl.duration) return;
      const pct = (videoEl.currentTime / videoEl.duration) * 100;
      if (progressEl) progressEl.value = pct;
      if (timeEl)     timeEl.textContent = formatVideoTime(videoEl.currentTime);
    });

    progressEl?.addEventListener('input', () => {
      if (!videoEl.duration) return;
      videoEl.currentTime = (progressEl.value / 100) * videoEl.duration;
    });

    videoEl.addEventListener('ended', () => {
      playBtn.querySelector('.play-icon').textContent = '▶';
      if (progressEl) progressEl.value = 0;
    });
  });
};

// ─────────────────────────────────────────────────────────────────
// 6. Bootstrap
// ─────────────────────────────────────────────────────────────────

const initFeed = () => {
  if (postForm) {
    postForm.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Sharing is currently disabled while legacy migration completes.');
    });
  }

  if (postVideoInput) {
    postVideoInput.addEventListener('change', () => {
      const file = postVideoInput.files?.[0];
      if (videoFileName) {
        videoFileName.textContent = file ? file.name : 'No file chosen';
      }
    });
  }
};

// Global listener for route changes
document.addEventListener('routechange', ({ detail }) => {
  if (detail.route === 'home' || detail.route === 'feed') {
    listenToFeed();
  }
});

// Auto-init on load if relevant elements exist
document.addEventListener('DOMContentLoaded', () => {
  initFeed();
  if (document.getElementById('feed-container') || document.getElementById('home-feed-grid')) {
    listenToFeed();
  }
});

// Public API
export const feed = { listenToFeed, timeAgo, initFeed };
window.CodeSphere       = window.CodeSphere ?? {};
window.CodeSphere.feed  = feed;
