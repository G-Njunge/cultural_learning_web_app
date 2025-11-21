/**
 * Search Module - Advanced search and filtering functionality
 * Implements regex-based search with highlighting and filtering capabilities
 */

import { compileRegex, highlightMatches, testRegex, checkDuplicateWords } from './validators.js';

/**
 * Search configuration and options
 */
export const SEARCH_CONFIG = {
  defaultFlags: 'gi',
  maxResults: 1000,
  highlightClass: 'search-highlight',
  debounceDelay: 300
};

/**
 * Search result object structure
 */
export class SearchResult {
  constructor(task, matches = [], score = 0) {
    this.task = task;
    this.matches = matches;
    this.score = score;
    this.highlightedFields = {};
  }
}

/**
 * Search index for fast searching
 */
class SearchIndex {
  constructor() {
    this.index = new Map();
    this.stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  }
  
  /**
   * Build search index from tasks
   * @param {Array} tasks - Array of task objects
   */
  buildIndex(tasks) {
    this.index.clear();
    
    tasks.forEach(task => {
      const terms = this.extractTerms(task);
      terms.forEach(term => {
        if (!this.index.has(term)) {
          this.index.set(term, new Set());
        }
        this.index.get(term).add(task.id);
      });
    });
  }
  
  /**
   * Extract searchable terms from a task
   * @param {Object} task - Task object
   * @returns {Array} Array of search terms
   */
  extractTerms(task) {
    const terms = new Set();
    
    // Extract from title
    if (task.title) {
      const titleTerms = this.tokenize(task.title);
      titleTerms.forEach(term => terms.add(term));
    }
    
    // Extract from description
    if (task.description) {
      const descTerms = this.tokenize(task.description);
      descTerms.forEach(term => terms.add(term));
    }
    
    // Extract from tag
    if (task.tag) {
      const tagTerms = this.tokenize(task.tag);
      tagTerms.forEach(term => terms.add(term));
    }
    
    return Array.from(terms);
  }
  
  /**
   * Tokenize text into searchable terms
   * @param {string} text - Text to tokenize
   * @returns {Array} Array of tokens
   */
  tokenize(text) {
    if (!text) return [];
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 0 && !this.stopWords.has(term));
  }
  
  /**
   * Search the index for terms
   * @param {Array} terms - Search terms
   * @returns {Set} Set of matching task IDs
   */
  search(terms) {
    if (terms.length === 0) return new Set();
    
    let result = new Set();
    
    terms.forEach((term, index) => {
      const matches = new Set();
      
      // Exact match
      if (this.index.has(term)) {
        this.index.get(term).forEach(id => matches.add(id));
      }
      
      // Partial match
      for (const [indexTerm, taskIds] of this.index) {
        if (indexTerm.includes(term)) {
          taskIds.forEach(id => matches.add(id));
        }
      }
      
      if (index === 0) {
        result = matches;
      } else {
        result = new Set([...result].filter(id => matches.has(id)));
      }
    });
    
    return result;
  }
}

/**
 * Search manager class
 */
export class SearchManager {
  constructor() {
    this.index = new SearchIndex();
    this.lastSearch = null;
    this.searchCache = new Map();
    this.debounceTimer = null;
  }
  
  /**
   * Initialize search with tasks
   * @param {Array} tasks - Array of task objects
   */
  initialize(tasks) {
    this.index.buildIndex(tasks);
    this.searchCache.clear();
  }
  
  /**
   * Perform regex search on tasks
   * @param {string} query - Search query (can be regex)
   * @param {Array} tasks - Array of tasks to search
   * @param {Object} options - Search options
   * @returns {Array} Array of SearchResult objects
   */
  searchTasks(query, tasks, options = {}) {
    const {
      caseSensitive = false,
      fields = ['title', 'description', 'tag'],
      maxResults = SEARCH_CONFIG.maxResults
    } = options;
    
    if (!query || query.trim() === '') {
      return tasks.map(task => new SearchResult(task));
    }
    
    // Check cache first
    const cacheKey = `${query}_${caseSensitive}_${fields.join(',')}`;
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey);
    }
    
    const results = [];
    const flags = caseSensitive ? 'g' : 'gi';
    
    // Compile regex safely
    const compilation = compileRegex(query, flags);
    if (!compilation.success) {
      return results;
    }
    
    const regex = compilation.regex;
    
    tasks.forEach(task => {
      const matches = [];
      let totalScore = 0;
      
      fields.forEach(field => {
        const fieldValue = task[field];
        if (!fieldValue) return;
        
        const testResult = testRegex(fieldValue, query, flags);
        if (testResult.success && testResult.matches.length > 0) {
          matches.push({
            field: field,
            value: fieldValue,
            matches: testResult.matches,
            score: testResult.matches.length * this.getFieldWeight(field)
          });
          
          totalScore += testResult.matches.length * this.getFieldWeight(field);
        }
      });
      
      if (matches.length > 0) {
        const result = new SearchResult(task, matches, totalScore);
        
        // Add highlighted fields
        fields.forEach(field => {
          const fieldValue = task[field];
          if (fieldValue) {
            result.highlightedFields[field] = highlightMatches(fieldValue, regex);
          }
        });
        
        results.push(result);
      }
    });
    
    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);
    
    // Limit results
    const limitedResults = results.slice(0, maxResults);
    
    // Cache results
    this.searchCache.set(cacheKey, limitedResults);
    
    return limitedResults;
  }
  
  /**
   * Get field weight for scoring
   * @param {string} field - Field name
   * @returns {number} Weight value
   */
  getFieldWeight(field) {
    const weights = {
      title: 3,
      tag: 2,
      description: 1
    };
    return weights[field] || 1;
  }
  
  /**
   * Perform advanced pattern searches
   * @param {string} patternType - Type of pattern to search for
   * @param {Array} tasks - Array of tasks to search
   * @returns {Array} Array of SearchResult objects
   */
  searchByPattern(patternType, tasks) {
    const patterns = {
      duplicateWords: /\b(\w+)\s+\1\b/gi,
      timeFormat: /\b([0-1]?[0-9]|2[0-3]):[0-5][0-9]\b/g,
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      url: /https?:\/\/[^\s]+/g,
      phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      currency: /\$\d+(?:\.\d{2})?/g,
      hashtag: /#\w+/g,
      mention: /@\w+/g
    };
    
    const pattern = patterns[patternType];
    if (!pattern) return [];
    
    const results = [];
    
    tasks.forEach(task => {
      const matches = [];
      let totalScore = 0;
      
      ['title', 'description'].forEach(field => {
        const fieldValue = task[field];
        if (!fieldValue) return;
        
        const testResult = testRegex(fieldValue, pattern.source, 'gi');
        if (testResult.success && testResult.matches.length > 0) {
          matches.push({
            field: field,
            value: fieldValue,
            matches: testResult.matches,
            score: testResult.matches.length
          });
          
          totalScore += testResult.matches.length;
        }
      });
      
      if (matches.length > 0) {
        const result = new SearchResult(task, matches, totalScore);
        results.push(result);
      }
    });
    
    return results.sort((a, b) => b.score - a.score);
  }
  
  /**
   * Search with debouncing
   * @param {string} query - Search query
   * @param {Array} tasks - Array of tasks
   * @param {Function} callback - Callback function
   * @param {Object} options - Search options
   */
  debouncedSearch(query, tasks, callback, options = {}) {
    clearTimeout(this.debounceTimer);
    
    this.debounceTimer = setTimeout(() => {
      const results = this.searchTasks(query, tasks, options);
      callback(results);
    }, SEARCH_CONFIG.debounceDelay);
  }
  
  /**
   * Get search suggestions based on query
   * @param {string} query - Partial query
   * @param {Array} tasks - Array of tasks
   * @param {number} limit - Maximum suggestions
   * @returns {Array} Array of suggestion strings
   */
  getSuggestions(query, tasks, limit = 10) {
    if (!query || query.length < 2) return [];
    
    const suggestions = new Set();
    const queryLower = query.toLowerCase();
    
    tasks.forEach(task => {
      ['title', 'description', 'tag'].forEach(field => {
        const value = task[field];
        if (!value) return;
        
        const words = value.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.startsWith(queryLower) && word.length > queryLower.length) {
            suggestions.add(word);
          }
        });
      });
    });
    
    return Array.from(suggestions).slice(0, limit);
  }
  
  /**
   * Clear search cache
   */
  clearCache() {
    this.searchCache.clear();
  }
  
  /**
   * Get search statistics
   * @returns {Object} Search statistics
   */
  getStats() {
    return {
      cacheSize: this.searchCache.size,
      indexSize: this.index.index.size,
      lastSearch: this.lastSearch
    };
  }
}

/**
 * Filter tasks by various criteria
 * @param {Array} tasks - Array of tasks to filter
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered tasks
 */
export function filterTasks(tasks, filters) {
  if (!filters || Object.keys(filters).length === 0) {
    return tasks;
  }
  
  return tasks.filter(task => {
    // Tag filter
    if (filters.tag && filters.tag !== '' && task.tag !== filters.tag) {
      return false;
    }
    
    // Date range filter
    if (filters.dateFrom && new Date(task.dueDate) < new Date(filters.dateFrom)) {
      return false;
    }
    
    if (filters.dateTo && new Date(task.dueDate) > new Date(filters.dateTo)) {
      return false;
    }
    
    // Duration range filter
    if (filters.durationMin && parseFloat(task.duration) < parseFloat(filters.durationMin)) {
      return false;
    }
    
    if (filters.durationMax && parseFloat(task.duration) > parseFloat(filters.durationMax)) {
      return false;
    }
    
    // Status filter
    if (filters.status) {
      const now = new Date();
      const dueDate = new Date(task.dueDate);
      const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      
      switch (filters.status) {
        case 'overdue':
          if (daysUntilDue >= 0) return false;
          break;
        case 'due-soon':
          if (daysUntilDue < 0 || daysUntilDue > 3) return false;
          break;
        case 'upcoming':
          if (daysUntilDue < 4 || daysUntilDue > 30) return false;
          break;
        case 'future':
          if (daysUntilDue <= 30) return false;
          break;
      }
    }
    
    return true;
  });
}

/**
 * Sort tasks by various criteria
 * @param {Array} tasks - Array of tasks to sort
 * @param {string} sortBy - Sort criteria
 * @returns {Array} Sorted tasks
 */
export function sortTasks(tasks, sortBy) {
  const sortedTasks = [...tasks];
  
  // Priority order based on Eisenhower Matrix
  const priorityOrder = {
    'Urgent & Important': 1,
    'Important but Not Urgent': 2,
    'Urgent but Not Important': 3
  };
  
  switch (sortBy) {
    case 'priority':
      return sortedTasks.sort((a, b) => {
        const priorityA = priorityOrder[a.tag] || 999;
        const priorityB = priorityOrder[b.tag] || 999;
        return priorityA - priorityB;
      });
    
    case 'title-asc':
      return sortedTasks.sort((a, b) => a.title.localeCompare(b.title));
    
    case 'title-desc':
      return sortedTasks.sort((a, b) => b.title.localeCompare(a.title));
    
    case 'date-asc':
      return sortedTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    case 'date-desc':
      return sortedTasks.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
    
    case 'duration-asc':
      return sortedTasks.sort((a, b) => parseFloat(a.duration) - parseFloat(b.duration));
    
    case 'duration-desc':
      return sortedTasks.sort((a, b) => parseFloat(b.duration) - parseFloat(a.duration));
    
    case 'tag-asc':
      return sortedTasks.sort((a, b) => a.tag.localeCompare(b.tag));
    
    case 'tag-desc':
      return sortedTasks.sort((a, b) => b.tag.localeCompare(a.tag));
    
    case 'created-asc':
      return sortedTasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    case 'created-desc':
      return sortedTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    default:
      return sortedTasks;
  }
}

/**
 * Create a search query builder
 * @returns {Object} Query builder object
 */
export function createQueryBuilder() {
  const query = {
    text: '',
    filters: {},
    sort: 'date-asc',
    caseSensitive: false,
    fields: ['title', 'description', 'tag']
  };
  
  return {
    text(value) {
      query.text = value;
      return this;
    },
    
    filter(key, value) {
      query.filters[key] = value;
      return this;
    },
    
    sortBy(value) {
      query.sort = value;
      return this;
    },
    
    caseSensitive(value) {
      query.caseSensitive = value;
      return this;
    },
    
    fields(value) {
      query.fields = value;
      return this;
    },
    
    build() {
      return { ...query };
    }
  };
}

/**
 * Global search manager instance
 */
export const searchManager = new SearchManager();
