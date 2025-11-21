// Test runner module for Campus-Life
// This file contains the same test harness that was previously embedded in tests.html

import { validateField, validateTask, compileRegex, testRegex, ADVANCED_PATTERNS } from './validators.js';
import { generateId, generateTimestamp, loadTasks, saveTasks, exportData, importData } from './storage.js';
import { searchManager, filterTasks, sortTasks } from './search.js';

// Test results storage
let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
};

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

function assertThrows(fn, message) {
    let threw = false;
    try {
        fn();
    } catch (e) {
        threw = true;
    }
    if (!threw) {
        throw new Error(`${message}: expected function to throw`);
    }
}

function runTest(testName, testFn) {
    testResults.total++;
    try {
        testFn();
        testResults.passed++;
        testResults.tests.push({ name: testName, status: 'pass', message: 'Test passed' });
        return true;
    } catch (error) {
        testResults.failed++;
        testResults.tests.push({ name: testName, status: 'fail', message: error.message });
        return false;
    }
}

// The test suites mirror the ones from tests.html
function runValidationTests(createTestSection, renderTestResults) {
    const section = createTestSection('Validation Tests');

    runTest('Title validation - valid title', () => {
        const result = validateField('title', 'Valid Task Title');
        assert(result.isValid, 'Valid title should pass validation');
    });

    runTest('Title validation - leading spaces', () => {
        const result = validateField('title', ' Invalid Title');
        assert(!result.isValid, 'Title with leading spaces should fail');
    });

    runTest('Title validation - trailing spaces', () => {
        const result = validateField('title', 'Invalid Title ');
        assert(!result.isValid, 'Title with trailing spaces should fail');
    });

    runTest('Title validation - only spaces', () => {
        const result = validateField('title', '   ');
        assert(!result.isValid, 'Title with only spaces should fail');
    });

    runTest('Duration validation - valid number', () => {
        const result = validateField('duration', '2.5');
        assert(result.isValid, 'Valid duration should pass validation');
    });

    runTest('Duration validation - integer', () => {
        const result = validateField('duration', '10');
        assert(result.isValid, 'Integer duration should pass validation');
    });

    runTest('Duration validation - negative number', () => {
        const result = validateField('duration', '-5');
        assert(!result.isValid, 'Negative duration should fail validation');
    });

    runTest('Duration validation - too many decimals', () => {
        const result = validateField('duration', '2.555');
        assert(!result.isValid, 'Duration with too many decimals should fail');
    });

    runTest('Date validation - valid date', () => {
        const result = validateField('date', '2024-12-25');
        assert(result.isValid, 'Valid date should pass validation');
    });

    runTest('Date validation - invalid format', () => {
        const result = validateField('date', '25/12/2024');
        assert(!result.isValid, 'Invalid date format should fail');
    });

    runTest('Date validation - invalid date', () => {
        const result = validateField('date', '2024-02-30');
        assert(!result.isValid, 'Invalid date should fail');
    });

    runTest('Tag validation - valid tag', () => {
        const result = validateField('tag', 'Homework');
        assert(result.isValid, 'Valid tag should pass validation');
    });

    runTest('Tag validation - tag with hyphen', () => {
        const result = validateField('tag', 'Math-Homework');
        assert(result.isValid, 'Tag with hyphen should pass validation');
    });

    runTest('Tag validation - tag with space', () => {
        const result = validateField('tag', 'Math Homework');
        assert(result.isValid, 'Tag with space should pass validation');
    });

    runTest('Tag validation - invalid characters', () => {
        const result = validateField('tag', 'Homework123');
        assert(!result.isValid, 'Tag with numbers should fail validation');
    });

    runTest('Complete task validation - valid task', () => {
        const task = {
            id: 'test-1',
            title: 'Complete Assignment',
            dueDate: '2024-12-25',
            duration: 2.5,
            tag: 'Homework',
            description: 'Finish the math assignment'
        };
        const result = validateTask(task);
        assert(result.isValid, 'Valid task should pass validation');
    });

    runTest('Complete task validation - missing required field', () => {
        const task = {
            id: 'test-1',
            title: 'Complete Assignment',
            dueDate: '2024-12-25',
            duration: 2.5
            // Missing tag
        };
        const result = validateTask(task);
        assert(!result.isValid, 'Task missing required field should fail validation');
    });

    section.innerHTML = renderTestResults();
}

function runAdvancedRegexTests(createTestSection, renderTestResults) {
    const section = createTestSection('Advanced Regex Tests');

    runTest('Duplicate words detection - has duplicates', () => {
        const result = testRegex('The the quick brown fox', ADVANCED_PATTERNS.duplicateWords.source, 'gi');
        assert(result.success && result.matches.length > 0, 'Should detect duplicate words');
    });

    runTest('Duplicate words detection - no duplicates', () => {
        const result = testRegex('The quick brown fox', ADVANCED_PATTERNS.duplicateWords.source, 'gi');
        assert(result.success && result.matches.length === 0, 'Should not detect duplicates when none exist');
    });

    runTest('Strong password validation - strong password', () => {
        const result = testRegex('MyStr0ng!Pass', ADVANCED_PATTERNS.strongPassword.source);
        assert(result.success && result.matches.length > 0, 'Strong password should pass validation');
    });

    runTest('Strong password validation - weak password', () => {
        const result = testRegex('weak', ADVANCED_PATTERNS.strongPassword.source);
        assert(result.success && result.matches.length === 0, 'Weak password should fail validation');
    });

    runTest('Email validation - valid email', () => {
        const result = testRegex('user@example.com', ADVANCED_PATTERNS.email.source);
        assert(result.success && result.matches.length > 0, 'Valid email should pass validation');
    });

    runTest('Email validation - invalid email', () => {
        const result = testRegex('invalid-email', ADVANCED_PATTERNS.email.source);
        assert(result.success && result.matches.length === 0, 'Invalid email should fail validation');
    });

    runTest('URL validation - valid URL', () => {
        const result = testRegex('https://example.com', ADVANCED_PATTERNS.url.source);
        assert(result.success && result.matches.length > 0, 'Valid URL should pass validation');
    });

    runTest('URL validation - invalid URL', () => {
        const result = testRegex('not-a-url', ADVANCED_PATTERNS.url.source);
        assert(result.success && result.matches.length === 0, 'Invalid URL should fail validation');
    });

    runTest('Time format validation - valid time', () => {
        const result = testRegex('14:30', ADVANCED_PATTERNS.timeFormat.source);
        assert(result.success && result.matches.length > 0, 'Valid time should pass validation');
    });

    runTest('Time format validation - invalid time', () => {
        const result = testRegex('25:70', ADVANCED_PATTERNS.timeFormat.source);
        assert(result.success && result.matches.length === 0, 'Invalid time should fail validation');
    });

    section.innerHTML = renderTestResults();
}

function runStorageTests(createTestSection, renderTestResults) {
    const section = createTestSection('Storage Tests');

    runTest('Generate unique ID', () => {
        const id1 = generateId();
        const id2 = generateId();
        assert(id1 !== id2, 'Generated IDs should be unique');
        assert(id1.startsWith('task_'), 'ID should start with task_ prefix');
    });

    runTest('Generate timestamp', () => {
        const timestamp = generateTimestamp();
        const date = new Date(timestamp);
        assert(!isNaN(date.getTime()), 'Generated timestamp should be valid');
    });

    runTest('Save and load tasks', () => {
        const testTasks = [
            {
                id: 'test-1',
                title: 'Test Task',
                dueDate: '2024-12-25',
                duration: 2.5,
                tag: 'Test',
                description: 'Test description',
                createdAt: generateTimestamp(),
                updatedAt: generateTimestamp()
            }
        ];

        const saveResult = saveTasks(testTasks);
        assert(saveResult, 'Should save tasks successfully');

        const loadedTasks = loadTasks();
        assert(loadedTasks.length === 1, 'Should load correct number of tasks');
        assert(loadedTasks[0].title === 'Test Task', 'Loaded task should match saved task');
    });

    runTest('Export data', () => {
        const tasks = [{ id: 'test-1', title: 'Test Task' }];
        const settings = { timeUnit: 'hours' };
        const exported = exportData(tasks, settings);

        assert(typeof exported === 'string', 'Export should return string');

        const parsed = JSON.parse(exported);
        assert(parsed.tasks.length === 1, 'Exported data should contain tasks');
        assert(parsed.settings.timeUnit === 'hours', 'Exported data should contain settings');
    });

    runTest('Import valid data', () => {
        const validData = JSON.stringify({
            tasks: [{
                id: 'test-1',
                title: 'Test Task',
                dueDate: '2024-12-25',
                duration: 2.5,
                tag: 'Test'
            }],
            settings: { timeUnit: 'hours' }
        });

        const result = importData(validData);
        assert(result.success, 'Valid data should import successfully');
        assert(result.tasks.length === 1, 'Should import correct number of tasks');
    });

    runTest('Import invalid data', () => {
        const invalidData = 'invalid json';
        const result = importData(invalidData);
        assert(!result.success, 'Invalid data should fail import');
        assert(result.errors.length > 0, 'Should report import errors');
    });

    section.innerHTML = renderTestResults();
}

function runSearchTests(createTestSection, renderTestResults) {
    const section = createTestSection('Search Tests');

    runTest('Search tasks by title', () => {
        const tasks = [
            { id: '1', title: 'Math Homework', description: 'Complete calculus problems', tag: 'Homework' },
            { id: '2', title: 'Science Project', description: 'Build volcano model', tag: 'Project' },
            { id: '3', title: 'English Essay', description: 'Write about literature', tag: 'Essay' }
        ];

        searchManager.initialize(tasks);
        const results = searchManager.searchTasks('Math', tasks);

        assert(results.length === 1, 'Should find one matching task');
        assert(results[0].task.title === 'Math Homework', 'Should find correct task');
    });

    runTest('Search tasks by tag', () => {
        const tasks = [
            { id: '1', title: 'Math Homework', description: 'Complete calculus problems', tag: 'Homework' },
            { id: '2', title: 'Science Project', description: 'Build volcano model', tag: 'Project' },
            { id: '3', title: 'English Essay', description: 'Write about literature', tag: 'Essay' }
        ];

        searchManager.initialize(tasks);
        const results = searchManager.searchTasks('Homework', tasks);

        assert(results.length === 1, 'Should find one matching task by tag');
    });

    runTest('Case insensitive search', () => {
        const tasks = [
            { id: '1', title: 'Math Homework', description: 'Complete calculus problems', tag: 'Homework' }
        ];

        searchManager.initialize(tasks);
        const results = searchManager.searchTasks('math', tasks, { caseSensitive: false });

        assert(results.length === 1, 'Case insensitive search should find match');
    });

    runTest('Filter tasks by tag', () => {
        const tasks = [
            { id: '1', title: 'Math Homework', description: 'Complete calculus problems', tag: 'Homework' },
            { id: '2', title: 'Science Project', description: 'Build volcano model', tag: 'Project' },
            { id: '3', title: 'English Essay', description: 'Write about literature', tag: 'Essay' }
        ];

        const filtered = filterTasks(tasks, { tag: 'Homework' });

        assert(filtered.length === 1, 'Should filter to one task');
        assert(filtered[0].tag === 'Homework', 'Should filter by correct tag');
    });

    runTest('Sort tasks by title', () => {
        const tasks = [
            { id: '1', title: 'Charlie Task', description: '', tag: 'Test' },
            { id: '2', title: 'Alpha Task', description: '', tag: 'Test' },
            { id: '3', title: 'Beta Task', description: '', tag: 'Test' }
        ];

        const sorted = sortTasks(tasks, 'title-asc');

        assert(sorted[0].title === 'Alpha Task', 'First task should be Alpha');
        assert(sorted[1].title === 'Beta Task', 'Second task should be Beta');
        assert(sorted[2].title === 'Charlie Task', 'Third task should be Charlie');
    });

    runTest('Sort tasks by duration', () => {
        const tasks = [
            { id: '1', title: 'Long Task', dueDate: '2024-12-25', duration: 5, tag: 'Test' },
            { id: '2', title: 'Short Task', dueDate: '2024-12-25', duration: 1, tag: 'Test' },
            { id: '3', title: 'Medium Task', dueDate: '2024-12-25', duration: 3, tag: 'Test' }
        ];

        const sorted = sortTasks(tasks, 'duration-asc');

        assert(sorted[0].duration === 1, 'First task should be shortest');
        assert(sorted[1].duration === 3, 'Second task should be medium');
        assert(sorted[2].duration === 5, 'Third task should be longest');
    });

    section.innerHTML = renderTestResults();
}

function runSmokeTests(createTestSection, renderTestResults) {
    const section = createTestSection('Smoke Tests');

    runTest("Today's tasks ordering by time then duration", () => {
        // Build three tasks for today: one at 08:30 (short), one at 09:00 (long), and one date-only
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];

        const tasks = [
            { id: 't1', title: 'Date-only task', dueDate: dateStr, duration: 1 },
            { id: 't2', title: 'Morning long', dueDate: `${dateStr}T09:00`, duration: 3 },
            { id: 't3', title: 'Early short', dueDate: `${dateStr}T08:30`, duration: 1.5 }
        ];

        // Filter tasks for today similar to UI logic
        const todays = tasks.filter(t => t.dueDate && String(t.dueDate).startsWith(dateStr));

        // Sort by datetime asc, timed tasks before date-only, then duration desc
        todays.sort((a, b) => {
            const aDt = a.dueDate ? new Date(a.dueDate) : null;
            const bDt = b.dueDate ? new Date(b.dueDate) : null;

            if (aDt && bDt) {
                const diff = aDt - bDt;
                if (diff !== 0) return diff;
            } else if (aDt && !bDt) {
                return -1;
            } else if (!aDt && bDt) {
                return 1;
            }

            return parseFloat(b.duration || 0) - parseFloat(a.duration || 0);
        });

        // Expect order: t3 (08:30), t2 (09:00), t1 (date-only)
        assert(todays[0].id === 't3', 'First task should be earliest timed task (t3)');
        assert(todays[1].id === 't2', 'Second task should be next timed task (t2)');
        assert(todays[2].id === 't1', 'Third should be date-only task (t1)');
    });

    section.innerHTML = renderTestResults();
}

function createTestSection(title) {
    const resultsDiv = document.getElementById('test-results');
    const section = document.createElement('div');
    section.className = 'test-section';
    section.innerHTML = `<h2>${title}</h2>`;
    resultsDiv.appendChild(section);
    return section;
}

function renderTestResults() {
    return testResults.tests.map(test => `
        <div class="test-case ${test.status}">
            <div class="test-title">${test.name}</div>
            <div class="test-result ${test.status}">${test.message}</div>
        </div>
    `).join('');
}

function updateStats() {
    document.getElementById('total-tests').textContent = testResults.total;
    document.getElementById('passed-tests').textContent = testResults.passed;
    document.getElementById('failed-tests').textContent = testResults.failed;

    const successRate = testResults.total > 0 ? Math.round((testResults.passed / testResults.total) * 100) : 0;
    document.getElementById('success-rate').textContent = successRate + '%';
}

// Expose runAllTests to window so tests.html button can trigger it
window.runAllTests = function() {
    testResults = { total: 0, passed: 0, failed: 0, tests: [] };
    document.getElementById('test-results').innerHTML = '';

    runValidationTests(createTestSection, renderTestResults);
    runAdvancedRegexTests(createTestSection, renderTestResults);
    runStorageTests(createTestSection, renderTestResults);
    runSearchTests(createTestSection, renderTestResults);
    runSmokeTests(createTestSection, renderTestResults);

    updateStats();
    console.log('Test Results:', testResults);
};

// Auto-run tests on load to mimic previous behavior
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.runAllTests();
    }, 500);
});
