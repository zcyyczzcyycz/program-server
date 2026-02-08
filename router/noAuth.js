const express = require('express');
const fs = require('fs');
const router = express.Router();
const { updateAppController } = require('../controllers/onAuth');

// 模块专属全局中间件：所有访问该模块的请求都会触发
// router.use((req, res, next) => {
//   next(); // 必须调用 next() 传递控制权
// });

// 更新app
router.post('/updateApp', updateAppController);

module.exports = router; // 导出路由实例
