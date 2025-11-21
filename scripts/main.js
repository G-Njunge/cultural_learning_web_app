 // This file is the main application entry point 

import { initializeState, stateManager, uiActions } from './state.js';
import { initializeUI, uiManager } from './ui.js';
import { searchManager } from './search.js';
import { loadSettings, saveSettings } from './storage.js';

// Shows date format preview in settings
function updateDateFormatExample(format) {
  const exampleElement = document.getElementById('date-format-example');
  if (!exampleElement) return;
  
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  let example;
  switch(format) {
    case 'YYYY-MM-DD':
      example = `${year}-${month}-${day}`;
      break;
    case 'MM/DD/YYYY':
      example = `${month}/${day}/${year}`;
      break;
    case 'DD/MM/YYYY':
      example = `${day}/${month}/${year}`;
      break;
    default:
      example = `${year}-${month}-${day}`;
  }
  
  exampleElement.textContent = `Example: ${example}`;
}

 //Initialize task form fields based on preferences on the settings page
function initializeTaskForm() {
  const taskDurationInput = document.getElementById('task-duration');
  const taskDurationLabel = document.getElementById('task-duration-unit-label');
  
  if (!taskDurationInput || !taskDurationLabel) return; // Not on tasks page
  
  const settings = loadSettings();
  const timeUnit = settings.timeUnit || 'hours';
  
  // Update label text
  taskDurationLabel.textContent = timeUnit;
  
  // Update input step, placeholder, time unit one can input
  if (timeUnit === 'minutes') {
    taskDurationInput.step = '15';
    taskDurationInput.placeholder = '60';
    taskDurationInput.max = '1200'; 
  } else {
    taskDurationInput.step = '0.25';
    taskDurationInput.placeholder = '2.5';
    taskDurationInput.max = '20'; 
  }
}

// Initialize the settings page
function initializeSettingsPage() {
  const timeUnitSelect = document.getElementById('time-unit');
  const dateFormatSelect = document.getElementById('date-format');
  
  if (!timeUnitSelect) return; 
  
  // Load current settings
  const settings = loadSettings();
  
  // Set current values
  timeUnitSelect.value = settings.timeUnit || 'hours';
  dateFormatSelect.value = settings.dateFormat || 'YYYY-MM-DD';
  
  // Update date format example
  updateDateFormatExample(settings.dateFormat || 'YYYY-MM-DD');
  
  // Update cap unit label on dashboard if it exists
  const capUnitLabel = document.getElementById('cap-unit-label');
  if (capUnitLabel) {
    capUnitLabel.textContent = settings.timeUnit || 'hours';
  }
  
  // Update the duration input step based on time unit specified on the settings page
  const capInput = document.getElementById('duration-cap');
  if (capInput) {
    const timeUnit = settings.timeUnit || 'hours';
    capInput.step = timeUnit === 'minutes' ? '15' : '0.5';
  }
  
  // Addition of  event listeners
  timeUnitSelect.addEventListener('change', (e) => {
    const oldSettings = loadSettings();
    const oldUnit = oldSettings.timeUnit || 'hours';
    const newUnit = e.target.value;
    
    // Convertion of duration cap 
    let newDurationCap = oldSettings.durationCap;
    if (newDurationCap && oldUnit !== newUnit) {
      if (oldUnit === 'hours' && newUnit === 'minutes') {
        // Converts hours to minutes
        newDurationCap = newDurationCap * 60;
      } else if (oldUnit === 'minutes' && newUnit === 'hours') {
        // Converts minutes to hours
        newDurationCap = newDurationCap / 60;
      }
    }
    
    const newSettings = { ...oldSettings, timeUnit: newUnit, durationCap: newDurationCap };
    saveSettings(newSettings);
    console.log('Time unit preference updated to:', newUnit);
    
    // Update the cap unit label on dashboard if it exists
    const capUnitLabel = document.getElementById('cap-unit-label');
    if (capUnitLabel) {
      capUnitLabel.textContent = newUnit;
    }
    
    // Update the duration cap input value if it exists
    const capInput = document.getElementById('duration-cap');
    if (capInput && newDurationCap) {
      capInput.value = newDurationCap;
      // Update step for input
      capInput.step = newUnit === 'minutes' ? '15' : '0.5';
    }
    
    // Update task duration label and input if it exists
    const taskDurationLabel = document.getElementById('task-duration-unit-label');
    if (taskDurationLabel) {
      taskDurationLabel.textContent = newUnit;
    }
    const taskDurationInput = document.getElementById('task-duration');
    if (taskDurationInput) {
      if (newUnit === 'minutes') {
        taskDurationInput.step = '15';
        taskDurationInput.placeholder = '60';
        taskDurationInput.max = '1200'; // 20 hours = 1200 minutes
      } else {
        taskDurationInput.step = '0.25';
        taskDurationInput.placeholder = '2.5';
        taskDurationInput.max = '20'; // 20 hours
      }
    }
    
    // Show toast notification
    if (window.uiManager && window.uiManager.showToast) {
      window.uiManager.showToast('Time unit preference updated successfully', 'success');
    }
  });
  
  dateFormatSelect.addEventListener('change', (e) => {
    const newSettings = { ...loadSettings(), dateFormat: e.target.value };
    saveSettings(newSettings);
    console.log('Date format preference updated to:', e.target.value);
    
    // Update date format example
    updateDateFormatExample(e.target.value);
    
    // Re-render tasks if we're on the tasks page
    if (window.uiManager && window.uiManager.renderTasks) {
      const currentState = window.stateManager ? window.stateManager.getState() : null;
      if (currentState && currentState.tasks) {
        window.uiManager.renderTasks(currentState.tasks);
      }
    }
    
    if (window.uiManager && window.uiManager.showToast) {
      window.uiManager.showToast('Date format preference updated successfully', 'success');
    }
  });
}



/**
 * Application class
 */
class CampusLifePlanner {
  constructor() {
    this.isInitialized = false;
    this.version = '1.0.0';
  }
  
  //Initialize the application
  
  async initialize() {
    if (this.isInitialized) {
      console.warn('Application already initialized');
      return;
    }
    
    try {
      console.log(`Campus Life Planner v${this.version} initializing...`);

      // Initialize UI first
      try {
        initializeUI();
        console.log('UI initialized');
      } catch (err) {
        console.error('UI initialization failed:', err);
      }

      // Initialize state management
      try {
        initializeState();
        console.log('State initialized');
      } catch (err) {
        console.error('State initialization failed:', err);
      }

      // Initialize search manager
      try {
        this.initializeSearchManager();
        console.log('Search manager initialized');
      } catch (err) {
        console.error('Search manager initialization failed:', err);
      }

      // Setup global error handling
      try {
        this.setupErrorHandling();
        console.log('Error handling set up');
      } catch (err) {
        console.error('Setup error handling failed:', err);
      }

      // Setup service worker for offline support
      try {
        await this.setupServiceWorker();
        console.log('Service worker setup completed');
      } catch (err) {
        console.warn('Service Worker registration failed or skipped:', err);
      }

      // Setup keyboard shortcuts
      try {
        this.setupKeyboardShortcuts();
        console.log('Keyboard shortcuts set');
      } catch (err) {
        console.error('Keyboard shortcuts setup failed:', err);
      }

      // Initialize settings page
      try {
        initializeSettingsPage();
        console.log('Settings page initialized');
      } catch (err) {
        console.error('Settings page initialization failed:', err);
      }

      // Initialize task form
      try {
        initializeTaskForm();
        console.log('Task form initialized');
      } catch (err) {
        console.error('Task form initialization failed:', err);
      }

      // Set active navigation link
      try {
        this.setActiveNavLink();
        console.log('Active navigation link set');
      } catch (err) {
        console.error('Active nav link setup failed:', err);
      }

      // Setup performance monitoring
      try {
        this.setupPerformanceMonitoring();
        console.log('Performance monitoring set');
      } catch (err) {
        console.error('Performance monitoring setup failed:', err);
      }

      this.isInitialized = true;
      console.log('Campus Life Planner initialized (partial failures may have occurred)');

      // Announce to screen readers
      try {
        this.announceAppReady();
      } catch (err) {
        console.warn('announceAppReady failed:', err);
      }
      
    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.handleInitializationError(error);
    }
  }
  
  //nitialize search manager
   
  initializeSearchManager() {
    // Listen for tasks changes to update search index
    stateManager.subscribe('tasks', (tasks) => {
      searchManager.initialize(tasks);
    });
  }
  
  // Set active navigation link based on current page

  setActiveNavLink() {
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPage = window.location.pathname;
    
    navLinks.forEach(link => {
      // Get the href attribute and extract the filename
      const linkHref = link.getAttribute('href');
      
      if (linkHref) {
        // Check if current page ends with this link's href
        // or if both are the root/index
        if (currentPage.endsWith(linkHref) || 
            (linkHref === 'index.html' && (currentPage.endsWith('/') || currentPage.endsWith('index.html')))) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      }
    });
  }
  
  //Setup global error handling
  setupErrorHandling() {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      console.error('Uncaught error:', event.error);
      this.handleError(event.error);
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleError(event.reason);
    });
    
    // Handle state manager errors
    stateManager.subscribe('error', (error) => {
      if (error) {
        this.handleError(error);
      }
    });
  }
  
  /**
   * Handle errors gracefully
   * @param {Error|string} error - Error to handle
   */
  handleError(error) {
    const errorMessage = typeof error === 'string' ? error : error.message || 'An unexpected error occurred';
    
    // Log error for debugging
    console.error('Application error:', error);
    
    // Show user-friendly error message
    stateManager.setState({
      error: 'Something went wrong. Please try again or refresh the page.',
      success: null
    });
    
    // Report error to analytics (if available)
    this.reportError(error);
  }
  
  /**
   * Handle initialization errors
   * @param {Error} error - Initialization error
   */
  handleInitializationError(error) {
    // Show critical error message
    const errorContainer = document.createElement('div');
    errorContainer.className = 'critical-error';
    errorContainer.innerHTML = `
      <div class="error-content">
        <h2>Application Failed to Load</h2>
        <p>We're sorry, but the Campus Life Planner couldn't be initialized properly.</p>
        <p>Please try refreshing the page or contact support if the problem persists.</p>
        <button onclick="window.location.reload()" class="btn btn-primary">
          Refresh Page
        </button>
      </div>
    `;
    
    // Style the error container
    errorContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      color: white;
      font-family: system-ui, sans-serif;
    `;
    
    document.body.appendChild(errorContainer);
  }
  
  /**
   * Setup service worker for offline support
   */
  async setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available
              this.showUpdateNotification();
            }
          });
        });
        
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }
  }
  
  //Show update notification
  
  showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
      <div class="update-content">
        <p>New version available!</p>
        <button onclick="window.location.reload()" class="btn btn-primary">
          Update Now
        </button>
        <button onclick="this.parentElement.parentElement.remove()" class="btn btn-secondary">
          Later
        </button>
      </div>
    `;
    
    // Style the notification
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  }
  
  //Setup keyboard shortcuts

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only handle shortcuts when not in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Arrow key navigation for nav menu
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const navLinks = Array.from(document.querySelectorAll('.nav-menu .nav-link'));
        const currentIndex = navLinks.indexOf(document.activeElement);
        
        if (currentIndex !== -1) {
          e.preventDefault();
          let nextIndex;
          
          if (e.key === 'ArrowRight') {
            nextIndex = (currentIndex + 1) % navLinks.length;
          } else {
            nextIndex = (currentIndex - 1 + navLinks.length) % navLinks.length;
          }
          
          navLinks[nextIndex].focus();
        }
      }
      
      // Arrow key navigation for task cards
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const taskCards = Array.from(document.querySelectorAll('.task-card'));
        const currentIndex = taskCards.findIndex(card => card.contains(document.activeElement));
        
        if (currentIndex !== -1) {
          e.preventDefault();
          let nextIndex;
          
          if (e.key === 'ArrowDown') {
            nextIndex = Math.min(currentIndex + 1, taskCards.length - 1);
          } else {
            nextIndex = Math.max(currentIndex - 1, 0);
          }
          
          // Focus the first focusable element in the next card
          const nextCard = taskCards[nextIndex];
          const focusableElement = nextCard.querySelector('button, a, [tabindex="0"]');
          if (focusableElement) {
            focusableElement.focus();
          } else {
            nextCard.setAttribute('tabindex', '0');
            nextCard.focus();
          }
        }
      }
      
      // Alt + N: New task
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        uiManager.navigateToSection('add-task');
      }
      
      // Alt + D: Dashboard
      if (e.altKey && e.key === 'd') {
        e.preventDefault();
        uiManager.navigateToSection('dashboard');
      }
      
      // Alt + T: Tasks
      if (e.altKey && e.key === 't') {
        e.preventDefault();
        uiManager.navigateToSection('tasks');
      }
      
      // Alt + S: Settings
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        uiManager.navigateToSection('settings');
      }
      
      // Alt + A: About
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        uiManager.navigateToSection('about');
      }
      
      // Escape: Close modal or cancel editing
      if (e.key === 'Escape') {
        if (stateManager.getState('showModal')) {
          uiActions.hideModal(stateManager);
        } else if (stateManager.getState('editingTaskId')) {
          uiActions.cancelEditing(stateManager);
        }
      }
    });
  }
  
  // Setup performance monitoring
  
  setupPerformanceMonitoring() {
    // Monitor page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        if (perfData) {
          console.log('Page load performance:', {
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
            totalTime: perfData.loadEventEnd - perfData.fetchStart
          });
        }
      }, 0);
    });
    
    // Monitor memory usage (if available)
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        console.log('Memory usage:', {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB',
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB',
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
        });
      }, 30000); // Every 30 seconds
    }
  }
  
  /**
   * Report error to analytics
   * @param {Error|string} error - Error to report
   */
  reportError(error) {
    // In a real application, you would send this to your analytics service
    console.log('Error reported to analytics:', {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : null,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }
  
  /**
   * Announce app ready to screen readers
   */
  announceAppReady() {
    // Create a live region for announcements
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.textContent = 'Campus Life Planner loaded successfully';
    document.body.appendChild(liveRegion);
    
    // Remove after announcement
    setTimeout(() => {
      liveRegion.remove();
    }, 1000);
  }
  
  /**
   * Get application info
   * @returns {Object} Application information
   */
  getAppInfo() {
    return {
      name: 'Campus Life Planner',
      version: this.version,
      initialized: this.isInitialized,
      userAgent: navigator.userAgent,
      language: navigator.language,
      online: navigator.onLine,
      storage: {
        available: 'localStorage' in window,
        quota: this.getStorageQuota()
      }
    };
  }
  
  /**
   * Get storage quota information
   * @returns {Object} Storage quota info
   */
  getStorageQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      return navigator.storage.estimate().then(estimate => ({
        quota: estimate.quota,
        usage: estimate.usage,
        available: estimate.quota - estimate.usage
      }));
    }
    return null;
  }
  
  /**
   * Cleanup application resources
   */
  cleanup() {
    // Clear any timers
    // Remove event listeners
    // Clean up state
    this.isInitialized = false;
    console.log('Application cleaned up');
  }
}

/**
 * Global application instance
 */
const app = new CampusLifePlanner();

/**
 * Initialize application when DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app.initialize();
  });
} else {
  app.initialize();
}

/**
 * Handle page visibility changes
 */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Page is hidden - save current state
    console.log('Page hidden - saving state');
  } else {
    // Page is visible - refresh data if needed
    console.log('Page visible - refreshing state');
  }
});

/**
 * Handle online/offline status
 */
window.addEventListener('online', () => {
  console.log('Application is online');
  stateManager.setState({
    success: 'Connection restored'
  });
});

window.addEventListener('offline', () => {
  console.log('Application is offline');
  stateManager.setState({
    error: 'You are currently offline. Some features may not work properly.'
  });
});

/**
 * Handle beforeunload to save data
 */
window.addEventListener('beforeunload', (e) => {
  // Save any pending changes
  const tasks = stateManager.getState('tasks');
  if (tasks.length > 0) {
    // Import save function dynamically to avoid circular dependency
    import('./storage.js').then(({ saveTasks }) => {
      saveTasks(tasks);
    });
  }
});

/**
 * Expose app instance globally for debugging
 */
if (typeof process !== 'undefined' && process && process.env && process.env.NODE_ENV === 'development') {
  window.campusLifePlanner = app;
  window.stateManager = stateManager;
  window.uiManager = uiManager;
  window.searchManager = searchManager;
}

/**
 * Export for module usage
 */
export default app;
