const mysql = require('mysql2/promise');
const dbConfig = require('../config/mysql.js');

//同步创建了一个连接池配置实例（pool 对象），此时并没有和 MySQL 服务器建立任何实际的网络连接，只是实例化连接配置
const pool = mysql.createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  charset: dbConfig.charset,
  connectTimeout: dbConfig.connectTimeout,
  waitForConnections: true,
  queueLimit: 0, // 排队等待连接的最大请求数，0表示无限制
  connectionLimit: dbConfig.pool.max, // 最大连接数
  idleTimeout: dbConfig.pool.idleTimeout,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

exports.pool = pool;

// 验证是否成功连接数据库
exports.verifyPoolConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ 数据库连接池验证成功，已成功获取连接！');
    connection.release(); // 释放连接（将连接放回连接池，变为空闲状态，供后续使用）
  } catch (err) {
    console.error('❌ 数据库连接池验证失败：', err.message);
    throw new Error('数据库连接池验证失败');
  }
};
