// cart.js — 购物车状态管理 + 抽屉 UI

const Cart = (() => {
    const KEY = 'kfl_cart';

    function load() {
        try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
        catch { return {}; }
    }

    function save(cart) {
        localStorage.setItem(KEY, JSON.stringify(cart));
    }

    // product: { product_id, product_name, product_price, merchant_id, merchant_name }
    function add(product) {
        const cart = load();
        if (!cart[product.merchant_id]) {
            cart[product.merchant_id] = { merchant_name: product.merchant_name, items: {} };
        }
        const items = cart[product.merchant_id].items;
        if (items[product.product_id]) {
            items[product.product_id].quantity += 1;
        } else {
            items[product.product_id] = { ...product, quantity: 1 };
        }
        save(cart);
        _refresh();
    }

    function remove(merchantId, productId) {
        const cart = load();
        if (!cart[merchantId]?.items[productId]) return;
        cart[merchantId].items[productId].quantity -= 1;
        if (cart[merchantId].items[productId].quantity <= 0) {
            delete cart[merchantId].items[productId];
        }
        if (Object.keys(cart[merchantId].items).length === 0) {
            delete cart[merchantId];
        }
        save(cart);
        _refresh();
    }

    function getQty(merchantId, productId) {
        const cart = load();
        return cart[merchantId]?.items[productId]?.quantity || 0;
    }

    function totalCount() {
        const cart = load();
        return Object.values(cart).reduce((sum, m) =>
            sum + Object.values(m.items).reduce((s, i) => s + i.quantity, 0), 0);
    }

    function getMerchant(merchantId) {
        return load()[merchantId] || null;
    }

    function clearMerchant(merchantId) {
        const cart = load();
        delete cart[merchantId];
        save(cart);
        _refresh();
    }

    // ─── UI ───

    function _refresh() {
        _updateFAB();
        _syncCards();
        const drawer = document.getElementById('cart-drawer');
        if (drawer?.classList.contains('open')) _renderDrawer();
    }

    function _updateFAB() {
        const count = totalCount();
        const badge = document.getElementById('cart-fab-badge');
        const fab = document.getElementById('cart-fab');
        if (badge) badge.textContent = count;
        if (fab) fab.style.display = count > 0 ? 'flex' : 'none';
    }

    function _syncCards() {
        document.querySelectorAll('.cart-area').forEach(area => {
            const { productId, merchantId } = area.dataset;
            if (!merchantId) return;
            _updateCardArea(area, getQty(merchantId, productId));
        });
    }

    function _updateCardArea(area, qty) {
        const addBtn = area.querySelector('.cart-add-btn');
        const counter = area.querySelector('.cart-counter');
        const qtySpan = area.querySelector('.cart-counter-qty');
        if (qty > 0) {
            addBtn.style.display = 'none';
            counter.style.display = 'flex';
            if (qtySpan) qtySpan.textContent = qty;
        } else {
            addBtn.style.display = 'flex';
            counter.style.display = 'none';
        }
    }

    function _renderDrawer() {
        const body = document.getElementById('cart-drawer-body');
        if (!body) return;
        const cart = load();
        const merchants = Object.entries(cart);
        if (merchants.length === 0) {
            body.innerHTML = '<p class="cart-empty">购物车是空的</p>';
            return;
        }
        body.innerHTML = merchants.map(([mId, merchant]) => {
            const items = Object.values(merchant.items);
            const subtotal = items.reduce((s, i) => s + i.product_price * i.quantity, 0);
            return `
            <div class="cart-merchant-group">
                <div class="cart-merchant-header">
                    <span class="cart-merchant-name">${merchant.merchant_name}</span>
                    <button class="cart-checkout-btn" onclick="Cart.checkout('${mId}')">去结算</button>
                </div>
                ${items.map(item => `
                <div class="cart-item-row">
                    <span class="cart-item-name">${item.product_name}</span>
                    <div class="cart-item-right">
                        <div class="cart-item-controls">
                            <button onclick="Cart.remove('${mId}','${item.product_id}')">－</button>
                            <span>${item.quantity}</span>
                            <button onclick="Cart.add(${JSON.stringify(item).replace(/"/g, '&quot;')})">＋</button>
                        </div>
                        <span class="cart-item-price">￥${(item.product_price * item.quantity).toFixed(2)}</span>
                    </div>
                </div>`).join('')}
                <div class="cart-subtotal">小计：￥${subtotal.toFixed(2)}</div>
            </div>`;
        }).join('');
    }

    function toggleDrawer() {
        const drawer = document.getElementById('cart-drawer');
        const overlay = document.getElementById('cart-drawer-overlay');
        if (!drawer) return;
        const isOpen = drawer.classList.toggle('open');
        overlay.style.display = isOpen ? 'block' : 'none';
        if (isOpen) _renderDrawer();
    }

    function checkout(merchantId) {
        toggleDrawer();
        if (typeof showCartCheckoutPopup === 'function') {
            showCartCheckoutPopup(merchantId);
        }
    }

    return { add, remove, getQty, totalCount, getMerchant, clearMerchant, toggleDrawer, checkout, _refresh, _updateCardArea };
})();

document.addEventListener('DOMContentLoaded', () => {
    const count = Cart.totalCount();
    const fab = document.getElementById('cart-fab');
    if (fab) fab.style.display = count > 0 ? 'flex' : 'none';
    const badge = document.getElementById('cart-fab-badge');
    if (badge) badge.textContent = count;
});