const express = require('express');
const cors = require('cors');
const path = require('path');

const pool = require('./db');
const customerRoutes = require('./routes/customer');
const orderRoutes = require('./routes/order');
const merchantRoutes = require('./routes/merchant');
const productRoutes = require('./routes/product');
const deliveryRoutes = require('./routes/delivery');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', customerRoutes(pool));
app.use('/api', orderRoutes(pool));
app.use('/api', merchantRoutes(pool));
app.use('/api', productRoutes(pool));
app.use('/api', deliveryRoutes(pool));
app.use('/api', adminRoutes(pool));

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});