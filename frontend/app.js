const API_BASE = '/api';
let allMatters = [];
let currentCandidates = [];

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
    document.getElementById('settings-btn').addEventListener('click', showSettings);
    document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
    document.getElementById('reset-btn').addEventListener('click', showResetModal);
    document.getElementById('confirm-reset-btn').addEventListener('click', confirmReset);
    document.getElementById('reset-confirm-input').addEventListener('input', checkResetInput);

    document.getElementById('add-matter-btn').addEventListener('click', showAddMatterModal);
    document.getElementById('save-new-matter-btn').addEventListener('click', saveNewMatterManual);

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
        ui_panel_opacity: parseFloat(document.getElementById('theme-panel-opacity').value)
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

function renderMatters(matters) {
    const list = document.getElementById('matters-list');
    list.innerHTML = '';

    if (matters.length === 0) {
        list.innerHTML = '<div class="empty-state">No matters found. Try scanning Outlook.</div>';
        return;
    }

    matters.forEach(matter => {
        const item = document.createElement('div');
        item.className = 'matter-item';

        let displayName = escapeHtml(matter.name);
        if (matter.external_id) {
            displayName = `[${escapeHtml(matter.external_id)}] ${displayName}`;
        }

        item.innerHTML = `
            <div class="matter-name">${displayName}</div>
        `;
        item.addEventListener('click', () => {
            document.getElementById('chat-input').value = `Worked on ${matter.name} `;
            document.getElementById('chat-input').focus();
        });
        list.appendChild(item);
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

    // 1. Header Grid (Today, This Week, Grand Total)
    const headerGrid = document.createElement('div');
    headerGrid.className = 'summary-header-grid';
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
        <div class="summary-card">
            <h3>Grand Total</h3>
            <div class="value">${data.grand_total_units} units</div>
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
        showSummary(); // Refresh summary
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
            body: JSON.stringify({ name, external_id, description })
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
