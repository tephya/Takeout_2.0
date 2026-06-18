const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, verifyRider } = require('../middleware/auth');

module.exports = (pool) => {

    // 骑手登录（返回 JWT）
    router.post('/riderLogin', (req, res) => {
        const { rider_phone, password } = req.body;
        if (!rider_phone || !password) return res.status(400).json({ success: false, message: '缺少参数' });
        pool.query('SELECT * FROM RiderInfo WHERE rider_phone = ?', [rider_phone], async (err, results) => {
            if (err) return res.status(500).json({ success: false });
            if (!results.length) return res.json({ success: false, message: '骑手不存在' });
            try {
                const match = await bcrypt.compare(password, results[0].password);
                if (!match) return res.json({ success: false, message: '密码错误' });
                const token = jwt.sign(
                    { id: results[0].rider_id, role: 'rider' },
                    JWT_SECRET,
                    { expiresIn: '7d' }
                );
                res.json({ success: true, token, data: results[0] });
            } catch (e) {
                res.status(500).json({ success: false });
            }
        });
    });

    // 骑手注册
    router.post('/riderRegister', async (req, res) => {
        const { rider_name, rider_phone, password } = req.body;
        if (!rider_name || !rider_phone || !password)
            return res.status(400).json({ success: false, message: '缺少参数' });

        pool.query('SELECT rider_id FROM RiderInfo WHERE rider_phone = ?', [rider_phone], async (err, results) => {
            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
            if (results.length) return res.json({ success: false, message: '该手机号已注册' });

            pool.query('SELECT rider_id FROM RiderInfo ORDER BY rider_id DESC LIMIT 1', async (err2, idResults) => {
                if (err2) return res.status(500).json({ success: false, message: '服务器错误' });

                let nextId = 'R000000001';
                if (idResults.length) {
                    const num = parseInt(idResults[0].rider_id.replace(/^R/, '')) + 1;
                    nextId = 'R' + num.toString().padStart(9, '0');
                }

                const hashed = await bcrypt.hash(password, 10);
                pool.query(
                    'INSERT INTO RiderInfo (rider_id, rider_name, rider_phone, score, password) VALUES (?, ?, ?, 5.0, ?)',
                    [nextId, rider_name, rider_phone, hashed],
                    (err3) => {
                        if (err3) return res.status(500).json({ success: false, message: '服务器错误' });
                        res.json({ success: true });
                    }
                );
            });
        });
    });

    // 骑手密码重置（无需鉴权）
    router.post('/riderResetPassword', async (req, res) => {
        const { rider_phone, new_password } = req.body;
        if (!rider_phone || !new_password)
            return res.status(400).json({ success: false, message: '缺少参数' });
        try {
            const hashed = await bcrypt.hash(new_password, 10);
            pool.query(
                'UPDATE RiderInfo SET password = ? WHERE rider_phone = ?',
                [hashed, rider_phone],
                (err, result) => {
                    if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                    res.json(result.affectedRows > 0
                        ? { success: true }
                        : { success: false, message: '手机号不存在' });
                }
            );
        } catch {
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    });

    // 设置取餐时间（需鉴权）
    router.post('/setRiderPickupTime', verifyRider, (req, res) => {
        const { delivery_id } = req.body;
        if (!delivery_id) return res.status(400).json({ success: false, message: '缺少 delivery_id' });
        pool.query(
            'UPDATE RiderDeliveryInfo SET pickup_time = NOW() WHERE delivery_id = ?',
            [delivery_id],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                res.json(results.affectedRows > 0 ? { success: true } : { success: false, message: '配送记录不存在' });
            }
        );
    });

    // 通过订单ID查配送记录ID（需鉴权）
    router.get('/getDeliveryIdByOrderId', verifyRider, (req, res) => {
        const { order_id } = req.query;
        if (!order_id) return res.status(400).json({ success: false, message: '缺少 order_id' });
        pool.query(
            'SELECT delivery_id FROM RiderDeliveryInfo WHERE order_id = ?',
            [order_id],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                if (results.length > 0) res.json({ success: true, delivery_id: results[0].delivery_id });
                else res.json({ success: false, message: '未找到配送记录' });
            }
        );
    });

    // 获取骑手当前订单（需鉴权，rider_id 从 token 取）riderRegister
    router.get('/riderOrders', verifyRider, (req, res) => {
        const rider_id = req.rider.id;
        pool.query(`
            SELECT d.delivery_id, d.order_id, d.delivery_status, d.pickup_time,
                o.customer_username, o.customer_phone, o.product_name,
                o.order_quantity, o.total_price, o.merchant_name, o.merchant_id
            FROM RiderDeliveryInfo d
            JOIN CustomerOrder o ON d.order_id = o.order_id
            WHERE d.rider_id = ?
            AND d.delivery_status IN ('In Transit', 'Picked Up')
            ORDER BY d.delivery_id DESC
        `, [rider_id], (err, results) => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true, data: results });
        });
    });

    // 更新配送状态（需鉴权）
    router.post('/updateDeliveryStatus', verifyRider, (req, res) => {
        const { delivery_id, order_id, delivery_status } = req.body;
        if (delivery_status === 'Picked Up') {
            pool.query(
                'UPDATE RiderDeliveryInfo SET delivery_status = ?, pickup_time = NOW() WHERE delivery_id = ?',
                ['Picked Up', delivery_id],
                (err) => {
                    if (err) return res.status(500).json({ success: false });
                    res.json({ success: true });
                }
            );
        } else if (delivery_status === 'Delivered') {
            pool.query(
                'UPDATE RiderDeliveryInfo SET delivery_status = ?, delivery_time = NOW() WHERE delivery_id = ?',
                ['Delivered', delivery_id],
                (err) => {
                    if (err) return res.status(500).json({ success: false });
                    pool.query(
                        'UPDATE CustomerOrderInfo SET order_status = ? WHERE order_id = ?',
                        ['Completed', order_id]
                    );
                    res.json({ success: true });
                }
            );
        } else {
            res.status(400).json({ success: false, message: '无效状态' });
        }
    });

    // 获取可抢订单：Ready 且尚未分配骑手（需鉴权）
    router.get('/availableOrders', verifyRider, (req, res) => {
        pool.query(`
            SELECT o.order_id, o.order_date, o.order_quantity, o.total_price,
                   o.customer_address, m.merchant_name, m.merchant_address, p.product_name
            FROM CustomerOrderInfo o
            JOIN MerchantInfo m ON o.merchant_id = m.merchant_id
            JOIN ProductInfo p ON o.product_id = p.product_id
            WHERE o.order_status = 'Ready'
            AND NOT EXISTS (
                SELECT 1 FROM RiderDeliveryInfo d WHERE d.order_id = o.order_id
            )
            ORDER BY o.order_date ASC
        `, (err, results) => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true, data: results });
        });
    });

    // 骑手抢单（需鉴权，事务保证原子性）
    router.post('/grabOrder', verifyRider, (req, res) => {
        const rider_id = req.rider.id;
        const { order_id } = req.body;
        if (!order_id) return res.status(400).json({ success: false, message: '缺少 order_id' });

        pool.getConnection((err, conn) => {
            if (err) return res.status(500).json({ success: false });
            conn.beginTransaction(err => {
                if (err) { conn.release(); return res.status(500).json({ success: false }); }

                // FOR UPDATE 加行锁，防并发双抢
                conn.query(
                    'SELECT order_status FROM CustomerOrderInfo WHERE order_id = ? FOR UPDATE',
                    [order_id],
                    (err, results) => {
                        if (err) return rollback(conn, res);
                        if (!results.length || results[0].order_status !== 'Ready') {
                            return rollback(conn, res, '订单已被抢走或状态有误');
                        }

                        conn.query(
                            'SELECT 1 FROM RiderDeliveryInfo WHERE order_id = ?',
                            [order_id],
                            (err, rows) => {
                                if (err) return rollback(conn, res);
                                if (rows.length) return rollback(conn, res, '订单已被抢走');

                                const now = new Date();
                                const pad = n => String(n).padStart(2, '0');
                                const delivery_id = `D${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

                                conn.query(
                                    'INSERT INTO RiderDeliveryInfo (delivery_id, order_id, rider_id, delivery_status) VALUES (?, ?, ?, ?)',
                                    [delivery_id, order_id, rider_id, 'In Transit'],
                                    (err) => {
                                        if (err) return rollback(conn, res);

                                        // 更新为 Processing；触发器检查到已有配送记录，不会重复分配
                                        conn.query(
                                            'UPDATE CustomerOrderInfo SET order_status = ? WHERE order_id = ?',
                                            ['Processing', order_id],
                                            (err) => {
                                                if (err) return rollback(conn, res);
                                                conn.commit(err => {
                                                    conn.release();
                                                    if (err) return res.status(500).json({ success: false });
                                                    res.json({ success: true, delivery_id });
                                                });
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                );
            });
        });
    });

    return router;
};

function rollback(conn, res, message) {
    conn.rollback(() => {
        conn.release();
        res.json({ success: false, message: message || '服务器错误' });
    });
}