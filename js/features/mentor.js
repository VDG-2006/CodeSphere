/**
 * mentor.js — CodeSphere AI Mentor Module (Floating Widget Version)
 * Updated: Proxying calls through the backend to protect API keys.
 * Unified: Using core utility functions.
 */

import { API_BASE } from '../core/config.js';
import { escapeHtml } from '../core/utils.js';

// ─────────────────────────────────────────────────────────────────
// DOM Elements
// ─────────────────────────────────────────────────────────────────

const toggleBtn     = document.getElementById('ai-mentor-toggle');
const windowEl      = document.getElementById('ai-mentor-window');
const closeBtn      = document.getElementById('ai-window-close');
const chatBody      = document.getElementById('ai-chat-body');
const input         = document.getElementById('ai-question');
const sendBtn       = document.getElementById('ask-ai-btn');

// ─────────────────────────────────────────────────────────────────
// Toggle Logic
// ─────────────────────────────────────────────────────────────────

export const toggleMentor = (e) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (!windowEl) return;
  const isHidden = windowEl.hidden;
  windowEl.hidden = !isHidden;
  toggleBtn?.classList.toggle('active', isHidden);
  
  if (isHidden) {
    input?.focus();
    if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
  }
};

const closeMentor = (e) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (!windowEl) return;
  windowEl.hidden = true;
  toggleBtn?.classList.remove('active');
};

toggleBtn?.addEventListener('click', toggleMentor);
closeBtn?.addEventListener('click', closeMentor);

// ─────────────────────────────────────────────────────────────────
// Chat Helpers
// ─────────────────────────────────────────────────────────────────

const appendMessage = (text, type = 'bot', isHtml = false) => {
  if (!chatBody) return;
  const msg = document.createElement('div');
  msg.className = `ai-message ai-message--${type}`;
  if (isHtml) {
    msg.innerHTML = text;
  } else {
    msg.textContent = text;
  }
  chatBody.appendChild(msg);
  chatBody.scrollTop = chatBody.scrollHeight;
  return msg;
};

const parseMarkdown = (text) => {
  if (!text) return '';
  if (text.length > 4000) text = text.substring(0, 4000) + '... (Truncated)';
  
  // Use core escapeHtml then apply markdown formatting
  let safeText = escapeHtml(text);
  
  return safeText
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
};

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
        'Authorization': `Bearer ${sessionStorage.getItem('cs_token')}`
      },
      body: JSON.stringify({ prompt: promptText })
    });

    const result = await response.json();
    if (result.success) {
      return result.reply;
    } else {
      return result.message || '⚠️ Mentor unavailable.';
    }
  } catch (error) {
    console.error('[Mentor] Request Error:', error);
    return '⚠️ Connection error. Please try again.';
  }
};

const handleAsk = async () => {
  const question = input?.value.trim();
  if (!question) return;

  input.value = '';
  appendMessage(question, 'user');

  if (sendBtn) sendBtn.disabled = true;
  const loadingMsg = appendMessage('Thinking...', 'bot');

  const reply = await askMentor(question);

  loadingMsg.remove();
  appendMessage(parseMarkdown(reply), 'bot', true);
  
  if (sendBtn) sendBtn.disabled = false;
};

sendBtn?.addEventListener('click', handleAsk);
input?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleAsk();
  }
});

// Global Exposure
window.CodeSphere = window.CodeSphere ?? {};
window.CodeSphere.mentor = { askMentor, toggle: toggleMentor };
