// ===================================================================
// TIMER MODULE  –  Inline button variant (no floating widget)
// ===================================================================

// Timer state persisted to localStorage
let timerState = {
    status: 'idle',      // 'idle' | 'running' | 'paused'
    matterId: null,
    matterName: null,
    startTime: null,     // epoch ms of last resume
    accumulatedMs: 0     // total ms counted before last pause
};

let timerInterval = null;

// --- Initialise on page load ---
function initTimer() {
    const saved = localStorage.getItem('timerState');
    if (saved) {
        try {
            timerState = JSON.parse(saved);
        } catch (e) {
            timerState = { status: 'idle', matterId: null, matterName: null, startTime: null, accumulatedMs: 0 };
        }
    }

    if (timerState.status === 'running') {
        _timerStartTick();
    }
    _timerRenderUI();

    // Wire up close buttons for the two modals
    document.getElementById('close-timer-stop-modal').onclick = () => {
        document.getElementById('timer-stop-modal').style.display = 'none';
        if (timerState.accumulatedMs > 0) {
            timerState.status = 'paused';
            _timerRenderUI();
            _persistTimerState();
        }
    };

    document.getElementById('close-timer-matter-picker-modal').onclick = () => {
        document.getElementById('timer-matter-picker-modal').style.display = 'none';
    };

    // Allow pressing Enter in description field
    document.getElementById('timer-stop-desc').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') timerSaveLog();
    });
}

// --- Inline button click handler ---
// idle  → start (after picking matter)
// running → pause
// paused  → show mini-menu (resume / stop)
function timerInlineClick() {
    const status = timerState.status;
    if (status === 'idle') {
        timerStart();
    } else if (status === 'running') {
        timerPause();
    } else if (status === 'paused') {
        // Show a context menu: Resume / Stop & Save
        _showTimerContextMenu();
    }
}

function _showTimerContextMenu() {
    // Remove existing menu if any
    let menu = document.getElementById('timer-context-menu');
    if (menu) { menu.remove(); return; }

    menu = document.createElement('div');
    menu.id = 'timer-context-menu';
    menu.className = 'timer-context-menu';

    const resumeBtn = document.createElement('button');
    resumeBtn.textContent = '▶ Resume';
    resumeBtn.onclick = () => { menu.remove(); timerResume(); };

    const stopBtn = document.createElement('button');
    stopBtn.textContent = '■ Stop & Save';
    stopBtn.className = 'stop';
    stopBtn.onclick = () => { menu.remove(); timerStop(); };

    menu.appendChild(resumeBtn);
    menu.appendChild(stopBtn);

    // Position below the inline button
    const btn = document.getElementById('timer-inline-btn');
    const rect = btn.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
    menu.style.left = rect.left + 'px';
    document.body.appendChild(menu);

    // Dismiss when clicking elsewhere
    setTimeout(() => {
        document.addEventListener('click', function handler(e) {
            if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', handler); }
        });
    }, 0);
}

// --- Public Controls ---
function timerStart() {
    if (!timerState.matterId) {
        _openTimerMatterPicker();
        return;
    }
    timerState.status = 'running';
    timerState.startTime = Date.now();
    _timerStartTick();
    _timerRenderUI();
    _persistTimerState();
}

function timerPause() {
    if (timerState.status !== 'running') return;
    timerState.accumulatedMs += Date.now() - timerState.startTime;
    timerState.startTime = null;
    timerState.status = 'paused';
    _timerStopTick();
    _timerRenderUI();
    _persistTimerState();
}

function timerResume() {
    if (timerState.status !== 'paused') return;
    timerState.status = 'running';
    timerState.startTime = Date.now();
    _timerStartTick();
    _timerRenderUI();
    _persistTimerState();
}

function timerStop() {
    // Internally pause first to freeze accumulated time
    if (timerState.status === 'running') {
        timerState.accumulatedMs += Date.now() - timerState.startTime;
        timerState.startTime = null;
        _timerStopTick();
    }
    timerState.status = 'paused';
    _timerRenderUI();

    // Show stop/description modal
    const totalMs = timerState.accumulatedMs;
    const totalMins = Math.max(1, Math.round(totalMs / 60000));
    const h = Math.floor(totalMs / 3600000);
    const m = Math.floor((totalMs % 3600000) / 60000);
    const s = Math.floor((totalMs % 60000) / 1000);

    document.getElementById('timer-stop-summary').textContent =
        `${h > 0 ? h + 'h ' : ''}${m}m ${s}s  →  ${totalMins} minute(s) will be logged`;
    document.getElementById('timer-stop-desc').value = '';
    document.getElementById('timer-stop-modal').style.display = 'block';
    setTimeout(() => document.getElementById('timer-stop-desc').focus(), 80);
}

async function timerSaveLog() {
    const desc = document.getElementById('timer-stop-desc').value.trim();
    const btn = document.getElementById('timer-save-log-btn');
    const originalText = btn.innerText;
    btn.innerText = 'Saving...';
    btn.disabled = true;

    const totalMins = Math.max(1, Math.round(timerState.accumulatedMs / 60000));

    try {
        const response = await fetch(`${API_BASE}/log/direct`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                matter_id: timerState.matterId,
                duration_minutes: totalMins,
                description: desc || `Timed session on ${timerState.matterName}`
            })
        });

        if (!response.ok) throw new Error('Failed to save');
        const data = await response.json();

        document.getElementById('timer-stop-modal').style.display = 'none';
        _timerReset();

        const chatHistory = document.getElementById('chat-history');
        if (chatHistory) {
            const msg = document.createElement('div');
            msg.className = 'message bot-message';
            msg.textContent = `⏱ Timer log saved: ${totalMins}m (${data.units}u) for "${data.matter}"`;
            chatHistory.appendChild(msg);
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }

    } catch (e) {
        alert('Error saving timer log: ' + e.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// --- Matter Picker ---
function _openTimerMatterPicker() {
    const list = document.getElementById('timer-picker-list');
    list.innerHTML = '';
    document.getElementById('timer-picker-search').value = '';

    allMatters.forEach(m => _renderTimerPickerItem(m, list));

    document.getElementById('timer-matter-picker-modal').style.display = 'block';
    document.getElementById('timer-picker-search').focus();
}

function _renderTimerPickerItem(m, list) {
    const item = document.createElement('div');
    item.className = 'matter-item';
    item.dataset.name = (m.name + ' ' + (m.external_id || '')).toLowerCase();
    item.style.cursor = 'pointer';
    item.innerHTML = `
        <div class="matter-id" style="font-weight:600;">${escapeHtml(m.external_id) || 'No ID'}</div>
        <div class="matter-name">${escapeHtml(m.name)}</div>
    `;
    item.onclick = () => {
        document.getElementById('timer-matter-picker-modal').style.display = 'none';
        _timerSelectMatter(m);
        timerStart();
    };
    list.appendChild(item);
}

function filterTimerMatterPicker(term) {
    const lower = term.toLowerCase();
    document.querySelectorAll('#timer-picker-list .matter-item').forEach(item => {
        item.style.display = item.dataset.name.includes(lower) ? '' : 'none';
    });
}

function _timerSelectMatter(matter) {
    timerState.matterId = matter.id;
    timerState.matterName = matter.name;
    timerState.accumulatedMs = 0;
    timerState.startTime = null;
    timerState.status = 'idle';
    _persistTimerState();
}

// --- Internal helpers ---
function _timerStartTick() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(_updateTimerDisplay, 500);
}

function _timerStopTick() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function _updateTimerDisplay() {
    const totalMs = timerState.accumulatedMs +
        (timerState.startTime ? Date.now() - timerState.startTime : 0);
    const h = Math.floor(totalMs / 3600000);
    const m = Math.floor((totalMs % 3600000) / 60000);
    const s = Math.floor((totalMs % 60000) / 1000);
    const pad = n => String(n).padStart(2, '0');
    const display = document.getElementById('timer-inline-display');
    if (display) {
        display.textContent = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
    }
}

function _timerRenderUI() {
    const status = timerState.status;
    const btn = document.getElementById('timer-inline-btn');
    const display = document.getElementById('timer-inline-display');
    if (!btn || !display) return;

    // Remove state classes
    btn.classList.remove('timer-inline-idle', 'timer-inline-running', 'timer-inline-paused');

    if (status === 'idle') {
        btn.classList.add('timer-inline-idle');
        btn.title = 'Start Timer';
        display.textContent = 'Timer';
        _updateTimerIcon('clock');
    } else if (status === 'running') {
        btn.classList.add('timer-inline-running');
        btn.title = `Timing: ${timerState.matterName || '?'} — click to pause`;
        _updateTimerIcon('pause');
        _updateTimerDisplay();
    } else if (status === 'paused') {
        btn.classList.add('timer-inline-paused');
        btn.title = `Paused: ${timerState.matterName || '?'} — click for options`;
        _updateTimerIcon('paused');
        _updateTimerDisplay();
    }
}

function _updateTimerIcon(type) {
    const icon = document.getElementById('timer-inline-icon');
    if (!icon) return;
    if (type === 'clock') {
        icon.innerHTML = '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>';
    } else if (type === 'pause') {
        icon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
    } else if (type === 'paused') {
        icon.innerHTML = '<circle cx="12" cy="12" r="10" stroke-dasharray="3 2"/><polyline points="12 6 12 12 16 14"/>';
    }
}

function _timerReset() {
    _timerStopTick();
    timerState = { status: 'idle', matterId: null, matterName: null, startTime: null, accumulatedMs: 0 };
    _timerRenderUI();
    _persistTimerState();
}

function _persistTimerState() {
    localStorage.setItem('timerState', JSON.stringify(timerState));
}
