const express = require('express');
const router = express.Router();
const { uploadProduct } = require('../middleware/upload');
const { verifyMerchant } = require('../middleware/auth');

module.exports = (pool) => {

    // ───────── 公开接口（顾客端使用） ─────────

    // 通过商品ID查询商品及商家信息
    router.get('/getProductInfo', (req, res) => {
        const { product_id } = req.query;
        pool.query(
            `SELECT p.product_id, p.product_name, p.merchant_id,
                    m.merchant_name, m.merchant_address,
                    p.product_price, p.product_description
             FROM ProductInfo p
             JOIN MerchantInfo m ON p.merchant_id = m.merchant_id
             WHERE p.product_id = ?`,
            [product_id],
            (err, results) => {
                if (err) return res.status(500).json({ success: false });
                res.json({ success: true, data: results });
            }
        );
    });

    // 批量获取商品及商家信息
    router.get('/getBatchProductInfo', (req, res) => {
        const ids = req.query.product_ids;
        if (!ids) return res.status(400).json({ success: false, message: '缺少product_ids' });
        const idList = ids.split(',').map(id => id.trim()).filter(Boolean);
        if (idList.length === 0) return res.status(400).json({ success: false, message: 'product_ids为空' });
        const placeholders = idList.map(() => '?').join(',');
        pool.query(
            `SELECT p.product_id, p.product_name, p.product_price, p.product_image_url,
                    p.click_count, p.good_review_count, p.bad_review_count, p.merchant_id,
                    p.focal_x, p.focal_y, p.zoom_level,
                    m.merchant_name, m.merchant_address, m.opening_time, m.closing_time, m.is_24h, m.is_temporarily_closed
             FROM ProductInfo p
             JOIN MerchantInfo m ON p.merchant_id = m.merchant_id
             WHERE p.product_id IN (${placeholders})`,
            idList,
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                const dataMap = {};
                results.forEach(row => { dataMap[row.product_id] = row; });
                res.json({ success: true, data: dataMap });
            }
        );
    });

    // 按分类获取商品列表
    router.get('/getProductsByCategory', (req, res) => {
        const { category } = req.query;
        if (!category) return res.status(400).json({ success: false, message: '缺少category' });
        pool.query(
            `SELECT p.product_id, m.merchant_name as folder
             FROM ProductInfo p
             JOIN MerchantInfo m ON p.merchant_id = m.merchant_id
             WHERE p.category = ?`,
            [category],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                res.json({ success: true, data: results });
            }
        );
    });

    // 点击量
    router.post('/incrementProductClickCount', (req, res) => {
        const { product_id } = req.body;
        pool.query('UPDATE ProductInfo SET click_count = click_count + 1 WHERE product_id = ?', [product_id], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
            res.json(result.affectedRows > 0 ? { success: true } : { success: false, message: '商品不存在' });
        });
    });

    router.get('/getProductClickCount', (req, res) => {
        const { product_id } = req.query;
        pool.query('SELECT click_count FROM ProductInfo WHERE product_id = ?', [product_id], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
            if (results.length > 0) res.json({ success: true, click_count: results[0].click_count });
            else res.json({ success: false, message: '商品不存在' });
        });
    });

    // 好评
    router.post('/incrementProductGoodRvCount', (req, res) => {
        const { product_id } = req.body;
        pool.query('UPDATE ProductInfo SET good_review_count = good_review_count + 1 WHERE product_id = ?', [product_id], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
            res.json(result.affectedRows > 0 ? { success: true } : { success: false, message: '商品不存在' });
        });
    });

    router.get('/getProductGoodRvCount', (req, res) => {
        const { product_id } = req.query;
        pool.query('SELECT good_review_count FROM ProductInfo WHERE product_id = ?', [product_id], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
            if (results.length > 0) res.json({ success: true, good_review_count: results[0].good_review_count });
            else res.json({ success: false, message: '商品不存在' });
        });
    });

    // 差评
    router.post('/incrementProductBadRvCount', (req, res) => {
        const { product_id } = req.body;
        pool.query('UPDATE ProductInfo SET bad_review_count = bad_review_count + 1 WHERE product_id = ?', [product_id], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
            res.json(result.affectedRows > 0 ? { success: true } : { success: false, message: '商品不存在' });
        });
    });

    router.get('/getProductBadRvCount', (req, res) => {
        const { product_id } = req.query;
        pool.query('SELECT bad_review_count FROM ProductInfo WHERE product_id = ?', [product_id], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
            if (results.length > 0) res.json({ success: true, bad_review_count: results[0].bad_review_count });
            else res.json({ success: false, message: '商品不存在' });
        });
    });

    // ───────── 商家专属接口（需鉴权，merchant_id 从 token 取） ─────────

    // 按商家获取商品列表
    router.get('/getProductsByMerchant', verifyMerchant, (req, res) => {
        const merchant_id = req.merchant.id;
        pool.query(
            'SELECT product_id, product_name, product_price, product_description, product_image_url, category, focal_x, focal_y, zoom_level FROM ProductInfo WHERE merchant_id = ? ORDER BY product_id',
            [merchant_id],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                res.json({ success: true, data: results });
            }
        );
    });

    // 新增商品（含图片上传）
    router.post('/addProduct', verifyMerchant, uploadProduct.single('product_image'), (req, res) => {
        const merchant_id = req.merchant.id;
        const { product_name, product_price, product_description, category } = req.body;
        if (!product_name || !product_price) {
            return res.status(400).json({ success: false, message: '缺少必填字段' });
        }
        if (parseFloat(product_price) <= 0) {
            return res.status(400).json({ success: false, message: '价格必须大于0' });
        }
        const imageUrl = req.file ? `/uploads/products/${merchant_id}/${req.file.filename}` : null;
        const product_id = 'P' + Date.now().toString().slice(-9);
        pool.query(
            `INSERT INTO ProductInfo 
             (product_id, merchant_id, product_name, product_price, product_description, product_image_url, category)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [product_id, merchant_id, product_name, product_price, product_description || null, imageUrl, category || null],
            (err) => {
                if (err) return res.status(500).json({ success: false, message: err.message });
                res.json({ success: true, product_id, product_image_url: imageUrl });
            }
        );
    });

    // 单独更新商品图片
    router.post('/updateProductImage', verifyMerchant, uploadProduct.single('product_image'), (req, res) => {
        const merchant_id = req.merchant.id;
        const { product_id } = req.body;
        if (!product_id || !req.file) {
            return res.status(400).json({ success: false, message: '缺少 product_id 或图片' });
        }
        const imageUrl = `/uploads/products/${merchant_id}/${req.file.filename}`;
        pool.query(
            'UPDATE ProductInfo SET product_image_url = ? WHERE product_id = ? AND merchant_id = ?',
            [imageUrl, product_id, merchant_id],
            (err, result) => {
                if (err) return res.status(500).json({ success: false, message: err.message });
                res.json(result.affectedRows > 0
                    ? { success: true, product_image_url: imageUrl }
                    : { success: false, message: '商品不存在或无权限' });
            }
        );
    });

    // 更新商品信息
    router.post('/updateProduct', verifyMerchant, (req, res) => {
        const merchant_id = req.merchant.id;
        const { product_id, product_name, product_price, product_description, category } = req.body;
        if (!product_id) return res.status(400).json({ success: false, message: '缺少参数' });
        pool.query(
            'UPDATE ProductInfo SET product_name = ?, product_price = ?, product_description = ?, category = ? WHERE product_id = ? AND merchant_id = ?',
            [product_name, product_price, product_description || null, category || null, product_id, merchant_id],
            (err, result) => {
                if (err) return res.status(500).json({ success: false, message: err.message });
                res.json(result.affectedRows > 0 ? { success: true } : { success: false, message: '商品不存在或无权限' });
            }
        );
    });

    // 删除商品
    router.post('/deleteProduct', verifyMerchant, (req, res) => {
        const merchant_id = req.merchant.id;
        const { product_id } = req.body;
        if (!product_id) return res.status(400).json({ success: false, message: '缺少参数' });
        pool.query(
            'DELETE FROM ProductInfo WHERE product_id = ? AND merchant_id = ?',
            [product_id, merchant_id],
            (err, result) => {
                if (err) return res.status(500).json({ success: false, message: err.message });
                res.json(result.affectedRows > 0 ? { success: true } : { success: false, message: '商品不存在或无权限' });
            }
        );
    });

    // 更新图片焦点
    router.post('/updateProductFocalPoint', verifyMerchant, (req, res) => {
        const merchant_id = req.merchant.id;
        const { product_id, focal_x, focal_y } = req.body;
        if (!product_id || focal_x == null || focal_y == null) {
            return res.status(400).json({ success: false, message: '缺少参数' });
        }
        const x = Math.min(100, Math.max(0, parseFloat(focal_x)));
        const y = Math.min(100, Math.max(0, parseFloat(focal_y)));
        const z = Math.min(200, Math.max(100, parseFloat(req.body.zoom_level || 100)));
        pool.query(
            'UPDATE ProductInfo SET focal_x = ?, focal_y = ?, zoom_level = ? WHERE product_id = ? AND merchant_id = ?',
            [x, y, z, product_id, merchant_id],
            (err, result) => {
                if (err) return res.status(500).json({ success: false, message: err.message });
                res.json(result.affectedRows > 0 ? { success: true } : { success: false, message: '商品不存在或无权限' });
            }
        );
    });

    // 搜索商家和菜品
    router.get('/search', (req, res) => {
        const { q } = req.query;
        if (!q || !q.trim()) return res.json({ success: true, merchants: [], products: [] });
        const kw = `%${q.trim()}%`;
        pool.query(
            `SELECT m.merchant_id, m.merchant_name, m.merchant_address, m.is_temporarily_closed,
                    m.cuisine_type, m.opening_time, m.closing_time, m.is_24h,
                    p.product_image_url AS cover_image_url
             FROM MerchantInfo m
             LEFT JOIN ProductInfo p ON m.cover_product_id = p.product_id
             WHERE m.merchant_name LIKE ?`,
            [kw],
            (err, merchants) => {
                if (err) return res.status(500).json({ success: false });
                pool.query(
                    `SELECT p.product_id, p.product_name, p.product_price, p.product_image_url,
                            p.merchant_id, m.merchant_name
                    FROM ProductInfo p
                    JOIN MerchantInfo m ON p.merchant_id = m.merchant_id
                    WHERE p.product_name LIKE ?`,
                    [kw],
                    (err2, products) => {
                        if (err2) return res.status(500).json({ success: false });
                        res.json({ success: true, merchants, products });
                    }
                );
            }
        );
    });

    // 公开：获取商家列表（支持 ?category= 筛选）
    router.get('/getPublicMerchants', (req, res) => {
        const { category } = req.query;
        const baseSql = `
            SELECT m.merchant_id, m.merchant_name, m.merchant_address,
                m.opening_time, m.closing_time, m.is_24h, m.is_temporarily_closed,
                COALESCE(
                    (SELECT p.product_image_url FROM ProductInfo p WHERE p.product_id = m.cover_product_id),
                    (SELECT p.product_image_url FROM ProductInfo p WHERE p.merchant_id = m.merchant_id LIMIT 1)
                ) AS cover_image_url,
                COALESCE(
                    (SELECT p.focal_x FROM ProductInfo p WHERE p.product_id = m.cover_product_id),
                    (SELECT p.focal_x FROM ProductInfo p WHERE p.merchant_id = m.merchant_id LIMIT 1)
                ) AS cover_focal_x,
                COALESCE(
                    (SELECT p.focal_y FROM ProductInfo p WHERE p.product_id = m.cover_product_id),
                    (SELECT p.focal_y FROM ProductInfo p WHERE p.merchant_id = m.merchant_id LIMIT 1)
                ) AS cover_focal_y,
                COALESCE(
                    (SELECT p.zoom_level FROM ProductInfo p WHERE p.product_id = m.cover_product_id),
                    (SELECT p.zoom_level FROM ProductInfo p WHERE p.merchant_id = m.merchant_id LIMIT 1)
                ) AS cover_zoom_level,
                (SELECT COALESCE(SUM(p2.click_count),       0) FROM ProductInfo p2 WHERE p2.merchant_id = m.merchant_id) AS total_clicks,
                (SELECT COALESCE(SUM(p3.good_review_count), 0) FROM ProductInfo p3 WHERE p3.merchant_id = m.merchant_id) AS total_good,
                (SELECT COALESCE(SUM(p4.bad_review_count),  0) FROM ProductInfo p4 WHERE p4.merchant_id = m.merchant_id) AS total_bad
            FROM MerchantInfo m`;
        if (category) {
            pool.query(
                `${baseSql} WHERE m.cuisine_type = ?`,
                [category],
                (err, results) => {
                    if (err) return res.status(500).json({ success: false });
                    res.json({ success: true, data: results });
                }
            );
        } else {
            pool.query(baseSql, (err, results) => {
                if (err) return res.status(500).json({ success: false });
                res.json({ success: true, data: results });
            });
        }
    });

    // 公开：获取单个商家信息
    router.get('/getPublicMerchantInfo', (req, res) => {
        const { merchant_id } = req.query;
        if (!merchant_id) return res.status(400).json({ success: false, message: '缺少merchant_id' });
        pool.query(
            `SELECT m.merchant_id, m.merchant_name, m.merchant_address,
                    m.opening_time, m.closing_time, m.is_24h, m.is_temporarily_closed,
                    (SELECT p.product_image_url FROM ProductInfo p WHERE p.merchant_id = m.merchant_id LIMIT 1) AS cover_image_url
            FROM MerchantInfo m WHERE m.merchant_id = ?`,
            [merchant_id],
            (err, results) => {
                if (err) return res.status(500).json({ success: false });
                if (!results.length) return res.status(404).json({ success: false, message: '商家不存在' });
                res.json({ success: true, data: results[0] });
            }
        );
    });

    // 公开：获取商家全部菜品
    router.get('/getPublicMerchantProducts', (req, res) => {
        const { merchant_id } = req.query;
        if (!merchant_id) return res.status(400).json({ success: false, message: '缺少merchant_id' });
        pool.query(
            `SELECT product_id, product_name, product_price, product_description,
                    product_image_url, category, good_review_count, bad_review_count, click_count
            FROM ProductInfo WHERE merchant_id = ? ORDER BY product_id`,
            [merchant_id],
            (err, results) => {
                if (err) return res.status(500).json({ success: false });
                res.json({ success: true, data: results });
            }
        );
    });

    // 公开：获取商家自定义分类列表（顾客侧用）
    router.get('/getPublicMerchantCategories', (req, res) => {
        const { merchant_id } = req.query;
        if (!merchant_id) return res.status(400).json({ success: false });
        pool.query(
            'SELECT category_name FROM MerchantCategory WHERE merchant_id = ? ORDER BY sort_order ASC, category_id ASC',
            [merchant_id],
            (err, results) => {
                if (err) return res.status(500).json({ success: false });
                res.json({ success: true, data: results.map(r => r.category_name) });
            }
        );
    });

    return router;
};