// 常量定义
const API_BASE_URL = 'http://localhost:3000/api';
const STATUS_TYPES = {
    PENDING: 'Pending',
    PROCESSING: 'Processing',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled'
};

// 工具函数
const utils = {
    formatDate(dateString) {
        const date = new Date(dateString);
        return isNaN(date.getTime()) 
            ? '无效日期' 
            : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    },

    formatPrice(price) {
        return parseFloat(price) || 0;
    },

    handleError(error) {
        console.error(error);
        return null;
    }
};

// 订单状态处理
const orderStatus = {
    getClass(status) {
        const statusMap = {
            [STATUS_TYPES.PENDING]: 'status-pending',
            [STATUS_TYPES.PROCESSING]: 'status-processing',
            [STATUS_TYPES.COMPLETED]: 'status-completed',
            [STATUS_TYPES.CANCELLED]: 'status-cancelled'
        };
        return statusMap[status] || 'status-processing';
    },

    getText(status) {
        const textMap = {
            [STATUS_TYPES.PENDING]: '商家备餐中',
            'Ready': '待取餐',
            [STATUS_TYPES.PROCESSING]: '骑手配送中',
            [STATUS_TYPES.COMPLETED]: '已完成',
            [STATUS_TYPES.CANCELLED]: '已取消'
        };
        return textMap[status] || '处理中';
    }
};

// API 服务
const orderService = {
    getCustomerOrders: async (customer_id) => {
        const response = await fetch(`${API_BASE_URL}/CustomerOrderView?customer_id=${customer_id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        }).catch(utils.handleError);

        if (!response?.ok) return null;

        const result = await response.json().catch(utils.handleError);
        return result?.data || null;
    }
};

// 视图渲染
const orderView = {
    renderOrderItem(order) {
        const totalPrice = utils.formatPrice(order.total_price);
        // 判断是否显示取消按钮
        const canCancel = order.order_status === 'Pending';

        // 新增：好评/差评按钮，仅已完成订单显示
        let commentBtns = '';
        if (order.order_status === 'Completed') {
            if (order.review_type) {
                commentBtns = `<span class="comment-btns"><span class="comment-done">${order.review_type === 'good' ? '👍 已好评' : '👎 已差评'}</span></span>`;
            } else {
                commentBtns = `
                    <span class="comment-btns">
                        <img src="images/icons/thumbs-up.svg" class="comment-icon comment-good"
                            title="好评" data-order-id="${order.order_id}" data-product-id="${order.product_id}">
                        <img src="images/icons/thumbs-down.svg" class="comment-icon comment-bad"
                            title="差评" data-order-id="${order.order_id}" data-product-id="${order.product_id}">
                    </span>`;
            }
        }

        return `
            <div class="order-item">
                <div class="merchant-info">
                    <img src="${order.product_image_url ? 'http://localhost:3000' + order.product_image_url : 'images/store-pending.svg'}"
                        alt="${order.product_name || '商品图片'}"
                        class="merchant-image"
                        onerror="this.onerror=null; this.src='./images/system/store-pending.svg';"
                    <span>${order.merchant_name || '未知商家'}</span>
                </div>
                <span class="product-name">${order.product_name || '未知商品'}</span>
                <span class="quantity">${order.order_quantity || 0}</span>
                <span class="price">¥${totalPrice.toFixed(2)}</span>
                <div class="status-wrapper">
                    <span class="${orderStatus.getClass(order.order_status)}">${orderStatus.getText(order.order_status)}</span>
                    ${commentBtns}
                </div>
                <span class="order-time">${utils.formatDate(order.order_date)}
                    ${canCancel ? `<button class="cancel-btn" data-order-id="${order.order_id}">取消</button>` : ''}
                </span>
            </div>
        `;
    },

    renderOrderList(orders = []) {
        if (!orders.length) {
            return this.showMessage('empty', '暂无订单记录');
        }

        return `
            <div class="order-list">
                <div class="order-header">
                    <span>商家信息</span>
                    <span>商品</span>
                    <span>数量</span>
                    <span>金额</span>
                    <span>状态</span>
                    <span>时间</span>
                </div>
                ${orders.map(order => this.renderOrderItem(order)).join('')}
            </div>
        `;
    },

    showMessage(type, message) {
        if (type === 'empty') {
            return `
                <div class="empty-order">
                    <svg class="empty-illustration" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="100" cy="85" r="55" fill="#f5f5f5" stroke="#e0e0e0" stroke-width="2"/>
                        <ellipse cx="100" cy="138" rx="45" ry="8" fill="#eeeeee"/>
                        <path d="M72 85 Q100 60 128 85" stroke="#bdbdbd" stroke-width="3" fill="none" stroke-linecap="round"/>
                        <circle cx="85" cy="90" r="4" fill="#bdbdbd"/>
                        <circle cx="115" cy="90" r="4" fill="#bdbdbd"/>
                        <path d="M88 105 Q100 98 112 105" stroke="#bdbdbd" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                    </svg>
                    <p class="empty-title">还没有订单</p>
                    <p class="empty-subtitle">${message}</p>
                    <a href="./index.html" class="empty-action-btn">去逛逛</a>
                </div>
            `;
        }
        return `<div class="empty-order empty-order--simple">${message}</div>`;
    }
};

// 主程序
const initOrderPage = async () => {
    const orderContent = document.getElementById('order-content');
    if (!orderContent) return;

    const customer_id = localStorage.getItem('customer_id');
    if (!customer_id) {
        orderContent.innerHTML = orderView.showMessage('login', '请先登录后查看订单');
        return;
    }

    await loadOrders(orderContent, customer_id);

    document.getElementById('refresh-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('refresh-btn');
        btn.disabled = true;
        btn.classList.add('refreshing');
        await loadOrders(orderContent, customer_id);
        btn.disabled = false;
        btn.classList.remove('refreshing');
    });
};

// 抽取加载订单的函数
const loadOrders = async (orderContent, customer_id) => {
    try {
        const orderData = await orderService.getCustomerOrders(customer_id);
        if (orderData) {
            orderContent.innerHTML = orderView.renderOrderList(orderData);
        } else {
            orderContent.innerHTML = orderView.showMessage('error', '获取订单数据失败，请稍后重试');
        }
    } catch (error) {
        console.error('加载订单失败:', error);
        orderContent.innerHTML = orderView.showMessage('error', '加载订单失败，请刷新页面重试');
    }
};

// 弹窗HTML插入body
if (!document.getElementById('cancel-modal')) {
    const modal = document.createElement('div');
    modal.id = 'cancel-modal';
    modal.style.display = 'none';
    modal.innerHTML = `
        <div class="modal-mask" style="position:fixed;left:0;top:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:1000;"></div>
        <div class="modal-content" style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;padding:32px;border-radius:12px;z-index:1001;min-width:320px;max-width:90vw;box-shadow:0 4px 24px rgba(0,0,0,0.15);">
            <div style="font-size:18px;font-weight:600;margin-bottom:16px;">确认取消订单？</div>
            <div style="font-size:14px;color:#666;margin-bottom:10px;">取消原因</div>
            <div id="cancel-reason-options" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">
                <label class="cancel-reason-label"><input type="radio" name="cancel_reason" value="等待时间太长"> 等待时间太长</label>
                <label class="cancel-reason-label"><input type="radio" name="cancel_reason" value="下错订单"> 下错订单</label>
                <label class="cancel-reason-label"><input type="radio" name="cancel_reason" value="商家未接单"> 商家未接单</label>
                <label class="cancel-reason-label"><input type="radio" name="cancel_reason" value="其他"> 其他</label>
            </div>
            <textarea id="cancel-reason-text" placeholder="补充说明（选填）"
                style="width:100%;height:70px;border:1px solid #eee;border-radius:8px;padding:10px;font-size:14px;resize:none;outline:none;display:none;"></textarea> 
            <div style="margin-top:16px;display:flex;justify-content:flex-end;gap:10px;">
                <button id="modal-cancel-cancel" style="background:#eee;color:#333;padding:8px 24px;border:none;border-radius:6px;cursor:pointer;">返回</button>
                <button id="modal-confirm-cancel" style="background:#e74c3c;color:#fff;padding:8px 24px;border:none;border-radius:6px;cursor:pointer;">确认取消</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// 事件委托绑定取消按钮
function bindCancelBtnEvent() {
    document.getElementById('order-content').addEventListener('click', function(e) {
        if (e.target.classList.contains('cancel-btn')) {
            const orderId = e.target.getAttribute('data-order-id');
            showCancelModal(orderId);
        }
    });
}

function showCancelModal(orderId) {
    const modal = document.getElementById('cancel-modal');

    // 重置状态
    document.querySelectorAll('input[name="cancel_reason"]').forEach(r => r.checked = false);
    document.getElementById('cancel-reason-text').style.display = 'none';
    document.getElementById('cancel-reason-text').value = '';
    modal.style.display = 'block';

    // "其他" 选项显示 textarea
    document.getElementById('cancel-reason-options').addEventListener('change', function(e) {
        const textarea = document.getElementById('cancel-reason-text');
        textarea.style.display = e.target.value === '其他' ? 'block' : 'none';
    });

    document.getElementById('modal-cancel-cancel').onclick = () => {
        modal.style.display = 'none';
    };

    document.getElementById('modal-confirm-cancel').onclick = async function() {
        const selected = document.querySelector('input[name="cancel_reason"]:checked');
        if (!selected) {
            alert('请选择取消原因');
            return;
        }
        const reason = selected.value === '其他'
            ? (document.getElementById('cancel-reason-text').value.trim() || '其他')
            : selected.value;

        try {
            const res = await fetch('http://localhost:3000/api/updateOrderStatus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, order_status: 'Cancelled', cancel_reason: reason })
            });
            const data = await res.json();
            if (data.success) {
                modal.style.display = 'none';
                const customer_id = localStorage.getItem('customer_id');
                await loadOrders(document.getElementById('order-content'), customer_id);
            } else {
                alert('取消失败：' + (data.message || '未知错误'));
            }
        } catch {
            alert('网络错误，请稍后重试');
        }
    };
}

// 页面加载后绑定事件
window.onload = async function() {
    await initOrderPage();
    bindCancelBtnEvent();

    // 头像点击跳转账户页面
    const avatarImg = document.getElementById('is-login');
    if (avatarImg) {
        avatarImg.style.cursor = 'pointer';
        avatarImg.addEventListener('click', () => {
            window.location.href = './account.html?from=myorder';
        });
    }

    if (!document.getElementById('review-modal')) {
    const modal = document.createElement('div');
    modal.id = 'review-modal';
    modal.style.display = 'none';
    modal.innerHTML = `
        <div class="modal-mask" style="position:fixed;left:0;top:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:1000;"></div>
        <div class="modal-content" style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;padding:32px;border-radius:12px;z-index:1001;min-width:320px;max-width:90vw;box-shadow:0 4px 24px rgba(0,0,0,0.15);">
            <div style="font-size:18px;font-weight:600;margin-bottom:8px;" id="review-modal-title">评价订单</div>
            <div style="font-size:13px;color:#999;margin-bottom:16px;" id="review-modal-product"></div>
            <textarea id="review-text-input" placeholder="写下您的评价（选填）"
                style="width:100%;height:90px;border:1px solid #eee;border-radius:8px;padding:10px;font-size:14px;resize:none;outline:none;"></textarea>
            <div id="rider-rating-section" style="margin-top:16px;">
                <div style="font-size:14px;color:#666;margin-bottom:8px;">骑手评分（选填）</div>
                <div id="star-rating" style="font-size:28px;cursor:pointer;letter-spacing:4px;">
                    <span data-score="1">☆</span>
                    <span data-score="2">☆</span>
                    <span data-score="3">☆</span>
                    <span data-score="4">☆</span>
                    <span data-score="5">☆</span>
                </div>
            </div> 
            <div style="margin-top:16px;display:flex;justify-content:flex-end;gap:10px;">
                <button id="review-modal-cancel" style="background:#eee;color:#333;padding:8px 24px;border:none;border-radius:6px;cursor:pointer;">取消</button>
                <button id="review-modal-confirm" style="background:#e74c3c;color:#fff;padding:8px 24px;border:none;border-radius:6px;cursor:pointer;">提交</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}
};

document.getElementById('order-content').addEventListener('click', function(e) {
    const btn = e.target.closest('.comment-good, .comment-bad');
    if (!btn) return;

    const isGood = btn.classList.contains('comment-good');
    const orderId = btn.dataset.orderId;
    const productId = btn.dataset.productId;

    const modal = document.getElementById('review-modal');
    document.getElementById('review-modal-title').textContent = isGood ? '👍 好评' : '👎 差评';
    document.getElementById('review-modal-product').textContent = `订单：${orderId}`;
    document.getElementById('review-text-input').value = '';
    modal.style.display = 'block';
    let selectedScore = 0;
    const stars = modal.querySelectorAll('#star-rating span');

    // 重置星级
    stars.forEach(s => s.textContent = '☆');
    selectedScore = 0;

    stars.forEach(star => {
        star.addEventListener('mouseover', () => {
            stars.forEach(s => s.textContent = parseInt(s.dataset.score) <= parseInt(star.dataset.score) ? '★' : '☆');
        });
        star.addEventListener('mouseout', () => {
            stars.forEach(s => s.textContent = parseInt(s.dataset.score) <= selectedScore ? '★' : '☆');
        });
        star.addEventListener('click', () => {
            selectedScore = parseInt(star.dataset.score);
            stars.forEach(s => s.textContent = parseInt(s.dataset.score) <= selectedScore ? '★' : '☆');
        });
    });

    document.getElementById('review-modal-cancel').onclick = () => {
        modal.style.display = 'none';
    };

    document.getElementById('review-modal-confirm').onclick = async () => {
        const reviewText = document.getElementById('review-text-input').value.trim();
        const customerId = localStorage.getItem('customer_id');
        document.getElementById('review-modal-confirm').disabled = true;

        try {
            const res = await fetch(`${API_BASE_URL}/submitReview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: orderId,
                    customer_id: customerId,
                    product_id: productId,
                    review_type: isGood ? 'good' : 'bad',
                    review_text: reviewText || null,
                    rider_score: selectedScore || null
                })
            });
            const data = await res.json();
            modal.style.display = 'none';

            if (data.success) {
                // 局部更新按钮，不重新拉全量
                const wrapper = btn.closest('.comment-btns');
                if (wrapper) {
                    wrapper.innerHTML = `<span class="comment-done">${isGood ? '👍 已好评' : '👎 已差评'}</span>`;
                }
            } else {
                alert(data.message || '提交失败，请重试');
                document.getElementById('review-modal-confirm').disabled = false;
            }
        } catch {
            alert('网络错误，请稍后重试');
            document.getElementById('review-modal-confirm').disabled = false;
        }
    };
});