const categoryData={
    '粤式料理':{
        folder:'百乐中心',
        images:[
            'P000100001.webp',
            'P000100002.webp',
            'P000100003.webp',
            'P000100004.webp',
            'P000100005.webp',
            'P000100006.webp',
            'P000100007.webp',
            'P000100008.webp',
            'P000100009.webp',
        ]
    },
    '日韩料理':{
        folder:'幸屋',
        images:[
            'P000200001.webp',
            'P000200002.webp',
            'P000200003.webp',
            'P000200004.webp',
            'P000200005.webp',
            'P000200006.webp',
            'P000200007.webp',
            'P000200008.webp',
        ]
    },
    '东南亚菜':{
        folder:'肯德基',
        images:[
            'P000300001.webp',
            'P000300002.webp',
            'P000300003.webp',
            'P000300004.webp',
            'P000300005.webp',
            'P000300006.webp',
            'P000300007.webp'
        ]
    },
    '西式简餐':{
        folder:'璃月食色',
        images:[
            'P000400001.webp',
            'P000400002.webp',
            'P000400003.webp',
            'P000400004.webp',
            'P000400005.webp',
            'P000400006.webp',
            'P000400007.webp'
        ]
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // 默认渲染第一个分类
    const firstCategory = Object.keys(categoryData)[3];
    const categoryInfo = categoryData[firstCategory];  // 这是一个包含 folder 和 images 的对象
    
    // 传入图片数组和文件夹名
    renderMerchantImages(categoryInfo.images, categoryInfo.folder);
    
    // 设置高亮
    document.querySelectorAll('.a3-category-bar .category-item').forEach(item => {
        if(item.textContent.trim() === firstCategory) {
            item.classList.add('active');
        }
    });
});

document.querySelectorAll('.a3-category-bar .category-item').forEach(item => {
    item.addEventListener('click', function() {
        const category = this.textContent.trim();
        const data = categoryData[category];
        if(data){
            renderMerchantImages(data.images,data.folder);
        }

        // 高亮
        document.querySelectorAll('.a3-category-bar .category-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
    });
});