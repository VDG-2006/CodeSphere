/**
 * js/auth/auth.js
 * CodeSphere Authentication Module
 */

import { API_BASE } from '../core/config.js';

export const auth = {
  init() {
    this.setupListeners();
    this.checkSession();
  },

  setupListeners() {
    document.getElementById('login-form')?.addEventListener('submit', (e) => this.handleAuth(e, 'login'));
    document.getElementById('signup-form')?.addEventListener('submit', (e) => this.handleAuth(e, 'register'));
    document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());
  },

  async handleAuth(e, type) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    try {
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      const endpoint = type === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = type === 'login' ? { 
        identifier: form.querySelector('input[type="email"]')?.value,
        password: form.querySelector('input[type="password"]')?.value
      } : {
        username: data.username,
        email: form.querySelector('input[type="email"]')?.value,
        password: form.querySelector('input[type="password"]')?.value,
        handles: { leetcode: data.leetcode, codeforces: data.codeforces }
      };

      const resp = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await resp.json();
      if (result.success) {
        sessionStorage.setItem('cs_user', JSON.stringify(result.data));
        sessionStorage.setItem('cs_token', result.token);
        window.location.hash = '#home';
        location.reload();
      } else {
        alert(result.message || 'Authentication failed');
      }
    } catch (err) {
      console.error('Auth Error:', err);
      alert('Network error. Please try again.');
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  checkSession() {
    const user = sessionStorage.getItem('cs_user');
    const isAuthRoute = ['#login', '#signup', '#getting-started'].includes(window.location.hash);
    
    document.body.classList.toggle('is-logged-in', !!user);
    
    if (user && isAuthRoute) {
      window.location.hash = '#home';
    }
  },

  logout() {
    sessionStorage.removeItem('cs_user');
    sessionStorage.removeItem('cs_token');
    window.location.hash = '#getting-started';
    location.reload();
  }
};

// auth.init() called from index.html boot
