/**
 * mentor.js — CodeSphere AI Mentor Module
 * 
 * Handles:
 * 1. Dedicated AI Section Chat
 * 2. Floating Popup Chat
 * 3. Settings-based visibility toggle
 */

import { API_BASE } from '../core/config.js';
import { ConfigManager } from '../core/config.js';

// ─────────────────────────────────────────────────────────────────
// DOM Elements
// ─────────────────────────────────────────────────────────────────

// AI Section Elements
const aiSectionInput = document.getElementById('ai-section-input');
const aiSectionSend  = document.getElementById('ai-section-send');
const aiSectionChat  = document.getElementById('ai-section-chat');

// AI Popup Elements
const aiPopup       = document.getElementById('ai-popup');
const aiPopupInput  = document.getElementById('ai-popup-input');
const aiPopupSend   = document.getElementById('ai-popup-send');
const aiPopupMessages = document.getElementById('ai-popup-messages');
const aiPopupClose  = document.getElementById('ai-popup-close');
const askHelpBtn    = document.getElementById('ask-help-btn');

// ─────────────────────────────────────────────────────────────────
// Core Ask Logic (Proxied via Backend)
// ─────────────────────────────────────────────────────────────────

export const askMentor = async (promptText) => {
  if (!promptText?.trim()) return 'Please enter a question.';

  try {
    const response = await fetch(`${API_BASE}/mentor/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('cs_token')}`
      },
      body: JSON.stringify({ prompt: promptText })
    });

    const result = await response.json();
    return result.success ? result.reply : (result.message || '⚠️ Mentor unavailable.');
  } catch (error) {
    console.error('[Mentor] Request Error:', error);
    return '⚠️ Connection error. Please try again.';
  }
};

// ─────────────────────────────────────────────────────────────────
// UI Helpers
// ─────────────────────────────────────────────────────────────────

const createMessage = (text, isBot = false) => {
  const div = document.createElement('div');
  div.className = `message ${isBot ? 'message--bot' : 'message--user'}`;
  if (isBot && text.length < 50) div.classList.add('text-xs'); // For popup
  div.textContent = text;
  return div;
};

const createTypingIndicator = () => {
  const div = document.createElement('div');
  div.className = 'message message--bot ai-typing-wrapper';
  div.innerHTML = `
    <div class="ai-typing">
      <span></span><span></span><span></span>
    </div>
  `;
  return div;
};

const appendMessage = (container, text, isBot = false) => {
  if (!container) return;
  const msg = createMessage(text, isBot);
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
  return msg;
};

// ─────────────────────────────────────────────────────────────────
// Event Handlers
// ─────────────────────────────────────────────────────────────────

const handleSendMessage = async (inputEl, containerEl, buttonEl) => {
  const text = inputEl?.value.trim();
  if (!text) return;

  // 1. Clear input & Add user message
  inputEl.value = '';
  appendMessage(containerEl, text, false);

  // 2. Add loading state
  if (buttonEl) buttonEl.disabled = true;
  const indicator = createTypingIndicator();
  containerEl?.appendChild(indicator);
  containerEl.scrollTop = containerEl.scrollHeight;

  // 3. Get AI Response
  const reply = await askMentor(text);

  // 4. Remove loading & Add bot message
  indicator.remove();
  
  if (reply.includes('Rate Limit')) {
    appendMessage(containerEl, '⚠️ ' + reply, true);
  } else {
    appendMessage(containerEl, reply, true);
  }

  // 5. Cooldown: Keep button disabled for 2s to prevent spamming
  if (buttonEl) {
    setTimeout(() => {
      buttonEl.disabled = false;
    }, 2000);
  }
};

// ─────────────────────────────────────────────────────────────────
// Popup Controls
// ─────────────────────────────────────────────────────────────────

const togglePopup = () => {
  if (!aiPopup) return;
  const isActive = aiPopup.classList.toggle('active');
  if (isActive) aiPopupInput?.focus();
};

// ─────────────────────────────────────────────────────────────────
// Visibility Toggle (Settings)
// ─────────────────────────────────────────────────────────────────

const applyMentorVisibility = (config) => {
  const isVisible = config?.aiMentor?.visible !== false;
  if (askHelpBtn) {
    askHelpBtn.style.display = isVisible ? 'flex' : 'none';
  }
  // If hidden via settings, close the popup too
  if (!isVisible && aiPopup) aiPopup.classList.remove('active');
};

// ─────────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────────

const setupEventListeners = () => {
  // Section Events
  aiSectionSend?.addEventListener('click', () => handleSendMessage(aiSectionInput, aiSectionChat, aiSectionSend));
  aiSectionInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSendMessage(aiSectionInput, aiSectionChat, aiSectionSend);
  });

  // Popup Events
  askHelpBtn?.addEventListener('click', togglePopup);
  aiPopupClose?.addEventListener('click', togglePopup);
  aiPopupSend?.addEventListener('click', () => handleSendMessage(aiPopupInput, aiPopupMessages, aiPopupSend));
  aiPopupInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSendMessage(aiPopupInput, aiPopupMessages, aiPopupSend);
  });

  // Settings Update Listener
  window.addEventListener('cs-settings-update', (e) => {
    if (e.detail?.config) applyMentorVisibility(e.detail.config);
  });
};

const init = () => {
  setupEventListeners();
  
  // Initial visibility check
  const config = ConfigManager.get('aiMentor');
  applyMentorVisibility({ aiMentor: config });
};

// Start
document.addEventListener('DOMContentLoaded', init);

// ─────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────

window.CodeSphere = window.CodeSphere ?? {};
window.CodeSphere.mentor = { askMentor, togglePopup, applyMentorVisibility };
