function initPage() {
    const phone = localStorage.getItem('customer_phone');
    if (phone) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userPhone', phone);
    }
    if (typeof UIStateManager !== 'undefined') {
        UIStateManager.updateLoginUI();
    }
}

function customLogout() {
    if (typeof UIStateManager !== 'undefined') {
        UIStateManager.logout();
        localStorage.clear();
    } else {
        localStorage.clear();
        location.reload();
    }
}

document.addEventListener('DOMContentLoaded', function () {
    setTimeout(initPage, 100);
});

window.logout = customLogout;
window.loadUserAvatar = loadUserAvatar;

async function loadUserAvatar() {
    const phone = localStorage.getItem('customer_phone');
    if (!phone) return;
    try {
        const res = await fetch(`http://localhost:3000/api/getAvatar?customer_phone=${phone}`);
        const data = await res.json();
        const avatarImg = document.getElementById('is-login');
        if (avatarImg) {
            avatarImg.src = data.success && data.avatarUrl
                ? `http://localhost:3000${data.avatarUrl}`
                : './images/icons/user-avator.webp';
            avatarImg.style.visibility = 'visible';
        }
    } catch (e) {
        console.error('加载头像失败:', e);
    }
}