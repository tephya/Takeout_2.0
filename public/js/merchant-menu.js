const API = 'http://localhost:3000/api';

let allProducts = [];
let allCategories = [];
let selectedCategory = '__all__';

function merchantAuthHeader() {
    return { 'Authorization': `Bearer ${localStorage.getItem('merchantToken')}` };
}

async function merchantFetch(url, options = {}) {
    const res = await fetch(url, {
        ...options,
        headers: { ...merchantAuthHeader(), ...(options.headers || {}) }
    });
    if (res.status === 401) {
        alert('登录已过期，请重新登录');
        merchantLogout();
        throw new Error('Unauthorized');
    }
    return res;
}

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('merchantToken');
    const name = localStorage.getItem('merchantName');
    if (!token || !name) { window.location.href = 'merchant-login.html'; return; }
    document.getElementById('merchant-name-title').textContent = name + ' · 菜单管理';
    loadAll();
});

async function loadAll() {
    try {
        const [catRes, prodRes] = await Promise.all([
            merchantFetch(`${API}/getMerchantCategories`).then(r => r.json()),
            merchantFetch(`${API}/getProductsByMerchant`).then(r => r.json())
        ]);
        allCategories = catRes.success ? catRes.data : [];
        allProducts = prodRes.success ? prodRes.data : [];
        renderSidebar();
        renderProducts();
    } catch (e) {
        if (e.message !== 'Unauthorized')
            document.getElementById('product-area-content').innerHTML =
                '<p class="product-empty-msg">加载失败，请刷新重试</p>';
    }
}

function renderSidebar() {
    const list = document.getElementById('menu-cat-list');
    list.innerHTML = '';

    const allItem = makeCatItem('全部', '__all__', null, null, allProducts.length);
    list.appendChild(allItem);

    allCategories.forEach(cat => {
        const count = allProducts.filter(p => p.category === cat.category_name).length;
        list.appendChild(makeCatItem(cat.category_name, cat.category_name, cat.category_id, cat.category_name, count));
    });

    const uncategorizedCount = allProducts.filter(p => !p.category).length;
    if (uncategorizedCount > 0) {
        list.appendChild(makeCatItem('未分类', '__uncategorized__', null, null, uncategorizedCount));
    }
}

function makeCatItem(label, value, categoryId, categoryName, count) {
    const item = document.createElement('div');
    item.className = 'menu-cat-item' + (selectedCategory === value ? ' active' : '');
    item.dataset.value = value;

    const nameLabel = document.createElement('span');
    nameLabel.className = 'cat-name-label';
    nameLabel.textContent = `${label} (${count})`;
    nameLabel.onclick = () => selectCategory(value);
    item.appendChild(nameLabel);

    if (categoryId) {
        const actions = document.createElement('div');
        actions.className = 'cat-actions';
        actions.innerHTML = `
            <span class="cat-action-btn cat-rename-btn" title="重命名">✏️</span>
            <span class="cat-action-btn cat-delete-btn" title="删除">✕</span>`;
        actions.querySelector('.cat-rename-btn').onclick = (e) => {
            e.stopPropagation();
            startRename(item, categoryId, categoryName);
        };
        actions.querySelector('.cat-delete-btn').onclick = (e) => {
            e.stopPropagation();
            deleteCategory(categoryId, categoryName);
        };
        item.appendChild(actions);
    }
    return item;
}

function selectCategory(value) {
    selectedCategory = value;
    renderSidebar();
    renderProducts();
}

function renderProducts() {
    const area = document.getElementById('product-area-content');
    area.innerHTML = '';

    let products;
    if (selectedCategory === '__all__') products = allProducts;
    else if (selectedCategory === '__uncategorized__') products = allProducts.filter(p => !p.category);
    else products = allProducts.filter(p => p.category === selectedCategory);

    if (!products.length) {
        area.innerHTML = '<p class="product-empty-msg">该分类下暂无商品</p>';
        return;
    }
    products.forEach(p => area.appendChild(buildCard(p)));
}

function getImageSrc(url) {
    if (!url) return null;
    if (url.startsWith('/uploads/')) return `http://localhost:3000${url}`;
    return url;
}

function buildCard(p) {
    const imgSrc = getImageSrc(p.product_image_url);
    const catOptions = allCategories.map(c =>
        `<option value="${c.category_name}" ${p.category === c.category_name ? 'selected' : ''}>${c.category_name}</option>`
    ).join('');

    const card = document.createElement('div');
    card.className = 'menu-product-card';
    card.innerHTML = `
        <div class="menu-product-img${imgSrc ? '' : ' no-img'}"
             ${imgSrc ? `style="background-image:url('${imgSrc}')"` : ''}></div>
        <div class="menu-product-body">
            <div class="menu-product-name">${p.product_name}</div>
            ${p.product_description ? `<div class="menu-product-desc">${p.product_description}</div>` : ''}
            <div class="menu-product-footer">
                <span class="menu-product-price">¥${parseFloat(p.product_price).toFixed(2)}</span>
                <select class="menu-product-cat-select">
                    <option value="">未分类</option>
                    ${catOptions}
                </select>
            </div>
        </div>`;

    card.querySelector('.menu-product-cat-select').addEventListener('change', function () {
        moveProductCategory(p.product_id, this.value, p.category || '');
    });
    return card;
}

async function moveProductCategory(productId, newCategory, oldCategory) {
    if (newCategory === oldCategory) return;
    const p = allProducts.find(x => x.product_id === productId);
    if (!p) return;
    try {
        const res = await merchantFetch(`${API}/updateProduct`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_id: productId,
                product_name: p.product_name,
                product_price: p.product_price,
                product_description: p.product_description || null,
                category: newCategory || null
            })
        });
        const data = await res.json();
        if (data.success) {
            p.category = newCategory || null;
            renderSidebar();
            renderProducts();
        } else {
            alert(data.message || '移动失败');
        }
    } catch (e) {
        if (e.message !== 'Unauthorized') alert('网络错误');
    }
}

async function addCategory() {
    const input = document.getElementById('new-cat-input');
    const name = input.value.trim();
    if (!name) return;
    try {
        const res = await merchantFetch(`${API}/addMerchantCategory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category_name: name })
        });
        const data = await res.json();
        if (data.success) { input.value = ''; await loadAll(); }
        else alert(data.message || '添加失败');
    } catch (e) {
        if (e.message !== 'Unauthorized') alert('网络错误');
    }
}

function startRename(item, categoryId, currentName) {
    const nameLabel = item.querySelector('.cat-name-label');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'cat-rename-input';
    input.value = currentName;
    nameLabel.replaceWith(input);
    input.focus();
    input.select();

    const save = async () => {
        const newName = input.value.trim();
        if (!newName || newName === currentName) { await loadAll(); return; }
        try {
            const res = await merchantFetch(`${API}/renameMerchantCategory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category_id: categoryId, old_name: currentName, new_name: newName })
            });
            const data = await res.json();
            if (data.success) {
                if (selectedCategory === currentName) selectedCategory = newName;
                await loadAll();
            } else {
                alert(data.message || '重命名失败');
                await loadAll();
            }
        } catch (e) {
            if (e.message !== 'Unauthorized') alert('网络错误');
        }
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') { input.value = currentName; input.blur(); }
    });
}

async function deleteCategory(categoryId, categoryName) {
    const count = allProducts.filter(p => p.category === categoryName).length;
    const msg = count > 0
        ? `删除「${categoryName}」？该分类下 ${count} 个商品将变为未分类。`
        : `确认删除「${categoryName}」分类？`;
    if (!confirm(msg)) return;
    try {
        const res = await merchantFetch(`${API}/deleteMerchantCategory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category_id: categoryId, category_name: categoryName })
        });
        const data = await res.json();
        if (data.success) {
            if (selectedCategory === categoryName) selectedCategory = '__all__';
            await loadAll();
        } else {
            alert(data.message || '删除失败');
        }
    } catch (e) {
        if (e.message !== 'Unauthorized') alert('网络错误');
    }
}

function merchantLogout() {
    localStorage.removeItem('merchantToken');
    localStorage.removeItem('merchantId');
    localStorage.removeItem('merchantName');
    window.location.href = 'merchant-entry.html';
}