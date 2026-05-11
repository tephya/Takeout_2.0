const API = 'http://localhost:3000/api';

// 加载用户信息
async function loadAccountInfo() {
    const phone = localStorage.getItem('customer_phone');
    const userId = localStorage.getItem('customer_id');
    const username = localStorage.getItem('customer_username');

    // 填充侧边栏
    const sideUsername = document.getElementById('sidebar-username');
    const sideUserId = document.getElementById('sidebar-userid');
    const topUsername = document.getElementById('account-username');
    if (sideUsername) sideUsername.textContent = username || '';
    if (sideUserId) sideUserId.textContent = userId || '';
    if (topUsername) topUsername.textContent = username || '';

    // 填充个人资料
    const profileUserId = document.getElementById('profile-userid');
    const profileUsername = document.getElementById('profile-username');
    if (profileUserId) profileUserId.value = userId || '';
    if (profileUsername) profileUsername.value = username || '';

    // 填充手机号（脱敏）
    if (phone) {
        const masked = phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
        const phoneDisplay = document.getElementById('security-phone-display');
        if (phoneDisplay) phoneDisplay.value = masked;
    }

    // 填充地址
    try {
        const res = await fetch(`${API}/get_user_info?customer_phone=${phone}`);
        const data = await res.json();
        if (data.success && data.data) {
            const addrDisplay = document.getElementById('current-address-display');
            if (addrDisplay) addrDisplay.value = data.data.customer_address || '';
        }
    } catch (e) {
        console.error('获取用户信息失败:', e);
    }
}

// 加载头像
async function loadAccountAvatar() {
    const phone = localStorage.getItem('customer_phone');
    if (!phone) return;
    try {
        const res = await fetch(`${API}/getAvatar?customer_phone=${phone}`);
        const data = await res.json();
        if (data.success && data.avatarUrl) {
            const img = document.getElementById('account-avatar-img');
            if (img) img.src = `http://localhost:3000${data.avatarUrl}`;
            const a1Img = document.getElementById('a1-avatar');
            if (a1Img) a1Img.src = `http://localhost:3000${data.avatarUrl}`;
        }
    } catch (e) {
        console.error('加载头像失败:', e);
    }
}

// 绑定头像上传
function bindAvatarUpload() {
    const fileInput = document.getElementById('account-avatar-input');
    if (!fileInput) return;
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            alert('图片大小不能超过 2MB');
            return;
        }
        const phone = localStorage.getItem('customer_phone');
        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('customer_phone', phone);
        try {
            const res = await fetch(`${API}/uploadAvatar`, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                const img = document.getElementById('account-avatar-img');
                if (img) img.src = `http://localhost:3000${data.avatarUrl}?t=${Date.now()}`;
            } else {
                alert('上传失败：' + (data.message || '未知错误'));
            }
        } catch (e) {
            alert('网络错误，请稍后重试');
        }
        fileInput.value = '';
    });
}

function triggerAvatarUpload() {
    document.getElementById('account-avatar-input').click();
}

// 导航切换
function switchSection(name) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`section-${name}`).style.display = 'block';
    document.querySelector(`[data-section="${name}"]`).classList.add('active');
}

// 保存用户名
async function saveUsername() {
    const newUsername = document.getElementById('profile-username').value.trim();
    const errorEl = document.getElementById('username-error');
    if (!newUsername) { errorEl.textContent = '请输入用户名'; return; }
    if (newUsername.length > 20) { errorEl.textContent = '用户名不能超过20个字符'; return; }
    try {
        const phone = localStorage.getItem('customer_phone');
        const res = await fetch(`${API}/update_username`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_phone: phone, new_username: newUsername })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('customer_username', newUsername);
            document.getElementById('sidebar-username').textContent = newUsername;
            document.getElementById('account-username').textContent = newUsername;
            errorEl.textContent = '';
            alert('用户名修改成功！');
        } else {
            errorEl.textContent = data.message || '修改失败';
        }
    } catch (e) {
        errorEl.textContent = '网络错误，请稍后重试';
    }
}

// 手机号修改
function togglePhoneEdit() {
    const area = document.getElementById('phone-edit-area');
    area.style.display = area.style.display === 'none' ? 'block' : 'none';
}

function sendCurrentPhoneCode() {
    const btn = document.getElementById('get-current-phone-code-btn');
    if (btn.disabled) return;
    const code = codeManager.generateCode();
    codeManager.startCountdown('get-current-phone-code-btn');
    const input = codeManager.createCodeInput('current-phone-code-area', code);
    codeManager.handleCodeInput(input, code, () => {
        document.getElementById('new-phone-area').style.display = 'block';
    });
}

async function sendNewPhoneCode() {
    const newPhone = document.getElementById('new-phone-input').value.trim();
    const errorEl = document.getElementById('phone-error');
    if (!/^\d{11}$/.test(newPhone)) { errorEl.textContent = '请输入正确的11位手机号'; return; }
    const btn = document.getElementById('get-new-phone-code-btn');
    if (btn.disabled) return;
    try {
        const res = await fetch(`${API}/select_phone?customer_phone=${newPhone}`);
        const data = await res.json();
        if (data.exists) { errorEl.textContent = '该手机号已被注册'; return; }
    } catch (e) { errorEl.textContent = '网络错误'; return; }
    errorEl.textContent = '';
    const code = codeManager.generateCode();
    codeManager.startCountdown('get-new-phone-code-btn');
    const input = codeManager.createCodeInput('new-phone-code-area', code);
    codeManager.handleCodeInput(input, code, () => {
        document.getElementById('confirm-phone-btn').style.display = 'block';
    });
}

async function savePhone() {
    const oldPhone = localStorage.getItem('customer_phone');
    const newPhone = document.getElementById('new-phone-input').value.trim();
    const errorEl = document.getElementById('phone-error');
    try {
        const res = await fetch(`${API}/update_phone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ old_phone: oldPhone, new_phone: newPhone })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('customer_phone', newPhone);
            alert('手机号修改成功！');
            location.reload();
        } else {
            errorEl.textContent = data.message || '修改失败';
        }
    } catch (e) {
        errorEl.textContent = '网络错误，请稍后重试';
    }
}

// 密码修改
function sendVerifyCode() {
    const btn = document.getElementById('get-verify-code-btn');
    if (btn.disabled) return;
    const code = codeManager.generateCode();
    codeManager.startCountdown('get-verify-code-btn');
    const input = codeManager.createCodeInput('verify-code-area', code);
    codeManager.handleCodeInput(input, code, () => {
        document.getElementById('password-edit-area').style.display = 'block';
    });
}

async function savePassword() {
    const newPwd = document.getElementById('new-password').value.trim();
    const confirmPwd = document.getElementById('confirm-new-password').value.trim();
    const errorEl = document.getElementById('password-error');
    if (newPwd !== confirmPwd) { errorEl.textContent = '两次密码不一致'; return; }
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,16}$/.test(newPwd)) {
        errorEl.textContent = '密码须6-16位，包含字母和数字';
        return;
    }
    try {
        const phone = localStorage.getItem('customer_phone');
        const res = await fetch(`${API}/update_password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_phone: phone, new_password: newPwd })
        });
        const data = await res.json();
        if (data.success) {
            errorEl.textContent = '';
            alert('密码修改成功！');
            document.getElementById('password-edit-area').style.display = 'none';
            document.getElementById('verify-code-area').innerHTML = '';
            codeManager.resetButton('get-verify-code-btn');
        } else {
            errorEl.textContent = data.message || '修改失败';
        }
    } catch (e) {
        errorEl.textContent = '网络错误，请稍后重试';
    }
}

// 地址修改
async function saveAddress() {
    const newAddr = document.getElementById('new-address-input').value.trim();
    const errorEl = document.getElementById('address-error');
    if (!newAddr) { errorEl.textContent = '请输入新地址'; return; }
    try {
        const phone = localStorage.getItem('customer_phone');
        const res = await fetch(`${API}/updateUserAddress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, address: newAddr })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('current-address-display').value = newAddr;
            document.getElementById('new-address-input').value = '';
            errorEl.textContent = '';
            alert('地址修改成功！');
        } else {
            errorEl.textContent = data.message || '修改失败';
        }
    } catch (e) {
        errorEl.textContent = '网络错误，请稍后重试';
    }
}

// 登出
function accountLogout() {
    localStorage.clear();
    window.location.href = '../../homepage/html/index.html';
}

document.addEventListener('DOMContentLoaded', function () {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        window.location.href = '../../homepage/html/index.html';
        return;
    }

    loadAccountInfo();
    loadAccountAvatar();
    bindAvatarUpload();

    try {
        codeManager = new VerificationCodeManager();
    } catch (e) {
        console.error('VerificationCodeManager 初始化失败:', e);
    }
});