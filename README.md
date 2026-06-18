# 开饭啦（takeout_System）

全栈外卖点餐 Web 应用，软件工程课程设计项目。支持顾客浏览下单、商家管理菜单与订单、骑手配送追踪、管理员入驻审核，前后端分离，RESTful API 通信。

---

## 功能概览

### 顾客端
- 首页商家列表（按菜系分类）
- 商家详情页（含菜品分类导航）
- 购物车（FAB 悬浮按钮 + 侧边抽屉）
- 下单结账弹窗
- 搜索页（商家名 / 菜品名）
- 我的订单（状态追踪、取消订单、评价）
- 账户设置（头像上传）

### 商家端
- 入驻申请
- 商家登录
- 管理中心（营业状态、营业时间、菜系设置）
- 菜单管理（商品增删改、图片上传）
- 菜单分类管理
- 订单管理（接单 / 拒单）

### 骑手端
- 手机号登录
- 确认取货
- 确认送达

### 管理员端
- 管理员登录
- 商家入驻审核（通过 / 拒绝）

---

## 技术栈

- **后端**：Node.js + Express
- **数据库**：MySQL
- **前端**：原生 HTML / CSS / JavaScript
- **鉴权**：JWT（JSON Web Token）
- **文件上传**：multer

---

## 项目结构

```
takeout_System/
├── public/          # 前端页面（HTML / CSS / JS）
├── server/          # 后端（Express 路由、中间件、数据库）
│   ├── routes/      # customer.js / merchant.js / order.js / product.js / delivery.js / admin.js
│   ├── middleware/  # JWT 鉴权、图片上传
│   └── uploads/     # 商品图片、头像
└── database-sql.txt # 数据库建表语句
```

---

## 快速开始

1. 将 `database-sql.txt` 导入 MySQL；
2. 在 `server/` 目录下配置数据库连接（`db.js`）；
3. 初始化管理员账号（仅首次）：
```bash
   node seed-admin.js
```
   默认账号：`admin` / `admin123`；
4. 安装依赖并启动后端服务：
   ```bash
   cd server
   npm install
   node app.js
   ```
   默认监听端口 `3000`；
5. 使用 Live Server 或任意静态服务器打开 `public/index.html`。

注意：后续运行都要在terminal输入 node server/app.js启动后端，同时用Live Server打开html

---

## 角色入口对照表

| 角色 | 入口页面 | 说明 |
|------|----------|------|
| 顾客 | `public/index.html` | 首页，浏览商家、搜索、下单、查看订单与个人中心 |
| 商家 | `public/merchant-entry.html` | 入驻申请与登录入口 |
| 商家 | `public/merchant-dashboard.html` | 管理中心，包含营业设置、菜单管理、订单管理 |
| 骑手 | `public/rider.html` | 骑手登录、确认取货与送达 |
| 管理员 | `public/admin.html` | 管理员登录 |
| 管理员 | `public/admin-dashboard.html` | 商家入驻审核 |

---

## 说明

- 前端页面通过原生 Fetch API 与后端 `localhost:3000` 通信，请确保前后端服务同时运行；
- 商家与骑手的图片资源（商品图、头像）由 multer 统一上传至 `server/uploads/`，前端通过相对路径引用；
- 数据库连接配置、JWT Secret 等敏感信息请按实际环境修改，勿直接提交到仓库。
