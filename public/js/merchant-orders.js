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
                            ? `<button class="confirm-btn" data-order-id="${order.order_id}">确认出餐</button>
                               <button class="reject-btn" data-order-id="${order.order_id}">拒单</button>`
                                : order.order_status === 'Ready'
                                    ? `<span class="delivered-label" style="color:orange">待取餐</span>`
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
    const token = localStorage.getItem('merchantToken');
    const orderContent = document.getElementById('merchant-order-content');
    if (!token) {
        orderContent.innerHTML = '<div class="empty-order">请先登录商家账号</div>';
        return;
    }
    orderContent.innerHTML = '<div class="loading">加载中...</div>';
    try {
        const res = await fetch(`${API_BASE_URL}/MerchantOrderView`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
            orderContent.innerHTML = '<div class="empty-order">登录已过期，请重新登录</div>';
            setTimeout(() => { window.location.href = 'merchant-login.html'; }, 1500);
            return;
        }
        const data = await res.json();
        orderContent.innerHTML = data.success ? renderOrderList(data.data) : '<div class="empty-order">加载失败</div>';
    } catch (e) {
        orderContent.innerHTML = '<div class="empty-order">网络错误</div>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadMerchantOrders();
    document.getElementById('merchant-order-content').addEventListener('click', async function (e) {
        if (e.target.classList.contains('confirm-btn')) {
            const orderId = e.target.getAttribute('data-order-id');
            if (confirm('确认要将该订单状态改为"Ready"吗？')) {
                const res = await fetch(`${API_BASE_URL}/updateOrderStatus`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order_id: orderId, order_status: 'Ready' })
                });
                const data = await res.json();
                if (data.success) { alert('已确认出餐！'); loadMerchantOrders(); }
                else alert('操作失败：' + (data.message || '未知错误'));
            }
        }
        if (e.target.classList.contains('reject-btn')) {
            const orderId = e.target.getAttribute('data-order-id');
            const reason = prompt('请输入拒单原因（必填）：');
            if (reason === null) return;
            if (!reason.trim()) { alert('拒单原因不能为空'); return; }
            const res = await fetch(`${API_BASE_URL}/updateOrderStatus`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, order_status: 'Cancelled', cancel_reason: reason.trim() })
            });
            const data = await res.json();
            if (data.success) { alert('已拒单'); loadMerchantOrders(); }
            else alert('操作失败：' + (data.message || '未知错误'));
        }
    });
});