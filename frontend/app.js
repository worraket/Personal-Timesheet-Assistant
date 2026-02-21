const API_BASE = '/api';
let allMatters = [];
let currentCandidates = [];
let currentEditingMatter = null;
let currentSort = 'id-asc'; // Default sort preference
let showClosedMatters = false;

document.addEventListener('DOMContentLoaded', () => {
    loadMatters();
    loadThemeSettings();

    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    document.getElementById('scan-btn').addEventListener('click', scanOutlook);
    document.getElementById('export-btn').addEventListener('click', exportLogs);
    document.getElementById('summary-btn').addEventListener('click', showSummary);
    document.querySelector('.settings-trigger').addEventListener('click', showSettings);
    document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
    document.getElementById('reset-btn').addEventListener('click', showResetModal);
    document.getElementById('confirm-reset-btn').addEventListener('click', confirmReset);
    document.getElementById('reset-confirm-input').addEventListener('input', checkResetInput);

    document.getElementById('add-matter-btn').addEventListener('click', showAddMatterModal);
    document.getElementById('save-new-matter-btn').addEventListener('click', saveNewMatterManual);

    // Toggle Closed Matters btn
    const toggleClosedBtn = document.getElementById('toggle-closed-btn');
    if (toggleClosedBtn) {
        toggleClosedBtn.addEventListener('click', toggleClosedMattersVisibility);
    }

    // Missing Duration Handlers
    document.getElementById('save-missing-duration-btn').addEventListener('click', retryWithDuration);
    document.getElementById('missing-duration-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') retryWithDuration();
    });

    // Background Image Handlers
    document.getElementById('upload-bg-btn').addEventListener('click', () => {
        document.getElementById('bg-upload-input').click();
    });
    document.getElementById('bg-upload-input').addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            uploadBackground(e.target.files[0]);
        }
    });
    document.getElementById('remove-bg-btn').addEventListener('click', removeBackground);

    const summaryModal = document.getElementById('summary-modal');
    const settingsModal = document.getElementById('settings-modal');
    const resetModal = document.getElementById('reset-modal');
    const addMatterModal = document.getElementById('add-matter-modal');

    document.getElementById('close-summary-modal').onclick = () => summaryModal.style.display = 'none';
    document.getElementById('close-settings-modal').onclick = () => settingsModal.style.display = 'none';
    document.getElementById('close-reset-modal').onclick = () => resetModal.style.display = 'none';
    document.getElementById('close-add-matter-modal').onclick = () => addMatterModal.style.display = 'none';

    // Edit Log Modal
    const editLogModal = document.getElementById('edit-log-modal');
    document.getElementById('close-edit-log-modal').onclick = () => editLogModal.style.display = 'none';
    document.getElementById('save-edit-log-btn').addEventListener('click', saveLogEdit);
    document.getElementById('delete-log-btn').addEventListener('click', deleteLogFromModal);

    window.onclick = (event) => {
        if (event.target == summaryModal) summaryModal.style.display = 'none';
        if (event.target == settingsModal) settingsModal.style.display = 'none';
        if (event.target == resetModal) resetModal.style.display = 'none';
        if (event.target == addMatterModal) addMatterModal.style.display = 'none';
        if (event.target == editLogModal) editLogModal.style.display = 'none';
    }

    // Feature: Default Date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('log-date').value = today;

    // Feature: Matter Search
    document.getElementById('matter-search-input').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const items = document.querySelectorAll('.matter-item');
        items.forEach(item => {
            const text = item.innerText.toLowerCase();
            if (text.includes(term)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });

    // Feature: Close modals on Esc
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            summaryModal.style.display = 'none';
            settingsModal.style.display = 'none';
            resetModal.style.display = 'none';
            addMatterModal.style.display = 'none';
            document.getElementById('missing-duration-modal').style.display = 'none';
            document.getElementById('ambiguous-matter-modal').style.display = 'none';
            document.getElementById('edit-log-modal').style.display = 'none';
            document.getElementById('timer-stop-modal').style.display = 'none';
            document.getElementById('timer-matter-picker-modal').style.display = 'none';
            document.getElementById('matter-details-modal').style.display = 'none';
        }
    });

    // Feature: Ambiguous Matter Search
    const ambiguousSearchInput = document.getElementById('ambiguous-search-input');
    if (ambiguousSearchInput) {
        ambiguousSearchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();

            let source = currentCandidates;
            // If user is searching, filter against ALL matters to be helpful
            if (term) {
                source = allMatters;
            }

            const results = source.filter(m => {
                const name = m.name.toLowerCase();
                const extId = m.external_id ? m.external_id.toLowerCase() : '';
                return name.includes(term) || extId.includes(term);
            });

            renderAmbiguousList(results);
        });
    }

    // First-Run Wizard
    document.getElementById('first-run-save-btn').addEventListener('click', saveFirstRunSettings);
    checkFirstRun();

    // Timer module init
    initTimer();
});

async function showSettings() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = 'block';

    try {
        const response = await fetch(`${API_BASE}/settings`);
        if (!response.ok) throw new Error('Failed to load settings');
        const settings = await response.json();

        document.getElementById('user-full-name').value = settings.full_name || '';
        document.getElementById('user-email').value = settings.email || '';

        // Load theme settings into inputs
        document.getElementById('theme-bg-start').value = settings.ui_bg_gradient_start || '#fbfbfd';
        document.getElementById('theme-bg-end').value = settings.ui_bg_gradient_end || '#f0f2f5';
        document.getElementById('theme-scan-btn').value = settings.ui_btn_scan_color || '#0071e3';
        document.getElementById('theme-export-btn').value = settings.ui_btn_export_color || '#e5e5e5';
        document.getElementById('theme-manual-btn').value = settings.ui_btn_manual_color || '#f5f5f5';
        document.getElementById('theme-log-btn').value = settings.ui_btn_log_color || '#007AFF';
        document.getElementById('theme-bg-image-url').value = settings.ui_bg_image_url || '';

        const opacity = settings.ui_panel_opacity !== undefined ? settings.ui_panel_opacity : 0.4;
        document.getElementById('theme-panel-opacity').value = opacity;
        document.getElementById('opacity-value').innerText = Math.round(opacity * 100) + '%';

        // Timer indicator color
        const timerColor = settings.ui_timer_color || '#FF3B30';
        document.getElementById('theme-timer-color').value = timerColor;
        document.documentElement.style.setProperty('--timer-color', timerColor);

        // Setup live preview listeners
        setupThemeListeners();
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveSettings() {
    const btn = document.getElementById('save-settings-btn');
    const originalText = btn.innerText;

    const settings = {
        full_name: document.getElementById('user-full-name').value.trim(),
        email: document.getElementById('user-email').value.trim(),
        ui_bg_gradient_start: document.getElementById('theme-bg-start').value,
        ui_bg_gradient_end: document.getElementById('theme-bg-end').value,
        ui_bg_image_url: document.getElementById('theme-bg-image-url').value,
        ui_btn_scan_color: document.getElementById('theme-scan-btn').value,
        ui_btn_export_color: document.getElementById('theme-export-btn').value,
        ui_btn_manual_color: document.getElementById('theme-manual-btn').value,
        ui_btn_log_color: document.getElementById('theme-log-btn').value,
        ui_panel_opacity: parseFloat(document.getElementById('theme-panel-opacity').value),
        ui_timer_color: document.getElementById('theme-timer-color').value
    };

    if (!settings.full_name || !settings.email) {
        alert('Please fill in both fields.');
        return;
    }

    btn.innerText = 'Saving...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        if (!response.ok) throw new Error('Failed to save settings');

        alert('Settings saved successfully!');

        // Apply settings immediately
        applyTheme(settings);
        // Apply timer color immediately
        document.documentElement.style.setProperty('--timer-color', settings.ui_timer_color);

        document.getElementById('settings-modal').style.display = 'none';
    } catch (error) {
        alert('Error saving settings: ' + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function uploadBackground(file) {
    const btn = document.getElementById('upload-bg-btn');
    const originalText = btn.innerText;
    btn.innerText = 'Uploading...';
    btn.disabled = true;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE}/upload/background`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        const url = data.url;

        // Update hidden input and preview
        document.getElementById('theme-bg-image-url').value = url;

        // Preview immediately using manual update
        const root = document.documentElement;
        root.style.setProperty('--bg-image', `url('${url}')`);

        alert('Background image uploaded! Click Save to persist.');
    } catch (error) {
        alert('Error uploading background: ' + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
        // Reset input so same file can be selected again
        document.getElementById('bg-upload-input').value = '';
    }
}



async function removeBackground() {
    const btn = document.getElementById('remove-bg-btn');
    const originalText = btn.innerText;
    btn.innerText = 'Removing...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/settings/background`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to remove background');

        // Clear settings locally
        document.getElementById('theme-bg-image-url').value = '';
        const root = document.documentElement;
        root.style.setProperty('--bg-image', 'none');

        alert('Background removed successfully.');
    } catch (error) {
        alert('Error removing background: ' + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function exportLogs() {
    window.location.href = `${API_BASE}/export`;
}

async function loadMatters() {
    const list = document.getElementById('matters-list');
    list.innerHTML = '<div class="loading-state">Loading matters...</div>';

    try {
        const response = await fetch(`${API_BASE}/matters`);
        if (!response.ok) throw new Error('Failed to load matters');

        const matters = await response.json();
        allMatters = matters; // Store globally
        renderMatters(matters);
    } catch (error) {
        list.innerHTML = `<div class="error-state">Error loading matters: ${error.message}</div>`;
    }
}

function handleSortChange() {
    currentSort = document.getElementById('matter-sort').value;
    loadMatters();
}

function renderMatters(matters) {
    const list = document.getElementById('matters-list');
    list.innerHTML = '';

    // Filter Closed Matters
    let filteredMatters = matters;
    if (!showClosedMatters) {
        filteredMatters = matters.filter(m => !m.is_closed);
    }

    if (filteredMatters.length === 0) {
        if (matters.length > 0) {
            list.innerHTML = '<div class="empty-state">No open matters found.</div>';
        } else {
            list.innerHTML = '<div class="empty-state">No matters found. Try scanning Outlook.</div>';
        }
        return;
    }

    // Apply Sorting
    const sortedMatters = [...filteredMatters].sort((a, b) => {
        if (currentSort === 'id-asc') {
            return (a.external_id || '').localeCompare(b.external_id || '');
        } else if (currentSort === 'id-desc') {
            return (b.external_id || '').localeCompare(a.external_id || '');
        } else if (currentSort === 'status-red' || currentSort === 'status-green') {
            const priority = { 'red': 1, 'yellow': 2, 'green': 3 };
            const valA = priority[a.status_flag] || 99;
            const valB = priority[b.status_flag] || 99;
            return currentSort === 'status-red' ? valA - valB : valB - valA;
        }
        return 0;
    });

    sortedMatters.forEach(m => {
        const div = document.createElement('div');
        div.className = 'matter-item';

        // Flex layout for item
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';

        const infoDiv = document.createElement('div');
        infoDiv.style.flex = '1';
        infoDiv.style.display = 'flex';
        infoDiv.style.alignItems = 'center';

        const statusDot = document.createElement('span');
        statusDot.className = `status-indicator status-${m.status_flag || 'yellow'}`;
        statusDot.title = `Status: ${m.status_flag || 'yellow'}`;

        const textDiv = document.createElement('div');
        textDiv.innerHTML = `
            <div class="matter-id" style="font-weight:600;">${escapeHtml(m.external_id) || 'No ID'}</div>
            <div class="matter-name">${escapeHtml(m.name)}</div>
        `;

        infoDiv.appendChild(statusDot);
        infoDiv.appendChild(textDiv);
        // Only clicking the info part selects the matter
        infoDiv.onclick = (e) => {
            document.getElementById('chat-input').value = `Worked on ${m.name} `;
            document.getElementById('chat-input').focus();
        };

        const editBtn = document.createElement('button');
        editBtn.innerHTML = '&#9998;'; // Pencil character
        editBtn.className = 'icon-btn';
        editBtn.title = "Edit Details";
        editBtn.style.background = 'transparent';
        editBtn.style.border = 'none';
        editBtn.style.cursor = 'pointer';
        editBtn.style.padding = '8px';
        editBtn.style.marginLeft = '8px';
        editBtn.style.color = 'var(--text-secondary)';
        editBtn.style.fontSize = '1.2em';

        editBtn.onclick = (e) => {
            e.stopPropagation();
            openMatterDetails(m);
        };

        div.appendChild(infoDiv);
        div.appendChild(editBtn);
        list.appendChild(div);
    });
}

async function scanOutlook() {
    const btn = document.getElementById('scan-btn');
    const originalText = btn.innerText;
    btn.innerText = 'Scanning...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/scan`, { method: 'POST' });
        const data = await response.json();

        if (data.added_matters && data.added_matters.length > 0) {
            let msg = `${data.message}\n\nNew Matters:\n`;
            data.added_matters.forEach(m => {
                msg += `- ${m}\n`;
            });
            alert(msg);
        } else {
            alert(data.message);
        }

        loadMatters();
    } catch (error) {
        alert('Error scanning Outlook: ' + error);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const dateInput = document.getElementById('log-date');
    const text = input.value.trim();
    const selectedDate = dateInput.value;

    if (!text) return;

    addMessage('User', text);
    input.value = '';

    try {
        const response = await fetch(`${API_BASE}/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                date: selectedDate || null
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            const error = new Error(errorData.detail || 'Failed to log time');
            error.code = errorData.code;
            error.status = response.status;
            error.candidates = errorData.candidates;
            throw error;
        }

        const data = await response.json();
        const responseMsg = `Logged <strong>${data.duration} mins</strong> for <strong>${escapeHtml(data.matter)}</strong> on ${data.date}.<br><em>"${escapeHtml(data.description)}"</em>`;
        addMessage('System', responseMsg, true); // true for HTML content

        // Reset date picker to today (optional, or keep if user wants to log multiple things for the same day)
        // dateInput.value = ''; 
    } catch (error) {
        // Handle specific error codes
        if (error.code === 'ERR_MISSING_DURATION') {
            showMissingDurationModal(text);
        } else if (error.status === 409 && error.candidates) {
            showAmbiguousMatterModal(text, error.candidates);
        } else {
            addMessage('System', `Error: ${error.message}`);
        }
    }
}

let pendingLogText = '';

function showMissingDurationModal(text) {
    pendingLogText = text;
    document.getElementById('missing-duration-input').value = '';
    document.getElementById('missing-duration-modal').style.display = 'block';
    document.getElementById('missing-duration-input').focus();
}

function retryWithDuration() {
    const duration = document.getElementById('missing-duration-input').value.trim();
    if (!duration) {
        alert('Please enter a duration.');
        return;
    }

    const newText = `${pendingLogText} ${duration}`;
    document.getElementById('missing-duration-modal').style.display = 'none';
    document.getElementById('chat-input').value = newText;
    sendMessage();
}

function showAmbiguousMatterModal(text, candidates) {
    pendingLogText = text;
    const modal = document.getElementById('ambiguous-matter-modal');
    const p = modal.querySelector('p');

    // Reset search input
    const searchInput = document.getElementById('ambiguous-search-input');
    if (searchInput) searchInput.value = '';

    // Determine what to show
    if (candidates && candidates.length > 0) {
        currentCandidates = candidates;
        p.textContent = "Multiple matters matched your description. Please select one:";
    } else {
        // Fallback to all matters if no NLP match
        currentCandidates = allMatters;
        p.textContent = "No matches found. Please select from all matters:";
    }

    renderAmbiguousList(currentCandidates);
    modal.style.display = 'block';
}

function renderAmbiguousList(items) {
    const list = document.getElementById('ambiguous-candidates-list');
    const modal = document.getElementById('ambiguous-matter-modal');
    list.innerHTML = '';

    if (items.length === 0) {
        list.innerHTML = '<div class="matter-item" style="cursor: default; color: var(--text-secondary);">No matching matters found.</div>';
        return;
    }

    items.forEach(matter => {
        const item = document.createElement('div');
        item.className = 'matter-item';

        let displayName = escapeHtml(matter.name);
        if (matter.external_id) {
            displayName = `[${escapeHtml(matter.external_id)}] ${displayName}`;
        }
        if (matter.description) {
            displayName += ` <span style="font-size: 0.8em; color: var(--text-secondary);">(${escapeHtml(matter.description)})</span>`;
        }

        item.innerHTML = `<div class="matter-name">${displayName}</div>`;
        item.addEventListener('click', () => {
            modal.style.display = 'none';
            retryWithMatterId(matter.id);
        });
        list.appendChild(item);
    });
}

async function retryWithMatterId(matterId) {
    const dateInput = document.getElementById('log-date');
    const selectedDate = dateInput.value;

    try {
        const response = await fetch(`${API_BASE}/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: pendingLogText,
                date: selectedDate || null,
                matter_id: matterId
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || 'Failed to log time');
        }

        const data = await response.json();
        const responseMsg = `Logged <strong>${data.duration} mins</strong> for <strong>${escapeHtml(data.matter)}</strong> on ${data.date}.<br><em>"${escapeHtml(data.description)}"</em>`;
        addMessage('System', responseMsg, true);
    } catch (error) {
        addMessage('System', `Error: ${error.message}`);
    }
}

function addMessage(sender, text, isHtml = false) {
    const history = document.getElementById('chat-history');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender === 'User' ? 'user-message' : 'bot-message'}`;

    if (isHtml) {
        msgDiv.innerHTML = text;
    } else {
        msgDiv.textContent = text;
    }

    history.appendChild(msgDiv);
    history.scrollTop = history.scrollHeight;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function showSummary() {
    const modal = document.getElementById('summary-modal');
    const container = document.getElementById('summary-container');
    container.innerHTML = '<div class="loading-state">Loading summary...</div>';
    modal.style.display = 'block';

    try {
        const response = await fetch(`${API_BASE}/summary`);
        if (!response.ok) throw new Error('Failed to load summary');

        const summary = await response.json();
        renderSummary(summary);
    } catch (error) {
        container.innerHTML = `<div class="error-state">Error: ${error.message}</div>`;
    }
}

function renderSummary(data) {
    const container = document.getElementById('summary-container');
    container.innerHTML = '';

    if (!data.by_matter || data.by_matter.length === 0) {
        container.innerHTML = '<div class="empty-state">No time logs found yet.</div>';
        return;
    }

    // 1. Header Grid (Buckets)
    const headerGrid = document.createElement('div');
    headerGrid.className = 'summary-header-grid';

    const thisMonth = data.reports.this_month;
    const lastMonth = data.reports.last_month;

    headerGrid.innerHTML = `
        <div class="summary-card">
            <h3>Today</h3>
            <div class="value">${data.reports.today.units} units</div>
            <div class="sub-value">${data.reports.today.minutes} mins</div>
        </div>
        <div class="summary-card">
            <h3>This Week</h3>
            <div class="value">${data.reports.this_week.units} units</div>
            <div class="sub-value">${data.reports.this_week.minutes} mins</div>
        </div>
        <div class="summary-card highlight">
            <h3>This Month</h3>
            <div class="value">${thisMonth.units} units</div>
            <div class="sub-value">${thisMonth.minutes} mins</div>
        </div>
        <div class="summary-card">
            <h3>Last Month</h3>
            <div class="value">${lastMonth.units} units</div>
            <div class="sub-value">${lastMonth.minutes} mins</div>
        </div>
    `;
    container.appendChild(headerGrid);

    // 2. Matter Breakdowns
    data.by_matter.forEach(item => {
        const block = document.createElement('div');
        block.className = 'matter-summary-block';

        let matterName = escapeHtml(item.name);
        if (item.external_id) {
            matterName = `[${escapeHtml(item.external_id)}] ${matterName}`;
        }

        block.innerHTML = `
            <div class="matter-summary-header">
                <div class="matter-summary-name">${matterName}</div>
                <div class="matter-summary-totals">
                    Total: <b>${item.total_units} units</b> (${item.total_minutes} mins)
                </div>
            </div>
            <div class="record-list">
                ${item.records.map(record => `
                    <div class="record-item">
                        <div class="record-date">${record.date}</div>
                        <div class="record-desc" title="${escapeHtml(record.description)}">
                            ${escapeHtml(record.description)}
                        </div>
                        <div class="record-time">
                            ${record.units} u (${record.minutes}m)
                            <div class="record-actions" style="display: inline-flex; gap: 8px; margin-left: 8px;">
                                <button onclick="openEditLogModal(${record.id}, '${escapeHtml(record.description).replace(/'/g, "\\'")}', ${record.minutes}, '${record.date}')" 
                                    class="icon-btn" title="Edit" style="background: none; border: none; cursor: pointer; color: var(--accent-color);">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 10l-4 1 1-4L16.5 3.5z"></path></svg>
                                </button>
                                <button onclick="deleteLog(${record.id}, '${escapeHtml(record.description).replace(/'/g, "\\'")}', ${record.minutes})"
                                    class="icon-btn" title="Delete" style="background: none; border: none; cursor: pointer; color: var(--danger-color);">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(block);
    });

    // 3. Footer
    const footer = document.createElement('div');
    footer.className = 'grand-total-footer';
    footer.innerHTML = `Total Units Logged: <span>${data.grand_total_units}</span>`;
    container.appendChild(footer);
}

function showResetModal() {
    const modal = document.getElementById('reset-modal');
    const input = document.getElementById('reset-confirm-input');
    const btn = document.getElementById('confirm-reset-btn');

    input.value = '';
    btn.disabled = true;
    modal.style.display = 'block';
    input.focus();
}

function checkResetInput() {
    const input = document.getElementById('reset-confirm-input');
    const btn = document.getElementById('confirm-reset-btn');
    btn.disabled = input.value.trim().toLowerCase() !== 'delete';
}

async function confirmReset() {
    const btn = document.getElementById('confirm-reset-btn');
    const originalText = btn.innerText;

    btn.innerText = 'Resetting...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/reset`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to reset database');

        alert('Database has been reset.');
        document.getElementById('reset-modal').style.display = 'none';

        // Refresh matters list
        loadMatters();
        // Clear chat history
        document.getElementById('chat-history').innerHTML = `
            <div class="message system-message">
                Database reset. Ready for new logs.
            </div>
        `;
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function showAddMatterModal() {
    document.getElementById('new-matter-name').value = '';
    document.getElementById('new-matter-id').value = '';
    document.getElementById('new-matter-desc').value = '';
    document.getElementById('add-matter-modal').style.display = 'block';
    document.getElementById('new-matter-name').focus();
}

// Edit/Delete Log Functions

function openEditLogModal(id, description, minutes, dateStr) {
    document.getElementById('edit-log-id').value = id;
    document.getElementById('edit-log-desc').value = description;
    document.getElementById('edit-log-duration').value = minutes;

    // dateStr is formatted like "2023-10-27 10:30"
    // datetime-local needs "2023-10-27T10:30"
    document.getElementById('edit-log-date').value = dateStr.replace(' ', 'T');

    document.getElementById('edit-log-modal').style.display = 'block';
}

// Wrapper used from the Matter Details history panel
function editLogFromHistory(id, description, minutes, dateStr) {
    openEditLogModal(id, description, minutes, dateStr);
}

async function saveLogEdit() {
    const id = document.getElementById('edit-log-id').value;
    const description = document.getElementById('edit-log-desc').value;
    const minutes = document.getElementById('edit-log-duration').value;
    const date = document.getElementById('edit-log-date').value;

    try {
        const response = await fetch(`${API_BASE}/logs/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                description: description,
                duration_minutes: parseInt(minutes),
                log_date: date
            })
        });

        if (!response.ok) throw new Error('Failed to update log');

        alert('Log updated successfully');
        document.getElementById('edit-log-modal').style.display = 'none';

        // Refresh the Summary modal if it is open
        const summaryModal = document.getElementById('summary-modal');
        if (summaryModal && summaryModal.style.display === 'block') {
            showSummary();
        }

        // Refresh Matter Details history if that modal is open
        const detailsModal = document.getElementById('matter-details-modal');
        if (detailsModal && detailsModal.style.display === 'block' && currentEditingMatter) {
            renderMatterHistory(currentEditingMatter.id);
        }
    } catch (error) {
        alert('Error updating log: ' + error.message);
    }
}

function deleteLogFromModal() {
    const id = document.getElementById('edit-log-id').value;
    deleteLog(id);
}

async function deleteLog(id, desc = "this log", minutes = "") {
    if (!confirm(`Are you sure you want to delete "${desc}" (${minutes}m)?`)) return;

    try {
        const response = await fetch(`${API_BASE}/logs/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete log');

        // Close modal if open
        document.getElementById('edit-log-modal').style.display = 'none';

        // Refresh summary
        showSummary();
    } catch (error) {
        alert('Error deleting log: ' + error.message);
    }
}

async function saveNewMatterManual() {
    const btn = document.getElementById('save-new-matter-btn');
    const name = document.getElementById('new-matter-name').value.trim();
    const external_id = document.getElementById('new-matter-id').value.trim();
    const description = document.getElementById('new-matter-desc').value.trim();
    const status_flag = document.getElementById('new-matter-status').value;

    if (!name) {
        alert('Matter Name is required.');
        return;
    }

    const originalText = btn.innerText;
    btn.innerText = 'Saving...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/matters/manual`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, external_id, description, status_flag })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to add matter');
        }

        alert('Matter added successfully!');
        document.getElementById('add-matter-modal').style.display = 'none';
        loadMatters();
    } catch (error) {
        alert('Error adding matter: ' + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function loadThemeSettings() {
    try {
        const response = await fetch(`${API_BASE}/settings`);
        if (response.ok) {
            const settings = await response.json();
            applyTheme(settings);
        }
    } catch (error) {
        console.error('Error loading theme:', error);
    }
}

function applyTheme(settings) {
    const root = document.documentElement;
    if (settings.ui_bg_gradient_start) root.style.setProperty('--bg-gradient-start', settings.ui_bg_gradient_start);
    if (settings.ui_bg_gradient_end) root.style.setProperty('--bg-gradient-end', settings.ui_bg_gradient_end);
    if (settings.ui_btn_scan_color) root.style.setProperty('--scan-btn-bg', settings.ui_btn_scan_color);
    if (settings.ui_btn_export_color) root.style.setProperty('--export-btn-bg', settings.ui_btn_export_color);
    if (settings.ui_btn_manual_color) root.style.setProperty('--manual-btn-bg', settings.ui_btn_manual_color);
    if (settings.ui_btn_log_color) root.style.setProperty('--log-btn-bg', settings.ui_btn_log_color);
    if (settings.ui_panel_opacity !== undefined) {
        root.style.setProperty('--panel-opacity', settings.ui_panel_opacity);
        root.style.setProperty('--panel-blur', (settings.ui_panel_opacity * 30) + 'px');
    }

    // Background Image
    if (settings.ui_bg_image_url) {
        root.style.setProperty('--bg-image', `url('${settings.ui_bg_image_url}')`);
    } else {
        root.style.setProperty('--bg-image', 'none');
    }
}

function setupThemeListeners() {
    const root = document.documentElement;

    document.getElementById('theme-bg-start').addEventListener('input', (e) => {
        root.style.setProperty('--bg-gradient-start', e.target.value);
    });
    document.getElementById('theme-bg-end').addEventListener('input', (e) => {
        root.style.setProperty('--bg-gradient-end', e.target.value);
    });
    document.getElementById('theme-scan-btn').addEventListener('input', (e) => {
        root.style.setProperty('--scan-btn-bg', e.target.value);
    });
    document.getElementById('theme-export-btn').addEventListener('input', (e) => {
        root.style.setProperty('--export-btn-bg', e.target.value);
    });
    document.getElementById('theme-manual-btn').addEventListener('input', (e) => {
        root.style.setProperty('--manual-btn-bg', e.target.value);
    });
    document.getElementById('theme-log-btn').addEventListener('input', (e) => {
        root.style.setProperty('--log-btn-bg', e.target.value);
    });

    document.getElementById('theme-panel-opacity').addEventListener('input', (e) => {
        const val = e.target.value;
        root.style.setProperty('--panel-opacity', val);
        root.style.setProperty('--panel-blur', (val * 30) + 'px');
        document.getElementById('opacity-value').innerText = Math.round(val * 100) + '%';
    });
}

// First-Run Wizard Logic
async function checkFirstRun() {
    try {
        const response = await fetch(`${API_BASE}/settings`);
        if (!response.ok) return; // Fail silently, standard UI will load

        const settings = await response.json();
        const infoMissing = !settings.full_name || !settings.email;

        if (infoMissing) {
            const modal = document.getElementById('first-run-modal');
            modal.style.display = 'block';

            // Allow closing by keyboard ONLY if it's not strictly empty (optional UX choice)
            // But requirement says "ask", implying mandatory.
            // We set data-backdrop="static" in HTML so clicks don't close it.
            // We also need to prevent Esc from closing it in the global event listener? 
            // The global listener closes 'settings-modal' etc. but `first-run-modal` is not in that list.
            // So it should be fine.
        }
    } catch (error) {
        console.error('Error checking first run status:', error);
    }
}

async function saveFirstRunSettings() {
    const btn = document.getElementById('first-run-save-btn');
    const nameInput = document.getElementById('first-run-name');
    const emailInput = document.getElementById('first-run-email');

    const fullName = nameInput.value.trim();
    const email = emailInput.value.trim();

    if (!fullName || !email) {
        alert('Please provide both your Full Name and Work Email.');
        return;
    }

    btn.innerText = 'Saving...';
    btn.disabled = true;

    try {
        // We need to fetch existing settings first to preserve theme settings
        // Because the PUT/POST endpoint might overwrite everything if we send a partial object?
        // Let's check update_settings in main.py.
        // It takes SettingsRequest. Validation says fields are required. 
        // But it also has default values for theme settings. 
        // If we send only name/email, the others might revert to class defaults!

        // So: Fetch current -> Update fields -> Post back.
        const getResponse = await fetch(`${API_BASE}/settings`);
        const currentSettings = await getResponse.json();

        const newSettings = {
            ...currentSettings,
            full_name: fullName,
            email: email
        };

        const response = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings)
        });

        if (!response.ok) throw new Error('Failed to save settings');

        // Success
        document.getElementById('first-run-modal').style.display = 'none';
        alert('Setup complete! You can now scan Outlook for matters.');

        // Refresh matters just in case (though unlikely to change immediately)
        // logic for scan is separate.

    } catch (error) {
        alert('Error saving settings: ' + error.message);
    } finally {
        btn.innerText = 'Get Started';
        btn.disabled = false;
    }
}

// Matter Details Logic

function openMatterDetails(matter) {
    currentEditingMatter = matter;

    // Populate Form
    document.getElementById('detail-name').value = matter.name || '';
    document.getElementById('detail-external-id').value = matter.external_id || '';
    document.getElementById('detail-client-name').value = matter.client_name || '';
    document.getElementById('detail-client-email').value = matter.client_email || '';
    document.getElementById('detail-description').value = matter.description || '';
    document.getElementById('detail-status').value = matter.status_flag || 'yellow';

    // Update Close/Re-open button state
    const closeBtn = document.getElementById('close-matter-btn');
    if (closeBtn) {
        if (matter.is_closed) {
            closeBtn.innerText = 'Re-open Matter';
            closeBtn.className = 'btn'; // reset to default blue/theme
            closeBtn.style.backgroundColor = '#28a745'; // Green for re-open
        } else {
            closeBtn.innerText = 'Close Matter';
            closeBtn.className = 'btn'; // reset
            closeBtn.style.backgroundColor = '#dc3545'; // Red for close
        }
    }

    // Reset Add Time panel
    document.getElementById('detail-add-time-panel').style.display = 'none';
    document.getElementById('detail-log-duration').value = '';
    document.getElementById('detail-log-desc').value = '';
    // Default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('detail-log-date').value = today;

    // Render History
    renderMatterHistory(matter.id);

    // Show Modal
    document.getElementById('matter-details-modal').style.display = 'block';
}

function toggleAddTimePanel() {
    const panel = document.getElementById('detail-add-time-panel');
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
        document.getElementById('detail-log-duration').focus();
    }
}

async function saveDetailLog() {
    if (!currentEditingMatter) return;

    const duration = parseInt(document.getElementById('detail-log-duration').value, 10);
    if (!duration || duration < 1) {
        alert('Please enter a valid duration in minutes.');
        return;
    }

    const desc = document.getElementById('detail-log-desc').value.trim();
    const date = document.getElementById('detail-log-date').value || null;

    const btn = document.querySelector('#detail-add-time-panel .save-settings-btn');
    const originalText = btn.innerText;
    btn.innerText = 'Saving...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/log/direct`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                matter_id: currentEditingMatter.id,
                duration_minutes: duration,
                description: desc || `Worked on ${currentEditingMatter.name}`,
                date: date
            })
        });

        if (!response.ok) throw new Error('Failed to save log');

        const data = await response.json();

        // Clear fields and hide panel
        document.getElementById('detail-log-duration').value = '';
        document.getElementById('detail-log-desc').value = '';
        document.getElementById('detail-add-time-panel').style.display = 'none';

        // Refresh the log history below
        renderMatterHistory(currentEditingMatter.id);

        // Brief success flash on the button row
        btn.innerText = '✓ Saved';
        setTimeout(() => { btn.innerText = originalText; btn.disabled = false; }, 1500);
    } catch (e) {
        alert('Error saving log: ' + e.message);
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function toggleClosedMattersVisibility() {
    showClosedMatters = !showClosedMatters;
    const btn = document.getElementById('toggle-closed-btn');
    if (btn) {
        if (showClosedMatters) {
            btn.innerHTML = '&#128065; Hide Closed Matters';
            btn.classList.add('active-toggle');
        } else {
            btn.innerHTML = '&#128065; Show All Matters';
            btn.classList.remove('active-toggle');
        }
    }
    loadMatters();
}

async function saveMatterDetails() {
    if (!currentEditingMatter) return;

    const btn = document.getElementById('save-details-btn');
    const originalText = btn.innerText;
    btn.innerText = 'Saving...';
    btn.disabled = true;

    const updateData = {
        name: document.getElementById('detail-name').value,
        external_id: document.getElementById('detail-external-id').value,
        client_name: document.getElementById('detail-client-name').value,
        client_email: document.getElementById('detail-client-email').value,
        description: document.getElementById('detail-description').value,
        status_flag: document.getElementById('detail-status').value
    };

    try {
        const response = await fetch(`${API_BASE}/matters/${currentEditingMatter.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        if (response.ok) {
            // Refresh matters list
            loadMatters();
            // Close modal
            document.getElementById('matter-details-modal').style.display = 'none';
        } else {
            alert('Failed to update matter');
        }
    } catch (e) {
        console.error(e);
        alert('Error saving matter details');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function toggleMatterClosedStatus() {
    if (!currentEditingMatter) return;

    const btn = document.getElementById('close-matter-btn');
    const originalText = btn.innerText;
    btn.innerText = 'Updating...';
    btn.disabled = true;

    const newClosedState = !currentEditingMatter.is_closed;

    try {
        const response = await fetch(`${API_BASE}/matters/${currentEditingMatter.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_closed: newClosedState })
        });

        if (response.ok) {
            // Update local state so it doesn't revert if we save details later
            currentEditingMatter.is_closed = newClosedState;

            // Refresh list
            loadMatters();
            // Close modal
            document.getElementById('matter-details-modal').style.display = 'none';
        } else {
            alert('Failed to update matter status');
        }
    } catch (e) {
        console.error(e);
        alert('Error updating matter status');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function renderMatterHistory(matterId) {
    const container = document.getElementById('matter-log-history');
    container.innerHTML = '<div class="loading-state">Loading history...</div>';

    try {
        const response = await fetch(`${API_BASE}/summary`);
        const data = await response.json();

        let matterData = null;
        if (data.by_matter) {
            matterData = data.by_matter.find(m => m.id === matterId);
        }

        if (!matterData || !matterData.records || matterData.records.length === 0) {
            container.innerHTML = '<div class="empty-state">No time logs found for this matter.</div>';
            return;
        }

        container.innerHTML = '';

        // Sort by date desc
        const sorted = matterData.records.sort((a, b) => new Date(b.date) - new Date(a.date));

        sorted.forEach(log => {
            const row = document.createElement('div');
            row.className = 'history-item';
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '10px';
            row.style.borderBottom = '1px solid var(--border-color)';

            row.innerHTML = `
                <div style="flex: 1; padding-right: 10px;">
                    <div style="font-weight: 500; font-size: 0.95em;">${escapeHtml(log.description || '(No description)')}</div>
                    <div style="font-size: 0.8em; color: var(--text-secondary); margin-top: 4px;">${log.date} &bull; ${log.minutes}m (${log.units}u)</div>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                     <button class="icon-btn" onclick="editLogFromHistory(${log.id}, '${escapeHtml(log.description || '').replace(/'/g, "\\'").replace(/"/g, '&quot;')}', ${log.minutes}, '${log.date}')" title="Edit Log"
                        style="background: none; border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size:1em;">
                        &#9998;
                     </button>
                     <button class="icon-btn" onclick="deleteLogFromHistory(${log.id})" title="Delete Log"
                        style="color: var(--danger-color); background: none; border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 8px; cursor: pointer;">
                        &times;
                     </button>
                </div>
            `;
            container.appendChild(row);
        });

    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="error-state">Failed to load history</div>';
    }
}

async function deleteLogFromHistory(logId) {
    if (!confirm("Are you sure you want to delete this time log?")) return;

    try {
        const response = await fetch(`${API_BASE}/logs/${logId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            if (currentEditingMatter) renderMatterHistory(currentEditingMatter.id);
        } else {
            const data = await response.json();
            alert('Failed to delete log: ' + (data.detail || 'Unknown error'));
        }
    } catch (e) {
        alert('Error deleting log');
    }
}
