const API = 'http://localhost:3000/api';

function riderAuthHeader() {
    return { 'Authorization': `Bearer ${localStorage.getItem('riderToken')}` };
}

// ─── 注册面板切换 ─────────────────────────────────────────
document.getElementById('to-register-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-panel').style.display = 'none';
    document.getElementById('register-panel').style.display = 'block';
    document.getElementById('register-error').textContent = '';
});

document.getElementById('to-login-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-panel').style.display = 'none';
    document.getElementById('login-panel').style.display = 'block';
    document.getElementById('login-error').textContent = '';
});

// ─── 骑手注册 ─────────────────────────────────────────────
document.getElementById('register-btn').addEventListener('click', async () => {
    const name     = document.getElementById('reg-name').value.trim();
    const phone    = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;
    const password2 = document.getElementById('reg-password2').value;
    const errorEl  = document.getElementById('register-error');

    if (!name || !phone || !password) { errorEl.textContent = '请填写所有字段'; return; }
    if (!/^[0-9]{8,15}$/.test(phone)) { errorEl.textContent = '请输入有效手机号（8-15位数字）'; return; }
    if (password !== password2) { errorEl.textContent = '两次密码不一致'; return; }

    const btn = document.getElementById('register-btn');
    btn.disabled = true;
    btn.textContent = '注册中…';

    try {
        const res = await fetch(`${API}/riderRegister`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rider_name: name, rider_phone: phone, password })
        });
        const data = await res.json();
        if (data.success) {
            alert('注册成功！请登录');
            document.getElementById('to-login-link').click();
            document.getElementById('rider-phone').value = phone;
        } else {
            errorEl.textContent = data.message || '注册失败';
        }
    } catch {
        errorEl.textContent = '网络错误，请稍后重试';
    } finally {
        btn.disabled = false;
        btn.textContent = '注册';
    }
});

// ─── 重置密码面板切换 ──────────────────────────────────────
document.getElementById('to-reset-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-panel').style.display = 'none';
    document.getElementById('reset-panel').style.display = 'block';
    document.getElementById('reset-error').textContent = '';
});

document.getElementById('reset-to-login-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('reset-panel').style.display = 'none';
    document.getElementById('login-panel').style.display = 'block';
    document.getElementById('login-error').textContent = '';
});

// ─── 骑手密码重置 ─────────────────────────────────────────
document.getElementById('reset-btn').addEventListener('click', async () => {
    const phone     = document.getElementById('reset-phone').value.trim();
    const password  = document.getElementById('reset-password').value;
    const password2 = document.getElementById('reset-password2').value;
    const errorEl   = document.getElementById('reset-error');

    if (!phone || !password) { errorEl.textContent = '请填写所有字段'; return; }
    if (password !== password2) { errorEl.textContent = '两次密码不一致'; return; }

    const btn = document.getElementById('reset-btn');
    btn.disabled = true;
    btn.textContent = '提交中…';

    try {
        const res = await fetch(`${API}/riderResetPassword`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rider_phone: phone, new_password: password })
        });
        const data = await res.json();
        if (data.success) {
            alert('密码已重置，请重新登录');
            document.getElementById('reset-to-login-link').click();
            document.getElementById('rider-phone').value = phone;
        } else {
            errorEl.textContent = data.message || '重置失败';
        }
    } catch {
        errorEl.textContent = '网络错误，请稍后重试';
    } finally {
        btn.disabled = false;
        btn.textContent = '确认重置';
    }
});

// ─── 登录 ────────────────────────────────────────────────
document.getElementById('login-btn').addEventListener('click', async () => {
    const phone = document.getElementById('rider-phone').value.trim();
    const password = document.getElementById('rider-password').value.trim();
    if (!phone || !password) return;
    const res = await fetch(`${API}/riderLogin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rider_phone: phone, password })
    });
    const data = await res.json();
    if (data.success) {
        localStorage.setItem('riderToken', data.token);
        localStorage.setItem('rider_id', data.data.rider_id);
        localStorage.setItem('rider_name', data.data.rider_name);
        showMain();
    } else {
        document.getElementById('login-error').textContent = data.message || '登录失败';
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('riderToken');
    localStorage.removeItem('rider_id');
    localStorage.removeItem('rider_name');
    document.getElementById('main-panel').style.display = 'none';
    document.getElementById('login-panel').style.display = 'block';
});

// ─── Tab 切换 ─────────────────────────────────────────────
let currentTab = 'available';

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentTab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('available-orders-content').style.display = currentTab === 'available' ? 'block' : 'none';
        document.getElementById('my-orders-content').style.display = currentTab === 'mine' ? 'block' : 'none';
        loadCurrentTab();
    });
});

document.getElementById('refresh-orders-btn').addEventListener('click', loadCurrentTab);

function loadCurrentTab() {
    if (currentTab === 'available') loadAvailableOrders();
    else loadMyOrders();
}

// ─── 主界面 ───────────────────────────────────────────────
function showMain() {
    document.getElementById('login-panel').style.display = 'none';
    document.getElementById('main-panel').style.display = 'block';
    document.getElementById('rider-name-display').textContent = localStorage.getItem('rider_name') + ' 你好';
    loadAvailableOrders();
}

// ─── 可抢订单 ─────────────────────────────────────────────
async function loadAvailableOrders() {
    const content = document.getElementById('available-orders-content');
    content.innerHTML = '<div class="loading">加载中...</div>';
    try {
        const res = await fetch(`${API}/availableOrders`, { headers: riderAuthHeader() });
        if (res.status === 401) return handleUnauth(content);
        const data = await res.json();
        if (!data.success) { content.innerHTML = '<div class="empty">加载失败</div>'; return; }
        if (!data.data.length) { content.innerHTML = '<div class="empty">暂无可抢订单</div>'; return; }
        content.innerHTML = data.data.map(order => `
            <div class="order-card">
                <div class="order-meta">
                    <span class="order-id">订单号：${order.order_id}</span>
                    <span class="order-status status-ready">待接单</span>
                </div>
                <div class="order-info">
                    <div>🏪 ${order.merchant_name}（${order.merchant_address}）</div>
                    <div>🍱 ${order.product_name} × ${order.order_quantity}</div>
                    <div>📍 ${order.customer_address || '未填写地址'}</div>
                    <div>💰 ¥${parseFloat(order.total_price).toFixed(2)}</div>
                </div>
                <div class="order-actions">
                    <button class="action-btn grab-btn" data-order-id="${order.order_id}">抢单</button>
                </div>
            </div>
        `).join('');
    } catch {
        content.innerHTML = '<div class="empty">网络错误</div>';
    }
}

// ─── 我的配送 ─────────────────────────────────────────────
async function loadMyOrders() {
    const content = document.getElementById('my-orders-content');
    content.innerHTML = '<div class="loading">加载中...</div>';
    try {
        const res = await fetch(`${API}/riderOrders`, { headers: riderAuthHeader() });
        if (res.status === 401) return handleUnauth(content);
        const data = await res.json();
        if (!data.success) { content.innerHTML = '<div class="empty">加载失败</div>'; return; }
        if (!data.data.length) { content.innerHTML = '<div class="empty">暂无配送任务</div>'; return; }
        content.innerHTML = data.data.map(order => `
            <div class="order-card">
                <div class="order-meta">
                    <span class="order-id">订单号：${order.order_id}</span>
                    <span class="order-status ${order.delivery_status === 'Picked Up' ? 'status-picked' : 'status-transit'}">
                        ${order.delivery_status === 'Picked Up' ? '已取餐' : '配送中'}
                    </span>
                </div>
                <div class="order-info">
                    <div>🏪 ${order.merchant_name}</div>
                    <div>🍱 ${order.product_name} × ${order.order_quantity}</div>
                    <div>👤 ${order.customer_username} ${order.customer_phone}</div>
                </div>
                <div class="order-actions">
                    ${order.delivery_status === 'In Transit'
                        ? `<button class="action-btn pickup-btn" data-delivery-id="${order.delivery_id}" data-order-id="${order.order_id}">确认取餐</button>`
                        : `<button class="action-btn deliver-btn" data-delivery-id="${order.delivery_id}" data-order-id="${order.order_id}">确认送达</button>`
                    }
                </div>
            </div>
        `).join('');
    } catch {
        content.innerHTML = '<div class="empty">网络错误</div>';
    }
}

// ─── 事件代理：抢单 + 取餐/送达 ──────────────────────────
document.getElementById('main-panel').addEventListener('click', async (e) => {
    const btn = e.target.closest('.grab-btn, .pickup-btn, .deliver-btn');
    if (!btn) return;
    btn.disabled = true;

    // 抢单
    if (btn.classList.contains('grab-btn')) {
        const res = await fetch(`${API}/grabOrder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...riderAuthHeader() },
            body: JSON.stringify({ order_id: btn.dataset.orderId })
        });
        const data = await res.json();
        if (data.success) {
            alert('抢单成功！');
            // 切换到我的配送
            currentTab = 'mine';
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'mine'));
            document.getElementById('available-orders-content').style.display = 'none';
            document.getElementById('my-orders-content').style.display = 'block';
            loadMyOrders();
        } else {
            alert(data.message || '抢单失败，订单可能已被其他骑手接走');
            btn.disabled = false;
            loadAvailableOrders();
        }
        return;
    }

    // 确认取餐 / 确认送达
    const isPickup = btn.classList.contains('pickup-btn');
    const res = await fetch(`${API}/updateDeliveryStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...riderAuthHeader() },
        body: JSON.stringify({
            delivery_id: btn.dataset.deliveryId,
            order_id: btn.dataset.orderId,
            delivery_status: isPickup ? 'Picked Up' : 'Delivered'
        })
    });
    const data = await res.json();
    if (data.success) {
        loadMyOrders();
    } else {
        alert('操作失败');
        btn.disabled = false;
    }
});

// ─── 工具函数 ─────────────────────────────────────────────
function handleUnauth(content) {
    content.innerHTML = '<div class="empty">登录已过期，请重新登录</div>';
    setTimeout(() => {
        localStorage.removeItem('riderToken');
        localStorage.removeItem('rider_id');
        localStorage.removeItem('rider_name');
        document.getElementById('main-panel').style.display = 'none';
        document.getElementById('login-panel').style.display = 'block';
    }, 1500);
}

// ─── 自动登录 ─────────────────────────────────────────────
window.onload = () => {
    if (localStorage.getItem('riderToken') && localStorage.getItem('rider_id')) showMain();
};