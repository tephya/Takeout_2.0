const userElements = {
    unlogin: document.getElementById('unlogin'),
    userAvatar: document.getElementById('is-login'),
    userBriefName: document.getElementById('user-brief-name')
};

function initPage() {
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
    setTimeout(loadUserAvatar, 150);
});

window.logout = customLogout;

async function loadUserAvatar() {
    const phone = localStorage.getItem('customer_phone');
    if (!phone) return;
    try {
        const res = await fetch(`http://localhost:3000/api/getAvatar?customer_phone=${phone}`);
        const data = await res.json();
        if (data.success && data.avatarUrl) {
            const avatarImg = document.getElementById('is-login');
            if (avatarImg) avatarImg.src = `http://localhost:3000${data.avatarUrl}`;
        }
    } catch (e) {
        console.error('加载头像失败:', e);
    }
}