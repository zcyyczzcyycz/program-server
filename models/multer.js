const path = require('path');
const multer = require('multer');
const fs = require('fs'); // 引入fs，确保目录存在

// 路径拼接（用path.join适配所有系统）
const fullPath = path.join(process.cwd(), 'public', 'upload');

// 确保上传目录存在（避免Multer写入失败）
if (!fs.existsSync(fullPath)) {
  fs.mkdirSync(fullPath, { recursive: true }); // recursive: true 自动创建多级目录
}

// 3. 修复storage配置：去掉全局变量filename，改用局部变量
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 路径已确保存在，直接传递
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    // 直接使用file.originalname（或自定义文件名，避免全局变量）
    const uniqueFilename = `${Date.now()}-${file.originalname}`; // 加时间戳避免文件名重复
    file.url = `/upload/${uniqueFilename}`; // 自定义：网络访问地址
    file.uploadTime = new Date().toISOString(); // 自定义：上传时间
    cb(null, uniqueFilename);
  },
});

// 4. 初始化Multer实例（仅初始化一次，避免冲突）
exports.upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 可选：限制文件大小5MB
});

// 5. 修复errorHandler：直接返回响应，不继续透传错误
exports.errorHandler = (err, req, res, next) => {
  let errorMsg = '文件上传失败';
  let errorCode = 400;

  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        errorMsg = '文件过大，最大支持 5MB';
        break;
      case 'NO_FILE':
        errorMsg = '请选择要上传的文件';
        break;
      default:
        errorMsg = err.message;
    }
  } else if (err) {
    errorMsg = err.message;
    errorCode = 500;
  }

  // 直接返回错误响应，不再next(err)
  res.status(errorCode).json({
    code: errorCode,
    data: null,
    message: errorMsg,
  });
};
