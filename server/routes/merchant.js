const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, verifyMerchant } = require('../middleware/auth');

module.exports = (pool) => {

    // 提交入驻申请（写入 MerchantApplication，不直接入库 MerchantInfo）
    router.post('/insertMerchantInfo', async (req, res) => {
        const { merchant_name, merchant_phone, merchant_address, opening_time, closing_time, password, is_24h, cuisine_type } = req.body;

        pool.query(
            'SELECT status FROM MerchantApplication WHERE merchant_phone = ? ORDER BY apply_date DESC LIMIT 1',
            [merchant_phone],
            async (err, appResults) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                if (appResults.length && appResults[0].status === 'pending') {
                    return res.json({ success: false, message: '该手机号已有待审核的申请，请等待审核结果' });
                }

                pool.query(
                    'SELECT merchant_id FROM MerchantInfo WHERE merchant_phone = ?',
                    [merchant_phone],
                    async (err2, merchantResults) => {
                        if (err2) return res.status(500).json({ success: false, message: '服务器错误' });
                        if (merchantResults.length) {
                            return res.json({ success: false, message: '该手机号已注册为商家' });
                        }

                        pool.query(
                            'SELECT application_id FROM MerchantApplication ORDER BY application_id DESC LIMIT 1',
                            async (err3, idResults) => {
                                if (err3) return res.status(500).json({ success: false, message: '服务器错误' });

                                let nextId = 'A000000001';
                                if (idResults.length > 0) {
                                    const num = parseInt(idResults[0].application_id.replace(/^A/, '')) + 1;
                                    nextId = 'A' + num.toString().padStart(9, '0');
                                }

                                const hashed = await bcrypt.hash(password, 10);
                                pool.query(
                                    'INSERT INTO MerchantApplication (application_id, merchant_name, merchant_phone, merchant_address, opening_time, closing_time, password, is_24h, cuisine_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                                    [nextId, merchant_name, merchant_phone, merchant_address, opening_time, closing_time, hashed, is_24h || 0, cuisine_type || null],
                                    (err4) => {
                                        if (err4) return res.status(500).json({ success: false, message: '服务器错误' });
                                        res.json({ success: true });
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });

    // 商家登录
    router.post('/merchant/login', (req, res) => {
        const { merchant_phone, password } = req.body;
        pool.query(
            'SELECT merchant_id, merchant_name, password FROM MerchantInfo WHERE merchant_phone = ?',
            [merchant_phone],
            async (err, results) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });

                if (!results.length) {
                    pool.query(
                        'SELECT status, reject_reason FROM MerchantApplication WHERE merchant_phone = ? ORDER BY apply_date DESC LIMIT 1',
                        [merchant_phone],
                        (err2, appResults) => {
                            if (err2) return res.status(500).json({ success: false, message: '服务器错误' });
                            if (appResults.length) {
                                const { status, reject_reason } = appResults[0];
                                if (status === 'pending') return res.json({ success: false, message: '您的入驻申请正在审核中，请耐心等待' });
                                if (status === 'rejected') return res.json({ success: false, message: `入驻申请已被拒绝：${reject_reason}` });
                            }
                            return res.json({ success: false, message: '手机号或密码错误' });
                        }
                    );
                    return;
                }

                const match = await bcrypt.compare(password, results[0].password);
                if (!match) return res.json({ success: false, message: '手机号或密码错误' });

                const token = jwt.sign(
                    { id: results[0].merchant_id, role: 'merchant' },
                    JWT_SECRET,
                    { expiresIn: '7d' }
                );
                res.json({ success: true, token, merchant_id: results[0].merchant_id, merchant_name: results[0].merchant_name });
            }
        );
    });

    // 查询商家所有订单
    router.get('/MerchantOrderView', verifyMerchant, (req, res) => {
        const merchant_id = req.merchant.id;
        pool.query(
            'SELECT * FROM CustomerOrder WHERE merchant_id = ? ORDER BY order_date DESC',
            [merchant_id],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                res.json({ success: true, data: results });
            }
        );
    });

    // 获取营业时间 + 临时关店状态
    router.get('/getMerchantBusinessHours', verifyMerchant, (req, res) => {
        const merchant_id = req.merchant.id;
        pool.query(
            'SELECT opening_time, closing_time, is_temporarily_closed, cuisine_type, cover_product_id FROM MerchantInfo WHERE merchant_id = ?',
            [merchant_id],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                if (results.length > 0) res.json({ success: true, data: results[0] });
                else res.json({ success: false, message: '商家不存在' });
            }
        );
    });

    // 设置封面餐品
    router.post('/setCoverProduct', verifyMerchant, (req, res) => {
        const merchant_id = req.merchant.id;
        const { product_id } = req.body;
        pool.query(
            'UPDATE MerchantInfo SET cover_product_id = ? WHERE merchant_id = ?',
            [product_id || null, merchant_id],
            (err, result) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                res.json(result.affectedRows > 0 ? { success: true } : { success: false, message: '商家不存在' });
            }
        );
    });

    // 更新营业时间
    router.post('/updateMerchantBusinessHours', verifyMerchant, (req, res) => {
        const merchant_id = req.merchant.id;
        const { opening_time, closing_time } = req.body;
        if (!opening_time || !closing_time) return res.status(400).json({ success: false, message: '缺少参数' });
        const { cuisine_type } = req.body;
        pool.query(
            'UPDATE MerchantInfo SET opening_time = ?, closing_time = ?, cuisine_type = ? WHERE merchant_id = ?',
            [opening_time, closing_time, cuisine_type || null, merchant_id],
            (err, result) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                res.json(result.affectedRows > 0 ? { success: true } : { success: false, message: '商家不存在' });
            }
        );
    });

    // 设置临时关店状态
    router.post('/setTemporaryClosure', verifyMerchant, (req, res) => {
        const merchant_id = req.merchant.id;
        const { is_temporarily_closed } = req.body;
        if (is_temporarily_closed === undefined) return res.status(400).json({ success: false, message: '缺少参数' });
        pool.query(
            'UPDATE MerchantInfo SET is_temporarily_closed = ? WHERE merchant_id = ?',
            [is_temporarily_closed ? 1 : 0, merchant_id],
            (err, result) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                res.json(result.affectedRows > 0 ? { success: true } : { success: false, message: '商家不存在' });
            }
        );
    });

    // 获取商家名称
    router.get('/getMerchantName', verifyMerchant, (req, res) => {
        const merchant_id = req.merchant.id;
        pool.query(
            'SELECT merchant_name FROM MerchantInfo WHERE merchant_id = ?',
            [merchant_id],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                if (results.length > 0) res.json({ success: true, merchant_name: results[0].merchant_name });
                else res.json({ success: false, message: '商家不存在' });
            }
        );
    });

    // 商家统计数据
    router.get('/getMerchantStats', verifyMerchant, (req, res) => {
        const merchant_id = req.merchant.id;
        pool.query(
            `SELECT
                COUNT(*) AS total_orders,
                SUM(CASE WHEN DATE(order_date) = CURDATE() THEN 1 ELSE 0 END) AS today_orders,
                SUM(CASE WHEN order_status NOT IN ('Cancelled') THEN total_price ELSE 0 END) AS total_revenue,
                SUM(CASE WHEN order_status NOT IN ('Cancelled') AND DATE(order_date) = CURDATE() THEN total_price ELSE 0 END) AS today_revenue,
                SUM(CASE WHEN order_status = 'Pending' THEN 1 ELSE 0 END) AS pending_orders
            FROM CustomerOrderInfo WHERE merchant_id = ?`,
            [merchant_id],
            (err, orderRows) => {
                if (err) return res.status(500).json({ success: false });
                pool.query(
                    `SELECT COALESCE(SUM(good_review_count),0) AS total_good, COALESCE(SUM(bad_review_count),0) AS total_bad FROM ProductInfo WHERE merchant_id = ?`,
                    [merchant_id],
                    (err2, reviewRows) => {
                        if (err2) return res.status(500).json({ success: false });
                        const o = orderRows[0];
                        const r = reviewRows[0];
                        const total = r.total_good + r.total_bad;
                        const good_rate = total > 0 ? Math.round(r.total_good / total * 100) : null;
                        res.json({
                            success: true,
                            data: {
                                today_orders: o.today_orders || 0,
                                total_orders: o.total_orders || 0,
                                today_revenue: parseFloat(o.today_revenue || 0).toFixed(2),
                                total_revenue: parseFloat(o.total_revenue || 0).toFixed(2),
                                pending_orders: o.pending_orders || 0,
                                good_rate: good_rate
                            }
                        });
                    }
                );
            }
        );
    });

    // 获取商家地址
    router.get('/getMerchantAddress', verifyMerchant, (req, res) => {
        const merchant_id = req.merchant.id;
        pool.query(
            'SELECT merchant_address FROM MerchantInfo WHERE merchant_id = ?',
            [merchant_id],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                if (results.length > 0) res.json({ success: true, merchant_address: results[0].merchant_address });
                else res.json({ success: false, message: '商家不存在' });
            }
        );
    });

    // 忘记密码
    router.post('/merchantResetPassword', async (req, res) => {
        const { merchant_phone, new_password } = req.body;
        if (!merchant_phone || !new_password) return res.status(400).json({ success: false, message: '缺少参数' });
        try {
            const hashed = await bcrypt.hash(new_password, 10);
            pool.query(
                'UPDATE MerchantInfo SET password = ? WHERE merchant_phone = ?',
                [hashed, merchant_phone],
                (err, result) => {
                    if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                    res.json(result.affectedRows > 0 ? { success: true } : { success: false, message: '手机号不存在' });
                }
            );
        } catch (e) {
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    });

    // 获取商家自定义分类列表
    router.get('/getMerchantCategories', verifyMerchant, (req, res) => {
        const merchant_id = req.merchant.id;
        pool.query(
            'SELECT category_id, category_name, sort_order FROM MerchantCategory WHERE merchant_id = ? ORDER BY sort_order ASC, category_id ASC',
            [merchant_id],
            (err, results) => {
                if (err) return res.status(500).json({ success: false });
                res.json({ success: true, data: results });
            }
        );
    });

    // 新增分类
    router.post('/addMerchantCategory', verifyMerchant, (req, res) => {
        const merchant_id = req.merchant.id;
        const { category_name } = req.body;
        if (!category_name?.trim()) return res.status(400).json({ success: false, message: '分类名称不能为空' });
        pool.query(
            'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM MerchantCategory WHERE merchant_id = ?',
            [merchant_id],
            (err, rows) => {
                if (err) return res.status(500).json({ success: false });
                const sort_order = rows[0].next_order;
                pool.query(
                    'INSERT INTO MerchantCategory (merchant_id, category_name, sort_order) VALUES (?, ?, ?)',
                    [merchant_id, category_name.trim(), sort_order],
                    (err2, result) => {
                        if (err2) return res.status(500).json({ success: false });
                        res.json({ success: true, category_id: result.insertId });
                    }
                );
            }
        );
    });

    // 重命名分类（同步更新商品 category 字段）
    router.post('/renameMerchantCategory', verifyMerchant, (req, res) => {
        const merchant_id = req.merchant.id;
        const { category_id, old_name, new_name } = req.body;
        if (!category_id || !new_name?.trim()) return res.status(400).json({ success: false, message: '参数缺失' });
        pool.query(
            'UPDATE MerchantCategory SET category_name = ? WHERE category_id = ? AND merchant_id = ?',
            [new_name.trim(), category_id, merchant_id],
            (err, result) => {
                if (err) return res.status(500).json({ success: false });
                if (!result.affectedRows) return res.json({ success: false, message: '分类不存在' });
                pool.query(
                    'UPDATE ProductInfo SET category = ? WHERE merchant_id = ? AND category = ?',
                    [new_name.trim(), merchant_id, old_name],
                    (err2) => {
                        if (err2) return res.status(500).json({ success: false });
                        res.json({ success: true });
                    }
                );
            }
        );
    });

    // 删除分类（该分类商品 category 置 NULL）
    router.post('/deleteMerchantCategory', verifyMerchant, (req, res) => {
        const merchant_id = req.merchant.id;
        const { category_id, category_name } = req.body;
        if (!category_id) return res.status(400).json({ success: false, message: '参数缺失' });
        pool.query(
            'DELETE FROM MerchantCategory WHERE category_id = ? AND merchant_id = ?',
            [category_id, merchant_id],
            (err, result) => {
                if (err) return res.status(500).json({ success: false });
                if (!result.affectedRows) return res.json({ success: false, message: '分类不存在' });
                pool.query(
                    'UPDATE ProductInfo SET category = NULL WHERE merchant_id = ? AND category = ?',
                    [merchant_id, category_name],
                    (err2) => {
                        if (err2) return res.status(500).json({ success: false });
                        res.json({ success: true });
                    }
                );
            }
        );
    });

    return router;
};