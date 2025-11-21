// Handles all user interface updates and interactions

import { stateManager, taskActions, uiActions, settingsActions } from './state.js';
import { searchManager, filterTasks, sortTasks } from './search.js';
import { validateField } from './validators.js';
import { formatDuration, formatDate } from './utils.js';
import { loadSettings } from './storage.js';

// Element selectors for DOM manipulation
const SELECTORS = {
  navToggle: '.nav-toggle',
  navMenu: '.nav-menu',
  navLinks: '.nav-link',
  sections: '.section',
  searchInput: '#search-input',
  searchBtn: '#search-btn',
  caseSensitiveCheckbox: '#case-sensitive',
  clearSearchBtn: '#clear-search',
  sortSelect: '#sort-select',
  tagFilter: '#tag-filter',
  tasksGrid: '#tasks-grid',
  tasksLoading: '#tasks-loading',
  tasksEmpty: '#tasks-empty',
  completedTasksGrid: '#completed-tasks-grid',
  completedTasksEmpty: '#completed-tasks-empty',

  // Dashboard stats (selectors present in dashboard.html)
  totalTasks: '#total-tasks',
  totalDuration: '#total-duration',
  topTag: '#top-tag',
  weekTasks: '#week-tasks',
  completedTasks: '#completed-tasks',
  capStatus: '#cap-status',
  todaysTasksList: '#todays-tasks-list',
  weeklyProgressCanvas: '#weekly-progress-canvas',
  weeklyChartTooltip: '#weekly-chart-tooltip',
  capInput: '#duration-cap',
  updateCapBtn: '#update-cap',
  
  // Form
  taskForm: '#task-form',
  taskTitle: '#task-title',
  taskDueDate: '#task-due-date',
  taskDueTime: '#task-due-time',
  taskDuration: '#task-duration',
  taskTag: '#task-tag',
  taskDescription: '#task-description',
  submitBtn: 'button[type="submit"]',
  cancelEditBtn: '#cancel-edit',
  
  // Settings
  exportDataBtn: '#export-data',
  importDataInput: '#import-data',
  clearDataBtn: '#clear-data',
  timeUnitSelect: '#time-unit',
  dateFormatSelect: '#date-format',
  dueRemindersCheckbox: '#due-reminders',
  goalAlertsCheckbox: '#goal-alerts',
  
  // Modal
  modal: '#confirm-modal',
  modalTitle: '#modal-title',
  modalMessage: '#modal-message',
  modalConfirm: '#modal-confirm',
  modalCancel: '#modal-cancel'
};

/**
 * UI Manager class
 */
class UIManager {
  constructor() {
    this.elements = {};
    this.isInitialized = false;
    this.currentSearchResults = [];
  }

  // Recent dropdown removed — functionality consolidated into Today's Tasks list
  
  /**
   * Initialize UI manager
   */
  initialize() {
    if (this.isInitialized) return;
    
    this.cacheElements();
    this.bindEvents();
    this.setupStateListeners();
    this.setupAccessibility();
    // Make charts responsive
    this.setupChartResize();
    
    // Honor current URL hash on initial load
    this.handleHashChange();
    
    this.isInitialized = true;

    // Register developer helpers to make manual testing easier
    this.registerDevHelpers();
  }

  /**
   * Register simple dev helpers on window.appDev for quick testing
   */
  registerDevHelpers() {
    if (typeof window === 'undefined') return;

    window.appDev = window.appDev || {};

    // Seed sample tasks (useful during development/testing)
    window.appDev.seedSampleTasks = (count = 6) => {
      const sample = [
        { title: 'Read Chapter 4', dueDate: nextDate(2), duration: 2, tag: 'Homework', description: 'Read and summarize.' },
        { title: 'Math Assignment', dueDate: nextDate(5), duration: 3.5, tag: 'Assignment', description: 'Complete exercises 1-10' },
        { title: 'Group Project Meeting', dueDate: nextDate(1), duration: 1, tag: 'Meeting', description: 'Discuss milestones' },
        { title: 'Prepare Presentation', dueDate: nextDate(7), duration: 4, tag: 'Project', description: 'Slides and rehearsal' },
        { title: 'Lab Report', dueDate: nextDate(3), duration: 2.5, tag: 'Lab', description: 'Analyze results' },
        { title: 'Read Article', dueDate: nextDate(4), duration: 1, tag: 'Reading', description: 'Journal article review' }
      ];

      const items = sample.slice(0, count);
      items.forEach(item => taskActions.addTask(item, stateManager));
      console.log(`Seeded ${items.length} sample tasks`);
    };

    // Show an app section programmatically
    window.appDev.showSection = (section) => {
      if (!section) return;
      this.navigateToSection(section);
      console.log(`Requested navigation to ${section}`);
    };

    // Add a single task quickly
    window.appDev.addTask = (task) => {
      if (!task || !task.title) {
        console.warn('addTask expects an object with at least a title and dueDate');
        return;
      }
      const success = taskActions.addTask(task, stateManager);
      console.log('addTask result:', success);
    };

    // Clear all data
    window.appDev.clearAllData = () => {
      import('./storage.js').then(({ clearAllData }) => {
        if (clearAllData()) {
          // Reset state in-memory
          stateManager.reset();
          console.log('Cleared all data and reset state');
        } else {
          console.error('Failed to clear data');
        }
      });
    };

    function nextDate(daysFromNow) {
      const d = new Date();
      d.setDate(d.getDate() + (daysFromNow || 1));
      return d.toISOString().split('T')[0];
    }
  }
  
  /**
   * Cache DOM elements
   */
  cacheElements() {
    Object.keys(SELECTORS).forEach(key => {
      this.elements[key] = document.querySelector(SELECTORS[key]);
    });

    // Debug: list which selectors were found (helps diagnose missing elements)
    try {
      const found = Object.keys(this.elements).filter(k => !!this.elements[k]);
      const missing = Object.keys(this.elements).filter(k => !this.elements[k]);
  console.log('uiManager.cacheElements: found elements', found);
  if (missing.length) console.log('uiManager.cacheElements: missing elements', missing);
    } catch (err) {
      console.debug('uiManager.cacheElements: debug failed', err);
    }
  }
  
  /**
   * Bind event listeners
   */
  bindEvents() {
    // Navigation
    this.bindNavigationEvents();
    
    // Dashboard
    this.bindDashboardEvents();
    
    // Tasks
    try {
      if (typeof this.bindTasksEvents === 'function') {
        this.bindTasksEvents();
      } else {
        console.warn('UIManager.bindTasksEvents not found; skipping task event bindings');
      }
    } catch (err) {
      console.error('Error while binding task events:', err);
    }
    
    // Form
    this.bindFormEvents();
    
    // Settings
    this.bindSettingsEvents();
    
    // Modal
    this.bindModalEvents();
    
    // Global events
    this.bindGlobalEvents();
  }
  
  /**
   * Bind navigation events
   */
  bindNavigationEvents() {
    // Mobile menu toggle
    if (this.elements.navToggle) {
      this.elements.navToggle.addEventListener('click', () => {
        const navMenu = this.elements.navMenu;
        const isExpanded = navMenu.classList.contains('active');
        
        navMenu.classList.toggle('active');
        this.elements.navToggle.setAttribute('aria-expanded', !isExpanded);
      });
    }
    
    // Navigation links: for fragment/hash links update location.hash so hashchange fires
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href') || '';

        if (href.startsWith('#')) {
          e.preventDefault();
          const section = href.substring(1);
          if (location.hash.substring(1) !== section) {
            location.hash = section;
          } else {
            this.navigateToSection(section);
          }
        }
        // Non-fragment links navigate normally
      });
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
      const hasActiveMenu = this.elements.navMenu && this.elements.navMenu.classList.contains('active');
      const clickedInsideMenu = this.elements.navMenu && this.elements.navMenu.contains(e.target);
      const clickedToggle = this.elements.navToggle ? this.elements.navToggle.contains(e.target) : false;
      if (hasActiveMenu && !clickedInsideMenu && !clickedToggle) {
        this.elements.navMenu.classList.remove('active');
        if (this.elements.navToggle) {
          this.elements.navToggle.setAttribute('aria-expanded', 'false');
        }
      }
    });
  }
  
  /**
   * Bind dashboard events
   */
  bindDashboardEvents() {
    // Case sensitive checkbox
    if (this.elements.caseSensitiveCheckbox) {
      this.elements.caseSensitiveCheckbox.addEventListener('change', (e) => {
        const query = this.elements.searchInput.value;
        this.handleSearch(query);
      });
    }
    
    // Clear search
    if (this.elements.clearSearchBtn) {
      this.elements.clearSearchBtn.addEventListener('click', () => {
        this.elements.searchInput.value = '';
        // Clear search results display
        const resultsEl = document.getElementById('search-results');
        if (resultsEl) resultsEl.textContent = '';
        const resultsListEl = document.getElementById('search-results-list');
        if (resultsListEl) resultsListEl.innerHTML = '';
        // Reset search state
        this.currentSearchResults = [];
        stateManager.setState({ searchQuery: '', caseSensitive: false });
      });
    }
    
    // Sort select
    if (this.elements.sortSelect) {
      this.elements.sortSelect.addEventListener('change', (e) => {
        this.handleSort(e.target.value);
      });
    }
    
    // Tag filter
    if (this.elements.tagFilter) {
      this.elements.tagFilter.addEventListener('change', (e) => {
        this.handleFilter(e.target.value);
      });
    }

    // Update cap button
    if (this.elements.updateCapBtn && this.elements.capInput) {
      this.elements.updateCapBtn.addEventListener('click', () => {
        const val = parseFloat(this.elements.capInput.value);
        if (!isNaN(val) && val >= 0) {
          settingsActions.updateSettings({ durationCap: val }, stateManager);
        } else {
          stateManager.setState({ error: 'Please enter a valid cap value' });
        }
      });
    }

    // recent-tasks panel removed from dashboard; no action needed here
  }

  /**
   * Bind tasks-specific events (search input, quick actions)
   */
  bindTasksEvents() {
    // Search input (live search)
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener('input', (e) => {
        this.handleSearch(e.target.value);
      });

      // Enter to run search immediately
      this.elements.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleSearch(this.elements.searchInput.value);
        }
      });
    }

    // Search button triggers search
    if (this.elements.searchBtn) {
      this.elements.searchBtn.addEventListener('click', () => {
        const q = this.elements.searchInput ? this.elements.searchInput.value : '';
        this.handleSearch(q);
      });
  console.log('uiManager.bindTasksEvents: searchBtn listener attached');
    } else {
      // Fallback: delegated click handler for dynamic content or timing issues
      document.addEventListener('click', (e) => {
        const btn = e.target.closest && e.target.closest('#search-btn');
        if (btn) {
          const q = this.elements.searchInput ? this.elements.searchInput.value : document.querySelector('#search-input')?.value || '';
          console.log('uiManager.bindTasksEvents: delegated search-btn click');
          this.handleSearch(q);
        }
      });
  console.log('uiManager.bindTasksEvents: delegated search-btn listener attached');
    }

    // Additional task-level events could be added here (pagination, bulk actions)
  }
  
  /**
   * Bind form events
   */
  bindFormEvents() {
    if (!this.elements.taskForm) return;
    
    // Form submission
    this.elements.taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });
    
    // Real-time validation
    const formInputs = [
      { element: this.elements.taskTitle, field: 'title' },
      { element: this.elements.taskDueDate, field: 'date' },
      { element: this.elements.taskDuration, field: 'duration' },
      { element: this.elements.taskTag, field: 'tag' },
      { element: this.elements.taskDescription, field: 'description' }
    ];
    
    formInputs.forEach(({ element, field }) => {
      if (element) {
        element.addEventListener('blur', () => {
          this.validateField(field, element.value);
        });
        
        element.addEventListener('input', () => {
          this.clearFieldError(field);
        });
      }
    });
    
    // Cancel edit
    if (this.elements.cancelEditBtn) {
      this.elements.cancelEditBtn.addEventListener('click', () => {
        uiActions.cancelEditing(stateManager);
        this.navigateToSection('add-task');
      });
    }
  }
  
  /**
   * Bind settings events
   */
  bindSettingsEvents() {
    // Export data
    if (this.elements.exportDataBtn) {
      this.elements.exportDataBtn.addEventListener('click', () => {
        this.handleExportData();
      });
    }
    
    // Import data
    if (this.elements.importDataInput) {
      this.elements.importDataInput.addEventListener('change', (e) => {
        this.handleImportData(e.target.files[0]);
      });
    }
    
    // Clear data
    if (this.elements.clearDataBtn) {
      this.elements.clearDataBtn.addEventListener('click', () => {
        this.showConfirmationModal(
          'Clear All Data',
          'Are you sure you want to clear all tasks? This action cannot be undone.',
          () => {
            this.handleClearData();
          }
        );
      });
    }
    
    // Settings changes
    const settingsInputs = [
      { element: this.elements.timeUnitSelect, key: 'timeUnit' },
      { element: this.elements.dateFormatSelect, key: 'dateFormat' },
      { element: this.elements.dueRemindersCheckbox, key: 'dueReminders' },
      { element: this.elements.goalAlertsCheckbox, key: 'goalAlerts' }
    ];
    
    settingsInputs.forEach(({ element, key }) => {
      if (element) {
        element.addEventListener('change', () => {
          const value = element.type === 'checkbox' ? element.checked : element.value;
          settingsActions.updateSettings({ [key]: value }, stateManager);
        });
      }
    });
  }
  
  /**
   * Bind modal events
   */
  bindModalEvents() {
    if (this.elements.modalConfirm) {
      this.elements.modalConfirm.addEventListener('click', () => {
        // Execute the stored callback if it exists
        if (typeof this.modalConfirmCallback === 'function') {
          this.modalConfirmCallback();
          this.modalConfirmCallback = null; // Clear callback after execution
        }
        uiActions.hideModal(stateManager);
      });
    }
    
    if (this.elements.modalCancel) {
      this.elements.modalCancel.addEventListener('click', () => {
        this.modalConfirmCallback = null; // Clear callback on cancel
        uiActions.hideModal(stateManager);
      });
    }
    
    // Close modal on backdrop click
    if (this.elements.modal) {
      this.elements.modal.addEventListener('click', (e) => {
        if (e.target === this.elements.modal || e.target.classList.contains('modal-backdrop')) {
          this.modalConfirmCallback = null; // Clear callback on backdrop click
          uiActions.hideModal(stateManager);
        }
      });
    }
    
    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && stateManager.getState('showModal')) {
        this.modalConfirmCallback = null; // Clear callback on escape
        uiActions.hideModal(stateManager);
      }
    });
  }
  
  /**
   * Bind global events
   */
  bindGlobalEvents() {
    // Handle keyboard navigation
    document.addEventListener('keydown', (e) => {
      // Skip to content
      if (e.key === 'Tab' && !e.shiftKey && document.activeElement === document.body) {
        const skipLink = document.querySelector('.skip-link');
        if (skipLink) {
          skipLink.focus();
        }
      }
    });

    // Handle navbar scroll effect
    window.addEventListener('scroll', this.handleNavbarScroll.bind(this));
    // Handle hash changes for navigation (back/forward/direct links)
    window.addEventListener('hashchange', this.handleHashChange.bind(this));
  }

  /**
   * Handle changes to the URL hash so back/forward and direct links work
   */
  handleHashChange() {
    const hash = location.hash ? location.hash.substring(1) : '';
    let section = hash;

    if (!section) {
      // Prefer dashboard if present, otherwise tasks, otherwise first available section on the page
      if (document.getElementById('dashboard')) {
        section = 'dashboard';
      } else if (document.getElementById('tasks')) {
        section = 'tasks';
      } else {
        const firstSection = document.querySelector('.section[id]');
        section = firstSection ? firstSection.id : '';
      }
    }

    // Recent dropdown removed from dashboard; nothing to toggle here

    if (section) this.navigateToSection(section);
  }

  /**
   * Handle navbar scroll effect
   */
  handleNavbarScroll() {
  const header = document.querySelector('.header');
  
  if (!header) return;
  
  // Add scrolled class to header on scroll
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
  
}
  
  /**
   * Setup state listeners
   */
  setupStateListeners() {
    // Listen to state changes
    stateManager.subscribe('tasks', (tasks) => {
      this.renderTasks();
      this.updateDashboard();
      this.updateTagFilter();
      this.renderTodaysTasks();
      this.renderWeeklyChart();
    });
    
    stateManager.subscribe('currentSection', (section) => {
      this.showSection(section);
      this.updateNavigation(section);
    });
    
    stateManager.subscribe('searchQuery', (query) => {
      this.handleSearch(query);
    });
    
    stateManager.subscribe('stats', (stats) => {
      this.updateDashboard();
      this.renderTodaysTasks();
      this.renderWeeklyChart();
    });
    
    // capSettings and homepage-only widgets removed from index.html
    
    stateManager.subscribe('showModal', (showModal) => {
      this.toggleModal(showModal);
    });
    
    stateManager.subscribe('error', (error) => {
      if (error) this.showError(error);
    });
    
    stateManager.subscribe('success', (success) => {
      if (success) this.showSuccess(success);
    });
    
    stateManager.subscribe('editingTaskId', (editingTaskId) => {
      this.updateFormForEditing(editingTaskId);
    });
    
    stateManager.subscribe('settings', (settings) => {
      this.updateSettingsForm(settings);
    });
    
    // Listen for capSettings updates specifically
    stateManager.subscribe('capSettings', (capSettings) => {
      if (capSettings) this.updateCapStatus(capSettings);
      this.renderWeeklyChart();
    });

    // Recent dropdown removed — no-op
  }
  
  /**
   * Setup accessibility features
   */
  setupAccessibility() {
    // Add ARIA live regions for dynamic content
    this.createLiveRegion('status', 'polite');
    this.createLiveRegion('alert', 'assertive');
    
    // Ensure proper focus management
    this.setupFocusManagement();
  }
  
  /**
   * Create ARIA live region
   * @param {string} id - Region ID
   * @param {string} politeness - Politeness level
   */
  createLiveRegion(id, politeness) {
    const region = document.createElement('div');
    region.id = `${id}-live-region`;
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    document.body.appendChild(region);
  }
  
  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   * @param {string} type - Message type (status or alert)
   */
  announceToScreenReader(message, type = 'status') {
    const region = document.getElementById(`${type}-live-region`);
    if (region) {
      region.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        region.textContent = '';
      }, 1000);
    }
  }
  
  /**
   * Setup focus management
   */
  setupFocusManagement() {
    // Store last focused element
    let lastFocusedElement = null;
    
    document.addEventListener('focusin', (e) => {
      lastFocusedElement = e.target;
    });
    
    // Restore focus after modal closes
    stateManager.subscribe('showModal', (showModal) => {
      if (!showModal && lastFocusedElement) {
        lastFocusedElement.focus();
      }
    });
  }
  
  /**
   * Navigate to section
   * @param {string} section - Section name
   */
  navigateToSection(section) {
    // Handle landing page navigation
    if (['features', 'how-it-works', 'testimonials', 'contact'].includes(section)) {
      // Scroll to landing page section
      const targetElement = document.getElementById(section);
      if (targetElement) {
        targetElement.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
      return;
    }

    // Handle app navigation
    if (section === 'app') {
      // Show app section
      this.showAppSection();
      return;
    }

    // Regular app section navigation
    uiActions.navigateToSection(section, stateManager);
    
    // Close mobile menu
    if (this.elements.navMenu) {
      this.elements.navMenu.classList.remove('active');
      if (this.elements.navToggle) {
        this.elements.navToggle.setAttribute('aria-expanded', 'false');
      }
    }
    
    // Announce navigation
    this.announceToScreenReader(`Navigated to ${section} section`);
  }

  /**
   * Show app section
   */
  showAppSection() {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => {
      s.classList.remove('active');
    });
    
    // Show app section
    const appSection = document.getElementById('app');
    if (appSection) {
      appSection.classList.add('active');
      appSection.scrollIntoView({ behavior: 'smooth' });
    }
  }
  
  /**
   * Show section
   * @param {string} section - Section name
   */
  showSection(section) {
    // Special handling for add-task which is inside tasks section
    if (section === 'add-task') {
      const tasksSection = document.getElementById('tasks');
      const addTaskContainer = document.getElementById('add-task');
      
      if (tasksSection && addTaskContainer) {
        // Make sure tasks section is visible
        tasksSection.classList.add('active');
        
        // Scroll to add-task form
        addTaskContainer.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
        
        // Focus first input field
        const firstInput = addTaskContainer.querySelector('input, select, textarea');
        if (firstInput) {
          setTimeout(() => firstInput.focus(), 500);
        }
      }
      return;
    }
    
    // Hide all top-level sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

    // If the target is a subsection inside #app (like dashboard/tasks/add-task/settings/about),
    // ensure the parent #app is shown and then activate the subsection.
    const targetSection = document.getElementById(section);

    if (targetSection) {
      // If it's inside the app wrapper, show the app container too
      const appContainer = document.getElementById('app');
      if (appContainer && appContainer.contains(targetSection)) {
        appContainer.classList.add('active');
        // Hide all sibling app-sections, then show only the target one
        appContainer.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
      }

      // Activate the specific section
      targetSection.classList.add('active');

      // Toggle header contrast for dashboard (white background) for readability
      const header = document.querySelector('.header');
      if (header) {
        if (section === 'dashboard') {
          header.classList.add('light');
        } else {
          header.classList.remove('light');
        }
      }

      // Focus first interactive element and scroll into view while accounting for fixed header
      const firstInteractive = targetSection.querySelector('button, input, select, textarea, a, [tabindex]');
      if (firstInteractive) {
        firstInteractive.focus();
      }

      // Scroll so the section is visible below the fixed header
      const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
      const top = Math.max(targetSection.getBoundingClientRect().top + window.scrollY - headerHeight - 8, 0);
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }
  
  /**
   * Update navigation active state
   * @param {string} currentSection - Current section
   */
  updateNavigation(currentSection) {
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      const isActive = href === `#${currentSection}`;
      
      link.classList.toggle('active', isActive);
      link.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }
  
  /**
   * Handle search
   * @param {string} query - Search query
   */
  handleSearch(query) {
  console.log('uiManager.handleSearch query:', query);
    const tasks = stateManager.getState('tasks');
    const caseSensitive = this.elements.caseSensitiveCheckbox?.checked || false;
    
    // Update state only if changed to avoid re-entrant notifications
    try {
      const prevQuery = stateManager.getState('searchQuery');
      const prevCase = stateManager.getState('caseSensitive');
      if (prevQuery !== query || prevCase !== caseSensitive) {
        stateManager.setState({ searchQuery: query, caseSensitive });
      }
    } catch (err) {
      console.warn('Failed to set search state safely', err);
    }
    
    // Perform search
    searchManager.initialize(tasks);
    const results = searchManager.searchTasks(query, tasks, { caseSensitive });
    
    this.currentSearchResults = results;
    this.renderTasks();

    console.log('uiManager.handleSearch results count:', results.length);
    // Update visible results count
    const resultsEl = document.getElementById('search-results');
    if (resultsEl) {
      if (query) {
        resultsEl.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
      } else {
        resultsEl.textContent = '';
      }
    }

    // Render a simple results list for quick preview - only if there's a query
    if (query) {
      this.renderSearchResultsList(results.map(r => r.task));
    } else {
      this.renderSearchResultsList([]);
    }
    
    // Announce search results
    if (query) {
      this.announceToScreenReader(`Found ${results.length} tasks matching "${query}"`);
    } else {
      this.announceToScreenReader('Showing all tasks');
    }
  }

  /**
   * Render a simple list of search-matching tasks under the search box
   * @param {Array} tasks - Array of task objects
   */
  renderSearchResultsList(tasks) {
    const container = document.getElementById('search-results-list');
    if (!container) return;

    if (!tasks || tasks.length === 0) {
      container.innerHTML = '';
      return;
    }

    const settings = loadSettings();
    container.innerHTML = tasks.map(task => {
      const due = task.dueDate ? formatDate(new Date(task.dueDate), settings.dateFormat || 'YYYY-MM-DD') : '-';
      const duration = task.duration ? formatDuration(parseFloat(task.duration), settings.timeUnit) : '-';
      return `
        <div class="search-result-item" data-task-id="${task.id}" style="padding:8px 12px;border:1px solid rgba(0,0,0,0.06);border-radius:8px;margin-bottom:8px;background:var(--surface, #fff);">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
            <div style="flex:1">
              <div style="font-weight:600;color:#1f2937;">${this.escapeHtml(task.title)}</div>
              <div style="color:#6b7280;font-size:0.9rem">Tag: ${this.escapeHtml(task.tag)} • Due: ${due}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
              <div style="white-space:nowrap;color:#6b7280;font-weight:600">${duration}</div>
              <label style="font-size:0.85rem;color:#6b7280;">
                <input type="checkbox" class="search-result-complete" data-task-id="${task.id}" ${task.completed ? 'checked' : ''}> Done
              </label>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Bind delegated listener for completion toggles inside results list
    container.querySelectorAll('.search-result-complete').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const taskId = e.target.dataset.taskId;
        const checked = e.target.checked;
        const task = stateManager.getState('tasks').find(t => t.id === taskId) || { id: taskId, title: '' };
        taskActions.updateTask(taskId, { completed: checked }, stateManager);
        if (checked) this.showUndoToast(task);
      });
    });
  }
  
  /**
   * Handle sort
   * @param {string} sortBy - Sort criteria
   */
  handleSort(sortBy) {
    stateManager.setState({ sortBy });
    this.renderTasks();
  }
  
  /**
   * Handle filter
   * @param {string} tag - Tag to filter by
   */
  handleFilter(tag) {
    const filters = tag ? { tag } : {};
    stateManager.setState({ activeFilters: filters });
    this.renderTasks();
  }
  
  /**
   * Render tasks
   */
  renderTasks() {
    const tasks = stateManager.getState('tasks');
    let sortBy = stateManager.getState('sortBy');
    
    // Default to priority sorting if not set
    if (!sortBy) {
      sortBy = 'priority';
      stateManager.setState({ sortBy: 'priority' }, false); // Set without triggering re-render
    }
    
    const activeFilters = stateManager.getState('activeFilters');
    
    // Apply filters
    let filteredTasks = filterTasks(tasks, activeFilters);
    
    // Apply search results if available
    if (this.currentSearchResults.length > 0) {
      const searchTaskIds = this.currentSearchResults.map(result => result.task.id);
      filteredTasks = filteredTasks.filter(task => searchTaskIds.includes(task.id));
    }
    
    // Separate completed and incomplete tasks
    const incompleteTasks = filteredTasks.filter(task => !task.completed);
    const completedTasks = filteredTasks.filter(task => task.completed);
    
    // Apply sorting
    const sortedIncompleteTasks = sortTasks(incompleteTasks, sortBy);
    const sortedCompletedTasks = sortTasks(completedTasks, sortBy);
    
    // Render tasks in their respective sections
    this.renderTasksGrid(sortedIncompleteTasks, false);
    this.renderTasksGrid(sortedCompletedTasks, true);
    
    // Bind events once after both sections are rendered
    this.bindTaskCardEvents();
    
  console.log('uiManager.renderTasks: rendering', sortedIncompleteTasks.length, 'incomplete and', sortedCompletedTasks.length, 'completed tasks');
  }
  
  /**
   * Render tasks grid
   * @param {Array} tasks - Tasks to render
   * @param {boolean} isCompleted - Whether these are completed tasks
   */
  renderTasksGrid(tasks, isCompleted = false) {
    const grid = isCompleted ? this.elements.completedTasksGrid : this.elements.tasksGrid;
    const loading = this.elements.tasksLoading;
    const empty = isCompleted ? this.elements.completedTasksEmpty : this.elements.tasksEmpty;
    
    if (!grid) return;
    
    // Hide loading (only for incomplete tasks section)
    if (!isCompleted && loading) loading.style.display = 'none';
    
    // Hide/show empty state
    if (empty) {
      empty.style.display = tasks.length === 0 ? 'block' : 'none';
    }
    
    if (tasks.length === 0) {
      grid.innerHTML = '';
      return;
    }
    
    // Render task cards
    grid.innerHTML = tasks.map(task => this.createTaskCard(task)).join('');

    // Mark completed visuals
    tasks.forEach(t => {
      const card = document.querySelector(`.task-card[data-task-id="${t.id}"]`);
      if (card) {
        if (t.completed) card.classList.add('task-completed'); else card.classList.remove('task-completed');
      }
    });
  }
  
  /**
   * Create task card HTML
   * @param {Object} task - Task object
   * @returns {string} HTML string
   */
  createTaskCard(task) {
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const now = new Date();
    const daysUntilDue = dueDate ? Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24)) : Infinity;
    
    let statusClass = '';
    let statusText = '';
    
    if (daysUntilDue < 0) {
      statusClass = 'overdue';
      statusText = 'Overdue';
    } else if (daysUntilDue <= 3) {
      statusClass = 'due-soon';
      statusText = 'Due Soon';
    }
    
  const settings = loadSettings();
  const formattedDate = dueDate ? formatDate(dueDate, settings.dateFormat || 'YYYY-MM-DD') : '-';
  const duration = parseFloat(task.duration);
    const durationText = formatDuration(duration, settings.timeUnit);
    
    return `
      <div class="task-card ${statusClass}" data-task-id="${task.id}">
        <div class="task-header">
          <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
          <div class="task-actions">
            <label class="checkbox-label" style="margin-right:8px">
              <input type="checkbox" class="task-complete-checkbox" data-task-id="${task.id}" ${task.completed ? 'checked' : ''}>
              Done
            </label>
            <button class="task-action-btn edit-btn" aria-label="Edit task" title="Edit task">
              ✏️
            </button>
            <button class="task-action-btn danger delete-btn" aria-label="Delete task" title="Delete task">
              🗑️
            </button>
          </div>
        </div>
        
        <div class="task-meta">
          <div class="meta-item">
            <span class="meta-label">Due Date</span>
            <span class="meta-value">${formattedDate}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Duration</span>
            <span class="meta-value">${durationText}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Tag</span>
            <span class="task-tag">${this.escapeHtml(task.tag)}</span>
          </div>
          ${statusText ? `<div class="meta-item">
            <span class="status-indicator ${statusClass}">${statusText}</span>
          </div>` : ''}
        </div>
        
        ${task.description ? `
          <div class="task-description">
            ${this.escapeHtml(task.description)}
          </div>
        ` : ''}
      </div>
    `;
  }
  
  /**
   * Bind task card events
   */
  bindTaskCardEvents() {
    // Remove old event listeners by cloning and replacing (prevents duplicates)
    document.querySelectorAll('.task-card').forEach(card => {
      const taskId = card.dataset.taskId;
      
      // Edit button
      const editBtn = card.querySelector('.edit-btn');
      if (editBtn) {
        // Clone to remove old listeners
        const newEditBtn = editBtn.cloneNode(true);
        editBtn.parentNode.replaceChild(newEditBtn, editBtn);
        newEditBtn.addEventListener('click', () => {
          this.editTask(taskId);
        });
      }
      
      // Delete button
      const deleteBtn = card.querySelector('.delete-btn');
      if (deleteBtn) {
        // Clone to remove old listeners
        const newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
        newDeleteBtn.addEventListener('click', () => {
          this.deleteTask(taskId);
        });
      }

      // Completion checkbox
      const completeCheckbox = card.querySelector('.task-complete-checkbox');
      if (completeCheckbox) {
        // Clone to remove old listeners
        const newCheckbox = completeCheckbox.cloneNode(true);
        completeCheckbox.parentNode.replaceChild(newCheckbox, completeCheckbox);
        newCheckbox.addEventListener('change', (e) => {
          const checked = e.target.checked;
          // Capture task snapshot for toast
          const task = stateManager.getState('tasks').find(t => t.id === taskId) || { id: taskId, title: '' };
          taskActions.updateTask(taskId, { completed: checked }, stateManager);
          if (checked) this.showUndoToast(task);
        });
      }
    });
  }
  
  /**
   * Edit task
   * @param {string} taskId - Task ID
   */
  editTask(taskId) {
    try {
      console.log('Editing task:', taskId);
      uiActions.startEditingTask(taskId, stateManager);
      
      // Scroll to the add-task form
      const addTaskSection = document.getElementById('add-task');
      if (addTaskSection) {
        console.log('Scrolling to add-task section');
        addTaskSection.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
        
        // Focus on the first input field after a short delay
        setTimeout(() => {
          const firstInput = addTaskSection.querySelector('input');
          if (firstInput) {
            console.log('Focusing first input');
            firstInput.focus();
          }
        }, 500);
      } else {
        console.error('Add-task section not found');
      }
    } catch (error) {
      console.error('Error editing task:', error);
      this.showToast('Error loading task for editing', 'error');
    }
  }
  
  /**
   * Delete task
   * @param {string} taskId - Task ID
   */
  deleteTask(taskId) {
    const tasks = stateManager.getState('tasks');
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
      this.showConfirmationModal(
        'Delete Task',
        `Are you sure you want to delete "${task.title}"?`,
        () => {
          taskActions.deleteTask(taskId, stateManager);
        }
      );
    }
  }
  
  /**
   * Handle form submission
   */
  handleFormSubmit() {
    const formData = this.getFormData();
    const editingTaskId = stateManager.getState('editingTaskId');

    // Validate form using validator field names (e.g. 'date')
    if (!this.validateForm(formData)) {
      return;
    }

    // Map validator-friendly names to the state shape expected by taskActions
    // Combine date and time (if provided) into an ISO-like datetime for storage/comparison
    const due = formData.date ? (formData.time ? `${formData.date}T${formData.time}` : String(formData.date)) : '';

    // Convert duration to hours if user is in minutes mode (internally we store in hours)
    const settings = loadSettings();
    const timeUnit = settings.timeUnit || 'hours';
    let duration = parseFloat(formData.duration) || 0;
    if (timeUnit === 'minutes') {
      // Convert minutes to hours for storage
      duration = duration / 60;
    }

    const payload = {
      title: formData.title,
      dueDate: due,
      duration: duration,
      tag: formData.tag,
      description: formData.description
    };

    // Submit form
    if (editingTaskId) {
      taskActions.updateTask(editingTaskId, payload, stateManager);
    } else {
      taskActions.addTask(payload, stateManager);
      // Clear form after adding a new task
      this.clearTaskForm();
    }
  }
  
  /**
   * Get form data
   * @returns {Object} Form data
   */
  getFormData() {
    // Return using the field names expected by the validators (date) so validation works.
    // We'll map to the state's expected `dueDate` field when submitting.
    return {
      title: this.elements.taskTitle?.value || '',
      date: this.elements.taskDueDate?.value || '',
      time: this.elements.taskDueTime?.value || '',
      duration: this.elements.taskDuration?.value || '',
      tag: this.elements.taskTag?.value || '',
      description: this.elements.taskDescription?.value || ''
    };
  }
  
  /**
   * Clear task form after submission
   */
  clearTaskForm() {
    if (this.elements.taskForm) {
      this.elements.taskForm.reset();
    }
    // Clear any error messages
    const errorFields = ['title', 'date', 'duration', 'tag', 'description'];
    errorFields.forEach(field => {
      this.clearFieldError(field);
    });
  }
  
  /**
   * Validate form
   * @param {Object} formData - Form data
   * @returns {boolean} Valid status
   */
  validateForm(formData) {
    let isValid = true;
    const errors = {};
    
    // Validate each field
    Object.keys(formData).forEach(field => {
      const validation = validateField(field, formData[field]);
      if (!validation.isValid) {
        isValid = false;
        errors[field] = validation.message;
        this.showFieldError(field, validation.message);
      } else {
        this.clearFieldError(field);
      }
    });
    
    return isValid;
  }
  
  /**
   * Validate single field
   * @param {string} field - Field name
   * @param {string} value - Field value
   */
  validateField(field, value) {
    const validation = validateField(field, value);
    
    if (!validation.isValid) {
      this.showFieldError(field, validation.message);
    } else {
      this.clearFieldError(field);
    }
  }
  
  /**
   * Show field error
   * @param {string} field - Field name
   * @param {string} message - Error message
   */
  showFieldError(field, message) {
    const errorElement = this.getErrorElement(field);
    const inputElement = this.getInputElement(field);

    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.add('show');
    }

    if (inputElement) {
      inputElement.classList.add('error');
    }
  }
  
  /**
   * Clear field error
   * @param {string} field - Field name
   */
  clearFieldError(field) {
    const errorElement = this.getErrorElement(field);
    const inputElement = this.getInputElement(field);

    if (errorElement) {
      errorElement.textContent = '';
      errorElement.classList.remove('show');
    }

    if (inputElement) {
      inputElement.classList.remove('error');
    }
  }

  /**
   * Get input element for a field with flexible naming
   * tries cached elements, then `task-<field>`, then kebab-case variants (e.g., due-date)
   */
  getInputElement(field) {
    // Check cached mapping first (elements are stored under keys like taskTitle/taskDueDate)
    const parts = String(field).split(/[-_\s]+/).filter(Boolean);
    const camel = parts.map((p, i) => i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)).join('');
    const candidateKeys = [
      `task${field}`,
      `task${camel}`,
      field,
      camel
    ].map(s => String(s).toLowerCase());

    for (const k of Object.keys(this.elements)) {
      if (candidateKeys.includes(k.toLowerCase())) {
        const el = this.elements[k];
        if (el) return el;
      }
    }

    // Fallback to DOM queries
    const idDirect = `task-${field}`;
    let el = document.getElementById(idDirect);
    if (el) return el;

    // Try kebab-case conversion (e.g., dueDate -> due-date)
    const kebab = field.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`).replace(/_/g, '-');
    el = document.getElementById(`task-${kebab}`) || document.querySelector(`#${kebab}`);
    return el;
  }

  /**
   * Get error element for a field
   */
  getErrorElement(field) {
    const directId = `${field}-error`;
    let el = document.getElementById(directId);
    if (el) return el;

    // Try kebab-case
    const kebab = field.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`).replace(/_/g, '-');
    el = document.getElementById(`${kebab}-error`);
    return el;
  }
  
  /**
   * Update dashboard
   */
  updateDashboard() {
    const stats = stateManager.getState('stats');
    
    // Homepage stat elements were removed; dashboard updates are handled in dashboard.html
    // Keep this method to allow dashboard pages that include these elements to update when present
    if (this.elements.totalTasks) {
      this.elements.totalTasks.textContent = stats.totalTasks;
    }
    if (this.elements.totalDuration) {
      const settings = loadSettings();
      this.elements.totalDuration.textContent = formatDuration(stats.totalDuration, settings.timeUnit);
    }
    if (this.elements.topTag) {
      this.elements.topTag.textContent = stats.topTag || '-';
    }
    if (this.elements.weekTasks) {
      this.elements.weekTasks.textContent = stats.weekTasks;
    }
    if (this.elements.completedTasks) {
      this.elements.completedTasks.textContent = stats.completedTasks || 0;
    }
  }

  /**
   * Show an undo toast when a task is marked completed
   * @param {Object} task - Task object
   */
  showUndoToast(task) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `Marked "${this.escapeHtml(task.title)}" complete. <button class="undo-btn">Undo</button>`;

    container.appendChild(toast);

    const undoBtn = toast.querySelector('.undo-btn');
    const timeoutId = setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 5000);

    undoBtn.addEventListener('click', () => {
      clearTimeout(timeoutId);
      // Revert completion
      taskActions.updateTask(task.id, { completed: false }, stateManager);
      toast.remove();
    });
  }
  
  /**
   * Update recent tasks
   */
  updateRecentTasks() {
    // Recent tasks preview removed from homepage; keep as no-op unless element exists on the page
    const tasks = stateManager.getState('tasks');
    const recentTasks = tasks
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
    // Also update Today's tasks if present
    this.renderTodaysTasks();
  }

  /**
   * Render Today's Tasks panel: tasks due today, sorted by priority (Eisenhower Matrix)
   */
  renderTodaysTasks() {
    const container = document.getElementById('todays-tasks-list');
    if (!container) return;

    const tasks = stateManager.getState('tasks') || [];
    const todayStr = new Date().toISOString().split('T')[0];

    // Filter tasks due today and not deleted
    const todays = tasks.filter(t => t.dueDate && String(t.dueDate).startsWith(todayStr));

    // Sort by priority first (Eisenhower Matrix), then by due time
    const priorityOrder = {
      'Urgent & Important': 1,
      'Important but Not Urgent': 2,
      'Urgent but Not Important': 3
    };
    
    todays.sort((a, b) => {
      // First, sort by priority
      const priorityA = priorityOrder[a.tag] || 999;
      const priorityB = priorityOrder[b.tag] || 999;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Then, sort by due datetime ascending (earlier first)
      const aDt = a.dueDate ? new Date(a.dueDate) : null;
      const bDt = b.dueDate ? new Date(b.dueDate) : null;

      if (aDt && bDt) {
        const diff = aDt - bDt;
        if (diff !== 0) return diff;
      } else if (aDt && !bDt) {
        return -1; // a has time, b doesn't -> a first
      } else if (!aDt && bDt) {
        return 1; // b has time, a doesn't -> b first
      }

      // Tie-breaker: longer duration first
      return parseFloat(b.duration || 0) - parseFloat(a.duration || 0);
    });

    if (todays.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:12px;color:var(--gray-300)">No tasks for today</div>';
      return;
    }

    // Build a semantic list
    const listHtml = todays.map(task => {
  const due = task.dueDate ? new Date(task.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-';
      const durationVal = parseFloat(task.duration || 0);
      const duration = task.duration ? `${durationVal} h` : '-';
      const longAttr = durationVal >= 2 ? 'data-duration-long="true"' : '';

      return `
        <li class="todays-list-item" data-task-id="${task.id}" ${longAttr}>
          <label class="todays-checkbox">
            <input type="checkbox" class="todays-task-complete" data-task-id="${task.id}" ${task.completed ? 'checked' : ''}>
          </label>
          <div class="todays-content">
            <div class="task-preview-title">${this.escapeHtml(task.title)}</div>
            <div class="task-preview-meta">Tag: ${this.escapeHtml(task.tag || '-') } • Due: ${due}</div>
          </div>
          <div class="duration-badge">${this.escapeHtml(duration)}</div>
        </li>
      `;
    }).join('');

    container.innerHTML = `<ul class="todays-list">${listHtml}</ul>`;

    // Bind completion toggles
    container.querySelectorAll('.todays-task-complete').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const taskId = e.target.dataset.taskId;
        const checked = e.target.checked;
        const task = stateManager.getState('tasks').find(t => t.id === taskId) || { id: taskId, title: '' };
        taskActions.updateTask(taskId, { completed: checked }, stateManager);
        if (checked) this.showUndoToast(task);
      });
    });
  }
  
  /**
   * Update cap status
   * @param {Object} capSettings - Cap settings
   */
  updateCapStatus(capSettings) {
    // Cap/target UI removed from homepage; update only if element exists on the current page
    if (!this.elements.capStatus) return;
    
    const settings = loadSettings();
    const timeUnit = settings.timeUnit || 'hours';
    
    // Update the unit label
    const unitLabel = document.getElementById('cap-unit-label');
    if (unitLabel) {
      unitLabel.textContent = timeUnit;
    }
    
    const { currentWeekDuration, durationCap, capStatus, percentage } = capSettings;
    this.elements.capStatus.className = `cap-status ${capStatus}`;
    
    // Format remaining/exceeded time based on user preference
    const remaining = durationCap - currentWeekDuration;
    const exceeded = currentWeekDuration - durationCap;
    const remainingText = formatDuration(remaining, timeUnit);
    const exceededText = formatDuration(exceeded, timeUnit);
    
    if (percentage > 100) {
      this.elements.capStatus.textContent = `You've exceeded your weekly goal by ${exceededText}! (${percentage}%)`;
      this.elements.capStatus.setAttribute('aria-live', 'assertive');
    } else if (percentage > 80) {
      this.elements.capStatus.textContent = `You have accomplished ${percentage}% of your weekly goal! ${remainingText} remaining`;
      this.elements.capStatus.setAttribute('aria-live', 'polite');
    } else {
      this.elements.capStatus.textContent = `You have accomplished ${percentage}% of your weekly goal. ${remainingText} remaining`;
      this.elements.capStatus.setAttribute('aria-live', 'polite');
    }
  }

  /**
   * Render weekly progress chart: compares per-day achieved hours (completed tasks) vs goal-per-day
   */
  renderWeeklyChart() {
    const canvas = document.querySelector('#weekly-progress-canvas');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    // Ensure the canvas backing store matches the displayed CSS size for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const tasks = stateManager.getState('tasks') || [];

    // Get client rect and size the canvas
    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width || 200;
    const cssHeight = rect.height || 160;
    canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
    canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
    // Reset transform and scale to DPR, then use CSS coordinates for drawing and hit testing
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    // Determine week range (start of week = today -6 .. today)
    const today = new Date();
    today.setHours(0,0,0,0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6);

    // Count tasks with dueDate inside the week (set tasks) and among them how many are completed
    let setCount = 0;
    let achievedCount = 0;

    tasks.forEach(t => {
      if (!t.dueDate) return;
      // dueDate may be YYYY-MM-DD or YYYY-MM-DDTHH:MM
      const due = new Date(String(t.dueDate));
      if (isNaN(due.getTime())) return;
      const dueDay = new Date(due);
      dueDay.setHours(0,0,0,0);
      if (dueDay >= weekStart && dueDay <= today) {
        setCount++;
        if (t.completed) {
          // completion time may be completedAt or updatedAt
          const completedTs = t.completedAt || t.updatedAt || null;
          if (completedTs) {
            const completedDate = new Date(completedTs);
            if (!isNaN(completedDate.getTime())) {
              const completedDay = new Date(completedDate);
              completedDay.setHours(0,0,0,0);
              if (completedDay >= weekStart && completedDay <= today) {
                achievedCount++;
              }
            }
          }
        }
      }
    });

    // Get weekly goal and compute completed hours
    const settings = loadSettings();
    const timeUnit = settings.timeUnit || 'hours';
    const capSettings = stateManager.getState('capSettings') || {};
    const weeklyGoal = capSettings.durationCap || stateManager.getState('settings')?.durationCap || 40;
    
    // Sum completed hours this week
    let completedHours = 0;
    const tasksList = stateManager.getState('tasks') || [];
    tasksList.forEach(t => {
      if (!t.completed) return;
      const completedTs = t.completedAt || t.updatedAt || null;
      if (!completedTs) return;
      const completedDate = new Date(completedTs);
      if (isNaN(completedDate.getTime())) return;
      const completedDay = new Date(completedDate);
      completedDay.setHours(0,0,0,0);
      if (completedDay >= weekStart && completedDay <= today) {
        completedHours += parseFloat(t.duration || 0) || 0;
      }
    });

    const remainingHours = Math.max(0, weeklyGoal - completedHours);

    // Draw pie chart (donut) showing completed vs remaining hours toward goal
    const padding = 8;
    const cx = cssWidth / 2;
    const cy = cssHeight / 2;
    const radius = Math.max(8, Math.min(cssWidth, cssHeight) / 2 - padding * 2);

    const total = Math.max(1, weeklyGoal);
    const completedAngle = (completedHours / total) * Math.PI * 2;

    // Background circle (remaining hours)
    ctx.fillStyle = 'rgba(255,159,67,0.25)'; // Orange for remaining
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Completed slice (start at top)
    ctx.fillStyle = 'rgba(99,102,241,0.95)'; // Blue for completed
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, -Math.PI/2, -Math.PI/2 + completedAngle);
    ctx.closePath();
    ctx.fill();

    // Draw inner circle to create donut effect
    ctx.fillStyle = 'rgba(20,20,20,0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.56, 0, Math.PI * 2);
    ctx.fill();

    // Center label
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '14px Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Format values based on time unit preference
    const completedText = formatDuration(completedHours, timeUnit);
    const goalText = formatDuration(weeklyGoal, timeUnit);
    ctx.fillText(`${completedText} / ${goalText}`, cx, cy);

    // Legend with color swatches
    ctx.font = '12px Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
    ctx.textAlign = 'left';
    // Completed legend (blue)
    ctx.fillStyle = 'rgba(99,102,241,0.95)';
    ctx.fillRect(padding + 4, 8, 12, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('Completed', padding + 20, 16);
    // Remaining legend (orange)
    ctx.fillStyle = 'rgba(255,159,67,0.6)';
    ctx.fillRect(padding + 120, 8, 12, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('Remaining', padding + 136, 16);

    // Store for tooltip (use CSS coordinates for hit testing)
    this._lastPie = { cx, cy, radius, completedHours, remainingHours, weeklyGoal };
    // Clear any legacy per-day chart data so tooltip fallback won't show stale info
    this._lastChartData = null;

    // Debug info to help diagnose rendering issues in the browser console
    try {
      console.debug('renderWeeklyChart:', { completedHours, remainingHours, weeklyGoal, cssWidth, cssHeight, cx, cy, radius });
    } catch (e) { /* ignore in old consoles */ }
    this._attachChartPointerHandlers();
  }

  _attachChartPointerHandlers() {
    const canvas = document.querySelector('#weekly-progress-canvas');
    const tooltip = document.querySelector('#weekly-chart-tooltip');
    if (!canvas || !tooltip) return;
    if (this._chartHandlersAttached) return;
    this._chartHandlersAttached = true;

    const getLocal = (evt) => {
      const rect = canvas.getBoundingClientRect();
      const x = (evt.touches ? evt.touches[0].clientX : evt.clientX) - rect.left;
      const y = (evt.touches ? evt.touches[0].clientY : evt.clientY) - rect.top;
      return { x, y, rect };
    };

    const pointInCircle = (px, py, cx, cy, r) => {
      const dx = px - cx; const dy = py - cy; return dx*dx + dy*dy <= r*r;
    };

    const showTooltip = (evt) => {
      // Prefer pie tooltip if available
      if (this._lastPie) {
        const { x, y, rect } = getLocal(evt);
        const p = this._lastPie;
        // only show when pointer is inside pie radius
        if (!pointInCircle(x, y, p.cx, p.cy, p.radius)) { tooltip.style.display = 'none'; return; }
        const percent = p.weeklyGoal === 0 ? 0 : Math.round((p.completedHours / p.weeklyGoal) * 100);
        tooltip.style.display = 'block';
        tooltip.innerHTML = `<strong>Completed:</strong> ${p.completedHours.toFixed(1)}h<br><strong>Remaining:</strong> ${p.remainingHours.toFixed(1)}h<br>${percent}% of goal`;
        // Position relative to canvas (using local coordinates + offset)
        const left = Math.min(rect.width - 160, Math.max(8, x + 12));
        const top = Math.max(8, Math.min(rect.height - 60, y + 12));
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        return;
      }

  // Fallback to per-day tooltip when chart data exists
  if (!this._lastChartData || !this._lastChartData.points) { tooltip.style.display = 'none'; return; }
  const pts = this._lastChartData.points;
  if (!Array.isArray(pts) || pts.length === 0) { tooltip.style.display = 'none'; return; }

  const { x, y, rect } = getLocal(evt);
  const { padding = 0, chartWidth = rect.width } = this._lastChartData;
  const relX = x - padding;
  if (relX < 0 || relX > chartWidth) { tooltip.style.display = 'none'; return; }
  // compute slot width defensively
  const slotWidth = chartWidth / Math.max(1, pts.length);
  const idx = Math.floor(relX / slotWidth);
  const clamped = Math.max(0, Math.min(pts.length - 1, idx));
  const d = pts[clamped];
  if (!d) { tooltip.style.display = 'none'; return; }

  tooltip.style.display = 'block';
  tooltip.textContent = `${d.label}: ${d.achieved} achieved • ${d.set} set`;
  // Position relative to canvas (using local coordinates + offset)
  const left = Math.min(rect.width - 160, Math.max(8, x + 12));
  const top = Math.max(8, Math.min(rect.height - 40, y + 12));
  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
    };

    const hideTooltip = () => { tooltip.style.display = 'none'; };

    canvas.addEventListener('mousemove', showTooltip);
    canvas.addEventListener('touchstart', showTooltip);
    canvas.addEventListener('touchmove', showTooltip);
    canvas.addEventListener('mouseleave', hideTooltip);
    canvas.addEventListener('touchend', hideTooltip);
  }

  /**
   * Setup responsive behavior for charts (resize canvas on window resize)
   */
  setupChartResize() {
    if (this._chartResizeAttached) return;
    this._chartResizeAttached = true;

    const debounce = (fn, wait = 120) => {
      let t = null;
      return function(...args) {
        if (t) clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
      };
    };

    const handler = debounce(() => {
      this.renderWeeklyChart();
    }, 120);

    window.addEventListener('resize', handler);
    // Also re-render once when visibility changes (e.g., navigating to dashboard)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.renderWeeklyChart();
    });
  }
  
  /**
   * Update tag filter options
   */
  updateTagFilter() {
    if (!this.elements.tagFilter) return;
    
    const tasks = stateManager.getState('tasks');
    const tags = [...new Set(tasks.map(task => task.tag))].sort();
    
    this.elements.tagFilter.innerHTML = `
      <option value="">All Tags</option>
      ${tags.map(tag => `<option value="${this.escapeHtml(tag)}">${this.escapeHtml(tag)}</option>`).join('')}
    `;
  }
  
  /**
   * Show confirmation modal
   * @param {string} title - Modal title
   * @param {string} message - Modal message
   * @param {Function} onConfirm - Confirm callback
   */
  showConfirmationModal(title, message, onConfirm) {
    if (this.elements.modalTitle) {
      this.elements.modalTitle.textContent = title;
    }
    
    if (this.elements.modalMessage) {
      this.elements.modalMessage.textContent = message;
    }
    
    // Store confirm callback
    this.modalConfirmCallback = onConfirm;
    
    uiActions.showModal({ type: 'confirmation' }, stateManager);
  }
  
  /**
   * Toggle modal visibility
   * @param {boolean} show - Show modal
   */
  toggleModal(show) {
    if (!this.elements.modal) return;
    
    if (show) {
      this.elements.modal.classList.add('active');
      this.elements.modal.setAttribute('aria-hidden', 'false');
      
      // Focus first interactive element
      const firstInteractive = this.elements.modal.querySelector('button');
      if (firstInteractive) {
        firstInteractive.focus();
      }
    } else {
      this.elements.modal.classList.remove('active');
      this.elements.modal.setAttribute('aria-hidden', 'true');
    }
  }
  
  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    this.announceToScreenReader(`Error: ${message}`, 'alert');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      uiActions.clearMessages(stateManager);
    }, 5000);
  }
  
  /**
   * Show success message
   * @param {string} message - Success message
   */
  showSuccess(message) {
    this.announceToScreenReader(`Success: ${message}`);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      uiActions.clearMessages(stateManager);
    }, 3000);
  }
  
  /**
   * Update form for editing
   * @param {string} editingTaskId - Task ID being edited
   */
  updateFormForEditing(editingTaskId) {
    if (editingTaskId) {
      const task = stateManager.getState('currentTask');
      if (task) {
        // Get user's time unit preference
        const settings = loadSettings();
        const timeUnit = settings.timeUnit || 'hours';
        
        // Convert duration from hours (stored) to user's preferred unit
        let displayDuration = task.duration;
        if (timeUnit === 'minutes' && task.duration) {
          // Convert hours to minutes
          displayDuration = task.duration * 60;
        }
        
        // Populate form
        if (this.elements.taskTitle) this.elements.taskTitle.value = task.title;
  if (this.elements.taskDueDate) this.elements.taskDueDate.value = task.dueDate ? String(task.dueDate).split('T')[0] : '';
  if (this.elements.taskDueTime) this.elements.taskDueTime.value = task.dueDate && String(task.dueDate).includes('T') ? String(task.dueDate).split('T')[1].slice(0,5) : '';
        if (this.elements.taskDuration) this.elements.taskDuration.value = displayDuration;
        if (this.elements.taskTag) this.elements.taskTag.value = task.tag;
        if (this.elements.taskDescription) this.elements.taskDescription.value = task.description || '';
        
        // Update form title and button
        const sectionTitle = document.querySelector('#add-task .section-title');
        if (sectionTitle) {
          sectionTitle.textContent = 'Edit Task';
        }
        
        if (this.elements.submitBtn) {
          this.elements.submitBtn.textContent = 'Update Task';
        }
        
        if (this.elements.cancelEditBtn) {
          this.elements.cancelEditBtn.style.display = 'inline-flex';
        }
      }
    } else {
      // Reset form for new task
      this.elements.taskForm?.reset();
      
      const sectionTitle = document.querySelector('#add-task .section-title');
      if (sectionTitle) {
        sectionTitle.textContent = 'Add New Task';
      }
      
      if (this.elements.submitBtn) {
        this.elements.submitBtn.textContent = 'Save Task';
      }
      
      if (this.elements.cancelEditBtn) {
        this.elements.cancelEditBtn.style.display = 'none';
      }
    }
  }
  
  /**
   * Update settings form
   * @param {Object} settings - Settings object
   */
  updateSettingsForm(settings) {
    if (this.elements.timeUnitSelect) {
      this.elements.timeUnitSelect.value = settings.timeUnit || 'hours';
    }
    
    if (this.elements.dateFormatSelect) {
      this.elements.dateFormatSelect.value = settings.dateFormat || 'YYYY-MM-DD';
    }
    
    if (this.elements.dueRemindersCheckbox) {
      this.elements.dueRemindersCheckbox.checked = settings.dueReminders !== false;
    }
    
    if (this.elements.goalAlertsCheckbox) {
      this.elements.goalAlertsCheckbox.checked = settings.goalAlerts !== false;
    }
    
    if (this.elements.capInput) {
      this.elements.capInput.value = settings.durationCap || 40;
    }
  }
  
  /**
   * Handle export data
   */
  handleExportData() {
    const tasks = stateManager.getState('tasks');
    const settings = stateManager.getState('settings');
    
    // Import the export function from storage module
    import('./storage.js').then(({ exportData, downloadBackup }) => {
      downloadBackup(tasks, settings);
      this.announceToScreenReader('Data exported successfully');
    });
  }
  
  /**
   * Handle import data
   * @param {File} file - File to import
   */
  handleImportData(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Import the import function from storage module
        import('./storage.js').then(({ importData, saveTasks, saveSettings }) => {
          const result = importData(e.target.result);
          
          if (result.success) {
            // Save imported data
            saveTasks(result.tasks);
            if (result.settings) {
              saveSettings(result.settings);
            }
            
            // Reload state
            stateManager.setState({
              tasks: result.tasks,
              settings: result.settings || stateManager.getState('settings'),
              success: `Imported ${result.tasks.length} tasks successfully`
            });
            
            this.announceToScreenReader(`Imported ${result.tasks.length} tasks`);
          } else {
            stateManager.setState({
              error: `Import failed: ${result.errors.join(', ')}`
            });
          }
        });
      } catch (error) {
        stateManager.setState({
          error: 'Failed to parse imported file'
        });
      }
    };
    
    reader.readAsText(file);
  }
  
  /**
   * Handle clear data
   */
  handleClearData() {
    // Import clear function from storage module
    import('./storage.js').then(({ clearAllData }) => {
      if (clearAllData()) {
        stateManager.reset();
        this.announceToScreenReader('All data cleared');
      } else {
        stateManager.setState({
          error: 'Failed to clear data'
        });
      }
    });
  }
  
  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Global UI manager instance
 */
export const uiManager = new UIManager();

/**
 * Initialize UI when DOM is ready
 */
export function initializeUI() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      uiManager.initialize();
    });
  } else {
    uiManager.initialize();
  }
}
