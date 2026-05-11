const API_BASE_URL = 'http://localhost:3000/api';

function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '无效日期';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function renderOrderList(orders) {
    if (!orders.length) {
        return '<div class="empty-order">暂无订单</div>';
    }
    return `
        <div class="order-list">
            <div class="order-header">
                <span>商品</span>
                <span>数量</span>
                <span>金额</span>
                <span>下单时间</span>
                <span>状态</span>
                <span>用户</span>
                <span>电话</span>
                <span>操作</span>
            </div>
            ${orders.map(order => `
                <div class="order-item">
                    <span data-label="商品">${order.product_name}</span>
                    <span data-label="数量">${order.order_quantity}</span>
                    <span data-label="金额">¥${parseFloat(order.total_price).toFixed(2)}</span>
                    <span data-label="下单时间">${formatDate(order.order_date)}</span>
                    <span data-label="状态">${order.order_status}</span>
                    <span data-label="用户">${order.customer_name}</span>
                    <span data-label="电话">${order.customer_phone}</span>
                    <span data-label="操作" style="font-weight:bold">
                        ${order.order_status === 'Pending' 
                            ? `<button class="confirm-btn" data-order-id="${order.order_id}">确认出餐</button>` 
                            : order.order_status === 'Processing'
                                ? `<span class="delivered-label">配送中</span>`
                                : order.order_status === 'Cancelled'
                                    ? `<span class="delivered-label" style="color:red">已取消</span>`
                                    : order.order_status === 'Completed'
                                        ? `<span class="delivered-label" style="color:blue">已完成</span>`
                                        : ''}
                    </span>
                </div>
            `).join('')}
        </div>
    `;
}

async function loadMerchantOrders() {
    const merchantId = localStorage.getItem('merchantId');
    const orderContent = document.getElementById('merchant-order-content');
    if (!merchantId) {
        orderContent.innerHTML = '<div class="empty-order">请先登录商家账号</div>';
        return;
    }
    orderContent.innerHTML = '<div class="loading">加载中...</div>';
    try {
        const res = await fetch(`${API_BASE_URL}/MerchantOrderView?merchant_id=${merchantId}`);
        const data = await res.json();
        
        if (data.success) {
            orderContent.innerHTML = renderOrderList(data.data);
        } else {
            orderContent.innerHTML = '<div class="empty-order">加载失败</div>';
        }
    } catch (e) {
        orderContent.innerHTML = '<div class="empty-order">网络错误</div>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadMerchantOrders();
    // 事件委托绑定"确认出餐"
    document.getElementById('merchant-order-content').addEventListener('click', async function(e) {
        if (e.target.classList.contains('confirm-btn')) {
            const orderId = e.target.getAttribute('data-order-id');
            if (confirm('确认要将该订单状态改为"Processing"吗？')) {
                const res = await fetch(`${API_BASE_URL}/updateOrderStatus`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order_id: orderId, order_status: 'Processing' })
                });
                const data = await res.json();
                if (data.success) {
                    const deliveryRes = await fetch(`${API_BASE_URL}/getDeliveryIdByOrderId?order_id=${orderId}`);
                    const deliveryData = await deliveryRes.json();
                    if (deliveryData.success) {
                        // 设置骑手取餐时间
                        await fetch(`${API_BASE_URL}/setRiderPickupTime`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ delivery_id: deliveryData.delivery_id })
                        });
                        // 随机生成骑手的配送时间
                        await fetch(`${API_BASE_URL}/startDeliverySimulation`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                order_id: orderId,
                                delivery_id: deliveryData.delivery_id,
                                min_minutes: 1, 
                                max_minutes: 2
                            })
                        });
                    }
                    alert('已确认出餐！');
                    loadMerchantOrders();
                } else {
                    alert('操作失败：' + (data.message || '未知错误'));
                }
            }
        }
    });
});