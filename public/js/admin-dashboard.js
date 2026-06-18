const API = 'http://localhost:3000/api';

let currentStatus = '';
let pendingRejectId = null;

function getToken() {
    return localStorage.getItem('adminToken');
}

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    };
}

document.addEventListener('DOMContentLoaded', () => {
    if (!getToken()) {
        window.location.href = 'admin-login.html';
        return;
    }

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        window.location.href = 'admin-login.html';
    });

    // 筛选 tab
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentStatus = tab.dataset.status;
            loadApplications();
        });
    });

    // 拒绝弹窗
    document.getElementById('modal-cancel-btn').addEventListener('click', closeRejectModal);
    document.getElementById('modal-confirm-btn').addEventListener('click', confirmReject);

    loadApplications();
});

async function loadApplications() {
    const list = document.getElementById('application-list');
    list.innerHTML = '<div class="loading-tip">加载中…</div>';

    try {
        const url = currentStatus
            ? `${API}/admin/applications?status=${currentStatus}`
            : `${API}/admin/applications`;

        const res = await fetch(url, { headers: authHeaders() });
        if (res.status === 401) { window.location.href = 'admin-login.html'; return; }

        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        // 更新待审核角标
        if (!currentStatus) {
            const pendingCount = data.data.filter(a => a.status === 'pending').length;
            const badge = document.getElementById('badge-pending');
            badge.textContent = pendingCount > 0 ? pendingCount : '';
        }

        renderApplications(data.data);
    } catch (e) {
        list.innerHTML = `<div class="error-tip">加载失败：${e.message}</div>`;
    }
}

function renderApplications(apps) {
    const list = document.getElementById('application-list');

    if (!apps.length) {
        list.innerHTML = '<div class="empty-tip">暂无申请记录</div>';
        return;
    }

    list.innerHTML = apps.map(app => {
        const hours = app.is_24h
            ? '24小时营业'
            : `${formatTime(app.opening_time)} ~ ${formatTime(app.closing_time)}`;

        const statusTag = {
            pending: '<span class="status-tag status-pending">待审核</span>',
            approved: '<span class="status-tag status-approved">已通过</span>',
            rejected: '<span class="status-tag status-rejected">已拒绝</span>'
        }[app.status];

        const rejectReason = app.status === 'rejected'
            ? `<div class="reject-reason-display">拒绝原因：${app.reject_reason}</div>`
            : '';

        const actions = app.status === 'pending' ? `
            <div class="card-actions">
                <button class="btn-approve" onclick="approveApplication('${app.application_id}')">通过</button>
                <button class="btn-reject" onclick="openRejectModal('${app.application_id}')">拒绝</button>
            </div>` : '';

        return `
            <div class="application-card" id="card-${app.application_id}">
                <div class="card-header">
                    <div class="card-title">${app.merchant_name}</div>
                    ${statusTag}
                </div>
                <div class="card-body">
                    <div class="card-row"><span class="card-label">申请ID</span><span>${app.application_id}</span></div>
                    <div class="card-row"><span class="card-label">联系电话</span><span>${app.merchant_phone}</span></div>
                    <div class="card-row"><span class="card-label">营业地址</span><span>${app.merchant_address}</span></div>
                    <div class="card-row"><span class="card-label">营业时间</span><span>${hours}</span></div>
                    <div class="card-row"><span class="card-label">申请时间</span><span>${formatDate(app.apply_date)}</span></div>
                </div>
                ${rejectReason}
                ${actions}
            </div>
        `;
    }).join('');
}

async function approveApplication(applicationId) {
    if (!confirm('确认通过该商家入驻申请？')) return;

    try {
        const res = await fetch(`${API}/admin/approve/${applicationId}`, {
            method: 'POST',
            headers: authHeaders()
        });
        const data = await res.json();
        if (data.success) {
            updateCardStatus(applicationId, 'approved');
        } else {
            alert('操作失败：' + data.message);
        }
    } catch {
        alert('网络错误，请稍后重试');
    }
}

function openRejectModal(applicationId) {
    pendingRejectId = applicationId;
    document.getElementById('reject-reason-input').value = '';
    document.getElementById('reject-error').style.display = 'none';
    document.getElementById('reject-modal').style.display = 'flex';
}

function closeRejectModal() {
    pendingRejectId = null;
    document.getElementById('reject-modal').style.display = 'none';
}

async function confirmReject() {
    const reason = document.getElementById('reject-reason-input').value.trim();
    const errorEl = document.getElementById('reject-error');

    if (!reason) {
        errorEl.textContent = '请填写拒绝原因';
        errorEl.style.display = 'block';
        return;
    }

    const btn = document.getElementById('modal-confirm-btn');
    btn.textContent = '提交中…';
    btn.disabled = true;

    try {
        const res = await fetch(`${API}/admin/reject/${pendingRejectId}`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ reject_reason: reason })
        });
        const data = await res.json();
        if (data.success) {
            updateCardStatus(pendingRejectId, 'rejected', reason);
            closeRejectModal();
        } else {
            errorEl.textContent = data.message || '操作失败';
            errorEl.style.display = 'block';
        }
    } catch {
        errorEl.textContent = '网络错误，请稍后重试';
        errorEl.style.display = 'block';
    } finally {
        btn.textContent = '确认拒绝';
        btn.disabled = false;
    }
}

// 直接更新卡片 DOM，无需重新请求
function updateCardStatus(applicationId, newStatus, rejectReason = '') {
    const card = document.getElementById(`card-${applicationId}`);
    if (!card) return;

    const statusTag = card.querySelector('.status-tag');
    statusTag.className = `status-tag status-${newStatus}`;
    statusTag.textContent = { approved: '已通过', rejected: '已拒绝' }[newStatus];

    const actions = card.querySelector('.card-actions');
    if (actions) actions.remove();

    if (newStatus === 'rejected' && rejectReason) {
        const div = document.createElement('div');
        div.className = 'reject-reason-display';
        div.textContent = `拒绝原因：${rejectReason}`;
        card.appendChild(div);
    }

    // 更新待审核角标
    const pendingCards = document.querySelectorAll('.status-pending').length;
    const badge = document.getElementById('badge-pending');
    badge.textContent = pendingCards > 0 ? pendingCards : '';
}

function formatTime(t) {
    if (!t) return '-';
    return String(t).slice(0, 5);
}

function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
}