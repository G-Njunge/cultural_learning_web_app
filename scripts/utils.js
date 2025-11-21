/**
 * Utility Functions Module
 * Common helper functions used throughout the application
 */

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 * @returns {Function} Debounced function
 */
export function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
}

/**
 * Throttle function to limit function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Format date to readable string with user preference support
 * @param {string|Date} date - Date to format
 * @param {string} userFormat - User's preferred date format (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY)
 * @returns {string} Formatted date string
 */
export function formatDate(date, userFormat = null) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  // If a specific user format is provided, use it
  if (userFormat) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    switch(userFormat) {
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }
  
  // Default fallback to short format
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return dateObj.toLocaleDateString('en-US', options);
}

/**
 * Format duration based on user's time unit preference
 * @param {number} hours - Duration in hours
 * @param {string} timeUnit - User's preferred time unit ('hours' or 'minutes')
 * @returns {string} Formatted duration string
 */
export function formatDuration(hours, timeUnit = 'hours') {
  if (timeUnit === 'minutes') {
    const totalMinutes = Math.round(hours * 60);
    return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
  }
  
  // Default to hours format
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (minutes === 0) {
    return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''}`;
  }
  
  return `${wholeHours}h ${minutes}m`;
}

/**
 * Calculate time until due date
 * @param {string|Date} dueDate - Due date
 * @returns {Object} Time information
 */
export function getTimeUntilDue(dueDate) {
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const now = new Date();
  const diffMs = due - now;
  
  if (isNaN(diffMs)) {
    return { status: 'invalid', message: 'Invalid date' };
  }
  
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { 
      status: 'overdue', 
      message: `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`,
      days: diffDays
    };
  } else if (diffDays === 0) {
    return { status: 'due-today', message: 'Due today', days: 0 };
  } else if (diffDays <= 3) {
    return { 
      status: 'due-soon', 
      message: `${diffDays} day${diffDays !== 1 ? 's' : ''} remaining`,
      days: diffDays
    };
  } else {
    return { 
      status: 'upcoming', 
      message: `${diffDays} day${diffDays !== 1 ? 's' : ''} remaining`,
      days: diffDays
    };
  }
}

/**
 * Generate random color for tags
 * @param {string} tag - Tag name
 * @returns {string} Hex color code
 */
export function generateTagColor(tag) {
  const colors = [
    '#6366f1', '#ec4899', '#06b6d4', '#10b981', '#f59e0b',
    '#ef4444', '#8b5cf6', '#06d6a0', '#ffd23f', '#ff6b6b'
  ];
  
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }
  
  if (typeof obj === 'object') {
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }
  
  return obj;
}

/**
 * Check if two objects are equal
 * @param {*} obj1 - First object
 * @param {*} obj2 - Second object
 * @returns {boolean} True if objects are equal
 */
export function isEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return false;
  
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 !== 'object') return obj1 === obj2;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (let key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!isEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

/**
 * Generate a unique identifier
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Unique identifier
 */
export function generateUniqueId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert string to title case
 * @param {string} str - String to convert
 * @returns {string} Title case string
 */
export function toTitleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Truncate string to specified length
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add
 * @returns {string} Truncated string
 */
export function truncate(str, length = 50, suffix = '...') {
  if (!str || str.length <= length) return str;
  return str.substring(0, length - suffix.length) + suffix;
}

/**
 * Remove HTML tags from string
 * @param {string} html - HTML string
 * @returns {string} Plain text string
 */
export function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML string
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Unescape HTML entities
 * @param {string} html - HTML string to unescape
 * @returns {string} Unescaped string
 */
export function unescapeHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current week date range
 * @returns {Object} Week start and end dates
 */
export function getCurrentWeek() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return {
    start: startOfWeek,
    end: endOfWeek
  };
}

/**
 * Check if date is in current week
 * @param {string|Date} date - Date to check
 * @returns {boolean} True if in current week
 */
export function isInCurrentWeek(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const week = getCurrentWeek();
  
  return dateObj >= week.start && dateObj <= week.end;
}

/**
 * Calculate percentage
 * @param {number} value - Current value
 * @param {number} total - Total value
 * @returns {number} Percentage (0-100)
 */
export function calculatePercentage(value, total) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Generate color gradient
 * @param {string} color1 - First color
 * @param {string} color2 - Second color
 * @param {string} direction - Gradient direction
 * @returns {string} CSS gradient string
 */
export function generateGradient(color1, color2, direction = 'to right') {
  return `linear-gradient(${direction}, ${color1}, ${color2})`;
}

/**
 * Detect mobile device
 * @returns {boolean} True if mobile device
 */
export function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Detect touch device
 * @returns {boolean} True if touch device
 */
export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get device pixel ratio
 * @returns {number} Device pixel ratio
 */
export function getDevicePixelRatio() {
  return window.devicePixelRatio || 1;
}

/**
 * Smooth scroll to element
 * @param {string|Element} target - Target element or selector
 * @param {number} offset - Scroll offset
 */
export function smoothScrollTo(target, offset = 0) {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  
  if (element) {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;
    
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy text:', error);
    return false;
  }
}

/**
 * Download file from data
 * @param {string} data - File data
 * @param {string} filename - File name
 * @param {string} type - MIME type
 */
export function downloadFile(data, filename, type = 'text/plain') {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Parse JSON safely
 * @param {string} json - JSON string
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed object or default value
 */
export function safeJsonParse(json, defaultValue = null) {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return defaultValue;
  }
}

/**
 * Stringify JSON safely
 * @param {*} obj - Object to stringify
 * @param {string} defaultValue - Default value if stringify fails
 * @returns {string} JSON string or default value
 */
export function safeJsonStringify(obj, defaultValue = '{}') {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    console.warn('Failed to stringify JSON:', error);
    return defaultValue;
  }
}
