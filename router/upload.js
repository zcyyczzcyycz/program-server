const express = require('express');
const router = express.Router();
const { upload, errorHandler } = require('../models/multer');
const { defaultController, mixController, multipleController } = require('../controllers/upload');

const fieldsList = [
  // 第一个字段：avatar（头像，默认最多1个文件）
  { name: 'avatar' },
  // 第二个字段：idCards（身份证，最多允许2个文件）
  { name: 'idCards', maxCount: 2 },
];

// 多文件
router.post('/multiple', upload.array('fileList', 5), multipleController, errorHandler);
// 混合文件 指的是「多个不同文件字段的混合（多字段、多文件）」，而非「文件字段 + 普通非文件字段」
router.post('/mix', upload.fields(fieldsList), mixController, errorHandler);
// 单文件
router.post('/', upload.single('file'), defaultController, errorHandler);
module.exports = router; // 导出路由实例
