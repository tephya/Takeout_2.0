# 开饭啦外卖平台

## 项目简介

"开饭啦"是一个基于Web的外卖点餐平台，集成了用户点餐、商家管理、订单处理和骑手配送等功能。系统使用MySQL数据库存储数据，前端采用原生HTML/CSS/JavaScript实现，后端使用Node.js提供API服务。

## 技术栈

- 前端：HTML5, CSS3, JavaScript
- 后端：Node.js
- 数据库：MySQL
- 开发环境：Windows

## 目录结构

```
/
├── database-sql.txt       # 数据库结构定义
├── database-insert.txt    # 数据库初始数据(只提供了指定商家的指定产品信息，如有需要，可以更替修改项目中图片)
├── homepage/              # 首页相关文件
│   ├── css/               # 样式文件
│   ├── html/              # HTML页面
│   ├── images/            # 图片资源
│   └── js/                # JavaScript脚本
├── Merchant/              # 商家管理系统
│   ├── css/
│   ├── html/
│   ├── images/
│   ├── js/
│   └── Merchants/         # 商家图片资源
├── myorder/               # 订单管理系统
│   ├── css/
│   ├── html/
│   └── js/
└── node-link-js/          # Node.js后端
    ├── dataToDatabase.js  # 数据库交互模块
    └── package.json       # 项目依赖配置
```

## 系统功能

### 用户端

- 用户注册与登录
- 浏览餐厅和菜品
- 添加商品到购物车
- 提交订单和在线支付
- 查看订单状态和历史
- 对商品和服务进行评价

### 商家端

- 商家入驻与登录
- 管理商品信息与库存
- 接收和处理订单
- 查看销售统计和评价

### 后台管理

- 骑手分配系统
- 订单跟踪与监控
- 售后服务处理

## 数据库设计

系统采用MySQL数据库，主要包含以下表：

- CustomerInfo：客户信息表
- MerchantInfo：商家信息表
- ProductInfo：商品信息表
- SalesInfo：销售信息表
- RiderInfo：骑手信息表
- CustomerOrderInfo：客户订单表
- RiderDeliveryInfo：骑手配送表
- CustomerPickupInfo：客户取餐表
- ProductReview：商品评价表
- AfterSales：售后服务表

数据库还包含多个视图和触发器，用于实现业务逻辑和数据一致性。

## 安装与运行

### 数据库配置

1. 安装MySQL数据库（推荐8.0+版本）
2. 创建名为`takeout`的数据库
3. 执行`database-sql.txt`中的SQL语句创建表结构
4. 执行`database-insert.txt`中的SQL语句导入初始数据

### 后端配置

1. 进入node-link-js目录
2. 安装依赖：`npm install`
3. 启动服务器：`node dataToDatabase.js`

### 前端访问

1. 用户端：直接在浏览器中打开`homepage/html/index.html`
2. 商家端：在浏览器中打开`Merchant/html/merchant-entry.html`
3. 订单管理：在浏览器中打开`myorder/html/myorder.html`

## 注意事项

- 确保MySQL服务已启动并正确配置
- 确保运行前，安装了`mysql2、express、cors`
- 安装语句如：`npm install mysql2`
- 默认数据库连接配置在`node-link-js/dataToDatabase.js`中
- 系统需要网络连接以加载某些资源

## 项目贡献者

- Tephy, Mr.H, Mr.Ma

## 开源许可

本项目采用[许可证类型]，详见LICENSE文件。
