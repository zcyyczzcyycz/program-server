exports.multipleController = async (req, res, next) => {
  try {
    console.log('上传的文件列表：', req.files);
    res.success(null, 200, '上传成功');
  } catch (error) {
    // error.message = '文件上传失败';
    next(error);
  }
};
exports.mixController = async (req, res, next) => {
  try {
    res.success(null, 200, '上传成功');
  } catch (error) {
    // error.message = '文件上传失败';
    next(error);
  }
};

exports.defaultController = async (req, res, next) => {
  try {
    console.log('上传的文件列表：', req.file);
    res.success(req.file.url, 200, '上传成功');
  } catch (error) {
    error.msg = '文件上传失败';
    next(error);
  }
};
