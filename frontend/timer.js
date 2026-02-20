// ===================================================================
// TIMER MODULE
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

    // Restore saved widget position
    const widget = document.getElementById('timer-widget');
    const savedPos = localStorage.getItem('timerPosition');
    if (savedPos) {
        try {
            const { left, top } = JSON.parse(savedPos);
            widget.style.right = 'auto';
            widget.style.bottom = 'auto';
            widget.style.left = left + 'px';
            widget.style.top = top + 'px';
        } catch (e) { }
    }

    // === Drag to move (header strip only) ===
    const handle = widget.querySelector('.timer-header');
    handle.style.cursor = 'grab';
    let dragStartX, dragStartY, originLeft, originTop, isDragging = false;

    handle.addEventListener('mousedown', (e) => {
        e.preventDefault();

        const rect = widget.getBoundingClientRect();
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        originLeft = rect.left;
        originTop = rect.top;
        isDragging = false;
        handle.style.cursor = 'grabbing';

        function onMove(e) {
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            if (!isDragging && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
            isDragging = true;

            let newLeft = originLeft + dx;
            let newTop = originTop + dy;
            newLeft = Math.max(0, Math.min(window.innerWidth - widget.offsetWidth, newLeft));
            newTop = Math.max(0, Math.min(window.innerHeight - widget.offsetHeight, newTop));

            widget.style.right = 'auto';
            widget.style.bottom = 'auto';
            widget.style.left = newLeft + 'px';
            widget.style.top = newTop + 'px';
        }

        function onUp() {
            handle.style.cursor = 'grab';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (isDragging) {
                localStorage.setItem('timerPosition', JSON.stringify({
                    left: parseFloat(widget.style.left),
                    top: parseFloat(widget.style.top)
                }));
            }
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });

    // Wire up close buttons for the two new modals
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
    timerState.status = 'paused'; // temporarily paused while user fills description
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

        // Close modal and reset timer
        document.getElementById('timer-stop-modal').style.display = 'none';
        _timerReset();

        // Show a brief success note in the chat
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
    document.getElementById('timer-display').textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function _timerRenderUI() {
    const status = timerState.status;
    const widget = document.getElementById('timer-widget');
    const dot = document.getElementById('timer-dot');
    const label = document.getElementById('timer-matter-label');

    // Label
    label.textContent = timerState.matterName || 'No matter selected';

    // Widget class
    widget.className = 'timer-widget ' + (status === 'idle' ? 'timer-idle' : '');

    // Dot animation class
    dot.className = 'timer-dot';
    if (status === 'running') dot.classList.add('active');
    else if (status === 'paused') dot.classList.add('paused');

    // Button visibility
    const startBtn = document.getElementById('timer-start-btn');
    const pauseBtn = document.getElementById('timer-pause-btn');
    const resumeBtn = document.getElementById('timer-resume-btn');
    const stopBtn = document.getElementById('timer-stop-btn');

    startBtn.style.display = status === 'idle' ? '' : 'none';
    pauseBtn.style.display = status === 'running' ? '' : 'none';
    resumeBtn.style.display = status === 'paused' ? '' : 'none';
    stopBtn.style.display = status !== 'idle' ? '' : 'none';

    // Update display once
    _updateTimerDisplay();
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
