const API = 'http://localhost:3000/api';
let originalUsername = '';

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
    originalUsername = profileUsername.value;
    const saveBtn = document.querySelector('.save-btn');
    if (saveBtn) saveBtn.disabled = true;

    // 填充手机号（脱敏）
    if (phone) {
        const masked = phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
        const phoneDisplay = document.getElementById('security-phone-display');
        if (phoneDisplay) phoneDisplay.value = masked;
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
    errorEl.textContent = '';
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
            originalUsername = newUsername;
            document.querySelector('.save-btn').disabled = true;
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

// 加载地址列表
async function loadAddresses() {
    const customer_id = localStorage.getItem('customer_id');
    try {
        const res = await fetch(`${API}/getAddresses?customer_id=${customer_id}`);
        const data = await res.json();
        renderAddressList(data.success ? data.data : []);
    } catch (e) {
        renderAddressList([]);
    }
}

function renderAddressList(addresses) {
    const container = document.getElementById('address-list');
    if (!container) return;
    if (addresses.length === 0) {
        container.innerHTML = '<p style="color:#999;">暂无收货地址</p>';
        return;
    }
    container.innerHTML = addresses.map(addr => `
        <div class="field-group" style="display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid #eee;">
            <div style="flex:1;">
                ${addr.address_label ? `<span style="background:#f0f0f0; padding:2px 8px; border-radius:4px; font-size:12px; margin-right:8px;">${addr.address_label}</span>` : ''}
                <span>${addr.address_detail}</span>
                ${addr.is_default ? '<span style="color:#e4393c; font-size:12px; margin-left:8px;">[默认]</span>' : ''}
            </div>
            <div style="display:flex; gap:6px; flex-shrink:0;">
                ${!addr.is_default ? `<button class="edit-btn" onclick="setDefault('${addr.address_id}')">设为默认</button>` : ''}
                <button class="edit-btn" style="color:#e4393c;" onclick="deleteAddress('${addr.address_id}')">删除</button>
            </div>
        </div>
    `).join('');
}

async function addAddress() {
    const detail = document.getElementById('new-address-input').value.trim();
    const label = document.getElementById('new-address-label').value.trim();
    const errorEl = document.getElementById('address-error');
    if (!detail) { errorEl.textContent = '请输入详细地址'; return; }
    const customer_id = localStorage.getItem('customer_id');
    try {
        const res = await fetch(`${API}/addAddress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_id, address_detail: detail, address_label: label || null })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('new-address-input').value = '';
            document.getElementById('new-address-label').value = '';
            errorEl.textContent = '';
            loadAddresses();
        } else {
            errorEl.textContent = data.message || '添加失败';
        }
    } catch (e) {
        errorEl.textContent = '网络错误，请稍后重试';
    }
}

async function deleteAddress(address_id) {
    if (!confirm('确认删除该地址？')) return;
    const customer_id = localStorage.getItem('customer_id');
    try {
        const res = await fetch(`${API}/deleteAddress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address_id, customer_id })
        });
        const data = await res.json();
        if (data.success) loadAddresses();
        else alert(data.message || '删除失败');
    } catch (e) {
        alert('网络错误，请稍后重试');
    }
}

async function setDefault(address_id) {
    const customer_id = localStorage.getItem('customer_id');
    try {
        const res = await fetch(`${API}/setDefaultAddress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address_id, customer_id })
        });
        const data = await res.json();
        if (data.success) loadAddresses();
        else alert(data.message || '操作失败');
    } catch (e) {
        alert('网络错误，请稍后重试');
    }
}

// 登出
function accountLogout() {
    localStorage.clear();
    window.location.href = './index.html';
}


// 动态设置面包屑：若从 myorder.html 跳转过来则显示“首页 › 我的订单 › 账户设置”
function setBreadcrumb() {
    const breadcrumbContainer = document.getElementById('account-breadcrumb');
    if (!breadcrumbContainer) return;
    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get('from');
    if (from === 'search') {
        breadcrumbContainer.innerHTML = `
            <a href="./index.html" class="breadcrumb-home">
                <img src="./images/icons/home.svg" class="breadcrumb-icon">
                首页
            </a>
            <span class="breadcrumb-sep"> › </span>
            <a href="./search.html" class="breadcrumb-link">搜索页</a>
            <span class="breadcrumb-sep"> › </span>
            <span class="breadcrumb-current">账户设置</span>
        `;
    } else if (from === 'myorder') {
        breadcrumbContainer.innerHTML = `
            <a href="./index.html" class="breadcrumb-home">
                <img src="./images/icons/home.svg" class="breadcrumb-icon">
                首页
            </a>
            <span class="breadcrumb-sep"> › </span>
            <a href="./myorder.html" class="breadcrumb-link">我的订单</a>
            <span class="breadcrumb-sep"> › </span>
            <span class="breadcrumb-current">账户设置</span>
        `;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    setBreadcrumb();

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        window.location.href = './index.html';
        return;
    }

    const usernameInput = document.getElementById('profile-username');
    const saveBtn = document.querySelector('.save-btn');
    if (usernameInput && saveBtn) {
        usernameInput.addEventListener('input', () => {
            saveBtn.disabled = usernameInput.value.trim() === originalUsername;
        });
    }

    loadAddresses();
    loadAccountInfo();
    loadAccountAvatar();
    bindAvatarUpload();

    try {
        codeManager = new VerificationCodeManager();
    } catch (e) {
        console.error('VerificationCodeManager 初始化失败:', e);
    }
});