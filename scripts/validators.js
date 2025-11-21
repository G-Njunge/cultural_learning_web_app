/**
 * Validators Module - Regex validation and input sanitization
 * Implements comprehensive validation rules including advanced regex patterns
 */

/**
 * Validation rules and their corresponding regex patterns
 */
export const VALIDATION_RULES = {
  // Basic validation rules
  title: {
    pattern: /^\S(?:.*\S)?$/,
    message: 'Title cannot have leading/trailing spaces and must contain at least one non-space character',
    test: (value) => value && value.trim().length > 0
  },
  
  duration: {
    pattern: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
    message: 'Duration must be a positive number with up to 2 decimal places',
    test: (value) => {
      const num = parseFloat(value);
      return !isNaN(num) && num > 0 && num <= 1000; // Max 1000 hours
    }
  },
  
  date: {
    // Accept either YYYY-MM-DD or YYYY-MM-DDTHH:MM (basic ISO date or ISO date+time)
    pattern: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(?:T([01]\d|2[0-3]):[0-5][0-9])?$/,
    message: 'Date must be in YYYY-MM-DD or YYYY-MM-DDTHH:MM format and be a valid date/time',
    test: (value) => {
      if (!value) return false;
      // If it's a pure date (YYYY-MM-DD), validate that exact date
      const parts = String(value).split('T');
      const datePart = parts[0];
      const date = new Date(datePart);
      if (!(date instanceof Date) || isNaN(date)) return false;
      if (date.toISOString().split('T')[0] !== datePart) return false;

      // If time present, validate HH:MM portion
      if (parts[1]) {
        return ADVANCED_PATTERNS.timeFormat.test(parts[1]);
      }

      return true;
    }
  },

  // Alias for tasks that reference dueDate directly
  dueDate: {
    pattern: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(?:T([01]\d|2[0-3]):[0-5][0-9])?$/,
    message: 'Due date must be in YYYY-MM-DD or YYYY-MM-DDTHH:MM format',
    test: (value) => {
      // reuse date logic
      const parts = String(value).split('T');
      const datePart = parts[0];
      const date = new Date(datePart);
      if (!(date instanceof Date) || isNaN(date)) return false;
      if (date.toISOString().split('T')[0] !== datePart) return false;
      if (parts[1]) return ADVANCED_PATTERNS.timeFormat.test(parts[1]);
      return true;
    }
  },

  // Time-only validator (used when validating separate time inputs)
  time: {
    pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    message: 'Time must be in HH:MM format',
    test: (value) => {
      if (!value) return true; // allow empty (optional)
      return ADVANCED_PATTERNS.timeFormat.test(value);
    }
  },
  
  tag: {
    pattern: /^[\w\s&(),-]+$/,
    message: 'Priority must be selected from the dropdown',
    test: (value) => value && value.trim().length > 0 && value.length <= 100
  },
  
  description: {
    pattern: /^[\s\S]*$/,
    message: 'Description contains invalid characters',
    test: (value) => value === null || value === undefined || value.length <= 1000
  }
};

/**
 * Advanced regex patterns for search and validation
 */
export const ADVANCED_PATTERNS = {
  // Back-reference pattern to detect duplicate words
  duplicateWords: /\b(\w+)\s+\1\b/,
  
  // Lookahead pattern for strong passwords (8+ chars, uppercase, lowercase, number, special)
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  
  // Lookbehind pattern to find words that start with specific letters
  startsWithLetter: (letter) => new RegExp(`(?<=\\b)${letter}\\w*`, 'gi'),
  
  // Time format validation (HH:MM or H:MM)
  timeFormat: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  
  // Email validation with lookahead
  email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  
  // URL validation
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  
  // ISBN validation (10 or 13 digits)
  isbn: /^(?:\d{10}|\d{13})$/,
  
  // Credit card number validation (basic pattern)
  creditCard: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
  
  // Phone number validation (various formats)
  phoneNumber: /^[\+]?[1-9][\d]{0,15}$/,
  
  // Social Security Number (US format)
  ssn: /^\d{3}-?\d{2}-?\d{4}$/,
  
  // ZIP code validation (US format)
  zipCode: /^\d{5}(-\d{4})?$/
};

/**
 * Validate a single field using its validation rule
 * @param {string} fieldName - Name of the field to validate
 * @param {string} value - Value to validate
 * @returns {Object} Validation result
 */
export function validateField(fieldName, value) {
  const rule = VALIDATION_RULES[fieldName];
  
  if (!rule) {
    return {
      isValid: true,
      message: '',
      error: 'Unknown field'
    };
  }
  
  // Check if value passes the test function
  if (!rule.test(value)) {
    return {
      isValid: false,
      message: rule.message,
      error: 'Validation failed'
    };
  }
  
  // Check regex pattern
  if (!rule.pattern.test(value)) {
    return {
      isValid: false,
      message: rule.message,
      error: 'Pattern mismatch'
    };
  }
  
  return {
    isValid: true,
    message: '',
    error: null
  };
}

/**
 * Validate a complete task object
 * @param {Object} task - Task object to validate
 * @returns {Object} Validation result with detailed field errors
 */
export function validateTask(task) {
  const result = {
    isValid: true,
    errors: {},
    warnings: []
  };
  
  // Required fields
  const requiredFields = ['title', 'dueDate', 'duration', 'tag'];
  
  for (const field of requiredFields) {
    if (!task[field]) {
      result.isValid = false;
      result.errors[field] = `${field} is required`;
      continue;
    }
    
    const validation = validateField(field, task[field]);
    if (!validation.isValid) {
      result.isValid = false;
      result.errors[field] = validation.message;
    }
  }
  
  // Optional fields
  if (task.description && task.description.trim()) {
    const validation = validateField('description', task.description);
    if (!validation.isValid) {
      result.warnings.push(`Description: ${validation.message}`);
    }
  }
  
  // Additional business logic validations
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dueDate < today) {
      result.warnings.push('Due date is in the past');
    }
  }
  
  if (task.duration && parseFloat(task.duration) > 24) {
    result.warnings.push('Duration seems unusually long (over 24 hours)');
  }
  
  return result;
}

/**
 * Sanitize input to prevent XSS and other security issues
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Compile a regex pattern safely with error handling
 * @param {string} pattern - Regex pattern string
 * @param {string} flags - Regex flags (default: 'i')
 * @returns {Object} Compilation result
 */
export function compileRegex(pattern, flags = 'i') {
  try {
    if (!pattern || pattern.trim() === '') {
      return {
        success: false,
        regex: null,
        error: 'Empty pattern'
      };
    }
    
    const regex = new RegExp(pattern, flags);
    return {
      success: true,
      regex: regex,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      regex: null,
      error: error.message
    };
  }
}

/**
 * Test a regex pattern against text
 * @param {string} text - Text to test against
 * @param {string} pattern - Regex pattern
 * @param {string} flags - Regex flags
 * @returns {Object} Test result
 */
export function testRegex(text, pattern, flags = 'i') {
  const compilation = compileRegex(pattern, flags);
  
  if (!compilation.success) {
    return {
      success: false,
      matches: [],
      error: compilation.error
    };
  }
  
  try {
    const matches = [];
    let match;
    const regex = compilation.regex;
    
    // Reset regex lastIndex for global flag
    regex.lastIndex = 0;
    
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        match: match[0],
        index: match.index,
        groups: match.slice(1)
      });
      
      // Prevent infinite loop with zero-width matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
    
    return {
      success: true,
      matches: matches,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      matches: [],
      error: error.message
    };
  }
}

/**
 * Highlight matches in text using regex pattern
 * @param {string} text - Text to highlight matches in
 * @param {RegExp} regex - Compiled regex pattern
 * @returns {string} HTML with highlighted matches
 */
export function highlightMatches(text, regex) {
  if (!regex || !text) return text;
  
  try {
    return text.replace(regex, '<mark>$&</mark>');
  } catch (error) {
    console.error('Error highlighting matches:', error);
    return text;
  }
}

/**
 * Validate email format using advanced regex
 * @param {string} email - Email to validate
 * @returns {boolean} Valid status
 */
export function validateEmail(email) {
  return ADVANCED_PATTERNS.email.test(email);
}

/**
 * Validate URL format using advanced regex
 * @param {string} url - URL to validate
 * @returns {boolean} Valid status
 */
export function validateUrl(url) {
  return ADVANCED_PATTERNS.url.test(url);
}

/**
 * Check for duplicate words in text using back-reference
 * @param {string} text - Text to check
 * @returns {Object} Duplicate detection result
 */
export function checkDuplicateWords(text) {
  const duplicates = [];
  let match;
  const regex = ADVANCED_PATTERNS.duplicateWords;
  
  while ((match = regex.exec(text)) !== null) {
    duplicates.push({
      word: match[1],
      position: match.index,
      fullMatch: match[0]
    });
  }
  
  return {
    hasDuplicates: duplicates.length > 0,
    duplicates: duplicates
  };
}

/**
 * Validate password strength using lookahead patterns
 * @param {string} password - Password to validate
 * @returns {Object} Password strength analysis
 */
export function validatePasswordStrength(password) {
  const result = {
    score: 0,
    feedback: [],
    isStrong: false
  };
  
  if (!password) {
    result.feedback.push('Password is required');
    return result;
  }
  
  // Length check
  if (password.length >= 8) {
    result.score += 1;
  } else {
    result.feedback.push('Password should be at least 8 characters long');
  }
  
  // Character type checks using lookahead
  if (/[a-z]/.test(password)) {
    result.score += 1;
  } else {
    result.feedback.push('Password should contain lowercase letters');
  }
  
  if (/[A-Z]/.test(password)) {
    result.score += 1;
  } else {
    result.feedback.push('Password should contain uppercase letters');
  }
  
  if (/\d/.test(password)) {
    result.score += 1;
  } else {
    result.feedback.push('Password should contain numbers');
  }
  
  if (/[@$!%*?&]/.test(password)) {
    result.score += 1;
  } else {
    result.feedback.push('Password should contain special characters');
  }
  
  // Overall strength
  result.isStrong = result.score >= 4;
  
  return result;
}

/**
 * Extract specific patterns from text (e.g., emails, URLs, phone numbers)
 * @param {string} text - Text to extract patterns from
 * @param {string} patternType - Type of pattern to extract
 * @returns {Array} Array of found patterns
 */
export function extractPatterns(text, patternType) {
  const patterns = {
    email: ADVANCED_PATTERNS.email,
    url: ADVANCED_PATTERNS.url,
    phone: ADVANCED_PATTERNS.phoneNumber,
    time: ADVANCED_PATTERNS.timeFormat,
    isbn: ADVANCED_PATTERNS.isbn
  };
  
  const regex = patterns[patternType];
  if (!regex) return [];
  
  const matches = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      value: match[0],
      index: match.index
    });
  }
  
  return matches;
}

/**
 * Validate and format date input
 * @param {string} dateString - Date string to validate
 * @returns {Object} Date validation result
 */
export function validateAndFormatDate(dateString) {
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return {
        isValid: false,
        formatted: null,
        error: 'Invalid date format'
      };
    }
    
    // Check if the parsed date matches the input string
    const isoString = date.toISOString().split('T')[0];
    if (isoString !== dateString) {
      return {
        isValid: false,
        formatted: null,
        error: 'Date does not exist (e.g., February 30th)'
      };
    }
    
    return {
      isValid: true,
      formatted: isoString,
      error: null
    };
  } catch (error) {
    return {
      isValid: false,
      formatted: null,
      error: error.message
    };
  }
}

/**
 * Create a custom validator function
 * @param {RegExp} pattern - Regex pattern
 * @param {string} message - Error message
 * @param {Function} testFn - Additional test function
 * @returns {Function} Validator function
 */
export function createValidator(pattern, message, testFn = null) {
  return function(value) {
    if (!value && value !== 0) {
      return {
        isValid: false,
        message: 'Value is required',
        error: 'Required'
      };
    }
    
    if (testFn && !testFn(value)) {
      return {
        isValid: false,
        message: message,
        error: 'Custom test failed'
      };
    }
    
    if (!pattern.test(value)) {
      return {
        isValid: false,
        message: message,
        error: 'Pattern mismatch'
      };
    }
    
    return {
      isValid: true,
      message: '',
      error: null
    };
  };
}
