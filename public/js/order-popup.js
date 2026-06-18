let currentDefaultAddress = null;

// 开窗口
function showPayPopup(producitId) {
    const popup = document.getElementById('popup-pay-interface');
    const overlay = document.getElementById('order-overlay');
    popup.style.display = 'block';
    overlay.style.display = 'block';
    if (typeof outputtime === 'function') {
        outputtime();
    }
    checkLoginAndFillInfo();
    if (typeof loadOrderContent === 'function') {
        loadOrderContent(producitId);
    }
}

// 检查登录状态并填充信息
async function checkLoginAndFillInfo() {
    if (UserManager.checkLoginStatus()) {
        const userPhone = UserManager.getCurrentUserPhone();
        const customerId = localStorage.getItem('customer_id');
        if (userPhone) {
            try {
                const [userInfo, addressData] = await Promise.all([
                    APIManager.getUserInfo(userPhone),
                    fetch(`http://localhost:3000/api/getAddresses?customer_id=${customerId}`).then(r => r.json())
                ]);
                if (userInfo && userInfo.success) {
                    const addresses = addressData.success ? addressData.data : [];
                    window._savedAddresses = addresses;  // ← 新增这一行
                    const defaultAddress = addresses.find(a => a.is_default) || addresses[0] || null;
                    currentDefaultAddress = defaultAddress;
                    fillUserInfo(userInfo.data, defaultAddress);
                }
            } catch (error) {
                console.error('获取用户信息失败:', error);
            }
        }
    }
}

// 填充用户信息到表单
function fillUserInfo(userInfo, defaultAddress) {
    const nameInput = document.getElementById('customer-name');
    const phoneInput = document.getElementById('customer-phone');
    const phoneError = document.getElementById('phone-error');
    const addressInput = document.getElementById('customer-address');
    const addressError = document.getElementById('address-error');
    const editAddressBtn = document.getElementById('edit-address-btn');

    if (nameInput && userInfo.customer_username) nameInput.value = userInfo.customer_username;
    nameInput.readOnly = true;
    if (phoneInput && userInfo.customer_phone) {
        phoneInput.value = userInfo.customer_phone;
        if (phoneError) phoneError.style.display = 'none';
    }

    if (addressInput) {
        const addresses = window._savedAddresses || [];

        // 清理上次残留，防止叠加
        document.getElementById('address-ui-wrapper')?.remove();
        document.getElementById('address-toggle-btn')?.remove();

        if (addresses.length > 0) {
            // 构建 select
            const select = document.createElement('select');
            select.style.cssText = 'flex:1; width:100%; height:44px; border:1px solid #ddd; border-radius:6px; padding:0 12px; font-size:16px;';
            addresses.forEach(addr => {
                const opt = document.createElement('option');
                opt.value = addr.address_detail;
                opt.dataset.addressId = addr.address_id;
                opt.textContent = (addr.address_label ? `[${addr.address_label}] ` : '') +
                    addr.address_detail + (addr.is_default ? ' (默认)' : '');
                if (addr.is_default || addr === addresses[0]) opt.selected = true;
                select.appendChild(opt);
            });

            // 构建 input（默认隐藏）
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = '请输入收货地址';
            input.style.cssText = select.style.cssText + ' display:none;';

            // 包装容器
            const wrapper = document.createElement('div');
            wrapper.id = 'address-ui-wrapper';
            wrapper.style.cssText = 'flex:1;';
            wrapper.appendChild(select);
            wrapper.appendChild(input);
            addressInput.replaceWith(wrapper);

            // 切换按钮
            const toggleBtn = document.createElement('div');
            toggleBtn.id = 'address-toggle-btn';
            toggleBtn.style.cssText = 'font-size:13px; color:#e74c3c; cursor:pointer; margin-top:6px;';
            toggleBtn.textContent = '+ 使用新地址';
            wrapper.insertAdjacentElement('afterend', toggleBtn);

            // 统一切换逻辑
            let isNewMode = false;
            toggleBtn.addEventListener('click', function () {
                isNewMode = !isNewMode;
                if (isNewMode) {
                    select.style.display = 'none';
                    input.style.display = 'block';
                    input.value = '';
                    input.focus();
                    toggleBtn.textContent = '← 从已保存地址中选择';
                } else {
                    input.style.display = 'none';
                    select.style.display = 'block';
                    toggleBtn.textContent = '+ 使用新地址';
                }
            });

            // 付款时统一从 wrapper 取值
            wrapper.getValue = () => isNewMode ? input.value.trim() : select.value;
            wrapper.getAddressId = () => isNewMode ? null : (select.selectedOptions[0]?.dataset.addressId || null);

            if (editAddressBtn) editAddressBtn.style.display = 'none';
        } else {
            addressInput.value = '';
            addressInput.readOnly = false;
            if (editAddressBtn) editAddressBtn.style.display = 'none';
        }

        if (addressError) addressError.style.display = 'none';
    }
}

// 关窗口
function closePayPopup() {
    const popup = document.getElementById('popup-pay-interface');
    const overlay = document.getElementById('order-overlay');
    if (popup) popup.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    window._cartCheckoutMerchantId = null;
}


// 格式化日期时间
function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

// 订单修改功能
function editOrder(orderId) {
    console.log(`正在修改订单：${orderId}`);
    // 实际业务逻辑示例：
    // 1. 打开修改模态框
    // 2. 跳转到编辑页面
    // 3. 调用修改接口
}

// 动态生成订单内容
function generateOrderDetails(product_data) {
    console.log('product_data:', product_data);

    const currentTime = new Date();
    const formattedDateTime = formatDateTime(currentTime);

    // 先取出第一个商品
    const item = Array.isArray(product_data) ? product_data[0] : product_data;
    console.log('item:', item);

    const orderHTML = `
        <div class="order-block">
            <div class="order-block-header">
                <span>订单号：待生成</span>
                <span>下单时间：${formattedDateTime}</span>
            </div>
            ${product_data.map(item => `
                <div class="order-item-row">
                    <div class="item-left">
                        <span class="item-qty" data-value="1">1x</span>
                        <span class="item-name">${item.product_name || '未知商品'}</span>
                    </div>
                    <div class="item-right">
                        <div class="quantity-control">
                            <button class="quantity-btn minus" disabled>-</button>
                            <button class="quantity-btn plus">+</button>
                        </div>
                        <span class="item-price">￥${item.product_price || 0}</span>
                        <span class="packaging-fee">包装费：￥2.00</span>
                    </div>
                </div>
            `).join('')}
            <div class="order-summary-row">
                <span class="summary-label">合共</span>
                <div class="summary-values">
                    <span class="total-amount">￥0</span>
                </div>
            </div>
        </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = orderHTML;

    // 绑定事件
    container.querySelectorAll('.order-item-row').forEach(itemRow => {
        const qtySpan = itemRow.querySelector('.item-qty');
        const decreaseBtn = itemRow.querySelector('.quantity-btn.minus');
        const increaseBtn = itemRow.querySelector('.quantity-btn.plus');

        const updateQty = (newValue) => {
            qtySpan.textContent = newValue + 'x';
            qtySpan.dataset.value = newValue;
            decreaseBtn.disabled = newValue <= 1;
            increaseBtn.disabled = newValue >= 99;
            updateTotalPrice();
        };

        decreaseBtn.onclick = () => {
            const currentValue = parseInt(qtySpan.dataset.value);
            if (currentValue > 1) {
                updateQty(currentValue - 1);
            }
        };

        increaseBtn.onclick = () => {
            const currentValue = parseInt(qtySpan.dataset.value);
            if (currentValue < 99) {
                updateQty(currentValue + 1);
            }
        };
    });

    // 保存订单关键信息到全局
    window.currentOrderData = {
        order_id: null,
        product_id: item.product_id,
        product_name: item.product_name,
        merchant_id: item.merchant_id,
        merchant_name: item.merchant_name,
        product_price: item.product_price,
        order_quantity: 1,
        total_price: 0
    };
    // 新增全局赋值
    window.currentProductId = item.product_id || '';
    window.currentMerchantId = item.merchant_id || '';
    window.currentProductName = item.product_name || '';
    window.currentCustomerId = localStorage.getItem('customer_id') || '';
    console.log('全局赋值:', window.currentCustomerId, window.currentMerchantId, window.currentProductId);

    return container.firstElementChild;
}

// 价格计算函数
function updateTotalPrice() {
    let total = 0;
    let totalQuantity = 0;
    const itemRows = document.querySelectorAll('.order-item-row');
    if (!itemRows.length) return;

    itemRows.forEach(row => {
        const quantity = parseInt(row.querySelector('.item-qty').dataset.value) || 0;
        const price = parseFloat(row.querySelector('.item-price').textContent.match(/\d+/)[0]);
        totalQuantity += quantity;
        total += price * quantity;
    });

    const packagingFeeValue = totalQuantity * 2;
    const packagingFeeElem = document.querySelector('.packaging-fee');
    if (packagingFeeElem) packagingFeeElem.textContent = `包装费：￥${packagingFeeValue.toFixed(2)}`;

    total += packagingFeeValue;

    const totalAmountElem = document.querySelector('.total-amount');
    const paymentAmountElem = document.querySelector('.payment-amount');
    if (totalAmountElem) totalAmountElem.textContent = `￥${total.toFixed(2)}`;
    if (paymentAmountElem) paymentAmountElem.textContent = `￥${total.toFixed(2)}`;
}

async function loadOrderContent(product_id) {
    const orderContainer = document.getElementById('orders-container');
    if (!orderContainer) return;
    if (!product_id) {
        // 可以给个默认值或提示
        orderContainer.innerHTML = '<div>未指定商品</div>';
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/getProductInfo?product_id=${product_id}`);
        if (!response.ok) throw new Error(`请求失败: ${response.status}`);

        const result = await response.json();
        
        if (!result.data || Object.keys(result.data).length === 0) {
            throw new Error('未找到商品信息');
        }

        orderContainer.innerHTML = '';
        const productElement = generateOrderDetails(result.data);
        orderContainer.appendChild(productElement);
        setTimeout(() => {
            updateTotalPrice();
        }, 100);

    } catch (error) {
        console.error('数据加载失败:', error);
        orderContainer.innerHTML = `
            <div class="error">
                <div class="error-icon">⚠️</div>
                <p>${error.message}</p>
                <button onclick="location.reload()">重新加载</button>
            </div>
        `;
    }
}

function showCartCheckoutPopup(merchantId) {
    const merchant = Cart.getMerchant(merchantId);
    if (!merchant) return;

    const popup = document.getElementById('popup-pay-interface');
    const overlay = document.getElementById('order-overlay');
    popup.style.display = 'block';
    overlay.style.display = 'block';
    if (typeof outputtime === 'function') outputtime();
    checkLoginAndFillInfo();

    window._cartCheckoutMerchantId = merchantId;
    const orderContainer = document.getElementById('orders-container');
    orderContainer.innerHTML = '';

    const items = Object.values(merchant.items);
    let totalQty = 0, subtotal = 0;
    items.forEach(i => { totalQty += i.quantity; subtotal += i.product_price * i.quantity; });
    const packagingFee = totalQty * 2;
    const total = subtotal + packagingFee;

    orderContainer.innerHTML = `
        <div class="order-block">
            <div class="order-block-header">
                <span>订单号：待生成</span>
                <span>下单时间：${formatDateTime(new Date())}</span>
            </div>
            ${items.map(item => `
                <div class="order-item-row">
                    <div class="item-left">
                        <span class="item-qty" data-value="${item.quantity}">${item.quantity}x</span>
                        <span class="item-name">${item.product_name}</span>
                    </div>
                    <div class="item-right">
                        <span class="item-price">￥${item.product_price}</span>
                    </div>
                </div>
            `).join('')}
            <div class="order-item-row">
                <div class="item-left"><span class="item-name">包装费</span></div>
                <div class="item-right"><span class="item-price">￥${packagingFee.toFixed(2)}</span></div>
            </div>
            <div class="order-summary-row">
                <span class="summary-label">合共</span>
                <div class="summary-values">
                    <span class="total-amount">￥${total.toFixed(2)}</span>
                </div>
            </div>
        </div>`;

    const paymentAmountElem = document.querySelector('.payment-amount');
    if (paymentAmountElem) paymentAmountElem.textContent = `￥${total.toFixed(2)}`;
}


// 付款按钮点击事件
document.addEventListener('DOMContentLoaded', function() {
    
    // --- 新增：绑定“修改”按钮的切换逻辑 ---
    const editAddressBtn = document.getElementById('edit-address-btn');
    const addressInput = document.getElementById('customer-address');

    if (editAddressBtn && addressInput) {
        editAddressBtn.addEventListener('click', function() {
            if (addressInput.readOnly) {
                addressInput.readOnly = false;
                addressInput.focus();
                editAddressBtn.textContent = '确定';
            } else {
                addressInput.readOnly = true;
                editAddressBtn.textContent = '修改';
            }
        });
    }

    // --- 修改：付款按钮的原有逻辑，增加地址校验 ---
    const paymentBtn = document.getElementById('payment-btn');
    if (paymentBtn) {
        paymentBtn.onclick = async function() {
            const name = document.getElementById('customer-name').value.trim();
            const phone = document.getElementById('customer-phone').value.trim();
            const wrapper = document.getElementById('address-ui-wrapper');
            const addressEl = document.getElementById('customer-address');
            const address = wrapper ? wrapper.getValue() : addressEl?.value.trim();
            const address_id = wrapper ? wrapper.getAddressId() : null;

            let hasError = false;

            // 校验姓名和电话
            if (!name || !phone) {
                document.getElementById('phone-error').style.display = 'flex';
                hasError = true;
            } else {
                document.getElementById('phone-error').style.display = 'none';
            }

            // 校验地址
            if (!address) {
                document.getElementById('address-error').style.display = 'flex';
                hasError = true;
            } else {
                document.getElementById('address-error').style.display = 'none';
            }

            // 若有任何校验失败，中断提交
            if (hasError) return;

        
            // 购物车结算模式
            if (window._cartCheckoutMerchantId) {
                const merchantId = window._cartCheckoutMerchantId;
                const merchant = Cart.getMerchant(merchantId);
                if (!merchant) return;
                const items = Object.values(merchant.items);
                const customer_id = localStorage.getItem('customer_id');
                if (!customer_id) { alert('请先登录'); return; }
                const order_group_id = 'GRP' + Date.now();
                try {
                    const results = [];
                    for (const item of items) {
                        const r = await fetch('http://localhost:3000/api/insertCustomerOrderData', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                customer_id,
                                merchant_id: item.merchant_id,
                                product_id: item.product_id,
                                order_quantity: item.quantity,
                                total_price: parseFloat((item.product_price * item.quantity + item.quantity * 2).toFixed(2)),
                                order_status: 'Pending',
                                customer_address: address,
                                address_id: address_id || null,
                                order_group_id
                            })
                        }).then(res => res.json());
                        results.push(r);
                    }
                    if (results.every(r => r.success)) {
                        if (!address_id) {
                            fetch('http://localhost:3000/api/addAddress', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ customer_id, address_detail: address })
                            });
                        }
                        Cart.clearMerchant(merchantId);
                        alert('下单成功！');
                        closePayPopup();
                    } else {
                        alert('部分商品下单失败，请重试');
                    }
                } catch (err) {
                    alert('网络错误，请稍后再试');
                    console.error(err);
                }
                return;
            }

            // 单品模式
            const order_status = 'Pending';
            const customer_id = window.currentCustomerId;
            const merchant_id = window.currentMerchantId;
            const product_id = window.currentProductId;
            const product_name = window.currentProductName;
            const order_quantity = parseInt(document.querySelector('.item-qty').dataset.value);
            const total_price = parseFloat(document.querySelector('.total-amount').textContent.replace('￥', ''));

            if (!customer_id || !merchant_id || !product_id) {
                alert('用户或商品信息缺失，请重新登录或刷新页面');
                return;
            }

            try {
                const res = await fetch('http://localhost:3000/api/insertCustomerOrderData', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        customer_id,
                        merchant_id,
                        product_id,
                        order_quantity,
                        total_price,
                        order_status: 'Pending',
                        customer_address: address
                    })
                });
                const data = await res.json();
                if (data.success) {
                    if (!address_id) {
                        fetch('http://localhost:3000/api/addAddress', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ customer_id, address_detail: address, address_id: address_id || null })
                        });
                    }
                    alert('下单成功！');
                    closePayPopup();
                } else {
                    alert('下单失败：' + (data.message || '请重试'));
                }
            } catch (err) {
                alert('网络错误，请稍后再试');
                console.error(err);
            }
        };
    }
});