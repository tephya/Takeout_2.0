document.addEventListener('DOMContentLoaded', async function () {
    try {
        const res = await fetch('./components/login-modal.html');
        const html = await res.text();
        document.body.insertAdjacentHTML('beforeend', html);

        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = './js/login-popup.js';
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    } catch (e) {
        console.error('登录弹框加载失败:', e);
    }
});