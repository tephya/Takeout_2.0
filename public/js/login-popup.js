// 登录弹窗重构版本 - 使用通用工具库

// DOM元素引用
const loginElements = {
    overlay: document.getElementById('login-overlay'),
    loginPopup: document.getElementById('login-popup'),
    registerPopup: document.getElementById('register-popup'),
    passwordModeBtn: document.getElementById('password-mode-btn'),
    captchaModeBtn: document.getElementById('captcha-mode-btn'),
    passwordLoginArea: document.getElementById('password-login-area'),
    captchaLoginArea: document.getElementById('captcha-login-area'),
    accountInput: document.getElementById('account-input'),
    passwordInput: document.getElementById('password-input'),
    passwordLoginBtn: document.getElementById('password-login-btn'),
    passwordError: document.getElementById('password-error'),
    phoneInput: document.getElementById('phone-input'),
    getCodeBtn: document.getElementById('get-code-btn'),
    verificationCodeArea: document.getElementById('verification-code-area'),
    registerForm: document.getElementById('register-form'),
    userIdInput: document.getElementById('user-id'),
    usernameInput: document.getElementById('username')
};

// 登录模式管理
class LoginModeManager {
    static switchToPasswordMode() {
        if (!loginElements.passwordModeBtn.classList.contains('active')) {
            loginElements.passwordModeBtn.classList.add('active');
            loginElements.captchaModeBtn.classList.remove('active');
            loginElements.passwordLoginArea.style.display = 'block';
            loginElements.captchaLoginArea.style.display = 'none';
            LoginModeManager.clearLoginForm();
        }
    }

    static switchToCaptchaMode() {
        if (!loginElements.captchaModeBtn.classList.contains('active')) {
            loginElements.captchaModeBtn.classList.add('active');
            loginElements.passwordModeBtn.classList.remove('active');
            loginElements.captchaLoginArea.style.display = 'block';
            loginElements.passwordLoginArea.style.display = 'none';
            LoginModeManager.clearLoginForm();
        }
    }

    static clearLoginForm() {
        FormValidator.clearFields([
            'account-input', 
            'password-input', 
            'phone-input', 
            'password-error', 
            'verification-code-area'
        ]);
        
        // 重置验证码按钮
        if (codeManager) {
            codeManager.resetButton('get-code-btn');
        }
    }
}

// 弹窗操作
function showLoginPopup() {
    PopupManager.show('login-popup');
}

function closeLoginPopup() {
    PopupManager.close('login-popup', () => LoginModeManager.clearLoginForm());
}

function showRegisterPopup() {
    closeLoginPopup();
    PopupManager.show('register-popup', () => generateUserInfo());
}

function closeRegisterPopup() {
    PopupManager.close('register-popup', () => clearRegisterForm());
}

// 生成用户信息（注册用）
function generateUserInfo() {
    if (loginElements.userIdInput) {
        loginElements.userIdInput.value = UserManager.generateUserId();
    }
}

// 清空注册表单
function clearRegisterForm() {
    if (loginElements.registerForm) {
        loginElements.registerForm.reset();
        FormValidator.clearFields(['user-id', 'username', 'real-name']);
    }
}

// 密码登录处理
async function handlePasswordLogin() {
    const account = loginElements.accountInput.value.trim();
    const password = loginElements.passwordInput.value.trim();
    
    if (!account || !password) {
        loginElements.passwordError.textContent = '请输入账户和密码';
        return;
    }
    
    try {
        // 直接验证登录
        const loginResult = await APIManager.validatePassword(account, password);
        
        if (loginResult.success) {
            loginElements.passwordError.textContent = '';
            alert('登录成功！');
            
            // 设置登录状态
            UserManager.setLoginStatus(loginResult.phone || account);
            
            // 保存额外的用户信息
            if (loginResult.userId) {
                localStorage.setItem('customer_id', loginResult.userId);
            }
            if (loginResult.userName) {
                localStorage.setItem('customer_username', loginResult.userName);
            }
            if (loginResult.phone) {
                localStorage.setItem('customer_phone', loginResult.phone);
            }
            
            closeLoginPopup();
            
            // 更新UI状态
            if (typeof UIStateManager !== 'undefined') {
                UIStateManager.updateLoginUI();
            }
            if (typeof window.loadUserAvatar === 'function') {
                window.loadUserAvatar();
            }
        } else {
            // 显示具体错误信息
            const errorMessage = loginResult.message || '登录失败';
            if (errorMessage.includes('密码错误')) {
                loginElements.passwordError.textContent = '密码错误，请重新输入';
            } else {
                loginElements.passwordError.textContent = '账户不存在或密码错误';
            }
        }
    } catch (error) {
        console.error('登录错误:', error);
        loginElements.passwordError.textContent = '登录失败，请检查网络连接';
    }
}

// 验证码登录处理
function handleCaptchaLogin() {
    const phone = loginElements.phoneInput.value.replace(/\s/g, '');
    
    if (!FormValidator.validatePhone(phone)) {
        return;
    }
    
    const verificationCode = codeManager.generateCode();
    codeManager.startCountdown('get-code-btn');
    
    // 创建验证码输入区域
    const codeInput = codeManager.createCodeInput('verification-code-area', verificationCode);
    
    // 处理验证码验证
    codeManager.handleCodeInput(codeInput, verificationCode, async () => {
        const user_exists = await APIManager.checkPhoneExists(phone);
        
        if (user_exists) {
            alert('登录成功！');
            UserManager.setLoginStatus(phone);
            
            // 获取并保存用户信息
            APIManager.getUserInfo(phone).then(result => {
                if (result.success && result.data) {
                    localStorage.setItem('customer_id', result.data.customer_id);
                    localStorage.setItem('customer_name', result.data.customer_name);
                    localStorage.setItem('customer_username', result.data.customer_username);
                    localStorage.setItem('customer_phone', result.data.customer_phone);
                }
            });
            
            closeLoginPopup();
            if (typeof UIStateManager !== 'undefined') {
                UIStateManager.updateLoginUI();
            }
            if (typeof window.loadUserAvatar === 'function') {
                window.loadUserAvatar();
            }
        } else {
            // 保存手机号并显示注册弹窗
            localStorage.setItem('tempPhone', phone);
            showRegisterPopup();
            // 在注册表单中设置手机号
            const registerPhoneInput = document.getElementById('register-phone');
            if (registerPhoneInput) {
                registerPhoneInput.value = phone;
            }
        }
    });
}

// 事件监听器初始化
function initEventListeners() {
    // 初始化遮罩层点击关闭 - 包含所有弹窗
    PopupManager.initOverlayClose('login-overlay', [
        'login-popup', 
        'register-popup',
        'change-password-popup',
        'change-username-popup', 
        'change-phone-popup'
    ]);
    
    // 登录模式切换 - 使用箭头函数保持this绑定
    if (loginElements.passwordModeBtn) {
        loginElements.passwordModeBtn.addEventListener('click', () => LoginModeManager.switchToPasswordMode());
    }
    if (loginElements.captchaModeBtn) {
        loginElements.captchaModeBtn.addEventListener('click', () => LoginModeManager.switchToCaptchaMode());
    }
    
    // 密码登录
    if (loginElements.passwordLoginBtn) {
        loginElements.passwordLoginBtn.addEventListener('click', handlePasswordLogin);
    }
    
    // 手机号输入格式化和验证码按钮状态
    if (loginElements.phoneInput) {
        FormValidator.formatPhoneInput(loginElements.phoneInput);
        loginElements.phoneInput.addEventListener('input', function() {
            const phone = this.value.replace(/\s/g, '');
            const isValid = FormValidator.validatePhone(phone);
            loginElements.getCodeBtn.disabled = !isValid;
            
            if (isValid) {
                loginElements.getCodeBtn.classList.add('enabled');
            } else {
                loginElements.getCodeBtn.classList.remove('enabled');
            }
        });
    }
    
    // 获取验证码
    if (loginElements.getCodeBtn) {
        loginElements.getCodeBtn.addEventListener('click', function() {
            if (!this.disabled) {
                handleCaptchaLogin();
            }
        });
    }
    
    // 注册表单提交处理
    if (loginElements.registerForm) {
        loginElements.registerForm.addEventListener('submit', handleRegisterSubmit);
    }
}

// 注册表单提交处理
async function handleRegisterSubmit(e) {
    e.preventDefault();
    
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // 验证密码
    if (password !== confirmPassword) {
        alert('两次输入的密码不一致！');
        return;
    }
    
    // 验证密码格式
    if (!FormValidator.validatePassword(password)) {
        alert('密码必须是6-16位，包含字母和数字');
        return;
    }
    
    const userData = {
        customer_id: document.getElementById('user-id').value,
        customer_username: document.getElementById('username').value,
        password: password,
        verification_code: document.getElementById('register-verification-code').value.trim(),
        customer_phone: document.getElementById('register-phone').value
    };
    
    
    try {
        const res = await fetch('http://localhost:3000/api/insert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        const result = await res.json();

        if (result.success) {
            alert('注册成功！');
            localStorage.setItem('customer_id', userData.customer_id);
            localStorage.setItem('customer_username', userData.customer_username);
            localStorage.setItem('customer_phone', userData.customer_phone);
            localStorage.removeItem('tempPhone');
            closeRegisterPopup();
            if (typeof UIStateManager !== 'undefined') {
                UIStateManager.updateLoginUI();
            }
        } else {
            if (!result.success) {
                if (result.message.includes('用户名已存在')) {
                    generateUserInfo(); // 重新生成用户名
                }
                alert(result.message || '注册失败');
                return;
            }
            alert(result.message || '注册失败，请检查注册信息');
        }
    } catch (error) {
        console.error('注册错误:', error);
        alert('注册失败，请稍后重试');
    }
}


async function sendRegisterCode() {
    const phone = document.getElementById('register-phone').value.trim();
    if (!phone || phone.length < 11) { alert('请输入正确的手机号'); return; }

    const btn = document.getElementById('register-get-code-btn');
    btn.disabled = true;

    try {
        const res = await fetch('http://localhost:3000/api/sendVerificationCode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });
        const data = await res.json();
        if (!data.success) { alert(data.message || '发送失败'); btn.disabled = false; return; }

        setTimeout(() => {
            alert(`您的验证码：${data.code}（5分钟内有效）`);
        }, 800);

        // 60 秒倒计时
        let count = 60;
        btn.textContent = `${count}s`;
        const timer = setInterval(() => {
            count--;
            btn.textContent = `${count}s`;
            if (count <= 0) { clearInterval(timer); btn.disabled = false; btn.textContent = '获取验证码'; }
        }, 1000);
    } catch {
        alert('网络错误'); btn.disabled = false;
    }
}

// 页面加载完成后初始化
function _loginPopupInit() {
    initEventListeners();
    if (typeof UIStateManager !== 'undefined') {
        UIStateManager.updateLoginUI();
    }
    initForgotPassword();
}

function initForgotPassword() {
    const link = document.getElementById('forgot-password-link');
    const modal = document.getElementById('forgot-password-modal');
    if (!link || !modal) return;

    link.addEventListener('click', () => {
        document.getElementById('forgot-phone').value = '';
        document.getElementById('forgot-code').value = '';
        document.getElementById('forgot-new-password').value = '';
        document.getElementById('forgot-error').style.display = 'none';
        modal.style.display = 'block';
    });

    document.getElementById('forgot-mask').addEventListener('click', () => modal.style.display = 'none');
    document.getElementById('forgot-cancel-btn').addEventListener('click', () => modal.style.display = 'none');

    document.getElementById('forgot-get-code-btn').addEventListener('click', async function () {
        const phone = document.getElementById('forgot-phone').value.trim();
        if (!phone || phone.length < 11) { alert('请输入正确的手机号'); return; }
        this.disabled = true;
        try {
            const res = await fetch('http://localhost:3000/api/sendVerificationCode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, type: 'reset' })
            });
            const data = await res.json();
            if (!data.success) { alert(data.message || '发送失败'); this.disabled = false; return; }
            setTimeout(() => alert(`您的验证码：${data.code}（5分钟内有效）`), 800);
            let count = 60;
            const btn = this;
            btn.textContent = `${count}s`;
            const timer = setInterval(() => {
                count--;
                btn.textContent = `${count}s`;
                if (count <= 0) { clearInterval(timer); btn.disabled = false; btn.textContent = '获取验证码'; }
            }, 1000);
        } catch { alert('网络错误'); this.disabled = false; }
    });

    document.getElementById('forgot-submit-btn').addEventListener('click', async function () {
        const phone = document.getElementById('forgot-phone').value.trim();
        const code = document.getElementById('forgot-code').value.trim();
        const newPwd = document.getElementById('forgot-new-password').value;
        const errorEl = document.getElementById('forgot-error');

        if (!phone || !code || !newPwd) { errorEl.textContent = '请填写所有字段'; errorEl.style.display = 'block'; return; }
        if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,16}$/.test(newPwd)) {
            errorEl.textContent = '密码须6-16位，包含字母和数字'; errorEl.style.display = 'block'; return;
        }

        this.disabled = true;
        try {
            const res = await fetch('http://localhost:3000/api/resetPasswordWithCode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer_phone: phone, verification_code: code, new_password: newPwd })
            });
            const data = await res.json();
            if (data.success) {
                modal.style.display = 'none';
                alert('密码重置成功，请重新登录');
            } else {
                errorEl.textContent = data.message || '重置失败';
                errorEl.style.display = 'block';
            }
        } catch { errorEl.textContent = '网络错误'; errorEl.style.display = 'block'; }
        finally { this.disabled = false; }
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _loginPopupInit);
} else {
    _loginPopupInit();
}

// 导出主要函数供外部调用
window.showLoginPopup = showLoginPopup;
window.closeLoginPopup = closeLoginPopup;
window.showRegisterPopup = showRegisterPopup;
window.closeRegisterPopup = closeRegisterPopup;

// 导出登录模式切换函数供HTML调用
window.switchToPasswordMode = () => LoginModeManager.switchToPasswordMode();
window.switchToCaptchaMode = () => LoginModeManager.switchToCaptchaMode(); 