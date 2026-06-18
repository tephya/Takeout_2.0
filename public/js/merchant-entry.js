// 入口页不需要逻辑，导航由 HTML 的 onclick 处理
// 如果已登录，直接跳转到 dashboard
document.addEventListener('DOMContentLoaded', () => {
    const merchantId = localStorage.getItem('merchantId');
    if (merchantId) {
        window.location.href = 'merchant-dashboard.html';
    }
});