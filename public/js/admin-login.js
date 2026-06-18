const API = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    // 已登录则直接跳转
    if (localStorage.getItem('adminToken')) {
        window.location.href = 'admin-dashboard.html';
        return;
    }

    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('admin-password').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
});

async function handleLogin() {
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('login-error');

    errorEl.style.display = 'none';

    if (!username || !password) {
        errorEl.textContent = '请填写用户名和密码';
        errorEl.style.display = 'block';
        return;
    }

    const btn = document.getElementById('login-btn');
    btn.textContent = '登录中…';
    btn.disabled = true;

    try {
        const res = await fetch(`${API}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_username: username, password })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('adminToken', data.token);
            window.location.href = 'admin-dashboard.html';
        } else {
            errorEl.textContent = data.message || '登录失败';
            errorEl.style.display = 'block';
        }
    } catch {
        errorEl.textContent = '网络错误，请稍后重试';
        errorEl.style.display = 'block';
    } finally {
        btn.textContent = '登 录';
        btn.disabled = false;
    }
}