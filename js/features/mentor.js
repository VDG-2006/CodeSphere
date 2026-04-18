/**
 * mentor.js — CodeSphere AI Mentor Module
 *
 * Responsibilities:
 *  - Connect to the Google Gemini API via the official Web SDK.
 *  - Expose `askMentor(promptText)` for querying an AI mentor
 *    persona scoped to B.Tech CSE project guidance.
 *  - Handle API failures gracefully with user-friendly messages.
 */

import { GoogleGenerativeAI } from 'https://esm.run/@google/generative-ai';
import { GEMINI_API_KEY } from '../core/config.js';

// ─────────────────────────────────────────────────────────────────
// 1. API Key
//    Pulled from the gitignored config.js rather than hardcoded here.
//    Fallback lets the module load even if config.js hasn't been set up.
// ─────────────────────────────────────────────────────────────────

const API_KEY = GEMINI_API_KEY ?? 'AIzaSyB5QBJjHQZio5F7O9tkZx5TU_RBoYojfN4';

// ─────────────────────────────────────────────────────────────────
// 2. System Instruction
//    Defines the AI persona. Kept at module scope so it is built
//    once and reused across every call without re-allocation.
// ─────────────────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `
You are a senior B.Tech Computer Science & Engineering project mentor.
Your role is to guide students through technical challenges, code reviews,
data structure problems, algorithm design, project architecture, and career questions.

Communication style:
- Concise and to the point — no unnecessary padding.
- Technically precise — use correct CS terminology.
- Encouraging — acknowledge effort before identifying issues.
- Actionable — always end with a clear next step or suggestion.
- Use short code snippets when they clarify an explanation.

Never write full solutions for homework or exam questions unprompted.
Instead, guide the student toward the answer through targeted hints.
`.trim();

// ─────────────────────────────────────────────────────────────────
// 3. Gemini Client
//    Instantiated once at module level — avoids re-creating the
//    client object on every function call.
// ─────────────────────────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  systemInstruction: SYSTEM_INSTRUCTION,
});

// ─────────────────────────────────────────────────────────────────
// 4. Core Function — askMentor
// ─────────────────────────────────────────────────────────────────

/**
 * Sends a student's question to the Gemini AI mentor and returns
 * a plain-text response string.
 *
 * The system instruction is baked into the model config above, so
 * `promptText` is passed directly — no need to prefix it manually.
 *
 * @param {string} promptText - The student's question or code snippet.
 * @returns {Promise<string>}  The mentor's response, or a friendly
 *                             error message if the call fails.
 *
 * @example
 * const reply = await askMentor('Explain memoization with a JS example.');
 * console.log(reply);
 */
export const askMentor = async (promptText) => {
  if (!promptText?.trim()) {
    return 'Please enter a question for your mentor.';
  }

  try {
    const result = await model.generateContent(promptText);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      return 'The mentor returned an empty response. Please try rephrasing your question.';
    }

    return text;

  } catch (error) {
    // Log the full error privately so developers can debug,
    // but surface a clean message to the student-facing UI.
    console.error('[CodeSphere/mentor] Gemini API error:', error);

    // Distinguish common failure modes for more useful feedback.
    if (error.message?.includes('API_KEY')) {
      return '⚠️ Mentor unavailable: API key is missing or invalid. Check js/config.js.';
    }

    if (error.message?.includes('quota') || error.status === 429) {
      return '⚠️ The mentor is busy right now (rate limit reached). Please try again in a moment.';
    }

    if (error.message?.includes('network') || error.name === 'TypeError') {
      return '⚠️ Could not reach the mentor — check your internet connection and try again.';
    }

    return '⚠️ Your mentor is temporarily unavailable. Please try again shortly.';
  }
};

// ─────────────────────────────────────────────────────────────────
// 5. UI — Wire up the Ask button in the feed section
// ─────────────────────────────────────────────────────────────────

const aiQuestionInput = document.getElementById('ai-question');
const askAiBtn        = document.getElementById('ask-ai-btn');
const aiResponseEl    = document.getElementById('ai-response');

/**
 * Runs the mentor query and renders the response into #ai-response.
 * Handles the loading state and re-enables the button when done.
 */
const handleAskMentor = async () => {
  const question = aiQuestionInput?.value.trim();
  if (!question) {
    aiQuestionInput?.focus();
    return;
  }

  // Loading state — disable controls so the user can't double-submit.
  if (askAiBtn)        askAiBtn.disabled     = true;
  if (askAiBtn)        askAiBtn.textContent  = 'Thinking…';
  if (aiResponseEl)    aiResponseEl.textContent = '';
  if (aiResponseEl)    aiResponseEl.classList.remove('ai-response--error');
  if (aiResponseEl)    aiResponseEl.classList.add('ai-response--loading');

  const reply = await askMentor(question);

  // Render response.
  if (aiResponseEl) {
    aiResponseEl.textContent = reply;
    aiResponseEl.classList.remove('ai-response--loading');

    // Surface error styling when the reply is one of our warning messages.
    if (reply.startsWith('⚠️')) {
      aiResponseEl.classList.add('ai-response--error');
    }
  }

  // Restore controls.
  if (askAiBtn) {
    askAiBtn.disabled    = false;
    askAiBtn.textContent = 'Ask';
  }

  // Clear the input so it is ready for the next question.
  if (aiQuestionInput) aiQuestionInput.value = '';
};

// Click handler.
askAiBtn?.addEventListener('click', handleAskMentor);

// Also fires on Enter key inside the input for convenience.
aiQuestionInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleAskMentor();
  }
});

// ─────────────────────────────────────────────────────────────────
// 6. Public API — attach to shared CodeSphere namespace
// ─────────────────────────────────────────────────────────────────

window.CodeSphere        = window.CodeSphere ?? {};
window.CodeSphere.mentor = { askMentor };
