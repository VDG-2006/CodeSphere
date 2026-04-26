/**
 * js/core/utils.js
 * CodeSphere V2 Shared Utility functions
 */

/**
 * Escapes HTML characters to prevent XSS.
 */
export const escapeHtml = (str = '') => String(str).replace(/[&<>"']/g, match =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[match]
);

/**
 * Formats a unix timestamp into a human-readable or relative string.
 */
export const formatDate = (timestamp, format = 'relative') => {
  if (!timestamp) return '--';
  
  // Auto-detect if timestamp is in seconds or milliseconds
  const date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
  
  if (format === 'relative') {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }
  
  if (format === 'short') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  return date.toLocaleDateString();
};

/**
 * Basic debounce implementation.
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
