(function () {
    const params = new URLSearchParams(location.search);
    const merchantId = params.get('id');
    if (!merchantId) { window.location.href = './index.html'; return; }

    const fromSearch = params.get('from') === 'search';
    const searchQuery = params.get('q') || '';
    const backLink = document.querySelector('.merchant-back');
    if (backLink && fromSearch && searchQuery) {
        backLink.href = `./search.html?q=${encodeURIComponent(searchQuery)}`;
        backLink.textContent = `← 返回搜索"${searchQuery}"`;
    }

    document.querySelector('.topbar-search-input').addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && this.value.trim())
            window.location.href = './search.html?q=' + encodeURIComponent(this.value.trim());
    });

    Promise.all([
        fetch(`http://localhost:3000/api/getPublicMerchantInfo?merchant_id=${merchantId}`).then(r => r.json()),
        fetch(`http://localhost:3000/api/getPublicMerchantProducts?merchant_id=${merchantId}`).then(r => r.json()),
        fetch(`http://localhost:3000/api/getPublicMerchantCategories?merchant_id=${merchantId}`).then(r => r.json())
    ]).then(([merchantData, productsData, categoriesData]) => {
        document.getElementById('product-loading').style.display = 'none';

        if (!merchantData.success) {
            document.getElementById('product-empty').textContent = '商家不存在';
            document.getElementById('product-empty').style.display = 'block';
            return;
        }

        renderMerchantHeader(merchantData.data);

        if (!productsData.success || !productsData.data.length) {
            document.getElementById('product-empty').style.display = 'block';
            return;
        }

        const orderedCategories = categoriesData.success ? categoriesData.data : [];
        renderCategorySidebar(orderedCategories, productsData.data);
        renderProducts(productsData.data, merchantData.data, orderedCategories);
    }).catch(() => {
        document.getElementById('product-loading').textContent = '加载失败，请刷新重试';
    });

    function _isOpen(opening_time, closing_time, is_24h) {
        if (is_24h) return true;
        const now = new Date();
        const cur = now.getHours() * 60 + now.getMinutes();
        const [oh, om] = opening_time.slice(0, 5).split(':').map(Number);
        const [ch, cm] = closing_time.slice(0, 5).split(':').map(Number);
        const open = oh * 60 + om, close = ch * 60 + cm;
        return open < close ? cur >= open && cur < close : cur >= open || cur < close;
    }

    function renderMerchantHeader(m) {
        document.title = `${m.merchant_name} | 开饭啦`;
        document.getElementById('merchant-hero-name').textContent = m.merchant_name;
        document.getElementById('merchant-hero-address').textContent = m.merchant_address || '';
        document.getElementById('merchant-hero-hours').textContent = m.is_24h
            ? '全天营业'
            : `${m.opening_time.slice(0, 5)} – ${m.closing_time.slice(0, 5)}`;

        const open = _isOpen(m.opening_time, m.closing_time, m.is_24h);
        const statusEl = document.getElementById('merchant-hero-status');
        if (m.is_temporarily_closed) {
            statusEl.textContent = '临时关闭';
            statusEl.className = 'merchant-hero-status status-temp-closed';
        } else {
            statusEl.textContent = open ? '营业中' : '已打烊';
            statusEl.className = `merchant-hero-status ${open ? 'status-open' : 'status-closed'}`;
        }
        if (m.cover_image_url) {
            document.getElementById('merchant-hero-cover').style.backgroundImage =
                `url('http://localhost:3000${m.cover_image_url}')`;
        }
    }

    function buildCategoryOrder(orderedCategories, products) {
        const result = [...orderedCategories];
        products.forEach(p => {
            if (p.category && !result.includes(p.category)) result.push(p.category);
        });
        return result;
    }

    function renderCategorySidebar(orderedCategories, products) {
        const sidebar = document.getElementById('merchant-cat-sidebar');
        const allCats = buildCategoryOrder(orderedCategories, products);
        const hasUncategorized = products.some(p => !p.category);

        const items = [{ label: '全部', target: 'cat-section-all' }];
        allCats.forEach(cat => {
            items.push({ label: cat, target: `cat-section-${cat}` });
        });
        if (hasUncategorized) items.push({ label: '未分类', target: 'cat-section-uncategorized' });

        sidebar.innerHTML = items.map((item, i) =>
            `<div class="cust-cat-item${i === 0 ? ' active' : ''}" data-target="${item.target}"
                  onclick="scrollToSection('${item.target}', this)">${item.label}</div>`
        ).join('');
    }

    window.scrollToSection = function (targetId, el) {
        document.querySelectorAll('.cust-cat-item').forEach(i => i.classList.remove('active'));
        if (el) el.classList.add('active');
        const section = document.getElementById(targetId);
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    function renderProducts(products, merchant, orderedCategories) {
        const grid = document.getElementById('product-grid');
        const allCats = buildCategoryOrder(orderedCategories, products);
        const uncategorized = products.filter(p => !p.category);

        // 全部锚点（不可见，用于侧边栏"全部"定位）
        const allAnchor = document.createElement('div');
        allAnchor.id = 'cat-section-all';
        grid.appendChild(allAnchor);

        allCats.forEach(cat => {
            const catProducts = products.filter(p => p.category === cat);
            if (!catProducts.length) return;
            const section = document.createElement('div');
            section.className = 'product-cat-section';
            section.id = `cat-section-${cat}`;
            section.innerHTML = `<div class="product-cat-heading">${cat}</div>`;
            catProducts.forEach(p => section.appendChild(buildProductCard(p, merchant)));
            grid.appendChild(section);
        });

        if (uncategorized.length) {
            const section = document.createElement('div');
            section.className = 'product-cat-section';
            section.id = 'cat-section-uncategorized';
            section.innerHTML = `<div class="product-cat-heading">未分类</div>`;
            uncategorized.forEach(p => section.appendChild(buildProductCard(p, merchant)));
            grid.appendChild(section);
        }

        Cart._refresh();
        grid.addEventListener('click', handleCartClick);
    }

    function buildProductCard(p, merchant) {
        const imgSrc = p.product_image_url ? `http://localhost:3000${p.product_image_url}` : '';
        const good = p.good_review_count || 0, bad = p.bad_review_count || 0;
        const total = good + bad;
        const rateText = total > 0 ? `好评率 ${Math.round(good / total * 100)}%` : '暂无评价';

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-card-img${imgSrc ? '' : ' no-img'}"
                 ${imgSrc ? `style="background-image:url('${imgSrc}')"` : ''}></div>
            <div class="product-card-body">
                <div class="product-card-name">${p.product_name}</div>
                ${p.product_description ? `<div class="product-card-desc">${p.product_description}</div>` : ''}
                <div class="product-card-rate">${rateText}</div>
                <div class="product-card-footer">
                    <span class="product-card-price">¥${parseFloat(p.product_price).toFixed(2)}</span>
                    <div class="cart-area"
                         data-product-id="${p.product_id}"
                         data-merchant-id="${merchantId}"
                         data-product-name="${p.product_name}"
                         data-product-price="${p.product_price}"
                         data-merchant-name="${merchant.merchant_name}">
                        <button class="cart-add-btn">＋</button>
                        <div class="cart-counter" style="display:none">
                            <button class="cart-counter-btn" data-action="minus">－</button>
                            <span class="cart-counter-qty">1</span>
                            <button class="cart-counter-btn" data-action="plus">＋</button>
                        </div>
                    </div>
                </div>
            </div>`;
        return card;
    }

    function handleCartClick(e) {
        if (e.target.classList.contains('cart-add-btn')) {
            const area = e.target.closest('.cart-area');
            Cart.add({
                product_id: area.dataset.productId,
                product_name: area.dataset.productName,
                product_price: parseFloat(area.dataset.productPrice),
                merchant_id: area.dataset.merchantId,
                merchant_name: area.dataset.merchantName
            });
            return;
        }
        if (e.target.classList.contains('cart-counter-btn')) {
            const area = e.target.closest('.cart-area');
            if (e.target.dataset.action === 'minus') {
                Cart.remove(area.dataset.merchantId, area.dataset.productId);
            } else {
                Cart.add({
                    product_id: area.dataset.productId,
                    product_name: area.dataset.productName,
                    product_price: parseFloat(area.dataset.productPrice),
                    merchant_id: area.dataset.merchantId,
                    merchant_name: area.dataset.merchantName
                });
            }
        }
    }
})();