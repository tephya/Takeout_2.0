/**
 * 运行方式（在项目根目录）：
 *   node seed-admin.js
 *
 * 会在 AdminInfo 中插入一个初始管理员账号：
 *   用户名: admin
 *   密码:   admin123  （请在生产环境中修改）
 */

const bcrypt = require('bcrypt');
const pool = require('./server/db');

async function seed() {
    const password = 'admin123';
    const hashed = await bcrypt.hash(password, 10);
    pool.query(
        'INSERT INTO AdminInfo (admin_id, admin_username, password) VALUES (?, ?, ?)',
        ['A000000001', 'admin', hashed],
        (err) => {
            if (err) {
                console.error('插入失败：', err.message);
            } else {
                console.log('管理员账号创建成功：admin / admin123');
            }
            pool.end();
        }
    );
}

seed();