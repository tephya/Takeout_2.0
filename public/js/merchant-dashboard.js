const API = 'http://localhost:3000/api';

let currentIsTemporarilyClosed = false;

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
    const merchantToken = localStorage.getItem('merchantToken');
    const merchantId = localStorage.getItem('merchantId');
    const merchantName = localStorage.getItem('merchantName');

    if (!merchantToken || !merchantId || !merchantName) {
        window.location.href = 'merchant-login.html';
        return;
    }

    document.getElementById('merchant-id-display').textContent = merchantId;
    document.getElementById('merchant-name-display').textContent = merchantName;
    document.getElementById('welcome-title').textContent = `欢迎回来，${merchantName}`;

    loadBusinessStatus();
    loadProducts();
    loadMerchantCategories();
    loadStats();
});

// ───────── 营业状态 ─────────

async function loadBusinessStatus() {
    try {
        const res = await merchantFetch(`${API}/getMerchantBusinessHours`);
        const data = await res.json();
        if (!data.success) return;

        const { opening_time, closing_time, is_temporarily_closed, cuisine_type } = data.data;
        currentIsTemporarilyClosed = !!is_temporarily_closed;

        document.getElementById('business-hours-display').textContent =
            `${opening_time.slice(0, 5)} — ${closing_time.slice(0, 5)}`;

        updateStatusBadge(opening_time, closing_time, currentIsTemporarilyClosed);
        if (cuisine_type) window._currentCuisineType = cuisine_type;
    } catch (e) {
        if (e.message !== 'Unauthorized') console.error('获取营业时间失败:', e);
    }
}

function updateStatusBadge(opening_time, closing_time, isTemporarilyClosed) {
    const badge = document.getElementById('business-status');
    if (isTemporarilyClosed) {
        badge.textContent = '临时关闭';
        badge.className = 'status-badge temporarily-closed';
        return;
    }
    const nowStr = new Date().toTimeString().slice(0, 5);
    const isOpen = opening_time < closing_time
        ? nowStr >= opening_time && nowStr < closing_time
        : nowStr >= opening_time || nowStr < closing_time;
    badge.textContent = isOpen ? '营业中' : '打烊了';
    badge.className = 'status-badge ' + (isOpen ? 'active' : 'closed');
}

function openSettingsModal() {
    const display = document.getElementById('business-hours-display').textContent;
    const parts = display.split(' — ');
    if (parts.length === 2) {
        document.getElementById('input-opening-time').value = parts[0];
        document.getElementById('input-closing-time').value = parts[1];
    }

    // 同步临时关店 toggle 状态
    const toggle = document.getElementById('toggle-temporarily-closed');
    toggle.checked = currentIsTemporarilyClosed;
    syncClosureLabel(currentIsTemporarilyClosed);

    const cuisineSelect = document.getElementById('input-cuisine-type');
    if (cuisineSelect && window._currentCuisineType) cuisineSelect.value = window._currentCuisineType;

    document.getElementById('settings-modal-overlay').style.display = 'flex';
}

function closeSettingsModal() {
    document.getElementById('settings-modal-overlay').style.display = 'none';
}

async function saveBusinessHours() {
    const opening_time = document.getElementById('input-opening-time').value;
    const closing_time = document.getElementById('input-closing-time').value;
    const cuisine_type = document.getElementById('input-cuisine-type').value;
    if (!opening_time || !closing_time) { alert('请填写完整时间'); return; }
    try {
        const res = await merchantFetch(`${API}/updateMerchantBusinessHours`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ opening_time, closing_time, cuisine_type: cuisine_type || null })
        });
        const data = await res.json();
        if (data.success) {
            closeSettingsModal();
            loadBusinessStatus();
        } else {
            alert(data.message || '保存失败');
        }
    } catch (e) {
        if (e.message !== 'Unauthorized') alert('网络错误');
    }
}

// ───────── 临时关店 ─────────

async function setTemporaryClosure(isClosed) {
    syncClosureLabel(isClosed);
    try {
        const res = await merchantFetch(`${API}/setTemporaryClosure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_temporarily_closed: isClosed ? 1 : 0 })
        });
        const data = await res.json();
        if (data.success) {
            currentIsTemporarilyClosed = isClosed;
            // 立即更新信息卡片的 badge（不需要重新请求）
            const display = document.getElementById('business-hours-display').textContent;
            const parts = display.split(' — ');
            if (parts.length === 2) {
                updateStatusBadge(parts[0], parts[1], isClosed);
            }
        } else {
            // 回滚 toggle
            const toggle = document.getElementById('toggle-temporarily-closed');
            toggle.checked = !isClosed;
            syncClosureLabel(!isClosed);
            alert(data.message || '操作失败');
        }
    } catch (e) {
        const toggle = document.getElementById('toggle-temporarily-closed');
        toggle.checked = !isClosed;
        syncClosureLabel(!isClosed);
        if (e.message !== 'Unauthorized') alert('网络错误');
    }
}

function syncClosureLabel(isClosed) {
    const label = document.getElementById('closure-status-label');
    if (!label) return;
    label.textContent = isClosed ? '已临时关店' : '正常营业';
    label.style.color = isClosed ? '#e74c3c' : '#52c41a';
}

async function loadProducts() {
    try {
        const [productsRes, infoRes] = await Promise.all([
            merchantFetch(`${API}/getProductsByMerchant`),
            merchantFetch(`${API}/getMerchantBusinessHours`)
        ]);
        const productsData = await productsRes.json();
        const infoData = await infoRes.json();
        const coverProductId = infoData.success ? infoData.data.cover_product_id : null;
        renderProducts(productsData.success ? productsData.data : [], coverProductId);
    } catch (e) {
        if (e.message !== 'Unauthorized') renderProducts([]);
    }
}

function getImageSrc(url) {
    if (!url) return null;
    if (url.startsWith('/uploads/')) return `http://localhost:3000${url}`;
    return url;
}

function renderProducts(products, coverProductId = null) {
    const tbody = document.getElementById('product-tbody');
    const table = document.getElementById('product-table');
    const empty = document.getElementById('product-empty');

    if (products.length === 0) {
        table.style.display = 'none';
        empty.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    empty.style.display = 'none';

    tbody.innerHTML = products.map(p => `
        <tr id="row-${p.product_id}">
            <td>
                ${p.product_image_url
                    ? `<img src="${getImageSrc(p.product_image_url)}" alt="${p.product_name}">`
                    : `<div class="no-image">无图</div>`}
            </td>
            <td>${p.product_name}</td>
            <td>¥${parseFloat(p.product_price).toFixed(2)}</td>
            <td style="color:#888; font-size:13px;" title="${p.product_description || ''}">${p.product_description || '—'}</td>
            <td>
                <button class="btn-edit" onclick="editProduct('${p.product_id}', '${escapeQuote(p.product_name)}', ${p.product_price}, '${escapeQuote(p.product_description || '')}', '${p.category || ''}')">编辑</button>
                <button class="btn-delete" onclick="deleteProduct('${p.product_id}')">删除</button>
                ${p.product_image_url ? `<button class="btn-edit" style="background:#f0f0f0;color:#333;margin-top:4px;" onclick="openFocalPointModal('${p.product_id}','${getImageSrc(p.product_image_url)}',${p.focal_x ?? 50},${p.focal_y ?? 50},${p.zoom_level ?? 100})">设定焦点</button>` : ''}
                ${p.product_id === coverProductId
                    ? `<span style="display:inline-block;margin-top:4px;padding:2px 10px;background:#e8f5e9;color:#27ae60;border-radius:4px;font-size:12px;">当前封面</span>`
                    : `<button class="btn-edit" style="background:#fff7e6;color:#e67e22;border:1px solid #f0c070;margin-top:4px;" onclick="setCoverProduct('${p.product_id}')">设为封面</button>`}
            </td>
        </tr>
    `).join('');
}

function escapeQuote(str) {
    return str.replace(/'/g, "\\'");
}

function editProduct(productId, name, price, desc, category) {
    document.getElementById('edit-product-id').value = productId;
    document.getElementById('edit-product-name').value = name;
    document.getElementById('edit-product-price').value = price;
    document.getElementById('edit-product-desc').value = desc;
    document.getElementById('edit-product-category').value = category;
    document.getElementById('edit-product-image').value = '';
    document.getElementById('edit-form-area').style.display = 'block';
    document.getElementById('edit-form-area').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
    document.getElementById('edit-form-area').style.display = 'none';
}

async function submitEditProduct() {
    const productId = document.getElementById('edit-product-id').value;
    const name = document.getElementById('edit-product-name').value.trim();
    const price = document.getElementById('edit-product-price').value;
    const desc = document.getElementById('edit-product-desc').value.trim();
    const imageFile = document.getElementById('edit-product-image').files[0];
    const category = document.getElementById('edit-product-category').value;

    if (!name || !price) { alert('名称和价格不能为空'); return; }
    if (parseFloat(price) <= 0) { alert('价格必须大于0'); return; }

    try {
        const res = await merchantFetch(`${API}/updateProduct`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId, product_name: name, product_price: price, product_description: desc || null, category: category || null })
        });
        const data = await res.json();
        if (!data.success) { alert(data.message || '更新失败'); return; }

        if (imageFile) {
            const formData = new FormData();
            formData.append('product_image', imageFile);
            formData.append('product_id', productId);
            await merchantFetch(`${API}/updateProductImage`, { method: 'POST', body: formData });
        }

        cancelEdit();
        loadProducts();
    } catch (e) {
        if (e.message !== 'Unauthorized') alert('网络错误，请稍后重试');
    }
}

async function deleteProduct(productId) {
    if (!confirm('确认删除该商品？')) return;
    try {
        const res = await merchantFetch(`${API}/deleteProduct`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId })
        });
        const data = await res.json();
        if (data.success) loadProducts();
        else alert(data.message || '删除失败');
    } catch (e) {
        if (e.message !== 'Unauthorized') alert('网络错误，请稍后重试');
    }
}

async function addProduct() {
    const category = document.getElementById('new-product-category').value;
    const name = document.getElementById('new-product-name').value.trim();
    const price = document.getElementById('new-product-price').value;
    const desc = document.getElementById('new-product-desc').value.trim();
    const imageFile = document.getElementById('new-product-image').files[0];

    if (!name || !price) { alert('名称和价格不能为空'); return; }
    if (parseFloat(price) <= 0) { alert('价格必须大于0'); return; }
    if (!category) { alert('请选择商品分类'); return; }

    const formData = new FormData();
    formData.append('product_name', name);
    formData.append('product_price', price);
    formData.append('category', category);
    if (desc) formData.append('product_description', desc);
    if (imageFile) formData.append('product_image', imageFile);

    try {
        const res = await merchantFetch(`${API}/addProduct`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            document.getElementById('new-product-name').value = '';
            document.getElementById('new-product-price').value = '';
            document.getElementById('new-product-desc').value = '';
            document.getElementById('new-product-image').value = '';
            document.getElementById('new-product-category').value = '';
            loadProducts();
        } else {
            alert(data.message || '添加失败');
        }
    } catch (e) {
        if (e.message !== 'Unauthorized') alert('网络错误，请稍后重试');
    }
}

function openFocalPointModal(productId, imageUrl, focalX, focalY, zoomLevel) {
    let currentX = parseFloat(focalX) || 50;
    let currentY = parseFloat(focalY) || 50;
    let currentZoom = parseFloat(zoomLevel) || 100;

    const CONTAINER_H = 300;
    const FRAME_H = Math.round(432 * (180 / 660));
    const BAND_H = Math.round((CONTAINER_H - FRAME_H) / 2);

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:12px;padding:24px;width:480px;max-width:92vw;';
    modal.innerHTML = `
        <h3 style="margin:0 0 6px;font-size:16px;">设定图片焦点</h3>
        <p style="color:#888;font-size:13px;margin:0 0 14px;">拖动图片，将核心内容移入中间框内；框外区域在首页卡片中不可见</p>
        <div id="fp-wrap" style="position:relative;width:100%;height:${CONTAINER_H}px;overflow:hidden;border-radius:8px;cursor:grab;user-select:none;">
            <div id="fp-img" style="width:100%;height:100%;background-image:url('${imageUrl}');background-size:cover;background-position:${currentX}% ${currentY}%;"></div>
            <div style="position:absolute;top:0;left:0;right:0;height:${BAND_H}px;background:rgba(0,0,0,0.55);pointer-events:none;"></div>
            <div style="position:absolute;bottom:0;left:0;right:0;height:${BAND_H}px;background:rgba(0,0,0,0.55);pointer-events:none;"></div>
            <div style="position:absolute;top:${BAND_H}px;left:0;right:0;height:${FRAME_H}px;box-sizing:border-box;border-top:1.5px solid rgba(255,255,255,0.88);border-bottom:1.5px solid rgba(255,255,255,0.88);pointer-events:none;">
                <div style="position:absolute;left:33.33%;top:0;bottom:0;border-left:1px solid rgba(255,255,255,0.2);"></div>
                <div style="position:absolute;left:66.66%;top:0;bottom:0;border-left:1px solid rgba(255,255,255,0.2);"></div>
                <div style="position:absolute;top:33.33%;left:0;right:0;border-top:1px solid rgba(255,255,255,0.2);"></div>
                <div style="position:absolute;top:66.66%;left:0;right:0;border-top:1px solid rgba(255,255,255,0.2);"></div>
                <span style="position:absolute;top:6px;left:8px;font-size:10px;color:rgba(255,255,255,0.88);background:rgba(0,0,0,0.32);padding:2px 7px;border-radius:3px;">实际展示区域</span>
            </div>
            <div id="fp-wide-tip" style="display:none;position:absolute;bottom:${BAND_H + 6}px;left:50%;transform:translateX(-50%);font-size:11px;color:#fff;background:rgba(192,57,43,0.82);padding:3px 10px;border-radius:4px;white-space:nowrap;pointer-events:none;">图片较宽，建议适当放大以便调整焦点</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-top:14px;">
            <span style="font-size:13px;color:#555;white-space:nowrap;">放大倍率</span>
            <input id="fp-zoom" type="range" min="100" max="200" step="5" value="${currentZoom}" style="flex:1;">
            <span id="fp-zoom-val" style="font-size:13px;color:#333;min-width:36px;">${currentZoom}%</span>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
            <button id="fp-cancel" style="padding:8px 20px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;">取消</button>
            <button id="fp-save" style="padding:8px 20px;border:none;border-radius:6px;background:#C0392B;color:#fff;font-weight:600;cursor:pointer;">保存焦点</button>
        </div>`;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const wrap = modal.querySelector('#fp-wrap');
    const img  = modal.querySelector('#fp-img');
    const zoomSlider = modal.querySelector('#fp-zoom');
    const zoomVal    = modal.querySelector('#fp-zoom-val');
    const wideTip    = modal.querySelector('#fp-wide-tip');

    function applyBgSize() {
        img.style.backgroundSize = currentZoom > 100 ? `${currentZoom}% auto` : 'cover';
    }
    applyBgSize();

    // 自动检测图片宽度，提示
    const tempImg = new Image();
    tempImg.onload = () => {
        const ratio = tempImg.naturalWidth / tempImg.naturalHeight;
        if (ratio > 3.2 && currentZoom <= 100) {
            wideTip.style.display = 'block';
            setTimeout(() => { wideTip.style.display = 'none'; }, 4000);
        }
    };
    tempImg.src = imageUrl;

    zoomSlider.addEventListener('input', () => {
        currentZoom = parseFloat(zoomSlider.value);
        zoomVal.textContent = `${currentZoom}%`;
        applyBgSize();
    });

    let dragging = false, startX, startY, startBgX, startBgY;
    wrap.addEventListener('mousedown', (e) => {
        dragging = true; startX = e.clientX; startY = e.clientY;
        startBgX = currentX; startBgY = currentY;
        wrap.style.cursor = 'grabbing'; e.preventDefault();
    });

    const onMove = (e) => {
        if (!dragging) return;
        currentX = Math.min(100, Math.max(0, startBgX - (e.clientX - startX) * 0.12));
        currentY = Math.min(100, Math.max(0, startBgY - (e.clientY - startY) * 0.12));
        img.style.backgroundPosition = `${currentX}% ${currentY}%`;
    };
    const onUp = () => { dragging = false; wrap.style.cursor = 'grab'; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);

    function cleanup() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.removeChild(overlay);
    }

    modal.querySelector('#fp-cancel').onclick = cleanup;
    modal.querySelector('#fp-save').onclick = async () => {
        try {
            const res = await merchantFetch(`${API}/updateProductFocalPoint`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: productId,
                    focal_x: currentX.toFixed(2),
                    focal_y: currentY.toFixed(2),
                    zoom_level: currentZoom.toFixed(2)
                })
            });
            const data = await res.json();
            if (data.success) { cleanup(); loadProducts(); }
            else alert(data.message || '保存失败');
        } catch (e) {
            if (e.message !== 'Unauthorized') alert('网络错误');
        }
    };
}

async function loadMerchantCategories() {
    try {
        const res = await merchantFetch(`${API}/getMerchantCategories`);
        const data = await res.json();
        if (!data.success) return;
        const options = data.data.map(c =>
            `<option value="${c.category_name}">${c.category_name}</option>`
        ).join('');
        document.getElementById('new-product-category').innerHTML =
            `<option value="">请选择分类（必填）</option>${options}`;
        document.getElementById('edit-product-category').innerHTML =
            `<option value="">请选择分类</option>${options}`;
    } catch (e) {
        if (e.message !== 'Unauthorized') console.error('加载分类失败:', e);
    }
}

async function setCoverProduct(productId) {
    try {
        const res = await merchantFetch(`${API}/setCoverProduct`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId })
        });
        const data = await res.json();
        if (data.success) loadProducts();
        else alert(data.message || '设置失败');
    } catch (e) {
        if (e.message !== 'Unauthorized') alert('网络错误');
    }
}

async function loadStats() {
    try {
        const res = await merchantFetch(`${API}/getMerchantStats`);
        const data = await res.json();
        if (!data.success) return;
        const d = data.data;
        document.getElementById('stat-today-orders').textContent = d.today_orders;
        document.getElementById('stat-total-orders').textContent = d.total_orders;
        document.getElementById('stat-today-revenue').textContent = `¥${d.today_revenue}`;
        document.getElementById('stat-total-revenue').textContent = `¥${d.total_revenue}`;
        document.getElementById('stat-pending').textContent = d.pending_orders;
        const badge = document.getElementById('pending-badge');
        if (d.pending_orders > 0) { badge.textContent = d.pending_orders; badge.style.display = 'block'; }
        else { badge.style.display = 'none'; }
        document.getElementById('stat-good-rate').textContent = d.good_rate !== null ? `${d.good_rate}%` : '暂无';
    } catch (e) {
        if (e.message !== 'Unauthorized') console.error('加载统计失败:', e);
    }
}

// ───────── 登出 ─────────

function merchantLogout() {
    localStorage.removeItem('merchantToken');
    localStorage.removeItem('merchantId');
    localStorage.removeItem('merchantName');
    window.location.href = 'merchant-entry.html';
}