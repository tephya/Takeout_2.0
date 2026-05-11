const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads/avatars');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, `tmp_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 限制 2MB
    fileFilter: (req, file, cb) => {
        const allowed =['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('仅支持 jpg/png/webp 格式'));
        }
    }
});

const app = express();
app.use(cors()); // 允许跨域
app.use(express.json()); // 解析JSON请求体
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 创建数据库连接池（更高效）
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123123',
  database: 'takeout',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


// 插入客户信息
app.post('/api/insert', (req, res) => {
    const { customer_id, customer_username, password, customer_name, customer_sex, customer_phone, customer_address } = req.body;

    // 检查手机号是否已注册
    pool.query(
        'SELECT customer_id FROM CustomerInfo WHERE customer_phone = ?',
        [customer_phone],
        (checkError, checkResult) => {
            if (checkError) {
                console.error('查重错误:', checkError);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            if (checkResult.length > 0) {
                return res.json({ success: false, message: '该手机号已被注册' });
            }

            pool.query(
                'INSERT INTO CustomerInfo (customer_id, customer_username, password, customer_name, customer_sex, customer_phone, customer_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [customer_id, customer_username, password, customer_name, customer_sex, customer_phone, customer_address],
                (error, results) => {
                    if (error) {
                        console.error('数据库插入错误:', error);
                        return res.status(500).json({ success: false, message: '服务器错误' });
                    }
                    res.json({ success: true, id: results.insertId });
                }
            );
        }
    );
});
// 查询客户信息
app.get('/api/select_phone', (req, res) => {
    const customer_phone = req.query.customer_phone;
    
    pool.query (
        'SELECT * FROM CustomerInfo WHERE customer_phone = ?',
        [customer_phone],
        (error, result) => {
            if(error) {
                console.error(error);
                return res.status(500).json({ success: false });
            }
            if(result.length > 0) {
                // 用户存在
                res.json({ success: true, exists: true });
            } else {
                // 用户不存在
                res.json({ success: true, exists: false});
            }
        }
    )
})

// 查询用户ID是否存在
app.get('/api/select_user_id', (req, res) => {
    const customer_id = req.query.customer_id;
    
    pool.query(
        'SELECT * FROM CustomerInfo WHERE customer_id = ?',
        [customer_id],
        (error, result) => {
            if(error) {
                console.error(error);
                return res.status(500).json({ success: false });
            }
            if(result.length > 0) {
                // 用户ID存在
                res.json({ success: true, exists: true });
            } else {
                // 用户ID不存在
                res.json({ success: true, exists: false });
            }
        }
    )
})

// 密码登录验证
app.post('/api/login', (req, res) => {
    const { account, password } = req.body;
    
    // 判断是手机号还是用户ID
    let query, params;
    if (/^\d{11}$/.test(account)) {
        // 手机号登录
        query = 'SELECT customer_id, customer_name, customer_phone FROM CustomerInfo WHERE customer_phone = ? AND password = ?';
        params = [account, password];
    } else {
        // 用户ID登录
        query = 'SELECT customer_id, customer_name, customer_phone FROM CustomerInfo WHERE customer_id = ? AND password = ?';
        params =[account, password];
    }
    
    pool.query(query, params, (error, result) => {
        if(error) {
            console.error(error);
            return res.status(500).json({ success: false, message: '服务器错误' });
        }
        
        if(result.length > 0) {
            // 登录成功
            const user = result[0];
            res.json({ 
                success: true, 
                phone: user.customer_phone,
                userId: user.customer_id,
                userName: user.customer_name
            });
        } else {
            // 密码错误或用户不存在
            res.json({ success: false, message: '密码错误' });
        }
    });
})

// 获取用户信息
app.get('/api/get_user_info', (req, res) => {
    const customer_phone = req.query.customer_phone;
    
    console.log('获取用户信息请求，手机号:', customer_phone);
    
    pool.query(
        'SELECT customer_id, customer_username, customer_name, customer_sex, customer_phone, customer_address FROM CustomerInfo WHERE customer_phone = ?',[customer_phone],
        (error, result) => {
            if(error) {
                console.error('获取用户信息错误:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            
            if(result.length > 0) {
                // 用户存在，返回用户信息
                const user = result[0];
                console.log('用户信息查询成功:', user);
                res.json({ 
                    success: true, 
                    data: {
                        customer_id: user.customer_id,
                        customer_username: user.customer_username,
                        customer_name: user.customer_name,
                        customer_sex: user.customer_sex,
                        customer_phone: user.customer_phone,
                        customer_address: user.customer_address
                    }
                });
            } else {
                // 用户不存在
                console.log('用户不存在:', customer_phone);
                res.json({ success: false, message: '用户不存在' });
            }
        }
    );
});

// 更新用户密码
app.post('/api/update_password', (req, res) => {
    const { customer_phone, new_password } = req.body;
    
    console.log('更新密码请求，手机号:', customer_phone);
    
    pool.query(
        'UPDATE CustomerInfo SET password = ? WHERE customer_phone = ?',[new_password, customer_phone],
        (error, result) => {
            if(error) {
                console.error('更新密码错误:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            
            if(result.affectedRows > 0) {
                console.log('密码更新成功，手机号:', customer_phone);
                res.json({ success: true, message: '密码更新成功' });
            } else {
                console.log('用户不存在，手机号:', customer_phone);
                res.json({ success: false, message: '用户不存在' });
            }
        }
    );
});

// 更新用户名
app.post('/api/update_username', (req, res) => {
    const { customer_phone, new_username } = req.body;
    
    console.log('更新用户名请求，手机号:', customer_phone, '新用户名:', new_username);
    
    pool.query(
        'UPDATE CustomerInfo SET customer_username = ? WHERE customer_phone = ?',[new_username, customer_phone],
        (error, result) => {
            if(error) {
                console.error('更新用户名错误:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            
            if(result.affectedRows > 0) {
                console.log('用户名更新成功，手机号:', customer_phone);
                res.json({ success: true, message: '用户名更新成功' });
            } else {
                console.log('用户不存在，手机号:', customer_phone);
                res.json({ success: false, message: '用户不存在' });
            }
        }
    );
});

// 更新手机号
app.post('/api/update_phone', (req, res) => {
    const { old_phone, new_phone } = req.body;
    
    console.log('更新手机号请求，旧手机号:', old_phone, '新手机号:', new_phone);
    
    // 首先检查新手机号是否已被使用
    pool.query(
        'SELECT * FROM CustomerInfo WHERE customer_phone = ?',[new_phone],
        (error, checkResult) => {
            if(error) {
                console.error('检查新手机号错误:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            
            if(checkResult.length > 0) {
                // 新手机号已被使用
                console.log('新手机号已被注册:', new_phone);
                return res.json({ success: false, message: '该手机号已被注册' });
            }
            
            // 新手机号可用，更新手机号
            pool.query(
                'UPDATE CustomerInfo SET customer_phone = ? WHERE customer_phone = ?',[new_phone, old_phone],
                (updateError, updateResult) => {
                    if(updateError) {
                        console.error('更新手机号错误:', updateError);
                        return res.status(500).json({ success: false, message: '服务器错误' });
                    }
                    
                    if(updateResult.affectedRows > 0) {
                        console.log('手机号更新成功，从', old_phone, '到', new_phone);
                        res.json({ success: true, message: '手机号更新成功' });
                    } else {
                        console.log('旧手机号不存在:', old_phone);
                        res.json({ success: false, message: '用户不存在' });
                    }
                }
            );
        }
    );
});

// 更新收货地址
app.post('/api/updateUserAddress', (req, res) => {
    const { phone, address } = req.body;
    if (!phone || !address) {
        return res.status(400).json({ success: false, message: '缺少参数' });
    }
    pool.query(
        'UPDATE CustomerInfo SET customer_address = ? WHERE customer_phone = ?',
        [address, phone],
        (error, result) => {
            if (error) {
                console.error('更新地址错误:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            if (result.affectedRows > 0) {
                res.json({ success: true, message: '地址更新成功' });
            } else {
                res.json({ success: false, message: '用户不存在' });
            }
        }
    );
});

//插入客户点餐信息
app.post('/api/insertCustomerOrderData', (req, res) => {
    const { order_id, customer_id, merchant_id, product_id, order_date, order_quantity, total_price, order_status } = req.body; // 从前端获取数据

    // 首先获取商家名称
    pool.query(
        'SELECT merchant_name FROM MerchantInfo WHERE merchant_id = ?',
        [merchant_id],
        (error, merchantResults) => {
            if (error) {
                console.error('获取商家信息错误:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }

            const merchant_name = merchantResults[0]?.merchant_name || '未知商家';

            // 然后插入订单数据
            pool.query(
                'INSERT INTO CustomerOrderInfo (order_id, customer_id, merchant_id, product_id, order_date, order_quantity, total_price, order_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',[order_id, customer_id, merchant_id, product_id, order_date, order_quantity, total_price, order_status],
                (error, results) => {
                    if (error) {
                        console.error('插入订单数据错误:', error);
                        return res.status(500).json({ success: false, message: '服务器错误' });
                    }
                    console.log('订单创建成功:', order_id);
                    res.json({ success: true, id: results.insertId });
                }
            );
        }
    );
});

//从客户点餐视图中查询订单信息
app.get('/api/CustomerOrderView', (req, res) => {
    const customer_id = req.query.customer_id;
    
    console.log('获取订单信息，客户ID:', customer_id);

    pool.query(
        'SELECT * FROM CustomerOrder WHERE customer_id = ? ORDER BY order_date DESC',
        [customer_id],
        (error, results) => {
            if(error) {
                console.error('获取订单数据错误:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            console.log('查询到的订单数据:', results);
            res.json({success: true, data: results});
        }
    )
});


// 通过商品id查询商品信息，包括product_name, merchant_name, merchant_address, product_price, product_description
// 获取商品所属商家的信息是为了方便在主界面展示该商品的商家信息
app.get('/api/getProductInfo', (req, res) => {
    const product_id = req.query.product_id;
    pool.query(
        `SELECT 
            ProductInfo.product_id, 
            ProductInfo.product_name, 
            ProductInfo.merchant_id, 
            MerchantInfo.merchant_name, 
            MerchantInfo.merchant_address, 
            ProductInfo.product_price, 
            ProductInfo.product_description 
        FROM ProductInfo 
        JOIN MerchantInfo ON ProductInfo.merchant_id = MerchantInfo.merchant_id 
        WHERE ProductInfo.product_id = ?`,
        [product_id],
        (error, results) => {
            if(error) {
                console.error(error);
                return res.status(500).json({ success: false });
            }
            res.json({success: true, data: results});
        }
    )
});

// 检查商家入驻状态
app.get('/api/checkMerchantStatus', (req, res) => {
    const customer_id = req.query.customer_id;
    if (!customer_id) {
        return res.json({ success: false, message: '缺少用户ID' });
    }
    pool.query(
        'SELECT merchant_id, merchant_name FROM MerchantInfo WHERE customer_id = ?',
        [customer_id],
        (error, result) => {
            if (error) {
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            if (result.length > 0) {
                res.json({ success: true, merchant_id: result[0].merchant_id, merchant_name: result[0].merchant_name });
            } else {
                res.json({ success: false, message: '未入驻' });
            }
        }
    );
});


// 获取下一个商家ID
app.get('/api/getNextMerchantId', (req, res) => {
    pool.query(
        "SELECT merchant_id FROM MerchantInfo ORDER BY merchant_id DESC LIMIT 1",
        (error, results) => {
            if (error) {
                console.error('获取最新商家ID失败:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            let nextId = 'M000000001';
            if (results.length > 0) {
                // 提取数字部分+1
                const lastId = results[0].merchant_id;
                const num = parseInt(lastId.replace(/^M/, '')) + 1;
                nextId = 'M' + num.toString().padStart(9, '0');
            }
            res.json({ success: true, nextId });
        }
    );
});

// 插入商家信息（注册商家界面）
app.post('/api/insertMerchantInfo', (req, res) => {
    const { merchant_id, merchant_name, merchant_phone, merchant_address, opening_time, closing_time, password, customer_id } = req.body;
    pool.query(
        'INSERT INTO MerchantInfo (merchant_id, merchant_name, merchant_phone, merchant_address, opening_time, closing_time, password, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',[merchant_id, merchant_name, merchant_phone, merchant_address, opening_time, closing_time, password, customer_id],
        (error, results) => {
            if (error) {
                console.error('插入商家数据错误:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            res.json({ success: true, id: results.insertId });
        }
    );
});

// 更新订单状态接口
app.post('/api/updateOrderStatus', (req, res) => {
    const { order_id, order_status } = req.body;
    if (!order_id || !order_status) {
        return res.status(400).json({ success: false, message: '缺少参数' });
    }
    pool.query(
        'UPDATE CustomerOrderInfo SET order_status = ? WHERE order_id = ?',[order_status, order_id],
        (error, result) => {
            if (error) {
                console.error('更新订单状态错误:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            if (result.affectedRows > 0) {
                res.json({ success: true, message: '订单状态更新成功' });
            } else {
                res.json({ success: false, message: '订单不存在或未更新' });
            }
        }
    );
});

// 获取商家营业时间接口
app.get('/api/getMerchantBusinessHours', (req, res) => {
    const merchant_id = req.query.merchant_id;
    if (!merchant_id) {
        return res.status(400).json({ success: false, message: '缺少商家ID' });
    }
    pool.query(
        'SELECT opening_time, closing_time FROM MerchantInfo WHERE merchant_id = ?',
        [merchant_id],
        (error, results) => {
            if (error) {
                console.error('获取商家营业时间失败:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            if (results.length > 0) {
                res.json({ success: true, data: results[0] });
            } else {
                res.json({ success: false, message: '商家不存在' });
            }
        }
    );
});

// 获取商家名称接口
app.get('/api/getMerchantName', (req, res) => {
    const merchant_id = req.query.merchant_id;
    if (!merchant_id) {
        return res.status(400).json({ success: false, message: '缺少商家ID' });
    }
    pool.query(
        'SELECT merchant_name FROM MerchantInfo WHERE merchant_id = ?',
        [merchant_id],
        (error, results) => {
            if (error) {
                console.error('获取商家名称失败:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            if (results.length > 0) {
                res.json({ success: true, merchant_name: results[0].merchant_name });
            } else {
                res.json({ success: false, message: '商家不存在' });
            }
        }
    );
});

// 获取商家地址接口
app.get('/api/getMerchantAddress', (req, res) => {
    const merchant_id = req.query.merchant_id;
    if (!merchant_id) {
        return res.status(400).json({ success: false, message: '缺少商家ID' });
    }
    pool.query(
        'SELECT merchant_address FROM MerchantInfo WHERE merchant_id = ?',
        [merchant_id],
        (error, results) => {
            if (error) {
                console.error('获取商家地址失败:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            if (results.length > 0) {
                res.json({ success: true, merchant_address: results[0].merchant_address });
            } else {
                res.json({ success: false, message: '商家不存在' });
            }
        }
    );
});

// 商家登录
app.post('/api/merchant/login', (req, res) => {
    const { merchant_phone, password } = req.body;
    pool.query(
        'SELECT merchant_id, merchant_name customer_id FROM MerchantInfo WHERE merchant_phone = ? AND password = ?',
        [merchant_phone, password],
        (error, results) => {
            if (error) {
                console.error('商家登录失败:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            if (results.length > 0) {
                res.json({ 
                    success: true,
                    merchant_id: results[0].merchant_id,
                    merchant_name: results[0].merchant_name
                });
            } else {
                res.json({ success: false, message: '手机号或密码错误' });
            }
        }
    );
});

// 查询某商家的所有订单（含用户信息）
app.get('/api/MerchantOrderView', (req, res) => {
    const merchant_id = req.query.merchant_id;
    if (!merchant_id) {
        return res.status(400).json({ success: false, message: '缺少商家ID' });
    }
    pool.query(
        'SELECT * FROM CustomerOrder WHERE merchant_id = ? ORDER BY order_date DESC',
        [merchant_id],
        (error, results) => {
            if (error) {
                console.error('获取商家订单数据错误:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            res.json({ success: true, data: results });
        }
    );
});

// 增加商品点击量
app.post('/api/incrementProductClickCount', (req, res) => {
    const { product_id } = req.body;
    pool.query(
        'UPDATE ProductInfo SET click_count = click_count + 1 WHERE product_id = ?',
        [product_id],
        (error, result) => {
            if (error) {
                console.error('商品点击量自增失败:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            if (result.affectedRows > 0) {
                res.json({ success: true });
            } else {
                res.json({ success: false, message: '商品不存在' });
            }
        }
    );
});

// 获取商品点击量
app.get('/api/getProductClickCount', (req, res) => {
    const product_id = req.query.product_id;
    pool.query(
        'SELECT click_count FROM ProductInfo WHERE product_id = ?',
        [product_id],
        (error, results) => {
            if (error) {
                console.error('获取商品点击量失败:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            if (results.length > 0) {
                res.json({ success: true, click_count: results[0].click_count });
            } else {
                res.json({ success: false, message: '商品不存在' });
            }
        }
    );
});

app.post('/api/setRiderPickupTime', (req, res) => {
    const { delivery_id } = req.body;
    if (!delivery_id) {
        return res.status(400).json({ success: false, message: '缺少 delivery_id' });
    }
    // 这里用 NOW() 取当前服务器时间
    pool.query(
        'UPDATE RiderDeliveryInfo SET pickup_time = NOW() WHERE delivery_id = ?',
        [delivery_id],
        (error, results) => {
            if (error) {
                console.error('设置取餐时间失败:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            if (results.affectedRows > 0) {
                res.json({ success: true, message: '取餐时间已设置' });
            } else {
                res.json({ success: false, message: '配送记录不存在' });
            }
        }
    );
});

// 通过订单ID查找配送记录ID
app.get('/api/getDeliveryIdByOrderId', (req, res) => {
    const { order_id } = req.query;
    if (!order_id) {
        return res.status(400).json({ success: false, message: '缺少 order_id' });
    }
    pool.query(
        'SELECT delivery_id FROM RiderDeliveryInfo WHERE order_id = ?',
        [order_id],
        (error, results) => {
            if (error) {
                console.error('查找delivery_id失败:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            if (results.length > 0) {
                res.json({ success: true, delivery_id: results[0].delivery_id });
            } else {
                res.json({ success: false, message: '未找到配送记录' });
            }
        }
    );
});

// 设置预计送达时间并启动配送模拟
app.post('/api/startDeliverySimulation', (req, res) => {
    const { order_id, delivery_id, min_minutes, max_minutes } = req.body;
    
    if (!order_id || !delivery_id || !min_minutes || !max_minutes) {
        return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    // 生成随机配送时间（a到b分钟之间）
    const deliveryMinutes = Math.floor(Math.random() * (max_minutes - min_minutes + 1)) + min_minutes;
    const estimatedDeliveryTime = new Date(Date.now() + deliveryMinutes * 60000); // 当前时间加上随机分钟数

    // 更新骑手配送表的预计送达时间
    pool.query(
        'UPDATE RiderDeliveryInfo SET delivery_time = ? WHERE delivery_id = ?',[estimatedDeliveryTime, delivery_id],
        (error) => {
            if (error) {
                console.error('更新预计送达时间失败:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }

            // 设置定时器，模拟配送过程
            setTimeout(async () => {
                try {
                    // 更新订单状态为已完成
                    await pool.promise().query(
                        'UPDATE CustomerOrderInfo SET order_status = ? WHERE order_id = ?',
                        ['Completed', order_id]
                    );

                    // 更新骑手配送状态为已送达，记录实际送达时间
                    await pool.promise().query(
                        'UPDATE RiderDeliveryInfo SET delivery_status = ?, delivery_time = NOW() WHERE delivery_id = ?',['Delivered', delivery_id]
                    );

                    console.log(`订单 ${order_id} 配送完成，耗时 ${deliveryMinutes} 分钟`);
                } catch (err) {
                    console.error('更新配送完成状态失败:', err);
                }
            }, deliveryMinutes * 60000); // 转换为毫秒

            // 立即返回预计送达时间
            res.json({ 
                success: true, 
                delivery_time: estimatedDeliveryTime,
                estimated_minutes: deliveryMinutes 
            });
        }
    );
});


// 增加商品好评数
app.post('/api/incrementProductGoodRvCount', (req, res) => {
    const { product_id } = req.body;
    pool.query(
        'UPDATE ProductInfo SET good_review_count = good_review_count + 1 WHERE product_id = ?',
        [product_id],
        (error, result) => {
            if (error) {
                console.error('商品好评数自增失败:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            if (result.affectedRows > 0) {
                res.json({ success: true });
            } else {
                res.json({ success: false, message: '商品不存在' });
            }
        }
    );
});

// 增加商品差评数
app.post('/api/incrementProductBadRvCount', (req, res) => {
    const { product_id } = req.body;
    pool.query(
        'UPDATE ProductInfo SET bad_review_count = bad_review_count + 1 WHERE product_id = ?',[product_id],
        (error, result) => {
            if (error) {
                console.error('商品差评数自增失败:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            if (result.affectedRows > 0) {
                res.json({ success: true });
            } else {
                res.json({ success: false, message: '商品不存在' });
            }
        }
    );
});

// 获取商品好评量
app.get('/api/getProductGoodRvCount', (req, res) => {
    const product_id = req.query.product_id;
    pool.query(
        'SELECT good_review_count FROM ProductInfo WHERE product_id = ?',
        [product_id],
        (error, results) => {
            if (error) {
                console.error('获取商品好评量失败:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            if (results.length > 0) {
                res.json({ success: true, good_review_count: results[0].good_review_count });
            } else {
                res.json({ success: false, message: '商品不存在' });
            }
        }
    );
});

// 获取商品差评量
app.get('/api/getProductBadRvCount', (req, res) => {
    const product_id = req.query.product_id;
    pool.query(
        'SELECT bad_review_count FROM ProductInfo WHERE product_id = ?',
        [product_id],
        (error, results) => {
            if (error) {
                console.error('获取商品差评量失败:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            if (results.length > 0) {
                res.json({ success: true, bad_review_count: results[0].bad_review_count });
            } else {
                res.json({ success: false, message: '商品不存在' });
            }
        }
    );
});

// 上传头像
app.post('/api/uploadAvatar', upload.single('avatar'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: '未接收到文件' });
    }
    const customer_phone = req.body.customer_phone;
    if (!customer_phone) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: '缺少手机号' });
    }

    const ext = path.extname(req.file.originalname);
    const newFilename = `avatar_${customer_phone}${ext}`;
    const newPath = path.join(uploadDir, newFilename);

    // 删除同手机号旧头像（不同扩展名）
    ['jpg', 'jpeg', 'png', 'webp'].forEach(e => {
        const old = path.join(uploadDir, `avatar_${customer_phone}.${e}`);
        if (fs.existsSync(old)) fs.unlinkSync(old);
    });

    fs.renameSync(req.file.path, newPath);
    const avatarUrl = `/uploads/avatars/${newFilename}`;

    pool.query(
        'UPDATE CustomerInfo SET avatar = ? WHERE customer_phone = ?',
        [avatarUrl, customer_phone],
        (error, result) => {
            if (error) {
                console.error('更新头像失败:', error);
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            if (result.affectedRows > 0) {
                res.json({ success: true, avatarUrl });
            } else {
                res.json({ success: false, message: '用户不存在' });
            }
        }
    );
});

// 获取头像
app.get('/api/getAvatar', (req, res) => {
    const customer_phone = req.query.customer_phone;
    pool.query(
        'SELECT avatar FROM CustomerInfo WHERE customer_phone = ?',
        [customer_phone],
        (error, results) => {
            if (error) {
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            if (results.length > 0) {
                res.json({ success: true, avatarUrl: results[0].avatar });
            } else {
                res.json({ success: false, message: '用户不存在' });
            }
        }
    );
});

// 启动服务器
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});