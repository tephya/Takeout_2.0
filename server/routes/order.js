const express = require('express');
const router = express.Router();

module.exports = (pool) => {

    // 创建订单
    router.post('/insertCustomerOrderData', (req, res) => {
        const { customer_id, merchant_id, product_id, order_quantity, total_price, order_status } = req.body;
        if (!customer_id || !merchant_id || !product_id) {
            return res.status(400).json({ success: false, message: '缺少必要参数' });
        }
        // 后端生成 order_id
        pool.query('SELECT order_id FROM CustomerOrderInfo ORDER BY order_id DESC LIMIT 1', (err, results) => {
            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
            let nextId = 'O000000001';
            if (results.length > 0) {
                const num = parseInt(results[0].order_id.replace(/^O/, '')) + 1;
                nextId = 'O' + num.toString().padStart(9, '0');
            }
            const { customer_id, merchant_id, product_id, order_quantity, total_price, order_status, customer_address, address_id } = req.body;

            pool.query(
               'INSERT INTO CustomerOrderInfo (order_id, customer_id, merchant_id, product_id, order_quantity, total_price, order_status, customer_address, address_id, order_group_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [nextId, customer_id, merchant_id, product_id, order_quantity, total_price, order_status || 'Pending', customer_address || null, address_id || null, req.body.order_group_id || null],
                (err) => {
                    if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                    res.json({ success: true, order_id: nextId });
                }
            );
        });
    });

    // 查询客户订单
    router.get('/CustomerOrderView', (req, res) => {
        const { customer_id } = req.query;
        pool.query('SELECT * FROM CustomerOrder WHERE customer_id = ? ORDER BY order_date DESC', [customer_id], (err, results) => {
            if (err) {
                console.error('查询订单失败:', err);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            res.json({ success: true, data: results });
        });
    });

    // 更新订单状态
    router.post('/updateOrderStatus', (req, res) => {
        const { order_id, order_status, cancel_reason } = req.body;
        pool.query(
            'UPDATE CustomerOrderInfo SET order_status = ?, cancel_reason = ? WHERE order_id = ?',
            [order_status, cancel_reason || null, order_id],
            (err, result) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                res.json(result.affectedRows > 0 ? { success: true } : { success: false, message: '订单不存在' });
            }
        );
    });

    // 提交评价
    router.post('/submitReview', (req, res) => {
        const { order_id, customer_id, product_id, review_type, review_text, rider_score } = req.body;
        if (!order_id || !customer_id || !product_id || !review_type) {
            return res.status(400).json({ success: false, message: '缺少必要参数' });
        }
        const review_id = 'R' + order_id.slice(1); // 与 order_id 对齐格式
        pool.query(
            `INSERT INTO ProductReview (review_id, order_id, customer_id, product_id, review_type, review_text)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [review_id, order_id, customer_id, product_id, review_type, review_text || null],
            (err) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(409).json({ success: false, message: '该订单已评价' });
                    }
                    return res.status(500).json({ success: false, message: '服务器错误' });
                }
                // 同步更新 ProductInfo 计数器
                const col = review_type === 'good' ? 'good_review_count' : 'bad_review_count';
                pool.query(`UPDATE ProductInfo SET ${col} = ${col} + 1 WHERE product_id = ?`, [product_id]);
                if (rider_score && rider_score >= 1 && rider_score <= 5) {
                    pool.query(
                        'SELECT rider_id FROM RiderDeliveryInfo WHERE order_id = ? LIMIT 1',
                        [order_id],
                        (err, rows) => {
                            if (!err && rows.length) {
                                pool.query(
                                    `UPDATE RiderInfo
                                    SET score = ROUND((score * rating_count + ?) / (rating_count + 1), 1),
                                        rating_count = rating_count + 1
                                    WHERE rider_id = ?`,
                                    [rider_score, rows[0].rider_id]
                                );
                            }
                        }
                    );
                }
                res.json({ success: true });
            }
        );
    });

    return router;
};

