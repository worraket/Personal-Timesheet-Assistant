const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    loadMatters();

    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    document.getElementById('scan-btn').addEventListener('click', scanOutlook);
    document.getElementById('export-btn').addEventListener('click', exportLogs);
});

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
        item.innerHTML = `
            <div class="matter-name">${escapeHtml(matter.name)}</div>
            <div class="matter-desc">${escapeHtml(matter.description || '')}</div>
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
    const text = input.value.trim();

    if (!text) return;

    addMessage('User', text);
    input.value = '';

    try {
        const response = await fetch(`${API_BASE}/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to log time');
        }

        const data = await response.json();
        const responseMsg = `Logged <strong>${data.duration} mins</strong> for <strong>${escapeHtml(data.matter)}</strong>.<br><em>"${escapeHtml(data.description)}"</em>`;
        addMessage('System', responseMsg, true); // true for HTML content
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
