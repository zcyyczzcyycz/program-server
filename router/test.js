const express = require('express');
const router = express.Router();

// 模块专属全局中间件：所有访问该模块的请求都会触发
// router.use((req, res, next) => {
//   next(); // 必须调用 next() 传递控制权
// });

// 定义模块内路由
router.get('/', async (req, res) => {
  let [result] = await res.pool.execute('select * from user;');
  res.success(result);
});

router.post('/', (req, res) => {
  res.success('post');
});

module.exports = router; // 导出路由实例
