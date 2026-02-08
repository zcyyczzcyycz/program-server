exports.updateAppController = async (req, res, next) => {
  try {
    const { appVersion } = require(process.cwd() + '/config/appVersion.js');
    res.success(appVersion, 200, '成功');
  } catch (error) {
    res.error(400, 'app版本信息获取失败');
  }
};
