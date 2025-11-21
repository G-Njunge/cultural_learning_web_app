/**
 * State Module - Application state management
 * Handles centralized state, events, and data flow
 */

import { generateId, generateTimestamp, loadTasks, saveTasks, loadSettings, saveSettings } from './storage.js';
import { validateTask } from './validators.js';

// Initial app state
const initialState = {
  // Core data
  tasks: [],
  settings: {},
  currentTask: null,
  editingTaskId: null,
  
  // UI state
  currentSection: 'dashboard',
  isLoading: false,
  error: null,
  success: null,
  
  // Search and filter state
  searchQuery: '',
  searchResults: [],
  activeFilters: {},
  sortBy: 'date-asc',
  caseSensitive: false,
  
  // Modal state
  showModal: false,
  modalConfig: null,
  
  // Form state
  formData: {},
  formErrors: {},
  formTouched: {},
  
  // Stats and analytics
  stats: {
    totalTasks: 0,
    totalDuration: 0,
    topTag: null,
    weekTasks: 0,
    overdueTasks: 0,
    completedTasks: 0
  },
  
  // Cap/target tracking
  capSettings: {
    durationCap: 40,
    currentWeekDuration: 0,
    isOverCap: false,
    capStatus: 'success' // success, warning, error
  }
};

/**
 * State manager class
 */
class StateManager {
  constructor() {
    this.state = { ...initialState };
    this.listeners = new Map();
    this.history = [];
    this.maxHistorySize = 50;
  }
  
  /**
   * Get current state
   * @param {string} key - Optional specific state key
   * @returns {*} State value or entire state
   */
  getState(key = null) {
    if (key) {
      return this.state[key];
    }
    return { ...this.state };
  }
  
  /**
   * Update state
   * @param {Object} updates - State updates
   * @param {boolean} saveToHistory - Whether to save to history
   */
  setState(updates, saveToHistory = true) {
    const prevState = { ...this.state };
    
    // Deep merge updates
    this.state = this.deepMerge(this.state, updates);
    
    // Save to history if requested
    if (saveToHistory) {
      this.addToHistory(prevState, this.state);
    }
    
    // Notify listeners
    this.notifyListeners(updates, prevState);
  }
  
  /**
   * Subscribe to state changes
   * @param {string} key - State key to listen to
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    
    this.listeners.get(key).add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }
  
  /**
   * Notify listeners of state changes
   * @param {Object} updates - State updates
   * @param {Object} prevState - Previous state
   */
  notifyListeners(updates, prevState) {
    Object.keys(updates).forEach(key => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        listeners.forEach(callback => {
          try {
            callback(this.state[key], prevState[key], this.state);
          } catch (error) {
            console.error(`Error in state listener for ${key}:`, error);
          }
        });
      }
    });
  }
  
  /**
   * Deep merge objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    });
    
    return result;
  }
  
  /**
   * Add state to history
   * @param {Object} prevState - Previous state
   * @param {Object} newState - New state
   */
  addToHistory(prevState, newState) {
    this.history.push({
      timestamp: Date.now(),
      prevState,
      newState
    });
    
    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }
  
  /**
   * Undo last state change
   * @returns {boolean} Success status
   */
  undo() {
    if (this.history.length === 0) return false;
    
    const lastEntry = this.history.pop();
    this.state = { ...lastEntry.prevState };
    this.notifyListeners(this.state, lastEntry.newState);
    
    return true;
  }
  
  /**
   * Clear state history
   */
  clearHistory() {
    this.history = [];
  }
  
  /**
   * Reset state to initial
   */
  reset() {
    this.state = { ...initialState };
    this.history = [];
    this.notifyListeners(this.state, {});
  }
}

/**
 * Task management actions
 */
export const taskActions = {
  /**
   * Load tasks from storage
   * @param {StateManager} stateManager - State manager instance
   */
  loadTasks(stateManager) {
    stateManager.setState({ isLoading: true });
    
    try {
      const tasks = loadTasks();
      const settings = loadSettings();
      
      stateManager.setState({
        tasks,
        settings,
        isLoading: false,
        error: null
      });
      
      // Calculate stats after loading
      taskActions.calculateStats(stateManager);
      
    } catch (error) {
      stateManager.setState({
        isLoading: false,
        error: 'Failed to load tasks'
      });
    }
  },
  
  /**
   * Add new task
   * @param {Object} taskData - Task data
   * @param {StateManager} stateManager - State manager instance
   */
  addTask(taskData, stateManager) {
    // Validate task data
    const validation = validateTask(taskData);
    if (!validation.isValid) {
      stateManager.setState({
        error: 'Invalid task data',
        formErrors: validation.errors
      });
      return false;
    }
    
    const newTask = {
      id: generateId(),
      title: taskData.title.trim(),
      dueDate: taskData.dueDate,
      duration: parseFloat(taskData.duration),
      tag: taskData.tag.trim(),
      description: taskData.description ? taskData.description.trim() : '',
      completed: false,
      createdAt: generateTimestamp(),
      updatedAt: generateTimestamp()
    };
    
    const updatedTasks = [...stateManager.getState('tasks'), newTask];
    
    // Save to storage
    if (saveTasks(updatedTasks)) {
      console.debug('taskActions.addTask: saved task to storage', newTask);
      stateManager.setState({
        tasks: updatedTasks,
        success: 'Task added successfully',
        error: null,
        formData: {},
        formErrors: {},
        formTouched: {}
      });
      
      // Recalculate stats
  console.debug('taskActions.addTask: recalculating stats after add');
      taskActions.calculateStats(stateManager);
      
      return true;
    } else {
      stateManager.setState({
        error: 'Failed to save task'
      });
      return false;
    }
  },
  
  /**
   * Update existing task
   * @param {string} taskId - Task ID
   * @param {Object} updates - Task updates
   * @param {StateManager} stateManager - State manager instance
   */
  updateTask(taskId, updates, stateManager) {
    const tasks = stateManager.getState('tasks');
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      stateManager.setState({
        error: 'Task not found'
      });
      return false;
    }
    
    const prevTask = tasks[taskIndex];
    const updatedTask = {
      ...prevTask,
      ...updates,
      updatedAt: generateTimestamp()
    };

    // Manage completedAt timestamp: when a task is marked completed set completedAt, when unmarked clear it
    if (Object.prototype.hasOwnProperty.call(updates, 'completed')) {
      const wasCompleted = Boolean(prevTask.completed);
      const willBeCompleted = Boolean(updates.completed);
      if (!wasCompleted && willBeCompleted) {
        updatedTask.completedAt = generateTimestamp();
      } else if (wasCompleted && !willBeCompleted) {
        updatedTask.completedAt = null;
      }
      // If updates.completed present but no change in boolean, keep existing completedAt
      if (wasCompleted && willBeCompleted && !prevTask.completedAt) {
        // fallback to updatedAt if previous completed flag existed but no timestamp
        updatedTask.completedAt = updatedTask.updatedAt;
      }
    }
    
    // Validate updated task
    const validation = validateTask(updatedTask);
    if (!validation.isValid) {
      stateManager.setState({
        error: 'Invalid task data',
        formErrors: validation.errors
      });
      return false;
    }
    
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = updatedTask;
    
    // Save to storage
    if (saveTasks(updatedTasks)) {
      stateManager.setState({
        tasks: updatedTasks,
        editingTaskId: null,
        currentTask: null,
        success: 'Task updated successfully',
        error: null,
        formData: {},
        formErrors: {},
        formTouched: {}
      });
      
      // Recalculate stats
      taskActions.calculateStats(stateManager);
      
      return true;
    } else {
      stateManager.setState({
        error: 'Failed to save task'
      });
      return false;
    }
  },
  
  /**
   * Delete task
   * @param {string} taskId - Task ID
   * @param {StateManager} stateManager - State manager instance
   */
  deleteTask(taskId, stateManager) {
    const tasks = stateManager.getState('tasks');
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    
    if (updatedTasks.length === tasks.length) {
      stateManager.setState({
        error: 'Task not found'
      });
      return false;
    }
    
    // Save to storage
    if (saveTasks(updatedTasks)) {
      stateManager.setState({
        tasks: updatedTasks,
        success: 'Task deleted successfully',
        error: null
      });
      
      // Recalculate stats
      taskActions.calculateStats(stateManager);
      
      return true;
    } else {
      stateManager.setState({
        error: 'Failed to delete task'
      });
      return false;
    }
  },
  
  /**
   * Calculate application statistics
   * @param {StateManager} stateManager - State manager instance
   */
  calculateStats(stateManager) {
    const tasks = stateManager.getState('tasks');
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
  // Calculate total duration (planned/assigned)
  const totalDuration = tasks.reduce((sum, task) => sum + parseFloat(task.duration || 0), 0);
    
    // Calculate tag frequency
    const tagCounts = {};
    tasks.forEach(task => {
      if (task.tag) tagCounts[task.tag] = (tagCounts[task.tag] || 0) + 1;
    });

    // Determine top tag safely
    const tagEntries = Object.entries(tagCounts);
    const topTag = tagEntries.length ? tagEntries.sort((a, b) => b[1] - a[1])[0][0] : null;
    
    // Calculate tasks from last week
    const weekTasks = tasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      return taskDate >= weekAgo;
    }).length;
    
    // Calculate overdue tasks
    const overdueTasks = tasks.filter(task => {
      const dueDate = new Date(task.dueDate);
      return dueDate < now;
    }).length;
    
  // Calculate completed tasks
  const completedTasks = tasks.filter(t => t.completed).length;

  // Calculate completed duration for the past week (only completed tasks count toward the weekly goal)
  const completedDurationWeek = tasks.reduce((sum, task) => {
    if (!task.completed) return sum;

    // Determine completion timestamp: prefer completedAt, fall back to updatedAt
    const completedAt = task.completedAt ? new Date(task.completedAt) : (task.updatedAt ? new Date(task.updatedAt) : null);
    if (!completedAt) return sum;

    if (completedAt >= weekAgo && completedAt <= now) {
      return sum + parseFloat(task.duration || 0);
    }
    return sum;
  }, 0);
    
    const stats = {
      totalTasks: tasks.length,
      totalDuration,
      topTag,
      weekTasks,
      overdueTasks,
      completedTasks,
      completedDurationWeek
    };
    console.debug('taskActions.calculateStats: computed', stats);

    stateManager.setState({ stats });

    // Update cap status
    // The cap/goal should be computed against completed hours in the current week
    taskActions.updateCapStatus(stateManager, completedDurationWeek);
  },
  
  /**
   * Update cap/target status
   * @param {StateManager} stateManager - State manager instance
   * @param {number} currentDuration - Current total duration
   */
  updateCapStatus(stateManager, currentDuration = null) {
    const settings = stateManager.getState('settings');
    const durationCap = settings.durationCap || 40;
    const actualDuration = currentDuration !== null ? currentDuration : stateManager.getState('stats').totalDuration;
    
    const isOverCap = actualDuration > durationCap;
    const percentage = (actualDuration / durationCap) * 100;
    
    let capStatus = 'success';
    if (percentage > 100) {
      capStatus = 'success'; // Exceeding goal is an achievement, show in green
    } else if (percentage > 80) {
      capStatus = 'warning';
    }
    
    const capSettings = {
      durationCap,
      currentWeekDuration: actualDuration,
      isOverCap,
      capStatus,
      percentage: Math.round(percentage)
    };
    console.debug('taskActions.updateCapStatus: capSettings', capSettings);
    
    stateManager.setState({ capSettings });
  }
};

/**
 * UI management actions
 */
export const uiActions = {
  /**
   * Navigate to section
   * @param {string} section - Section name
   * @param {StateManager} stateManager - State manager instance
   */
  navigateToSection(section, stateManager) {
    stateManager.setState({
      currentSection: section,
      error: null,
      success: null
    });
  },
  
  /**
   * Set loading state
   * @param {boolean} isLoading - Loading state
   * @param {StateManager} stateManager - State manager instance
   */
  setLoading(isLoading, stateManager) {
    stateManager.setState({ isLoading });
  },
  
  /**
   * Set error message
   * @param {string} error - Error message
   * @param {StateManager} stateManager - State manager instance
   */
  setError(error, stateManager) {
    stateManager.setState({ error, success: null });
  },
  
  /**
   * Set success message
   * @param {string} success - Success message
   * @param {StateManager} stateManager - State manager instance
   */
  setSuccess(success, stateManager) {
    stateManager.setState({ success, error: null });
  },
  
  /**
   * Clear messages
   * @param {StateManager} stateManager - State manager instance
   */
  clearMessages(stateManager) {
    stateManager.setState({ error: null, success: null });
  },
  
  /**
   * Show modal
   * @param {Object} config - Modal configuration
   * @param {StateManager} stateManager - State manager instance
   */
  showModal(config, stateManager) {
    stateManager.setState({
      showModal: true,
      modalConfig: config
    });
  },
  
  /**
   * Hide modal
   * @param {StateManager} stateManager - State manager instance
   */
  hideModal(stateManager) {
    stateManager.setState({
      showModal: false,
      modalConfig: null
    });
  },
  
  /**
   * Start editing task
   * @param {string} taskId - Task ID
   * @param {StateManager} stateManager - State manager instance
   */
  startEditingTask(taskId, stateManager) {
    const tasks = stateManager.getState('tasks');
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
      stateManager.setState({
        editingTaskId: taskId,
        currentTask: task,
        formData: { ...task },
        formErrors: {},
        formTouched: {}
      });
    }
  },
  
  /**
   * Cancel editing
   * @param {StateManager} stateManager - State manager instance
   */
  cancelEditing(stateManager) {
    stateManager.setState({
      editingTaskId: null,
      currentTask: null,
      formData: {},
      formErrors: {},
      formTouched: {}
    });
  }
};

/**
 * Settings management actions
 */
export const settingsActions = {
  /**
   * Update settings
   * @param {Object} updates - Settings updates
   * @param {StateManager} stateManager - State manager instance
   */
  updateSettings(updates, stateManager) {
    const currentSettings = stateManager.getState('settings');
    const newSettings = { ...currentSettings, ...updates };
    
    if (saveSettings(newSettings)) {
      stateManager.setState({
        settings: newSettings,
        success: 'Settings updated successfully'
      });
      
      // Update cap status if duration cap was provided (allow 0)
      if (Object.prototype.hasOwnProperty.call(updates, 'durationCap')) {
        taskActions.updateCapStatus(stateManager);
      }
      
      return true;
    } else {
      stateManager.setState({
        error: 'Failed to save settings'
      });
      return false;
    }
  }
};

/**
 * Global state manager instance
 */
export const stateManager = new StateManager();

/**
 * Initialize application state
 */
export function initializeState() {
  taskActions.loadTasks(stateManager);
}
