/**
 * mentor.js — CodeSphere AI Mentor Module (Floating Widget Version)
 * Handles the fixed bottom-right AI assistant widget.
 */

import { GoogleGenerativeAI } from 'https://esm.run/@google/generative-ai';
import { GEMINI_API_KEY } from '../core/config.js';

const API_KEY = GEMINI_API_KEY ?? 'AIzaSyB5QBJjHQZio5F7O9tkZx5TU_RBoYojfN4';

const SYSTEM_INSTRUCTION = `
You are a senior B.Tech Computer Science & Engineering project mentor.
Your role is to guide students through technical challenges, code reviews,
data structure problems, algorithm design, project architecture, and career questions.

Communication style:
- Concise and to the point.
- Technically precise.
- Actionable advice.
`.trim();

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  systemInstruction: SYSTEM_INSTRUCTION,
});

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

const appendMessage = (text, type = 'bot') => {
  if (!chatBody) return;
  const msg = document.createElement('div');
  msg.className = `ai-message ai-message--${type}`;
  msg.textContent = text;
  chatBody.appendChild(msg);
  chatBody.scrollTop = chatBody.scrollHeight;
  return msg;
};

// ─────────────────────────────────────────────────────────────────
// Core Ask Logic
// ─────────────────────────────────────────────────────────────────

export const askMentor = async (promptText) => {
  if (!promptText?.trim()) return 'Please enter a question.';

  try {
    const result = await model.generateContent(promptText);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('[Mentor] Error:', error);
    return '⚠️ Mentor unavailable. Please try again.';
  }
};

const handleAsk = async () => {
  const question = input?.value.trim();
  if (!question) return;

  // Clear input
  input.value = '';

  // User message
  appendMessage(question, 'user');

  // Loading state
  if (sendBtn) sendBtn.disabled = true;
  const loadingMsg = appendMessage('Thinking...', 'bot');
  loadingMsg.style.opacity = '0.7';

  const reply = await askMentor(question);

  // Remove loading and show reply
  loadingMsg.remove();
  appendMessage(reply, 'bot');
  
  if (sendBtn) sendBtn.disabled = false;
};

sendBtn?.addEventListener('click', handleAsk);
input?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleAsk();
  }
});

// ─────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────

window.CodeSphere = window.CodeSphere ?? {};
window.CodeSphere.mentor = { askMentor, toggle: toggleMentor };
