const API = 'http://localhost:3000/api';
let localCodeManager;

document.addEventListener('DOMContentLoaded', () => {
    localCodeManager = new VerificationCodeManager();

    document.getElementById('login-submit-btn').addEventListener('click', handleLogin);
    document.getElementById('get-reset-code-btn').addEventListener('click', sendResetCode);
    document.getElementById('reset-submit-btn').addEventListener('click', handleResetPassword);
});

// 登录
async function handleLogin() {
    const phone = document.getElementById('login-phone').value.trim();
    const password = document.getElementById('login-password').value;
    if (!phone || !password) { alert('请填写手机号和密码'); return; }
    try {
        const res = await fetch(`${API}/merchant/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ merchant_phone: phone, password })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('merchantToken', data.token);
            localStorage.setItem('merchantId', data.merchant_id);
            localStorage.setItem('merchantName', data.merchant_name);
            window.location.href = 'merchant-dashboard.html';
        } else {
            alert(data.message || '登录失败');
        }
    } catch (e) {
        alert('网络错误，请稍后重试');
    }
}

// 切换到重置密码
function showResetSection() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('reset-section').style.display = 'block';
}

// 切换回登录
function showLoginSection() {
    document.getElementById('reset-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('reset-code-area').innerHTML = '';
    document.getElementById('reset-password-area').style.display = 'none';
    document.getElementById('reset-submit-section').style.display = 'none';
}

// 发送验证码
function sendResetCode() {
    const phone = document.getElementById('reset-phone').value.trim();
    if (!/^\d{11}$/.test(phone)) { alert('请输入正确的11位手机号'); return; }
    const btn = document.getElementById('get-reset-code-btn');
    if (btn.disabled) return;
    const code = codeManager.generateCode();
    codeManager.startCountdown('get-reset-code-btn');
    const input = codeManager.createCodeInput('reset-code-area', code);
    codeManager.handleCodeInput(input, code, () => {
        document.getElementById('reset-password-area').style.display = 'block';
        document.getElementById('reset-submit-section').style.display = 'flex';
    });
}

// 提交重置密码
async function handleResetPassword() {
    const phone = document.getElementById('reset-phone').value.trim();
    const newPassword = document.getElementById('reset-new-password').value;
    if (!newPassword) { alert('请输入新密码'); return; }
    try {
        const res = await fetch(`${API}/merchantResetPassword`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ merchant_phone: phone, new_password: newPassword })
        });
        const data = await res.json();
        if (data.success) {
            alert('密码重置成功，请重新登录');
            showLoginSection();
        } else {
            alert(data.message || '重置失败');
        }
    } catch (e) {
        alert('网络错误，请稍后重试');
    }
}