exports.appVersion = {
  versionCode: process.env.VERSION_CODE, // 版本编码（数字，用于版本对比，如101→102）
  versionName: process.env.VERSION_NAME, // 版本名称（用户可见，如1.2.0）
  updateType: 'forcibly', // 更新类型：forcibly（强制）/solicit（非强制）
  apkDownloadUrl: process.env.LAN_BASE_URL + '/app/app.apk', // 安装包下载地址
  wgtDownloadUrl: process.env.LAN_BASE_URL + '/app/app.wgt',
  iosDownloadUrl: process.env.LAN_BASE_URL + '/app/app.apk',
  md5: '8e7f99a071f2c8c6b5f6d87a8b9c0d1e', // 包体MD5校验值（防止下载损坏）
  packageSize: 25600000, // 包体大小（字节，用于显示下载进度）
  minVersionCode: 100, // 最低兼容版本（低于100的版本必须更新）
  updateDesc: `概述 
简要介绍本次升级的主要目的和亮点。例如：“本次升级旨在提升用户体验，增加了[新功能名称]，并对[具体问题]进行了优化。”

二、新增功能
功能一：[功能名称]

描述：详细介绍新功能的用途、操作方法及预期效果。
示例/截图：（可选）提供使用示例或界面截图帮助用户理解。
功能二：[功能名称]

...（同上格式）`, // 更新说明（展示给用户）
};
