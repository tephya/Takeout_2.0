const express = require('express');
const path = require('path');
const fs = require('fs');
const { upload, uploadDir } = require('../middleware/upload');
const bcrypt = require('bcryptjs');

const router = express.Router();
const verificationCodes = new Map(); // { phone: { code, expiry } }
module.exports = (pool) => {
    // 发送注册验证码
    router.post('/sendVerificationCode', (req, res) => {
        const { phone, type } = req.body;
        if (!phone) return res.status(400).json({ success: false, message: '缺少手机号' });
        pool.query('SELECT 1 FROM CustomerInfo WHERE customer_phone = ?', [phone], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
            if (type === 'reset') {
                if (results.length === 0) return res.json({ success: false, message: '该手机号未注册' });
            } else {
                if (results.length > 0) return res.json({ success: false, message: '该手机号已被注册' });
            }
            const code = String(Math.floor(100000 + Math.random() * 900000));
            verificationCodes.set(phone, { code, expiry: Date.now() + 5 * 60 * 1000 });
            res.json({ success: true, code });
        });
    });

    // 注册
    router.post('/insert', async (req, res) => {
        const { customer_id, customer_username, password, customer_phone, verification_code } = req.body;
        const stored = verificationCodes.get(customer_phone);
        if (!stored || stored.code !== verification_code || Date.now() > stored.expiry) {
            return res.json({ success: false, message: '验证码错误或已过期' });
        }
        verificationCodes.delete(customer_phone);
        try {
            const hashed = await bcrypt.hash(password, 10);
            pool.query(
                'SELECT customer_id FROM CustomerInfo WHERE customer_phone = ?',
                [customer_phone],
                (err, result) => {
                    if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                    if (result.length > 0) return res.json({ success: false, message: '该手机号已被注册' });
                    pool.query(
                        'INSERT INTO CustomerInfo (customer_id, customer_username, password, customer_phone) VALUES (?, ?, ?, ?)',
                        [customer_id, customer_username, hashed, customer_phone],
                        (err, results) => {
                            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                            res.json({ success: true, id: results.insertId });
                        }
                    );
                }
            );
        } catch (e) {
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    });

    // 查手机号是否存在
    router.get('/select_phone', (req, res) => {
        const { customer_phone } = req.query;
        pool.query('SELECT customer_id FROM CustomerInfo WHERE customer_phone = ?', [customer_phone], (err, result) => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true, exists: result.length > 0 });
        });
    });

    // 查用户ID是否存在
    router.get('/select_user_id', (req, res) => {
        const { customer_id } = req.query;
        pool.query('SELECT customer_id FROM CustomerInfo WHERE customer_id = ?', [customer_id], (err, result) => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true, exists: result.length > 0 });
        });
    });

    // 密码登录
    router.post('/login', (req, res) => {
        const { account, password } = req.body;
        let query, params;
        if (/^\d{11}$/.test(account)) {
            query = 'SELECT customer_id, customer_username, customer_phone, password FROM CustomerInfo WHERE customer_phone = ?';
            params = [account];
        } else {
            query = 'SELECT customer_id, customer_username, customer_phone, password FROM CustomerInfo WHERE customer_id = ?';
            params = [account];
        }
        pool.query(query, params, async (err, result) => {
            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
            if (!result.length) return res.json({ success: false, message: '密码错误' });
            const user = result[0];
            try {
                const match = await bcrypt.compare(password, user.password);
                if (!match) return res.json({ success: false, message: '密码错误' });
                res.json({ success: true, phone: user.customer_phone, userId: user.customer_id, userName: user.customer_username });
            } catch (e) {
                res.status(500).json({ success: false, message: '服务器错误' });
            }
        });
    });

    // 获取用户信息
    router.get('/get_user_info', (req, res) => {
        const { customer_phone } = req.query;
        pool.query(
            'SELECT customer_id, customer_username, customer_phone FROM CustomerInfo WHERE customer_phone = ?',
            [customer_phone],
            (err, result) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                if (result.length > 0) {
                    res.json({ success: true, data: result[0] });
                } else {
                    res.json({ success: false, message: '用户不存在' });
                }
            }
        );
    });

    // 验证码重置密码
    router.post('/resetPasswordWithCode', async (req, res) => {
        const { customer_phone, verification_code, new_password } = req.body;
        const stored = verificationCodes.get(customer_phone);
        if (!stored || stored.code !== verification_code || Date.now() > stored.expiry) {
            return res.json({ success: false, message: '验证码错误或已过期' });
        }
        verificationCodes.delete(customer_phone);
        try {
            const hashed = await bcrypt.hash(new_password, 10);
            pool.query('UPDATE CustomerInfo SET password = ? WHERE customer_phone = ?', [hashed, customer_phone], (err, result) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                res.json(result.affectedRows > 0 ? { success: true } : { success: false, message: '手机号不存在' });
            });
        } catch { res.status(500).json({ success: false, message: '服务器错误' }); }
    });

    // 更新密码
    router.post('/update_password', async (req, res) => {
        const { customer_phone, new_password } = req.body;
        try {
            const hashed = await bcrypt.hash(new_password, 10);
            pool.query('UPDATE CustomerInfo SET password = ? WHERE customer_phone = ?', [hashed, customer_phone], (err, result) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                res.json(result.affectedRows > 0 ? { success: true } : { success: false, message: '用户不存在' });
            });
        } catch (e) {
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    });

    // 更新用户名
    router.post('/update_username', (req, res) => {
        const { customer_phone, new_username } = req.body;
        pool.query('UPDATE CustomerInfo SET customer_username = ? WHERE customer_phone = ?', [new_username, customer_phone], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
            res.json(result.affectedRows > 0 ? { success: true } : { success: false, message: '用户不存在' });
        });
    });

    // 更新手机号
    router.post('/update_phone', (req, res) => {
        const { old_phone, new_phone } = req.body;
        pool.query('SELECT customer_id FROM CustomerInfo WHERE customer_phone = ?', [new_phone], (err, check) => {
            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
            if (check.length > 0) return res.json({ success: false, message: '该手机号已被注册' });
            pool.query('UPDATE CustomerInfo SET customer_phone = ? WHERE customer_phone = ?', [new_phone, old_phone], (err, result) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                res.json(result.affectedRows > 0 ? { success: true } : { success: false, message: '用户不存在' });
            });
        });
    });

    // 上传头像
    router.post('/uploadAvatar', upload.single('avatar'), (req, res) => {
        if (!req.file) return res.status(400).json({ success: false, message: '未接收到文件' });
        const { customer_phone } = req.body;
        if (!customer_phone) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: '缺少手机号' });
        }
        const ext = path.extname(req.file.originalname);
        const newFilename = `avatar_${customer_phone}${ext}`;
        const newPath = path.join(uploadDir, newFilename);
        ['jpg', 'jpeg', 'png', 'webp'].forEach(e => {
            const old = path.join(uploadDir, `avatar_${customer_phone}.${e}`);
            if (fs.existsSync(old)) fs.unlinkSync(old);
        });
        fs.renameSync(req.file.path, newPath);
        const avatarUrl = `/uploads/avatars/${newFilename}`;
        pool.query('UPDATE CustomerInfo SET avatar = ? WHERE customer_phone = ?', [avatarUrl, customer_phone], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
            res.json(result.affectedRows > 0 ? { success: true, avatarUrl } : { success: false, message: '用户不存在' });
        });
    });

    // 获取头像
    router.get('/getAvatar', (req, res) => {
        const { customer_phone } = req.query;
        pool.query('SELECT avatar FROM CustomerInfo WHERE customer_phone = ?', [customer_phone], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
            if (results.length > 0) {
                res.json({ success: true, avatarUrl: results[0].avatar });
            } else {
                res.json({ success: false, message: '用户不存在' });
            }
        });
    });

    // 获取所有地址
    router.get('/getAddresses', (req, res) => {
        const { customer_id } = req.query;
        if (!customer_id) return res.status(400).json({ success: false, message: '缺少customer_id' });
        pool.query(
            'SELECT address_id, address_label, address_detail, is_default FROM CustomerAddress WHERE customer_id = ? ORDER BY is_default DESC',
            [customer_id],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                res.json({ success: true, data: results });
            }
        );
    });

    // 新增地址
    router.post('/addAddress', (req, res) => {
        const { customer_id, address_detail, address_label } = req.body;
        if (!customer_id || !address_detail) return res.status(400).json({ success: false, message: '缺少参数' });
        const address_id = 'A' + Date.now().toString().slice(-9);
        pool.query('SELECT COUNT(*) AS cnt FROM CustomerAddress WHERE customer_id = ?', [customer_id], (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
            const is_default = rows[0].cnt === 0 ? 1 : 0;
            pool.query(
                'INSERT INTO CustomerAddress (address_id, customer_id, address_label, address_detail, is_default) VALUES (?, ?, ?, ?, ?)',
                [address_id, customer_id, address_label || null, address_detail, is_default],
                (err) => {
                    if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                    res.json({ success: true, address_id, is_default });
                }
            );
        });
    });

    // 删除地址
    router.post('/deleteAddress', (req, res) => {
        const { address_id, customer_id } = req.body;
        if (!address_id || !customer_id) return res.status(400).json({ success: false, message: '缺少参数' });
        pool.query('SELECT is_default FROM CustomerAddress WHERE address_id = ?', [address_id], (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
            const wasDefault = rows[0]?.is_default === 1;
            pool.query('DELETE FROM CustomerAddress WHERE address_id = ? AND customer_id = ?', [address_id, customer_id], (err) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                if (wasDefault) {
                    pool.query(
                        'UPDATE CustomerAddress SET is_default = 1 WHERE customer_id = ? ORDER BY address_id DESC LIMIT 1',
                        [customer_id]
                    );
                }
                res.json({ success: true });
            });
        });
    });

    // 设为默认地址
    router.post('/setDefaultAddress', (req, res) => {
        const { address_id, customer_id } = req.body;
        if (!address_id || !customer_id) return res.status(400).json({ success: false, message: '缺少参数' });
        pool.query('UPDATE CustomerAddress SET is_default = 0 WHERE customer_id = ?', [customer_id], (err) => {
            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
            pool.query('UPDATE CustomerAddress SET is_default = 1 WHERE address_id = ? AND customer_id = ?', [address_id, customer_id], (err, result) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                res.json(result.affectedRows > 0 ? { success: true } : { success: false, message: '地址不存在' });
            });
        });
    });

    router.post('/insert', async (req, res) => {
        const { customer_id, customer_username, password, customer_phone } = req.body;
        try {
            const hashed = await bcrypt.hash(password, 10);
            pool.query('SELECT customer_id FROM CustomerInfo WHERE customer_phone = ?', [customer_phone], (err, result) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                if (result.length > 0) return res.json({ success: false, message: '该手机号已被注册' });

                // 新增：用户名查重
                pool.query('SELECT customer_id FROM CustomerInfo WHERE customer_username = ?', [customer_username], (err, result) => {
                    if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                    if (result.length > 0) return res.json({ success: false, message: '用户名已被占用，请重新生成' });

                    pool.query(
                        'INSERT INTO CustomerInfo (customer_id, customer_username, password, customer_phone) VALUES (?, ?, ?, ?)',
                        [customer_id, customer_username, hashed, customer_phone],
                        (err) => {
                            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                            res.json({ success: true });
                        }
                    );
                });
            });
        } catch (e) {
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    });

    return router;
};