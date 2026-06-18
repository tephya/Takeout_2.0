(function () {
    const API_BASE = 'http://localhost:3000';
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    const input = document.querySelector('.topbar-search-input');
    const loading = document.getElementById('search-loading');
    const emptyEl = document.getElementById('search-empty');
    const noResult = document.getElementById('search-no-result');
    const merchantSection = document.getElementById('merchant-section');
    const productSection = document.getElementById('product-section');
    const merchantContainer = document.getElementById('merchant-results');
    const productContainer = document.getElementById('product-results');

    input.value = q;
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && this.value.trim())
            window.location.href = './search.html?q=' + encodeURIComponent(this.value.trim());
    });

    if (!q.trim()) {
        loading.style.display = 'none';
        emptyEl.style.display = 'block';
        return;
    }

    document.getElementById('search-query-label').textContent = '"' + q + '"';

    fetch(API_BASE + '/api/search?q=' + encodeURIComponent(q))
        .then(r => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .then(data => {
            loading.style.display = 'none';
            if (!data.success) { noResult.style.display = 'block'; return; }

            const hasMerchants = data.merchants && data.merchants.length > 0;
            const hasProducts = data.products && data.products.length > 0;
            if (!hasMerchants && !hasProducts) { noResult.style.display = 'block'; return; }

            // 清空容器
            merchantContainer.innerHTML = '';
            productContainer.innerHTML = '';

            if (hasMerchants) {
                merchantSection.style.display = 'block';
                renderMerchants(data.merchants);
            } else {
                merchantSection.style.display = 'none';
            }
            if (hasProducts) {
                productSection.style.display = 'block';
                renderProducts(data.products);
            } else {
                productSection.style.display = 'none';
            }
        })
        .catch(err => {
            console.error('搜索请求失败:', err);
            loading.style.display = 'none';
            noResult.style.display = 'block';
        });

    function renderMerchants(list) {
        list.forEach(m => {
            const card = document.createElement('div');
            card.className = 'search-card';
            card.onclick = () => window.location.href = './merchant.html?id=' + encodeURIComponent(m.merchant_id) + '&from=search&q=' + encodeURIComponent(q);

            const coverUrl = m.cover_image_url
                ? (m.cover_image_url.startsWith('http') ? m.cover_image_url : API_BASE + m.cover_image_url)
                : '';
            const coverStyle = coverUrl
                ? 'background-image:url(' + coverUrl + ')'
                : '';
            const badge = m.is_temporarily_closed
                ? '<span class="search-badge closed">暂停营业</span>'
                : '<span class="search-badge open">营业中</span>';
            const cuisineTag = m.cuisine_type
                ? '<span class="cuisine-tag">' + escHtml(m.cuisine_type) + '</span>'
                : '';
            const hours = m.is_24h
                ? '24小时营业'
                : (m.opening_time && m.closing_time
                    ? fmtTime(m.opening_time) + ' – ' + fmtTime(m.closing_time)
                    : '');

            card.innerHTML =
                '<div class="search-card-cover' + (coverUrl ? '' : ' no-cover') + '" style="' + coverStyle + '">' +
                    badge +
                    '<div class="search-card-cover-overlay">' +
                        '<div class="search-card-name">' + escHtml(m.merchant_name) + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="search-card-body">' +
                    '<div class="search-card-meta-row">' +
                        (cuisineTag || '') +
                        (hours ? '<span class="search-card-hours">' + hours + '</span>' : '') +
                    '</div>' +
                    '<div class="search-card-sub">📍 ' + escHtml(m.merchant_address || '') + '</div>' +
                '</div>';
            merchantContainer.appendChild(card);
        });
    }

    function fmtTime(t) {
        // MySQL TIME 返回 "HH:MM:SS"，截取前5位
        return String(t).slice(0, 5);
    }

    function renderProducts(list) {
        list.forEach(p => {
            const card = document.createElement('div');
            card.className = 'search-card';
            card.onclick = () => window.location.href = './merchant.html?id=' + encodeURIComponent(p.merchant_id) + '&from=search&q=' + encodeURIComponent(q);
            const imgUrl = p.product_image_url
                ? (p.product_image_url.startsWith('http') ? p.product_image_url : API_BASE + p.product_image_url)
                : '';
            card.innerHTML =
                (imgUrl ? '<img src="' + imgUrl + '" class="search-card-img" onerror="this.style.display=\'none\'">' : '') +
                '<div class="search-card-body">' +
                    '<div class="search-card-name">' + escHtml(p.product_name) + '</div>' +
                    '<div class="search-card-sub">' + escHtml(p.merchant_name) + '</div>' +
                    '<div class="search-card-price">¥' + parseFloat(p.product_price).toFixed(2) + '</div>' +
                '</div>';
            productContainer.appendChild(card);
        });
    }

    function escHtml(s) {
        if (s === undefined || s === null) return '';
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
})();