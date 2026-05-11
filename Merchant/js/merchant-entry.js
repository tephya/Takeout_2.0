// 商家入驻页面交互功能

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    generateMerchantId();
});

// 页面初始化
async function initializePage() {
    // 检查用户登录状态（本地 isLoggedIn + customerId）
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const customerId = localStorage.getItem('customer_id');
    if (!isLoggedIn || !customerId) {
        alert('请先登录后再进行商家入驻');
        window.location.href = '../../homepage/html/index.html';
        return;
    }
    // 检查商家入驻状态
    await checkMerchantStatus(customerId);

    bindFormEvents();
}

// 检查商家入驻状态
async function checkMerchantStatus() {
    const customerId = localStorage.getItem('customer_id');
    const res = await fetch(`http://localhost:3000/api/checkMerchantStatus?customer_id=${encodeURIComponent(customerId)}`);
    const data = await res.json();
    // 若登录的账号已经入驻了，则显示可登录原有账号入口
    if(data.success){
        const merchantId=data.merchant_id;
        const merchantName=data.merchant_name;
        // 将商家id，名称传到localStorage
        localStorage.setItem('merchantId', data.merchant_id);
        localStorage.setItem('merchantName', data.merchant_name);
        showRegisteredStatus(merchantId,merchantName);
    }
    else {
        // 如果该账号未入驻，隐藏登录旧账号的入口，因为该用户没有入驻过
        hideMerchantLoginForm();
        document.getElementById('login-btn').style.display = 'none';
        showNotRegisteredStatus();
    }
}

// 显示未入驻状态
function showNotRegisteredStatus() {
    document.getElementById('not-registered').style.display = 'block';
    document.getElementById('already-registered').style.display = 'none';
    document.getElementById('registration-form-section').style.display = 'none';
    document.getElementById('success-section').style.display = 'none';
}

// 显示已入驻状态
function showRegisteredStatus(merchantId, merchantName) {
    document.getElementById('not-registered').style.display = 'none';
    document.getElementById('already-registered').style.display = 'block';
    document.getElementById('registration-form-section').style.display = 'none';
    document.getElementById('success-section').style.display = 'none';
    document.getElementById('login-btn').style.display = 'none'; // 隐藏
    // 填充商家信息
    document.getElementById('merchant-id-display').textContent = merchantId;
    document.getElementById('merchant-name-display').textContent = merchantName;

    // 获取营业时间并判断当前是否营业
    fetch(`http://localhost:3000/api/getMerchantBusinessHours?merchant_id=${merchantId}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const opening = data.data.opening_time;
                const closing = data.data.closing_time;
                const now = new Date();
                const nowStr = now.toTimeString().slice(0,5); // "HH:MM"
                // 判断当前时间是否在营业时间段内
                let isOpen = false;
                if (opening < closing) {
                    // 正常营业时间（如09:00-22:00）
                    isOpen = (nowStr >= opening && nowStr < closing);
                } else {
                    // 跨天营业（如20:00-06:00）
                    isOpen = (nowStr >= opening || nowStr < closing);
                }
                const statusBadge = document.querySelector('.status-badge');
                if (statusBadge) {
                    if (isOpen) {
                        statusBadge.textContent = '营业中';
                        statusBadge.classList.remove('closed');
                        statusBadge.classList.add('active');
                    } else {
                        statusBadge.textContent = '打烊了';
                        statusBadge.classList.remove('active');
                        statusBadge.classList.add('closed');
                    }
                }
            }
        });
}

// 显示注册表单
function showRegistrationForm() {
    document.getElementById('not-registered').style.display = 'none';
    document.getElementById('already-registered').style.display = 'none';
    document.getElementById('registration-form-section').style.display = 'block';
    document.getElementById('success-section').style.display = 'none';
    document.getElementById('login-btn').style.display = 'none'; // 隐藏
    // 生成新的商家ID
    generateMerchantId();
}

// 隐藏注册表单
function hideRegistrationForm() {
    document.getElementById('not-registered').style.display = 'block';
    document.getElementById('already-registered').style.display = 'none';
    document.getElementById('registration-form-section').style.display = 'none';
    document.getElementById('success-section').style.display = 'none';
    document.getElementById('login-btn').style.display = 'block';
}

// 显示成功页面
function showSuccessPage(merchantId) {
    document.getElementById('not-registered').style.display = 'none';
    document.getElementById('already-registered').style.display = 'none';
    document.getElementById('registration-form-section').style.display = 'none';
    document.getElementById('success-section').style.display = 'block';
    
    // 显示生成的商家ID
    document.getElementById('success-merchant-id').textContent = merchantId;
}

// 生成商家ID（直接调用后端获取下一个ID）
async function generateMerchantId() {
    try {
        const response = await fetch('http://localhost:3000/api/getNextMerchantId');
        if (!response.ok) {
            throw new Error('网络错误');
        }
        const data = await response.json();
        if (data.success) {
            document.getElementById('merchant-id').value = data.nextId;
            return data.nextId;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('获取商家ID失败：', error);
        alert('获取商家ID失败，请稍后重试');
        return '';
    }
}

// 绑定表单事件
function bindFormEvents() {
    const form = document.getElementById('merchant-registration-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // 绑定营业时间验证
    const startTime = document.getElementById('start-time');
    const endTime = document.getElementById('end-time');
    
    if (startTime && endTime) {
        startTime.addEventListener('change', validateBusinessHours);
        endTime.addEventListener('change', validateBusinessHours);
    }
    
    // 绑定电话号码验证
    const contactPhone = document.getElementById('contact-phone');
    if (contactPhone) {
        contactPhone.addEventListener('input', validatePhoneNumber);
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();

    if (!validateForm()) {
        return;
    }

    showLoadingState();
    const formData = collectFormData();
    const success = await insertMerchantDataToDatabase(formData);
    hideLoadingState();

    if (success) {
        showSuccessPage(formData.merchant_id);
        console.log('商家入驻成功！', formData);
    } else {
        alert('商家入驻失败！请检查网络连接或稍后重试。');
    }
}

// 验证表单
function validateForm() {
    const requiredFields =[
        'merchant-name',
        'contact-phone', 
        'business-address',
        'start-time',
        'end-time'
    ];
    
    let isValid = true;
    
    // 检查必填字段
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            showFieldError(field, '此字段为必填项');
            isValid = false;
        } else {
            clearFieldError(field);
        }
    });
    
    // 检查服务条款同意
    const agreeTerms = document.getElementById('agree-terms');
    if (!agreeTerms.checked) {
        alert('请阅读并同意服务条款');
        isValid = false;
    }
    
    // 验证营业时间
    if (!validateBusinessHours()) {
        isValid = false;
    }
    
    // 验证电话号码
    if (!validatePhoneNumber()) {
        isValid = false;
    }
    
    return isValid;
}

// 验证营业时间
function validateBusinessHours() {
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    
    if (startTime && endTime) {
        if (startTime >= endTime) {
            showFieldError(document.getElementById('end-time'), '结束时间必须晚于开始时间');
            return false;
        } else {
            clearFieldError(document.getElementById('start-time'));
            clearFieldError(document.getElementById('end-time'));
        }
    }
    
    return true;
}

// 验证电话号码
function validatePhoneNumber() {
    const phoneField = document.getElementById('contact-phone');
    const phoneValue = phoneField.value.trim();
    
    if (phoneValue) {
        const phoneRegex = /^[0-9]{8,15}$/;
        if (!phoneRegex.test(phoneValue)) {
            showFieldError(phoneField, '请输入有效的电话号码（8-15位数字）');
            return false;
        } else {
            clearFieldError(phoneField);
        }
    }
    
    return true;
}

// 显示字段错误
function showFieldError(field, message) {
    // 移除现有的错误提示
    clearFieldError(field);
    
    // 添加错误样式
    field.style.borderColor = '#dc3545';
    
    // 创建错误提示元素
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.color = '#dc3545';
    errorDiv.style.fontSize = '0.9rem';
    errorDiv.style.marginTop = '0.25rem';
    errorDiv.textContent = message;
    
    // 插入错误提示
    field.parentNode.appendChild(errorDiv);
}

// 清除字段错误
function clearFieldError(field) {
    field.style.borderColor = '#e9ecef';
    
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

// 收集表单数据
function collectFormData() {
    return {
        merchant_id: document.getElementById('merchant-id').value,
        merchant_name: document.getElementById('merchant-name').value.trim(),
        merchant_phone: document.getElementById('contact-phone').value.trim(),
        merchant_address: document.getElementById('business-address').value.trim(),
        opening_time: document.getElementById('start-time').value,
        closing_time: document.getElementById('end-time').value,
        password: document.getElementById('merchant-password').value,
        countryCode: document.querySelector('.country-code').value,
        customer_id: localStorage.getItem('customer_id')
    };
}

// 显示加载状态
function showLoadingState() {
    const formContainer = document.querySelector('.form-container');
    formContainer.classList.add('loading');
    
    const submitBtn = document.getElementById('submit-registration');
    submitBtn.textContent = '提交中';
    submitBtn.disabled = true;
}

// 隐藏加载状态
function hideLoadingState() {
    const formContainer = document.querySelector('.form-container');
    formContainer.classList.remove('loading');
    
    const submitBtn = document.getElementById('submit-registration');
    submitBtn.textContent = '提交申请';
    submitBtn.disabled = false;
}

// 重置表单
function resetForm() {
    const form = document.getElementById('merchant-registration-form');
    if (form) {
        form.reset();
        
        // 清除所有错误提示
        const errorElements = form.querySelectorAll('.field-error');
        errorElements.forEach(error => error.remove());
        
        // 重置字段样式
        const inputFields = form.querySelectorAll('input, textarea, select');
        inputFields.forEach(field => {
            field.style.borderColor = '#e9ecef';
        });
        
        // 重新生成商家ID
        generateMerchantId();
    }
}

// 提交商家数据到数据库
async function insertMerchantDataToDatabase(formData) {
    try {
        const response = await fetch('http://localhost:3000/api/insertMerchantInfo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error('网络错误');
        }
        
        const data = await response.json();
        if (data.success) {
            console.log('商家数据插入成功');
            document.getElementById('success-merchant-id').textContent = formData.merchant_id;
            return true;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('插入商家数据失败：', error);
        alert('注册失败，请稍后重试：' + error.message);
        return false;
    }
}

// 导出函数供HTML调用
window.showRegistrationForm = showRegistrationForm;
window.hideRegistrationForm = hideRegistrationForm;
window.resetForm = resetForm;

// 显示登录表单
function showMerchantLoginForm() {
    document.getElementById('merchant-login-section').style.display = 'block';
    document.getElementById('login-btn').style.display = 'none'; 
    document.getElementById('not-registered').style.display='none';
}

// 隐藏登录表单
function hideMerchantLoginForm() {
    document.getElementById('merchant-login-section').style.display = 'none';
    document.getElementById('not-registered').style.display = 'block';
    document.getElementById('login-btn').style.display = 'block'; // 恢复显示
}

// 绑定登录表单事件
document.getElementById('merchant-login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const phone = document.getElementById('login-phone').value.trim();
    const password = document.getElementById('login-password').value;
    const res = await fetch('http://localhost:3000/api/merchant/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_phone: phone, password })
    });
    const data = await res.json();
    if (data.success) {
        // 登录成功，保存信息并显示已入驻状态
        localStorage.setItem('merchantId', data.merchant_id);
        localStorage.setItem('merchantName', data.merchant_name);
        showRegisteredStatus(data.merchant_id, data.merchant_name);
        hideMerchantLoginForm();
    } else {
        alert(data.message || '登录失败');
    }
});