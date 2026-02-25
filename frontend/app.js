const API_BASE = '/api';
let allMatters = [];
let currentCandidates = [];
let currentEditingMatter = null;
let currentSort = 'id-asc'; // Default sort preference
let showClosedMatters = false;

// ── Pinning ──────────────────────────────────────────────────
const MAX_PINS = 5;
function getPinnedIds() {
    try { return JSON.parse(localStorage.getItem('pinnedMatters') || '[]'); }
    catch { return []; }
}
function savePinnedIds(ids) {
    localStorage.setItem('pinnedMatters', JSON.stringify(ids));
}
function togglePin(matterId) {
    let ids = getPinnedIds();
    if (ids.includes(matterId)) {
        ids = ids.filter(id => id !== matterId);
        savePinnedIds(ids);
    } else {
        if (ids.length >= MAX_PINS) {
            showPinToast(`Max ${MAX_PINS} pins reached. Unpin one first.`);
            return;
        }
        ids.push(matterId);
        savePinnedIds(ids);
    }
    renderMatters(allMatters);
}
function showPinToast(msg) {
    let t = document.getElementById('pin-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'pin-toast';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('pin-toast-show');
    clearTimeout(t._to);
    t._to = setTimeout(() => t.classList.remove('pin-toast-show'), 2500);
}

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

    // Toggle Closed Matters btn (onclick only — no duplicate addEventListener)

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

    // Modals
    const settingsModal = document.getElementById('settings-modal');
    const summaryModal = document.getElementById('summary-modal');
    const resetModal = document.getElementById('reset-modal');
    const addMatterModal = document.getElementById('add-matter-modal');
    const detailsModal = document.getElementById('matter-details-modal');
    const missingDurationModal = document.getElementById('missing-duration-modal');
    const ambiguousMatterModal = document.getElementById('ambiguous-matter-modal');
    const firstRunModal = document.getElementById('first-run-modal');
    const editLogModal = document.getElementById('edit-log-modal');
    const mattersOverviewModal = document.getElementById('matters-overview-modal');

    // Triggers
    document.querySelector('.settings-trigger').onclick = showSettings; // Kept original showSettings for functionality
    document.getElementById('summary-btn').onclick = showSummary;
    document.getElementById('reset-btn').onclick = showResetModal;
    document.getElementById('add-matter-btn').onclick = showAddMatterModal;
    document.getElementById('toggle-closed-btn').onclick = toggleClosedMattersVisibility;
    document.getElementById('matters-overview-btn').onclick = showMattersOverview;

    // Close buttons
    const closeButtons = [
        { id: 'close-summary-modal', modal: summaryModal },
        { id: 'close-settings-modal', modal: settingsModal },
        { id: 'close-reset-modal', modal: resetModal },
        { id: 'close-add-matter-modal', modal: addMatterModal },
        { id: 'close-missing-duration-modal', modal: missingDurationModal },
        { id: 'close-ambiguous-modal', modal: ambiguousMatterModal },
        { id: 'close-edit-log-modal', modal: editLogModal },
        { id: 'close-matters-overview-modal', modal: mattersOverviewModal }
    ];

    closeButtons.forEach(btn => {
        const element = document.getElementById(btn.id);
        if (element) {
            element.onclick = () => btn.modal.style.display = 'none';
        }
    });

    document.getElementById('save-edit-log-btn').addEventListener('click', saveLogEdit);
    document.getElementById('delete-log-btn').addEventListener('click', deleteLogFromModal);
    // Search overview
    document.getElementById('overview-search').addEventListener('input', (e) => {
        filterMattersOverview(e.target.value);
    });

    // Close on click outside
    window.onclick = (event) => {
        const modals = [settingsModal, summaryModal, resetModal, addMatterModal, detailsModal, missingDurationModal, ambiguousMatterModal, editLogModal, mattersOverviewModal];
        modals.forEach(modal => {
            if (event.target == modal) modal.style.display = 'none';
        });
        // The original code had some redundant checks, removed for clarity and covered by the loop
    }

    // Feature: Default Date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('log-date').value = today;

    // Feature: Matter Search
    document.getElementById('matter-search-input').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const items = document.querySelectorAll('#matters-list .matter-item');
        items.forEach(item => {
            const searchData = item.dataset.searchData || item.innerText.toLowerCase();
            if (searchData.includes(term)) {
                item.style.display = 'flex';
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

        // Load AI settings
        const aiEnabled = settings.ai_enabled === true || settings.ai_enabled === 'true';
        document.getElementById('ai-enabled-toggle').value = aiEnabled ? 'true' : 'false';
        updateAiToggleUI(aiEnabled);

        document.getElementById('ai-provider').value = settings.ai_provider || 'thefuzz';
        document.getElementById('ai-key-claude').value = settings.ai_key_claude || '';
        document.getElementById('ai-key-gemini').value = settings.ai_key_gemini || '';
        document.getElementById('ai-key-openai').value = settings.ai_key_openai || '';
        document.getElementById('ai-key-grok').value = settings.ai_key_grok || '';

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

        // Button colors
        document.getElementById('theme-timer-btn').value = settings.ui_btn_timer_color || '#ffffff';
        document.getElementById('theme-matters-btn').value = settings.ui_btn_matters_color || '#f8fafc';
        document.getElementById('theme-reset-btn').value = settings.ui_btn_reset_color || '#ffffff';
        document.getElementById('theme-summary-btn').value = settings.ui_btn_summary_color || '#ffffff';
        document.getElementById('theme-closed-btn').value = settings.ui_btn_closed_color || '#ffffff';

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
        ui_timer_color: document.getElementById('theme-timer-color').value,
        ui_btn_timer_color: document.getElementById('theme-timer-btn').value,
        ui_btn_matters_color: document.getElementById('theme-matters-btn').value,
        ui_btn_reset_color: document.getElementById('theme-reset-btn').value,
        ui_btn_summary_color: document.getElementById('theme-summary-btn').value,
        ui_btn_closed_color: document.getElementById('theme-closed-btn').value,
        ai_enabled: document.getElementById('ai-enabled-toggle').value === 'true',
        ai_provider: document.getElementById('ai-provider').value,
        ai_key_claude: document.getElementById('ai-key-claude').value,
        ai_key_gemini: document.getElementById('ai-key-gemini').value,
        ai_key_openai: document.getElementById('ai-key-openai').value,
        ai_key_grok: document.getElementById('ai-key-grok').value
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

    // Split into pinned vs normal
    const pinnedIds = getPinnedIds();
    const pinned = sortedMatters.filter(m => pinnedIds.includes(m.id));
    const normal = sortedMatters.filter(m => !pinnedIds.includes(m.id));

    function buildItem(m, isPinned) {
        const div = document.createElement('div');
        div.className = 'matter-item' + (isPinned ? ' matter-pinned' : '');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';

        const searchTerms = [
            m.name || '',
            m.external_id || '',
            m.client_name || '',
            m.client_email || '',
            m.description || ''
        ].join(' ').toLowerCase();
        div.dataset.searchData = searchTerms;

        const infoDiv = document.createElement('div');
        infoDiv.style.flex = '1';
        infoDiv.style.display = 'flex';
        infoDiv.style.alignItems = 'center';
        infoDiv.style.minWidth = '0';

        const statusDot = document.createElement('span');
        statusDot.className = `status-indicator status-${m.status_flag || 'yellow'}`;
        statusDot.title = `Status: ${m.status_flag || 'yellow'}`;

        const textDiv = document.createElement('div');
        textDiv.style.minWidth = '0';
        textDiv.innerHTML = `
            <div class="matter-id" style="font-weight:600;">${escapeHtml(m.external_id) || 'No ID'}</div>
            <div class="matter-name">${escapeHtml(m.name)}</div>
        `;

        infoDiv.appendChild(statusDot);
        infoDiv.appendChild(textDiv);
        infoDiv.onclick = (e) => {
            document.getElementById('chat-input').value = `Worked on ${m.name} `;
            document.getElementById('chat-input').focus();
        };

        // Pin button
        const pinBtn = document.createElement('button');
        pinBtn.className = 'icon-btn pin-btn' + (isPinned ? ' pin-btn-active' : '');
        pinBtn.title = isPinned ? 'Unpin matter' : 'Pin matter (max ' + MAX_PINS + ')';
        pinBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="${isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h5l-4 4 2 7-6-4-6 4 2-7-4-4h5z"/></svg>`;
        pinBtn.onclick = (e) => { e.stopPropagation(); togglePin(m.id); };

        // Edit button
        const editBtn = document.createElement('button');
        editBtn.innerHTML = '&#9998;';
        editBtn.className = 'icon-btn';
        editBtn.title = 'Edit Details';
        editBtn.style.background = 'transparent';
        editBtn.style.border = 'none';
        editBtn.style.cursor = 'pointer';
        editBtn.style.padding = '8px';
        editBtn.style.marginLeft = '4px';
        editBtn.style.color = 'var(--text-secondary)';
        editBtn.style.fontSize = '1.2em';
        editBtn.onclick = (e) => { e.stopPropagation(); openMatterDetails(m); };

        div.appendChild(infoDiv);
        div.appendChild(pinBtn);
        div.appendChild(editBtn);
        return div;
    }

    // Render pinned section
    if (pinned.length > 0) {
        const pinHeader = document.createElement('div');
        pinHeader.className = 'pin-section-header';
        pinHeader.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3 7h5l-4 4 2 7-6-4-6 4 2-7-4-4h5z"/></svg> Pinned`;
        list.appendChild(pinHeader);
        pinned.forEach(m => list.appendChild(buildItem(m, true)));

        if (normal.length > 0) {
            const divider = document.createElement('div');
            divider.className = 'pin-section-divider';
            list.appendChild(divider);
        }
    }

    // Render normal matters
    normal.forEach(m => list.appendChild(buildItem(m, false)));
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
                        <div class="record-date">${record.date}${record.logged_at ? `<span class="record-logged-at" title="Logged at ${record.logged_at}"> (${record.logged_at.slice(11, 16)})</span>` : ''}</div>
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

// Matters Overview Implementation
let mattersOverviewData = null;

async function showMattersOverview() {
    const modal = document.getElementById('matters-overview-modal');
    const container = document.getElementById('matters-overview-list');
    container.innerHTML = '<div class="loading-state">Loading matters overview...</div>';
    modal.style.display = 'block';

    try {
        const [summaryRes, mattersRes] = await Promise.all([
            fetch(`${API_BASE}/summary`),
            fetch(`${API_BASE}/matters`)
        ]);
        if (!summaryRes.ok) throw new Error('Failed to load summary data');
        if (!mattersRes.ok) throw new Error('Failed to load matters data');

        const summaryData = await summaryRes.json();
        const allMattersArr = await mattersRes.json();

        // Build a lookup of summary data by matter id
        const summaryById = {};
        for (const m of summaryData.by_matter) {
            summaryById[m.id] = m;
        }

        // Merge: use summary data if available, otherwise create entry with zero totals
        const merged = allMattersArr.map(m => {
            if (summaryById[m.id]) {
                return summaryById[m.id];
            }
            return {
                id: m.id,
                name: m.name,
                external_id: m.external_id,
                client_name: m.client_name,
                status_flag: m.status_flag || 'yellow',
                is_closed: m.is_closed || false,
                total_minutes: 0,
                total_units: 0,
                records: []
            };
        });

        mattersOverviewData = { ...summaryData, by_matter: merged };
        renderMattersOverview(merged);
    } catch (error) {
        container.innerHTML = `<div class="error-state">Error: ${error.message}</div>`;
    }
}

function renderMattersOverview(matters) {
    const container = document.getElementById('matters-overview-list');
    container.innerHTML = '';

    if (!matters || matters.length === 0) {
        container.innerHTML = '<div class="empty-state">No matters found.</div>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'overview-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Status</th>
                <th>ID</th>
                <th>Name</th>
                <th>Client</th>
                <th>Total Time</th>
                <th>Last Logged</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    // Sort by last_logged_at (most recent first), then by name for matters with no logs
    const sortByRecency = (a, b) => {
        if (a.last_logged_at && b.last_logged_at) return b.last_logged_at.localeCompare(a.last_logged_at);
        if (a.last_logged_at) return -1;
        if (b.last_logged_at) return 1;
        return a.name.localeCompare(b.name);
    };

    // Grouping: open first, then closed
    const open = matters.filter(m => !m.is_closed).sort(sortByRecency);
    const closed = matters.filter(m => m.is_closed).sort(sortByRecency);

    [...open, ...closed].forEach(m => {
        const row = document.createElement('tr');
        row.className = 'overview-row' + (m.is_closed ? ' matter-closed' : '');
        row.onclick = () => {
            const fullMatter = allMatters.find(am => am.id === m.id);
            if (fullMatter) openMatterDetails(fullMatter);
        };

        const statusDot = `<span class="overview-status-dot status-${m.status_flag || 'yellow'}"></span>`;
        const lastLogged = m.last_logged_at ? m.last_logged_at.slice(0, 16).replace('T', ' ') : '-';

        row.innerHTML = `
            <td>${statusDot} ${m.is_closed ? '(Closed)' : ''}</td>
            <td class="overview-id">${escapeHtml(m.external_id) || '-'}</td>
            <td><strong>${escapeHtml(m.name)}</strong></td>
            <td>${escapeHtml(m.client_name) || '-'}</td>
            <td class="overview-totals">${m.total_units} units <span>(${m.total_minutes}m)</span></td>
            <td class="overview-last-logged">${lastLogged}</td>
        `;
        tbody.appendChild(row);
    });

    container.appendChild(table);
}

function filterMattersOverview(term) {
    if (!mattersOverviewData) return;
    const lower = term.toLowerCase();
    const filtered = mattersOverviewData.by_matter.filter(m =>
        m.name.toLowerCase().includes(lower) ||
        (m.external_id && m.external_id.toLowerCase().includes(lower)) ||
        (m.client_name && m.client_name.toLowerCase().includes(lower))
    );
    renderMattersOverview(filtered);
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

async function toggleAiEnabled() {
    const input = document.getElementById('ai-enabled-toggle');
    const newState = input.value !== 'true';
    input.value = newState ? 'true' : 'false';
    updateAiToggleUI(newState);

    // Auto-save the toggle state immediately
    try {
        const response = await fetch(`${API_BASE}/settings`);
        if (response.ok) {
            const current = await response.json();
            current.ai_enabled = newState;
            await fetch(`${API_BASE}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(current)
            });
        }
    } catch (e) {
        console.error('Failed to save AI toggle:', e);
    }
}

function updateAiToggleUI(enabled) {
    const label = document.getElementById('ai-toggle-label');
    const track = document.getElementById('ai-toggle-track');
    const thumb = document.getElementById('ai-toggle-thumb');
    if (enabled) {
        label.textContent = 'ON';
        label.style.color = 'var(--success-color)';
        track.style.background = 'var(--success-color)';
        thumb.style.transform = 'translateX(20px)';
    } else {
        label.textContent = 'OFF';
        label.style.color = 'var(--text-secondary)';
        track.style.background = '#ccc';
        thumb.style.transform = 'translateX(0)';
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
    if (settings.ui_btn_timer_color) root.style.setProperty('--timer-btn-bg', settings.ui_btn_timer_color);
    if (settings.ui_btn_matters_color) root.style.setProperty('--matters-btn-bg', settings.ui_btn_matters_color);
    if (settings.ui_btn_reset_color) root.style.setProperty('--reset-btn-bg', settings.ui_btn_reset_color);
    if (settings.ui_btn_summary_color) root.style.setProperty('--summary-btn-bg', settings.ui_btn_summary_color);
    if (settings.ui_btn_closed_color) root.style.setProperty('--closed-btn-bg', settings.ui_btn_closed_color);
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
    document.getElementById('theme-timer-btn').addEventListener('input', (e) => {
        root.style.setProperty('--timer-btn-bg', e.target.value);
    });
    document.getElementById('theme-matters-btn').addEventListener('input', (e) => {
        root.style.setProperty('--matters-btn-bg', e.target.value);
    });
    document.getElementById('theme-reset-btn').addEventListener('input', (e) => {
        root.style.setProperty('--reset-btn-bg', e.target.value);
    });
    document.getElementById('theme-summary-btn').addEventListener('input', (e) => {
        root.style.setProperty('--summary-btn-bg', e.target.value);
    });
    document.getElementById('theme-closed-btn').addEventListener('input', (e) => {
        root.style.setProperty('--closed-btn-bg', e.target.value);
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
    const closeBtn = document.getElementById('archive-matter-btn');
    if (closeBtn) {
        if (matter.is_closed) {
            closeBtn.innerText = 'Re-open Matter';
            closeBtn.style.backgroundColor = '#28a745'; // Green for re-open
        } else {
            closeBtn.innerText = 'Archive/Close Matter';
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

    const btn = document.getElementById('archive-matter-btn');
    const originalText = btn.innerText;

    const newClosedState = !currentEditingMatter.is_closed;
    const actionName = newClosedState ? 'Archive/Close' : 'Re-open';

    if (!confirm(`Are you sure you want to ${actionName} "${currentEditingMatter.name}"?`)) return;

    btn.innerText = 'Updating...';
    btn.disabled = true;

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
                <div style="display:flex; align-items:flex-start; gap:10px; flex:1;">
                    <input type="checkbox" class="merge-checkbox" value="${log.id}" data-date="${log.date.split(' ')[0]}" onchange="handleMergeSelection()">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 500; font-size: 0.95em;">${escapeHtml(log.description || '(No description)')}</div>
                        <div style="font-size: 0.8em; color: var(--text-secondary); margin-top: 4px;">${log.date} &bull; ${log.minutes}m (${log.units}u)</div>
                    </div>
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

        // Reset merge button state
        handleMergeSelection();

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

function handleMergeSelection() {
    const checkboxes = document.querySelectorAll('.merge-checkbox');
    const checked = Array.from(checkboxes).filter(cb => cb.checked);
    const mergeBtn = document.getElementById('merge-logs-btn');

    if (checked.length === 0) {
        // None checked, enable all
        checkboxes.forEach(cb => { cb.disabled = false; cb.parentElement.style.opacity = '1'; });
        if (mergeBtn) mergeBtn.style.display = 'none';
    } else {
        // Enforce same date
        const selectedDate = checked[0].dataset.date;
        checkboxes.forEach(cb => {
            if (cb.dataset.date !== selectedDate) {
                cb.disabled = true;
                cb.checked = false;
                cb.parentElement.style.opacity = '0.5';
            } else {
                cb.disabled = false;
                cb.parentElement.style.opacity = '1';
            }
        });

        // Show/hide button based on count
        if (mergeBtn) {
            if (checked.length >= 2) {
                mergeBtn.style.display = 'block';
                mergeBtn.innerText = `Merge ${checked.length} Logs`;
            } else {
                mergeBtn.style.display = 'none';
            }
        }
    }
}

async function mergeSelectedLogs() {
    const checkboxes = document.querySelectorAll('.merge-checkbox:checked');
    if (checkboxes.length < 2) return;

    const logIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
    const btn = document.getElementById('merge-logs-btn');
    const originalText = btn.innerText;

    if (!confirm(`Are you sure you want to merge these ${logIds.length} logs into a single record? This cannot be undone.`)) return;

    btn.innerText = 'Merging...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/logs/merge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ log_ids: logIds })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || 'Failed to merge logs');
        }

        // Refresh the view
        await loadMatters(); // Update global matter times
        if (currentEditingMatter) {
            // Re-render history to reflect new merged log
            await renderMatterHistory(currentEditingMatter.id);
        }

    } catch (e) {
        console.error(e);
        alert('Error merging logs: ' + e.message);
    } finally {
        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
}


// ===== DASHBOARD LOGIC =====
let dashboardVisible = true;

function toggleDashboard() {
    const container = document.getElementById('dashboard-container');
    const btn = document.getElementById('toggle-dashboard-btn');
    dashboardVisible = !dashboardVisible;
    if (dashboardVisible) {
        container.style.display = 'flex';
        btn.classList.add('active-toggle');
        loadDashboard();
    } else {
        container.style.display = 'none';
        btn.classList.remove('active-toggle');
    }
}

async function loadDashboard() {
    if (!dashboardVisible) return;
    try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error('Failed to load dashboard');
        const data = await res.json();
        renderWeeklyChart(data.weekly_stats);
        renderStickyNotes(data.sticky_notes);
    } catch (e) {
        console.error('Dashboard error:', e);
    }
}

function renderWeeklyChart(stats) {
    const chart = document.getElementById('weekly-chart');
    const rangeLabel = document.getElementById('dashboard-week-range');
    chart.innerHTML = '';
    if (!stats || stats.length === 0) return;
    rangeLabel.textContent = `${stats[0].date} - ${stats[stats.length - 1].date}`;
    const maxMinutes = Math.max(...stats.map(s => s.minutes), 60);
    stats.forEach(day => {
        const percentage = Math.min((day.minutes / maxMinutes) * 100, 100);
        const container = document.createElement('div');
        container.className = 'chart-bar-container';
        const valueLabel = document.createElement('div');
        valueLabel.className = 'chart-bar-value';
        valueLabel.textContent = day.minutes >= 60 ? `${(day.minutes / 60).toFixed(1)}h` : `${day.minutes}m`;
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = `${percentage}%`;
        const nameLabel = document.createElement('div');
        nameLabel.className = 'chart-bar-label';
        nameLabel.textContent = day.day;
        container.appendChild(valueLabel);
        container.appendChild(bar);
        container.appendChild(nameLabel);
        chart.appendChild(container);
    });
}

function renderStickyNotes(data) {
    const grid = document.getElementById('sticky-notes-grid');
    grid.innerHTML = '';
    const allNotes = [...(data.dynamic || []), ...(data.manual || [])];
    if (allNotes.length === 0) {
        grid.innerHTML = '<div style="color:var(--text-secondary); padding: 12px;">No reminders!</div>';
        return;
    }
    allNotes.forEach(note => {
        const div = document.createElement('div');
        div.className = `sticky-note sticky-${note.color || 'yellow'}`;
        div.innerHTML = `<div class="sticky-title">${escapeHtml(note.title)}</div><div class="sticky-text">${escapeHtml(note.text).replace(/\n/g, '<br>')}</div>`;
        const delBtn = document.createElement('button');
        delBtn.className = 'sticky-delete';
        delBtn.innerHTML = '×';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (note.id && note.id.startsWith('dynamic_')) {
                alert('Dynamic reminders clear automatically when you act on the matter.');
            } else {
                deleteStickyNote(note.id);
            }
        };

        const editBtn = document.createElement('button');
        editBtn.className = 'sticky-edit';
        editBtn.innerHTML = '✎';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            const newText = prompt("Edit note text:", note.text);
            if (newText !== null && newText.trim() !== "") {
                updateStickyNoteText(note.id, newText.trim());
            }
        };

        if (note.matter_id) {
            div.style.cursor = 'pointer';
            div.onclick = () => {
                const matter = allMatters.find(m => m.id === note.matter_id);
                if (matter) {
                    const input = document.getElementById('chat-input');
                    input.value = `Worked on ${matter.name} `;
                    input.focus();
                }
            };
        }
        div.appendChild(editBtn);
        div.appendChild(delBtn);
        grid.appendChild(div);
    });
}

function openStickyModal() {
    document.getElementById('sticky-title').value = '';
    document.getElementById('sticky-text').value = '';
    document.getElementById('add-sticky-modal').style.display = 'block';
}

async function saveManualStickyNote() {
    const title = document.getElementById('sticky-title').value.trim();
    const text = document.getElementById('sticky-text').value.trim();
    const color = document.getElementById('sticky-color').value;
    if (!title && !text) return;
    const note = { id: 'manual_' + Date.now(), title, text, color };
    try {
        await fetch('/api/sticky-notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(note) });
        document.getElementById('add-sticky-modal').style.display = 'none';
        loadDashboard();
    } catch (e) { alert('Error: ' + e.message); }
}

async function deleteStickyNote(id) {
    if (!confirm('Delete this note?')) return;
    try {
        await fetch(`/api/sticky-notes/${id}`, { method: 'DELETE' });
        loadDashboard();
    } catch (e) { alert('Error: ' + e.message); }
}
async function updateStickyNoteText(id, newText) {
    try {
        await fetch(`/api/sticky-notes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: newText })
        });
        loadDashboard();
    } catch (e) {
        alert('Error updating note: ' + e.message);
    }
}




// Auto-load dashboard
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDashboard);
} else {
    loadDashboard();
}

