let _wasDragged = false;

function initImageDrag(el) {
    let active = false, startX, startY, startBgX, startBgY;
    el.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        active = true; _wasDragged = false;
        startX = e.clientX; startY = e.clientY;
        startBgX = parseFloat(el.dataset.focalX) || 50;
        startBgY = parseFloat(el.dataset.focalY) || 50;
        el.style.transition = 'none';
        el.style.cursor = 'grabbing';
        e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
        if (!active) return;
        const dx = e.clientX - startX, dy = e.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) _wasDragged = true;
        const nx = Math.min(100, Math.max(0, startBgX - dx * 0.15));
        const ny = Math.min(100, Math.max(0, startBgY - dy * 0.15));
        el.style.backgroundPosition = `${nx}% ${ny}%`;
    });
    document.addEventListener('mouseup', () => {
        if (!active) return;
        active = false;
        el.style.cursor = 'grab';
        el.style.transition = 'background-position 0.45s cubic-bezier(0.25,0.46,0.45,0.94)';
        el.style.backgroundPosition = `${el.dataset.focalX || 50}% ${el.dataset.focalY || 50}%`;
        setTimeout(() => { _wasDragged = false; }, 100);
    });
}

function setSpecialTypeFood(merchantName, block) {
    const map = {
        '百乐中心': '/泰国菜/正宗泰式风味...',
        '璃月小馆': '/璃月菜/地道家常味...',
        '幸屋': '/日本菜/精致料理...',
        '肯德基': '/快餐/快快块...'
    };
    const el = block.querySelector('.special-typefood');
    if (el) el.textContent = map[merchantName] || '/其他';
}

function renderMerchantCards(merchants) {
    const container = document.getElementById('merchant-images');
    container.querySelectorAll('.merchant-block, .merchant-empty-state').forEach(el => el.remove());

    if (!merchants.length) {
        const el = document.createElement('div');
        el.className = 'merchant-empty-state';
        el.textContent = '该分类暂无商家';
        container.appendChild(el);
        return;
    }

    merchants.forEach(m => {
        const now = new Date();
        const cur = now.getHours() * 60 + now.getMinutes();
        const [oh, om] = m.opening_time.slice(0, 5).split(':').map(Number);
        const [ch, cm] = m.closing_time.slice(0, 5).split(':').map(Number);
        const openMin = oh * 60 + om, closeMin = ch * 60 + cm;
        const isOpen = m.is_24h || (openMin < closeMin
            ? cur >= openMin && cur < closeMin
            : cur >= openMin || cur < closeMin);

        const imgSrc = m.cover_image_url ? `http://localhost:3000${m.cover_image_url}` : '';
        const focalX = m.cover_focal_x != null ? m.cover_focal_x : 50;
        const focalY = m.cover_focal_y != null ? m.cover_focal_y : 50;
        const zoom   = m.cover_zoom_level || 100;
        const isOvernight = m.opening_time.slice(0, 5) > m.closing_time.slice(0, 5);
        const closeLabel = (isOvernight ? '次日 ' : '') + m.closing_time.slice(0, 5);

        const good = m.total_good || 0, bad = m.total_bad || 0, total = good + bad;
        const rateText = total > 0 ? `好评率 ${Math.round(good / total * 100)}%` : '暂无评价';

        let statusText, statusColor;
        if (m.is_temporarily_closed) { statusText = '临时关闭'; statusColor = '#e67e22'; }
        else if (isOpen)             { statusText = '营业中';   statusColor = '#2ecc71'; }
        else                         { statusText = '已打烊';   statusColor = '#e74c3c'; }

        const block = document.createElement('div');
        block.className = 'merchant-block';
        block.innerHTML = `
            <div class="merchant-image-wrap">
                <div class="pos-theme-list-sell-image"
                     data-focal-x="${focalX}" data-focal-y="${focalY}"
                     style="${imgSrc ? `background-image:url('${imgSrc}');` : ''}
                            background-position:${focalX}% ${focalY}%;
                            background-size:${zoom > 100 ? zoom + '% auto' : 'cover'};"></div>
                <div class="merchant-image-overlay">
                    <img src="./images/icons/bookmark.svg" alt="" class="bookmark-icon">
                    <span class="bookmark-num">${m.total_clicks || 0}</span>
                    <div class="label-start-selling-time-container">
                        <img src="./images/icons/start-selling-time-label.svg" alt="">
                        <div class="start-selling-time">${m.opening_time.slice(0, 5)}</div>
                    </div>
                    <span class="business-status" style="color:${statusColor}">${statusText}</span>
                    <span class="badge-24h" style="display:${m.is_24h ? 'inline-block' : 'none'};
                          background:#ff9500;color:#fff;font-size:11px;font-weight:700;
                          padding:2px 6px;border-radius:4px;margin-left:4px;">24H</span>
                    <div class="label-close-time-container">
                        <img src="./images/icons/门店打烊.png" alt="打烊"
                             style="width:25px;height:25px;margin-right:6px;">
                        <div class="close-time" style="font-size:13px;color:#3e3e3e;">${closeLabel}</div>
                    </div>
                </div>
            </div>
            <div class="pos-theme-list-sell-info">
                <div class="merchant-text-info">
                    <span class="pos-theme-list-sell-info-name">${m.merchant_name}</span>
                    <span class="pos-theme-list-sell-info-address">
                        <span class="merchant-address">${m.merchant_address || ''}</span>
                        <span class="special-typefood"></span>
                    </span>
                    <div class="food-brief-evaluate-emoji-container">
                        <img src="./images/icons/thumbs-up.svg" alt="" class="yammy-icon">
                        <span class="good-review-rate" style="margin-left:5px;">${rateText}</span>
                    </div>
                </div>
            </div>
        `;

        setSpecialTypeFood(m.merchant_name, block);

        const imgEl = block.querySelector('.pos-theme-list-sell-image');
        imgEl.style.cursor = 'grab';
        initImageDrag(imgEl);

        block.addEventListener('click', () => {
            if (_wasDragged) return;
            window.location.href = `./merchant.html?id=${m.merchant_id}`;
        });

        container.appendChild(block);
    });
}