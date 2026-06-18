async function loadMerchants(category) {
    const url = category
        ? `http://localhost:3000/api/getPublicMerchants?category=${encodeURIComponent(category)}`
        : 'http://localhost:3000/api/getPublicMerchants';
    try {
        const res = await fetch(url);
        const result = await res.json();
        if (result.success) renderMerchantCards(result.data);
    } catch (e) {
        console.error('加载商家列表失败:', e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const defaultCategory = '粤式料理';
    // 高亮默认分类
    document.querySelectorAll('.home-sidebar .category-item').forEach(item => {
        if (item.textContent.trim() === defaultCategory) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    loadMerchants(defaultCategory);
    document.querySelectorAll('.home-sidebar .category-item').forEach(item => {
        item.addEventListener('click', function () {
            document.querySelectorAll('.home-sidebar .category-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            loadMerchants(this.textContent.trim());
        });
    });
});