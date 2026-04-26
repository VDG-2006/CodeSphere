/**
 * mentor.js — CodeSphere AI Mentor Module
 * 
 * Proxies AI calls through the backend to protect API keys.
 * Works with the inline AI Mentor card in the feed section.
 */

import { API_BASE } from '../core/config.js';

// ─────────────────────────────────────────────────────────────────
// DOM Elements (Inline AI Mentor Card)
// ─────────────────────────────────────────────────────────────────

const aiQuestionInput = document.getElementById('ai-question');
const askAiBtn        = document.getElementById('ask-ai-btn');
const aiResponseEl    = document.getElementById('ai-response');

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

// ─────────────────────────────────────────────────────────────────
// UI Handler — Inline Card
// ─────────────────────────────────────────────────────────────────

const handleAskMentor = async () => {
  const question = aiQuestionInput?.value.trim();
  if (!question) {
    aiQuestionInput?.focus();
    return;
  }

  // Loading state
  if (askAiBtn)     askAiBtn.disabled     = true;
  if (askAiBtn)     askAiBtn.textContent  = 'Thinking…';
  if (aiResponseEl) aiResponseEl.textContent = '';
  if (aiResponseEl) aiResponseEl.classList.remove('ai-response--error');
  if (aiResponseEl) aiResponseEl.classList.add('ai-response--loading');

  const reply = await askMentor(question);

  // Render response
  if (aiResponseEl) {
    aiResponseEl.textContent = reply;
    aiResponseEl.classList.remove('ai-response--loading');

    if (reply.startsWith('⚠️')) {
      aiResponseEl.classList.add('ai-response--error');
    }
  }

  // Restore controls
  if (askAiBtn) {
    askAiBtn.disabled    = false;
    askAiBtn.textContent = 'Ask';
  }

  // Clear input
  if (aiQuestionInput) aiQuestionInput.value = '';
};

// Click handler
askAiBtn?.addEventListener('click', handleAskMentor);

// Enter key handler
aiQuestionInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleAskMentor();
  }
});

// ─────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────

window.CodeSphere        = window.CodeSphere ?? {};
window.CodeSphere.mentor = { askMentor };
