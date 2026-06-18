const API = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('merchant-registration-form');
    form.addEventListener('submit', handleFormSubmit);

    document.getElementById('start-time').addEventListener('change', validateBusinessHours);
    document.getElementById('end-time').addEventListener('change', validateBusinessHours);
    document.getElementById('contact-phone').addEventListener('input', validatePhoneNumber);
});

document.getElementById('is-24h').addEventListener('change', function () {
    const disabled = this.checked;
    document.getElementById('start-time').disabled = disabled;
    document.getElementById('end-time').disabled = disabled;
});

async function handleFormSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    const submitBtn = document.getElementById('submit-registration');
    submitBtn.textContent = '提交中…';
    submitBtn.disabled = true;

    const formData = {
        merchant_name: document.getElementById('merchant-name').value.trim(),
        merchant_phone: document.getElementById('contact-phone').value.trim(),
        merchant_address: document.getElementById('business-address').value.trim(),
        opening_time: document.getElementById('is-24h').checked ? '00:00' : document.getElementById('start-time').value,
        closing_time: document.getElementById('is-24h').checked ? '23:59' : document.getElementById('end-time').value,
        is_24h: document.getElementById('is-24h').checked ? 1 : 0,
        cuisine_type: document.getElementById('cuisine-type').value,
        password: document.getElementById('merchant-password').value
    };

    try {
        const res = await fetch(`${API}/insertMerchantInfo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.success) {
            // 显示审核提示，不跳转登录
            showSuccessBanner();
        } else {
            throw new Error(data.message);
        }
    } catch (e) {
        alert('提交失败：' + e.message);
    } finally {
        submitBtn.textContent = '提交申请';
        submitBtn.disabled = false;
    }
}

function showSuccessBanner() {
    const formContainer = document.querySelector('.form-container');
    formContainer.innerHTML = `
        <div style="text-align:center; padding: 60px 20px;">
            <div style="font-size:48px; margin-bottom:16px;">✅</div>
            <h2 style="margin-bottom:12px;">申请已提交</h2>
            <p style="color:#666; margin-bottom:8px;">我们将在 1-3 个工作日内完成审核。</p>
            <p style="color:#666; margin-bottom:32px;">审核结果将通过您登录时的提示通知。</p>
            <button onclick="window.location.href='merchant-entry.html'"
                style="padding:10px 28px; background:#e74c3c; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:15px;">
                返回首页
            </button>
        </div>
    `;
}

function validateForm() {
    let valid = true;

    const requiredFields = ['merchant-name', 'contact-phone', 'business-address', 'cuisine-type'];
    requiredFields.forEach(id => {
        const field = document.getElementById(id);
        if (!field.value.trim()) { showFieldError(field, '此字段为必填项'); valid = false; }
        else clearFieldError(field);
    });

    if (!document.getElementById('is-24h').checked) {
        const startField = document.getElementById('start-time');
        const endField = document.getElementById('end-time');
        if (!startField.value) { showFieldError(startField, '请选择开始时间'); valid = false; }
        if (!endField.value) { showFieldError(endField, '请选择结束时间'); valid = false; }
        if (!validateBusinessHours()) valid = false;
    }

    if (!document.getElementById('agree-terms').checked) {
        alert('请阅读并同意服务条款');
        valid = false;
    }
    if (!validatePhoneNumber()) valid = false;
    return valid;
}

function validateBusinessHours() {
    const start = document.getElementById('start-time').value;
    const end = document.getElementById('end-time').value;
    if (start && end && start >= end) {
        showFieldError(document.getElementById('end-time'), '结束时间必须晚于开始时间');
        return false;
    }
    clearFieldError(document.getElementById('end-time'));
    return true;
}

function validatePhoneNumber() {
    const field = document.getElementById('contact-phone');
    if (field.value && !/^[0-9]{8,15}$/.test(field.value.trim())) {
        showFieldError(field, '请输入有效的电话号码（8-15位数字）');
        return false;
    }
    clearFieldError(field);
    return true;
}

function showFieldError(field, message) {
    clearFieldError(field);
    field.style.borderColor = '#dc3545';
    const div = document.createElement('div');
    div.className = 'field-error';
    div.style.cssText = 'color:#dc3545;font-size:0.9rem;margin-top:0.25rem;';
    div.textContent = message;
    field.parentNode.appendChild(div);
}

function clearFieldError(field) {
    field.style.borderColor = '#e9ecef';
    const err = field.parentNode.querySelector('.field-error');
    if (err) err.remove();
}