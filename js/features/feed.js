/**
 * feed.js — CodeSphere Social Feed Module
 *
 * Responsibilities:
 *  - Listen to the Firestore `posts` collection in real time.
 *  - Render post cards (with optional custom video player).
 *  - Handle the Like toggle via event delegation.
 *  - Handle new text post creation.
 *  - Provide a clean timeAgo utility for human-readable timestamps.
 */

import { db } from '../core/firebase.js';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';


// ─────────────────────────────────────────────────────────────────
// DOM References
// ─────────────────────────────────────────────────────────────────

const feedContainer  = document.getElementById('feed-container') || document.getElementById('home-feed-grid');
const postForm       = document.getElementById('post-form');
const postContent    = document.getElementById('post-content');
const postSubmitBtn  = document.getElementById('post-submit-btn');
const postVideoInput = document.getElementById('post-video');
const videoFileName  = document.getElementById('video-file-name');

// Safe Initialization
const initFeed = () => {
  if (postForm) {
    postForm.addEventListener('submit', (en) => { /* logic */ });
  }
};

// ─────────────────────────────────────────────────────────────────
// 1. Utility — timeAgo
// ─────────────────────────────────────────────────────────────────

/**
 * Converts a Firestore Timestamp (or JS Date) into a human-readable
 * relative time string.
 *
 * Thresholds:
 *   < 60 s   → "Just now"
 *   < 60 min → "Xm ago"
 *   < 24 h   → "Xh ago"
 *   < 30 d   → "Xd ago"
 *   else     → "X weeks ago" / locale date string
 *
 * @param {import('firebase/firestore').Timestamp | Date | null} firebaseTimestamp
 * @returns {string}
 */
const timeAgo = (firebaseTimestamp) => {
  if (!firebaseTimestamp) return 'Just now';

  // Firestore Timestamps expose .toDate(); plain Dates pass straight through.
  const date    = firebaseTimestamp.toDate?.() ?? new Date(firebaseTimestamp);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60)                  return 'Just now';
  if (seconds < 3_600)               return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400)              return `${Math.floor(seconds / 3_600)}h ago`;
  if (seconds < 2_592_000)           return `${Math.floor(seconds / 86_400)}d ago`;
  if (seconds < 31_536_000)          return `${Math.floor(seconds / 604_800)}w ago`;
  return date.toLocaleDateString();
};

// ─────────────────────────────────────────────────────────────────
// 2. Template — Custom Video Player
// ─────────────────────────────────────────────────────────────────

const videoPlayerTemplate = (videoUrl, postId) => {
  // If it's a direct mp4 upload or non-YouTube
  if (!videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be')) {
    return /* html */ `
      <div class="video-player" data-post-id="${postId}">
        <video
          class="video-player__el"
          id="video-${postId}"
          src="${videoUrl}"
          preload="metadata"
          playsinline
        ></video>
        <div class="video-player__controls">
          <button
            class="video-player__play-btn"
            data-video-id="video-${postId}"
            aria-label="Play video"
            type="button"
          >
            <span class="play-icon" aria-hidden="true">▶</span>
          </button>

          <div class="video-player__progress-wrap">
            <input
              class="video-player__progress"
              id="progress-${postId}"
              type="range"
              min="0"
              max="100"
              value="0"
              step="0.1"
              aria-label="Video seek bar"
            />
          </div>

          <span class="video-player__time" id="time-${postId}">0:00</span>
        </div>
      </div>
    `;
  }

  // YouTube Extract
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = videoUrl.match(ytRegex);
  const videoId = match ? match[1] : null;

  if (videoId) {
    return /* html */ `
      <div class="video-container" style="opacity: 0; transform: translateY(10px); animation: fadeUp 0.6s ease forwards;">
        <iframe 
          src="https://www.youtube.com/embed/${videoId}?autoplay=0" 
          title="YouTube video player" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      </div>
    `;
  }
  return '';
};

// ─────────────────────────────────────────────────────────────────
// 3. Template — Post Card
// ─────────────────────────────────────────────────────────────────

/**
 * Generates the full HTML markup for a single feed post card.
 *
 * @param {string} postId    - Firestore document ID.
 * @param {object} data      - Firestore document data.
 * @param {string} currentUid - UID of the currently signed-in user.
 * @returns {string} HTML markup string.
 */
const postCardTemplate = (postId, data, currentUid) => {
  const {
    authorName    = 'Anonymous',
    authorUid     = '',
    content       = '',
    likesCount    = 0,
    likedBy       = [],
    createdAt     = null,
    videoUrl      = null,
    avatarUrl     = null,
  } = data;

  const hasLiked    = likedBy.includes(currentUid);
  const avatarSrc   = avatarUrl
    ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=0a0a0a&color=fff&size=36`;
  const timestamp   = timeAgo(createdAt);
  const likeLabel   = hasLiked ? 'Unlike' : 'Like';
  const likedClass  = hasLiked ? 'like-btn--active' : '';

  // Only render the video section when a URL is present.
  const videoSection = videoUrl
    ? videoPlayerTemplate(videoUrl, postId)
    : '';

  return /* html */ `
    <article class="post-card" id="post-${postId}" data-post-id="${postId}">

      <header class="post-card__header">
        <img
          class="post-card__avatar"
          src="${avatarSrc}"
          alt="${authorName}'s avatar"
          width="36"
          height="36"
          loading="lazy"
        />
        <div class="post-card__author-block">
          <span class="post-card__author">${escapeHtml(authorName)}</span>
          <span class="post-card__handle">@${escapeHtml(authorName.toLowerCase().replace(/\s+/g, ''))}</span>
        </div>
        <time class="post-card__timestamp" datetime="${createdAt?.toDate?.().toISOString() ?? ''}">
          ${timestamp}
        </time>
      </header>

      <div class="post-card__body">
        <p class="post-card__text">${escapeHtml(content)}</p>
        ${videoSection}
      </div>

      <footer class="post-card__footer">
        <button
          class="like-btn ${likedClass}"
          data-action="like"
          data-post-id="${postId}"
          data-liked="${hasLiked}"
          aria-label="${likeLabel} this post"
          aria-pressed="${hasLiked}"
          type="button"
        >
          <span class="like-btn__icon" aria-hidden="true">${hasLiked ? '❤️' : '🤍'}</span>
          <span class="like-btn__count">${likesCount}</span>
        </button>
      </footer>

    </article>
  `;
};

// ─────────────────────────────────────────────────────────────────
// 4. Security — HTML Escape
// ─────────────────────────────────────────────────────────────────

/**
 * Escapes a string for safe injection into innerHTML.
 * Prevents XSS from user-supplied content (names, post text, etc.).
 *
 * @param {string} str
 * @returns {string}
 */
const escapeHtml = (str = '') =>
  String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');

// ─────────────────────────────────────────────────────────────────
// 5. Real-time Feed — onSnapshot Listener
// ─────────────────────────────────────────────────────────────────

/**
 * Opens a persistent real-time listener on the `posts` Firestore
 * collection, ordered by `createdAt` descending (newest first).
 *
 * Every time the collection changes (new post, like update, deletion),
 * the entire feed is re-rendered. For a production app this would be
 * diffed; at this scale a full re-render is acceptable and keeps the
 * logic simple.
 *
 * @returns {Function} The `onSnapshot` unsubscribe function — call
 *   this when the feed section unmounts to avoid memory leaks.
 */
const listenToFeed = () => {
  if (!feedContainer) {
    console.warn('[CodeSphere/feed] #feed-container not found in DOM.');
    return () => {};
  }

  const postsRef    = collection(db, 'posts');
  const postsQuery  = query(postsRef, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(
    postsQuery,
    (snapshot) => {
      // Obtain the current user's UID from the shared auth namespace.
      const currentUid = window.CodeSphere?.auth?.getCurrentUser()?.uid ?? '';

      if (snapshot.empty) {
        feedContainer.innerHTML = emptyFeedTemplate();
        return;
      }

      const html = snapshot.docs
        .map(docSnap => postCardTemplate(docSnap.id, docSnap.data(), currentUid))
        .join('');

      feedContainer.innerHTML = html;

      // Attach video player interactivity to any newly rendered players.
      initVideoPlayers();
    },
    (error) => {
      console.warn('[CodeSphere/feed] onSnapshot error:', error);
      if (feedContainer) {
        feedContainer.innerHTML = errorFeedTemplate(error);
      }
    }
  );

  return unsubscribe;
};

// ─────────────────────────────────────────────────────────────────
// 6. Empty / Error State Templates
// ─────────────────────────────────────────────────────────────────

const emptyFeedTemplate = () => /* html */ `
  <div class="feed-empty">
    <span class="feed-empty__icon" aria-hidden="true">🛠️</span>
    <p class="feed-empty__text">No posts yet. Be the first to share something!</p>
  </div>
`;

const errorFeedTemplate = (error) => {
  const isBlocked = error?.message?.includes('failed') || error?.name?.includes('FirebaseError');
  return /* html */ `
    <div class="feed-empty feed-empty--error" style="grid-column: 1 / -1; padding: 40px; text-align: center; background: var(--color-bg-secondary); border-radius: 12px; border: 1px solid var(--color-border); margin: 20px;">
      <span class="feed-empty__icon" style="font-size: 32px; display: block; margin-bottom: 16px;" aria-hidden="true">${isBlocked ? '🚫' : '⚠️'}</span>
      <h3 style="color: var(--color-text-primary); margin-bottom: 8px;">${isBlocked ? 'Connection Blocked' : 'Could Not Load Feed'}</h3>
      <p class="feed-empty__text" style="color: var(--color-text-muted); font-size: 14px; max-width: 300px; margin: 0 auto;">
        ${isBlocked ? 'Your browser or ad-blocker is preventing a connection to the social feed. Please disable blockers for this site.' : 'An unexpected error occurred while loading posts. Please refresh or try again later.'}
      </p>
    </div>
  `;
};

// ─────────────────────────────────────────────────────────────────
// 7. Like System — Event Delegation
// ─────────────────────────────────────────────────────────────────

/**
 * Handles all click events on the feed container.
 * Using delegation means we attach ONE listener to the parent and
 * never need to re-attach as cards are added/removed by onSnapshot.
 */
feedContainer?.addEventListener('click', async (e) => {
  const likeBtn = e.target.closest('[data-action="like"]');
  if (!likeBtn) return;

  const postId    = likeBtn.dataset.postId;
  const hasLiked  = likeBtn.dataset.liked === 'true';
  const currentUid = window.CodeSphere?.auth?.getCurrentUser()?.uid;

  if (!currentUid) {
    console.warn('[CodeSphere/feed] Like attempted while signed out.');
    return;
  }

  if (!postId) return;

  // Optimistically disable the button while the write is in-flight
  // to prevent accidental double-taps.
  likeBtn.disabled = true;

  try {
    const postRef = doc(db, 'posts', postId);

    if (hasLiked) {
      // User is un-liking: remove their UID and decrement the count.
      await updateDoc(postRef, {
        likedBy:    arrayRemove(currentUid),
        likesCount: Math.max(0, (parseInt(likeBtn.querySelector('.like-btn__count').textContent, 10) || 1) - 1),
      });
    } else {
      // User is liking: add their UID and increment the count.
      await updateDoc(postRef, {
        likedBy:    arrayUnion(currentUid),
        likesCount: (parseInt(likeBtn.querySelector('.like-btn__count').textContent, 10) || 0) + 1,
      });
    }
    // onSnapshot re-renders the card automatically — no local DOM patch needed.
  } catch (error) {
    console.error('[CodeSphere/feed] Like update failed:', error);
    likeBtn.disabled = false;
  }
});

// ─────────────────────────────────────────────────────────────────
// 8. Create Post
// ─────────────────────────────────────────────────────────────────

const postVideoUrlInput = document.getElementById('post-video-url');

postForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const content    = postContent?.value.trim();
  const ytUrl      = postVideoUrlInput?.value.trim() || null;
  const currentUser = window.CodeSphere?.auth?.getCurrentUser();

  if (!content && !ytUrl) {
    postContent?.focus();
    return;
  }

  if (!currentUser) {
    console.warn('[CodeSphere/feed] Post attempted while signed out.');
    return;
  }

  // Loading state.
  if (postSubmitBtn) {
    postSubmitBtn.disabled    = true;
    postSubmitBtn.textContent = 'Posting…';
  }

  try {
    await addDoc(collection(db, 'posts'), {
      authorUid:  currentUser.uid,
      authorName: currentUser.displayName ?? currentUser.email.split('@')[0],
      avatarUrl:  currentUser.photoURL ?? null,
      content,
      likesCount: 0,
      likedBy:    [],
      videoUrl:   ytUrl,
      createdAt:  serverTimestamp(),
    });

    // Clear the form after a successful write.
    postContent.value = '';
    if (postVideoUrlInput) postVideoUrlInput.value = '';
    if (videoFileName) videoFileName.textContent = 'No file chosen';
    if (postVideoInput) postVideoInput.value = '';

  } catch (error) {
    console.error('[CodeSphere/feed] addDoc failed:', error);
  } finally {
    if (postSubmitBtn) {
      postSubmitBtn.disabled    = false;
      postSubmitBtn.textContent = 'Post';
    }
  }
});

// ─────────────────────────────────────────────────────────────────
// 9. File Input — display selected filename in the UI
// ─────────────────────────────────────────────────────────────────

postVideoInput?.addEventListener('change', () => {
  const file = postVideoInput.files?.[0];
  if (videoFileName) {
    videoFileName.textContent = file ? file.name : 'No file chosen';
  }
});

// ─────────────────────────────────────────────────────────────────
// 10. Custom Video Player Controls
// ─────────────────────────────────────────────────────────────────

/**
 * Scans the feed for `.video-player` elements and wires up the custom
 * play/pause button and scrub bar for each one.
 *
 * Called after every onSnapshot render cycle so newly injected players
 * are always interactive.
 */
const initVideoPlayers = () => {
  document.querySelectorAll('.video-player').forEach(playerEl => {
    const videoId    = playerEl.dataset.postId;
    const videoEl    = playerEl.querySelector('.video-player__el');
    const playBtn    = playerEl.querySelector('.video-player__play-btn');
    const progressEl = playerEl.querySelector('.video-player__progress');
    const timeEl     = playerEl.querySelector('.video-player__time');

    if (!videoEl || !playBtn) return;

    // Guard: skip if already initialised to avoid duplicate listeners.
    if (videoEl.dataset.initialised === 'true') return;
    videoEl.dataset.initialised = 'true';

    // Play / Pause toggle.
    playBtn.addEventListener('click', () => {
      if (videoEl.paused) {
        videoEl.play();
        playBtn.querySelector('.play-icon').textContent = '⏸';
        playBtn.setAttribute('aria-label', 'Pause video');
      } else {
        videoEl.pause();
        playBtn.querySelector('.play-icon').textContent = '▶';
        playBtn.setAttribute('aria-label', 'Play video');
      }
    });

    // Sync progress bar width as the video plays.
    videoEl.addEventListener('timeupdate', () => {
      if (!videoEl.duration) return;
      const pct = (videoEl.currentTime / videoEl.duration) * 100;
      if (progressEl) progressEl.value = pct;
      if (timeEl)     timeEl.textContent = formatVideoTime(videoEl.currentTime);
    });

    // Allow scrubbing via the range input.
    progressEl?.addEventListener('input', () => {
      if (!videoEl.duration) return;
      videoEl.currentTime = (progressEl.value / 100) * videoEl.duration;
    });

    // Reset play button icon when the video ends.
    videoEl.addEventListener('ended', () => {
      if (playBtn) {
        playBtn.querySelector('.play-icon').textContent = '▶';
        playBtn.setAttribute('aria-label', 'Play video');
      }
      if (progressEl) progressEl.value = 0;
    });
  });
};

/**
 * Formats a number of seconds as "M:SS".
 *
 * @param {number} seconds
 * @returns {string}
 */
const formatVideoTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// ─────────────────────────────────────────────────────────────────
// 11. Bootstrap — start listening when the feed route is active
// ─────────────────────────────────────────────────────────────────

/**
 * Starts the Firestore real-time listener and stores the unsubscribe
 * function so it can be called if the user logs out or navigates away.
 *
 * We listen for the custom `routechange` event emitted by router.js
 * so the listener only opens when the feed section is actually visible.
 */
let feedUnsubscribe = null;

document.addEventListener('routechange', ({ detail }) => {
  if (detail.route === 'home' || detail.route === 'feed') {
    // Start listening if not already active.
    if (!feedUnsubscribe) {
      feedUnsubscribe = listenToFeed();
    }
  } else {
    // Tear down the listener when leaving the feed to conserve reads.
    if (feedUnsubscribe) {
      feedUnsubscribe();
      feedUnsubscribe = null;
    }
  }
});

// ─────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────

window.CodeSphere       = window.CodeSphere ?? {};
window.CodeSphere.feed  = { listenToFeed, timeAgo };
