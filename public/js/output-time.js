function outputtime() {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);       // 默认30分钟后送达
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    
    const timeElement = document.getElementById('output-time');
    if (timeElement) {
        timeElement.textContent = `${hour}:${minute}`;
    }
}

// 当点击下单按钮时调用
document.addEventListener('DOMContentLoaded', function() {
    // 初始化时间显示
    outputtime();
});