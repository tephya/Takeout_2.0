const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, verifyAdmin } = require('../middleware/auth');

module.exports = (pool) => {

    // 管理员登录
    router.post('/admin/login', (req, res) => {
        const { admin_username, password } = req.body;
        if (!admin_username || !password) return res.status(400).json({ success: false, message: '缺少参数' });

        pool.query(
            'SELECT admin_id, password FROM AdminInfo WHERE admin_username = ?',
            [admin_username],
            async (err, results) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                if (!results.length) return res.json({ success: false, message: '用户名或密码错误' });

                const match = await bcrypt.compare(password, results[0].password);
                if (!match) return res.json({ success: false, message: '用户名或密码错误' });

                const token = jwt.sign(
                    { id: results[0].admin_id, role: 'admin' },
                    JWT_SECRET,
                    { expiresIn: '7d' }
                );
                res.json({ success: true, token });
            }
        );
    });

    // 获取申请列表（可选 status 过滤：pending / approved / rejected）
    router.get('/admin/applications', verifyAdmin, (req, res) => {
        const { status } = req.query;
        let sql = `SELECT application_id, merchant_name, merchant_phone, merchant_address,
                          opening_time, closing_time, is_24h,
                          status, reject_reason, apply_date
                   FROM MerchantApplication`;
        const params = [];
        if (status) {
            sql += ' WHERE status = ?';
            params.push(status);
        }
        sql += ' ORDER BY apply_date DESC';

        pool.query(sql, params, (err, results) => {
            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
            res.json({ success: true, data: results });
        });
    });

    // 审核通过：将申请数据写入 MerchantInfo，分配正式 merchant_id
    router.post('/admin/approve/:application_id', verifyAdmin, (req, res) => {
        const { application_id } = req.params;

        pool.query(
            'SELECT * FROM MerchantApplication WHERE application_id = ? AND status = "pending"',
            [application_id],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                if (!results.length) return res.json({ success: false, message: '申请不存在或已处理' });

                const app = results[0];

                pool.query(
                    'SELECT merchant_id FROM MerchantInfo ORDER BY merchant_id DESC LIMIT 1',
                    (err2, idResults) => {
                        if (err2) return res.status(500).json({ success: false, message: '服务器错误' });

                        let nextMerchantId = 'M000000001';
                        if (idResults.length > 0) {
                            const num = parseInt(idResults[0].merchant_id.replace(/^M/, '')) + 1;
                            nextMerchantId = 'M' + num.toString().padStart(9, '0');
                        }

                        pool.query(
                            'INSERT INTO MerchantInfo (merchant_id, merchant_name, merchant_phone, merchant_address, opening_time, closing_time, password, is_24h, cuisine_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [nextMerchantId, app.merchant_name, app.merchant_phone, app.merchant_address, app.opening_time, app.closing_time, app.password, app.is_24h, app.cuisine_type || null],
                            (err3) => {
                                if (err3) return res.status(500).json({ success: false, message: '服务器错误' });

                                pool.query(
                                    'UPDATE MerchantApplication SET status = "approved" WHERE application_id = ?',
                                    [application_id],
                                    (err4) => {
                                        if (err4) return res.status(500).json({ success: false, message: '服务器错误' });
                                        res.json({ success: true, merchant_id: nextMerchantId });
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });

    // 审核拒绝：记录拒绝原因
    router.post('/admin/reject/:application_id', verifyAdmin, (req, res) => {
        const { application_id } = req.params;
        const { reject_reason } = req.body;

        if (!reject_reason || !reject_reason.trim()) {
            return res.status(400).json({ success: false, message: '请填写拒绝原因' });
        }

        pool.query(
            'UPDATE MerchantApplication SET status = "rejected", reject_reason = ? WHERE application_id = ? AND status = "pending"',
            [reject_reason.trim(), application_id],
            (err, result) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                if (result.affectedRows === 0) return res.json({ success: false, message: '申请不存在或已处理' });
                res.json({ success: true });
            }
        );
    });

    return router;
};