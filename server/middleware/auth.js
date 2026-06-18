const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'takeout_dev_secret_change_in_prod';

const verifyMerchant = (req, res, next) => {
    const token = (req.headers['authorization'] || '').split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: '未登录' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'merchant') return res.status(403).json({ success: false, message: '无权限' });
        req.merchant = decoded;
        next();
    } catch {
        res.status(401).json({ success: false, message: 'token 无效或已过期，请重新登录' });
    }
};

const verifyRider = (req, res, next) => {
    const token = (req.headers['authorization'] || '').split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: '未登录' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'rider') return res.status(403).json({ success: false, message: '无权限' });
        req.rider = decoded;
        next();
    } catch {
        res.status(401).json({ success: false, message: 'token 无效或已过期，请重新登录' });
    }
};

const verifyAdmin = (req, res, next) => {
    const token = (req.headers['authorization'] || '').split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: '未登录' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') return res.status(403).json({ success: false, message: '无权限' });
        req.admin = decoded;
        next();
    } catch {
        res.status(401).json({ success: false, message: 'token 无效或已过期，请重新登录' });
    }
};

module.exports = { JWT_SECRET, verifyMerchant, verifyRider, verifyAdmin };