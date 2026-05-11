// ===============================
// 通用工具库 - 合并重复的业务逻辑
// ===============================

/**
 * 弹窗管理器
 */
class PopupManager {
    /**
     * 显示弹窗
     * @param {string} popupId - 弹窗ID
     * @param {Function} resetCallback - 重置弹窗的回调函数
     */
    static show(popupId, resetCallback = null) {
        const popup = document.getElementById(popupId);
        const overlay = document.getElementById('login-overlay');
        
        if (popup) {
            popup.style.display = 'block';
            if (overlay) overlay.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            if (resetCallback) resetCallback();
        }
    }

    /**
     * 关闭弹窗
     * @param {string} popupId - 弹窗ID
     * @param {Function} resetCallback - 重置弹窗的回调函数
     */
    static close(popupId, resetCallback = null) {
        const popup = document.getElementById(popupId);
        const overlay = document.getElementById('login-overlay');
        
        if (popup) {
            popup.style.display = 'none';
            if (overlay) overlay.style.display = 'none';
            document.body.style.overflow = 'auto';
            
            if (resetCallback) resetCallback();
        }
    }

    /**
     * 初始化遮罩层点击关闭功能
     * @param {string} overlayId - 遮罩层ID
     * @param {Array} popupIds - 需要关闭的弹窗ID数组
     */
    static initOverlayClose(overlayId, popupIds) {
        const overlay = document.getElementById(overlayId);
        if (overlay) {
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) {
                    popupIds.forEach(popupId => {
                        PopupManager.close(popupId);
                    });
                }
            });
        }
    }
}

/**
 * 验证码管理器
 */
class VerificationCodeManager {
    constructor() {
        this.timers = {};
        this.codes = {};
    }

    /**
     * 生成6位验证码
     */
    generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * 启动倒计时
     * @param {string} buttonId - 按钮ID
     * @param {number} seconds - 倒计时秒数
     */
    startCountdown(buttonId, seconds = 60) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        let clk = seconds;
        button.disabled = true;
        
        if (this.timers[buttonId]) {
            clearInterval(this.timers[buttonId]);
        }
        
        this.timers[buttonId] = setInterval(() => {
            clk--;
            if (clk > 0) {
                button.textContent = `${clk}秒后重试`;
            } else {
                clearInterval(this.timers[buttonId]);
                button.textContent = '获取验证码';
                button.disabled = false;
                delete this.timers[buttonId];
            }
        }, 1000);
    }

    /**
     * 重置验证码按钮
     * @param {string} buttonId - 按钮ID
     */
    resetButton(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.textContent = '获取验证码';
            button.disabled = false;
        }
        
        if (this.timers[buttonId]) {
            clearInterval(this.timers[buttonId]);
            delete this.timers[buttonId];
        }
        
        delete this.codes[buttonId];
    }

    /**
     * 创建验证码输入区域
     * @param {string} containerId - 容器ID
     * @param {string} code - 验证码
     * @param {string} inputClass - 输入框class
     * @param {string} displayClass - 显示区域class
     */
    createCodeInput(containerId, code, inputClass = 'verification-code-input', displayClass = 'verification-code-display') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <input type="text" class="${inputClass}" placeholder="请输入验证码" maxlength="6">
            <div class="${displayClass}">${code}</div>
        `;

        return container.querySelector(`.${inputClass}`);
    }

    /**
     * 验证码验证处理
     * @param {HTMLElement} input - 输入框元素
     * @param {string} correctCode - 正确的验证码
     * @param {Function} successCallback - 验证成功回调
     * @param {Function} errorCallback - 验证失败回调
     */
    handleCodeInput(input, correctCode, successCallback, errorCallback = null) {
        if (!input) return;

        input.addEventListener('input', function(e) {
            const inputCode = e.target.value.trim();
            
            if (inputCode === correctCode) {
                if (successCallback) successCallback();
            } else if (inputCode.length === 6) {
                if (errorCallback) {
                    errorCallback();
                } else {
                    alert('验证码错误');
                    e.target.value = '';
                }
            }
        });
    }

    /**
     * 清理所有定时器
     */
    cleanup() {
        Object.values(this.timers).forEach(timer => {
            if (timer) clearInterval(timer);
        });
        this.timers = {};
        this.codes = {};
    }
}

/**
 * 用户管理器
 */
class UserManager {
    /**
     * 检查登录状态
     */
    static checkLoginStatus() {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        return isLoggedIn === 'true';
    }

    /**
     * 获取当前用户手机号
     */
    static getCurrentUserPhone() {
        return localStorage.getItem('userPhone');
    }

    /**
     * 设置登录状态
     * @param {string} phone - 用户手机号
     */
    static setLoginStatus(phone) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userPhone', phone);
    }

    /**
     * 清除登录状态
     */
    static clearLoginStatus() {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userPhone');
    }

    /**
     * 生成随机用户ID
     */
    static generateUserId() {
        return 'U' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100).toString().padStart(3, '0');
    }

    /**
     * 生成随机用户名
     */
    static generateUsername() {
        const adjectives = ['Happy', 'Smart', 'Brave', 'Kind', 'Wise', 'Clever', 'Bright', 'Swift'];
        const nouns = ['Panda', 'Tiger', 'Eagle', 'Dolphin', 'Lion', 'Wolf', 'Fox', 'Bear'];
        const randomNum = Math.floor(Math.random() * 1000);
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        return `${adj}${noun}${randomNum}`;
    }
}

/**
 * 表单验证器
 */
class FormValidator {
    /**
     * 验证手机号格式
     * @param {string} phone - 手机号
     */
    static validatePhone(phone) {
        const cleanPhone = phone.replace(/\s/g, '');
        return /^\d{11}$/.test(cleanPhone);
    }

    /**
     * 验证密码格式
     * @param {string} password - 密码
     */
    static validatePassword(password) {
        const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,16}$/;
        return passwordPattern.test(password);
    }

    /**
     * 格式化手机号输入
     * @param {HTMLElement} input - 输入框元素
     */
    static formatPhoneInput(input) {
        if (!input) return;
        
        input.addEventListener('input', function(e) {
            let phone = e.target.value.replace(/\s/g, '').slice(0, 11);
            e.target.value = phone;
        });
    }

    /**
     * 清空表单字段
     * @param {Array} fields - 表单字段ID数组
     */
    static clearFields(fields) {
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                if (field.type === 'text' || field.type === 'password' || field.type === 'tel') {
                    field.value = '';
                } else if (field.tagName === 'DIV') {
                    field.innerHTML = '';
                    field.textContent = '';
                }
            }
        });
    }
}

/**
 * API调用管理器
 */
class APIManager {
    static baseURL = 'http://localhost:3000/api';

    /**
     * 检查手机号是否存在
     * @param {string} phone - 手机号
     */
    static async checkPhoneExists(phone) {
        try {
            const response = await fetch(`${this.baseURL}/select_phone?customer_phone=${phone}`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result.exists;
        } catch (error) {
            console.error('检查手机号错误:', error);
            return false;
        }
    }

    /**
     * 获取用户信息
     * @param {string} phone - 手机号
     */
    static async getUserInfo(phone) {
        try {
            const response = await fetch(`${this.baseURL}/get_user_info?customer_phone=${phone}`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('获取用户信息错误:', error);
            return { success: false };
        }
    }

    /**
     * 检查账户是否存在（修复版本）
     * @param {string} account - 账户（手机号或用户ID）
     */
    static async checkAccountExists(account) {
        try {
            let apiUrl;
            if (/^\d{11}$/.test(account)) {
                // 手机号
                apiUrl = `${this.baseURL}/select_phone?customer_phone=${account}`;
            } else {
                // 用户ID
                apiUrl = `${this.baseURL}/select_user_id?customer_id=${account}`;
            }
            
            const response = await fetch(apiUrl, {
                method: 'GET'
            });
            
            if (!response.ok) {
                console.warn(`API请求失败: ${response.status}`);
                return false;
            }
            
            const result = await response.json();
            return result.exists || false;
        } catch (error) {
            console.error('检查账户错误:', error);
            return false;
        }
    }

    /**
     * 验证密码（修复版本）
     * @param {string} account - 账户
     * @param {string} password - 密码
     */
    static async validatePassword(account, password) {
        try {
            const response = await fetch(`${this.baseURL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account, password })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('验证密码错误:', error);
            return { success: false, message: '网络错误，请稍后重试' };
        }
    }

    /**
     * 插入用户数据
     * @param {Object} userData - 用户数据
     */
    static async insertUserData(userData) {
        try {
            const response = await fetch(`${this.baseURL}/insert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('插入用户数据错误:', error);
            return false;
        }
    }

    /**
     * 更新用户密码
     * @param {string} phone - 手机号
     * @param {string} newPassword - 新密码
     */
    static async updateUserPassword(phone, newPassword) {
        try {
            const response = await fetch(`${this.baseURL}/update_password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    customer_phone: phone, 
                    new_password: newPassword 
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('更新密码错误:', error);
            return { success: false, message: '网络错误，请稍后重试' };
        }
    }

    /**
     * 更新用户名
     * @param {string} phone - 手机号
     * @param {string} newUsername - 新用户名
     */
    static async updateUsername(phone, newUsername) {
        try {
            const response = await fetch(`${this.baseURL}/update_username`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    customer_phone: phone, 
                    new_username: newUsername 
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('更新用户名错误:', error);
            return { success: false, message: '网络错误，请稍后重试' };
        }
    }

    /**
     * 更新手机号
     * @param {string} oldPhone - 旧手机号
     * @param {string} newPhone - 新手机号
     */
    static async updateUserPhone(oldPhone, newPhone) {
        try {
            const response = await fetch(`${this.baseURL}/update_phone`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    old_phone: oldPhone, 
                    new_phone: newPhone 
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('更新手机号错误:', error);
            return { success: false, message: '网络错误，请稍后重试' };
        }
    }
}

/**
 * UI状态管理器
 */
class UIStateManager {
    /**
     * 更新登录状态UI
     */
    static updateLoginUI() {
        const isLoggedIn = UserManager.checkLoginStatus();
        const unlogin = document.getElementById('unlogin');
        const userbrief = document.getElementById('is-login');
        
        console.log('更新登录状态UI:', isLoggedIn); // 添加调试信息
        
        if (isLoggedIn) {
            if (unlogin) unlogin.style.display = 'none';
            if (userbrief) userbrief.style.display = 'block';
            UIStateManager.loadUserInfo();
        } else {
            if (unlogin) unlogin.style.display = 'block';
            if (userbrief) userbrief.style.display = 'none';
        }
    }

    /**
     * 加载用户信息
     */
    static async loadUserInfo() {
        try {
            const userPhone = UserManager.getCurrentUserPhone();
            if (!userPhone) return;
            
            const userInfo = await APIManager.getUserInfo(userPhone);
            if (userInfo && userInfo.success) {
                const userBriefName = document.getElementById('user-brief-name');
                if (userBriefName) {
                    userBriefName.textContent = userInfo.data.customer_username || '用户';
                }
                console.log('用户信息加载成功:', userInfo.data);
            }
        } catch (error) {
            console.error('加载用户信息错误:', error);
        }
    }

    /**
     * 登出功能
     */
    static logout() {
        console.log('执行登出操作'); // 添加调试信息
        
        UserManager.clearLoginStatus();
        
        // 隐藏用户弹窗
        const userPopup = document.getElementById('user-login-popup');
        if (userPopup) userPopup.style.display = 'none';
        
        // 立即更新UI状态
        UIStateManager.updateLoginUI();
        
        console.log('登出操作完成'); // 添加调试信息
    }
}

// 创建全局实例
const codeManager = new VerificationCodeManager();

// 页面卸载时清理资源
window.addEventListener('beforeunload', function() {
    if (codeManager) {
        codeManager.cleanup();
    }
});

// 导出工具类供其他模块使用
window.PopupManager = PopupManager;
window.VerificationCodeManager = VerificationCodeManager;
window.UserManager = UserManager;
window.FormValidator = FormValidator;
window.APIManager = APIManager;
window.UIStateManager = UIStateManager;
window.codeManager = codeManager;
