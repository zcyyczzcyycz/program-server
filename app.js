// 处理文件路径相关操作（拼接、解析等）
const path = require('path');
// 引入 Express 框架，用于快速构建 Web 应用
const express = require('express');
// 引入压缩中间件，用于压缩 HTTP 响应体（提升传输效率）
const compression = require('compression');
// 引入 Express 会话中间件，用于管理用户会话（保存登录状态等）
const session = require('express-session');
// 引入 Express 错误处理中间件（开发环境下提供详细错误信息）
const errorHandler = require('errorhandler');
// 引入 Web 安全中间件，提供 CSRF、XSS、X-Frame-Options 等安全防护
const helmet = require('helmet');
// 引入环境变量加载模块，用于从 .env 文件加载配置
const dotenv = require('dotenv');
// 引入 MongoDB 会话存储模块，用于将 session 数据持久化到 MongoDB
const MongoStore = require('connect-mongo');
// 引入 MongoDB ODM 工具，用于操作 MongoDB 数据库
const mongoose = require('mongoose');
// 引入请求速率限制中间件，用于防止暴力请求、DDoS 攻击
const rateLimit = require('express-rate-limit');
// 引入 JWT 认证中间件，用于验证 JSON Web Token
const { expressjwt } = require('express-jwt');
// 引入 Node.js 内置文件系统模块，用于操作文件（此处用于读取文件并实现下载）
const fs = require('fs');
const cors = require('cors');
const { morganLogger } = require('./config/morgan');

/**
 * app 是整个 Web 应用的核心，所有中间件、路由都挂载在该实例上
 */
const app = express();

/**
 * 从 .env文件加载环境变量 将其分配给 process.env
 */
dotenv.config({ path: '.env' });

/**
 * Set config values (设置全局配置变量)
 * 判定是否启用安全传输（HTTPS），基于环境变量中的 BASE_URL 是否以 https 开头
 */
const secureTransfer = process.env.BASE_URL.startsWith('https');

/**
 * Rate limiting configuration (请求速率限制配置)
 * 用于限制客户端对 API 的请求频率，防止暴力破解、恶意刷接口、DDoS 攻击
 * 以下定义了 3 种不同粒度的限流器，适配不同场景
 */
// 1. 全局速率限制器（适用于所有未单独配置的路由）
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 时间窗口：15 分钟（毫秒数）
  max: 200, // 每个 IP 在时间窗口内的最大请求数：200 次
  standardHeaders: true, // 启用标准的 RateLimit-* 响应头，返回速率限制信息
  legacyHeaders: false, // 禁用过时的 X-RateLimit-* 响应头
});

// 2. 严格认证速率限制器（适用于注册、密码找回、邮箱验证、邮箱登录等敏感接口）
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 时间窗口：1 小时
  max: 5, // 每个 IP 每小时最多 5 次请求（防止暴力破解敏感接口）
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. 登录速率限制器（专门用于账号密码登录接口）
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 时间窗口：1 小时
  max: 10, // 每个 IP 每小时最多 10 次登录尝试
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Connect to MongoDB. (MongoDB 数据库连接配置)
 * 注：当前代码已注释，未启用数据库连接
 * 作用：连接 MongoDB 数据库，用于持久化存储 session、用户数据等
 */
// mongoose.connect(process.env.MONGODB_URI);
// mongoose.connection.on('error', (err) => {
//   console.error(err);
//   console.log('MongoDB connection error. Please make sure MongoDB is running.');
//   process.exit(1); // 数据库连接失败时，退出应用进程
// });

/**
 * Express configuration. (Express 应用核心配置)
 * 配置应用的主机、端口、视图引擎、中间件等核心选项
 */
// 配置应用监听的主机地址（默认 0.0.0.0，监听所有网络接口）
app.set('host', process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0'); // 整个服务运行周期
// 配置应用监听的端口（优先读取环境变量，默认 3000）
app.set('port', process.env.PORT || 3000);
// 配置视图文件（模板文件）的存放目录
app.set('views', path.join(__dirname, 'views'));
// 配置视图引擎为 pug（一款高性能的 Node.js 模板引擎，用于渲染 HTML 页面）
app.set('view engine', 'pug');

// 全局中间件
app.use(async (req, res, next) => {
  // 将用户信息挂载到响应本地变量（res.locals），供模板引擎直接使用
  res.locals.user = req.user;
  res.pool = app.locals.pool;

  // 成功响应方法
  res.success = (data, code = 200, message = '操作成功') => {
    res.status(code).json({
      code,
      data: data || null,
      message,
    });
  };

  // 错误响应方法
  res.error = (code = 400, message = '操作失败', data = null) => {
    res.status(code).json({
      code,
      data,
      message,
    });
  };

  next();
});

// 挂载自定义 Morgan 日志中间件，记录所有 HTTP 请求
app.use(morganLogger());

// 启用响应体压缩，减小传输数据体积，提升前端加载速度
app.use(compression());
// 解析 JSON 格式的请求体（支持 Content-Type: application/json）
app.use(express.json());
// 解析 URL 编码的请求体（支持 Content-Type: application/x-www-form-urlencoded）
// extended: true 表示支持嵌套对象格式的请求体
app.use(express.urlencoded({ extended: true }));
// 挂载全局速率限制器，限制所有请求的频率
app.use(limiter);
// 设置安全防护
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // 1. 基础规则：允许自身域名的所有资源
        defaultSrc: ["'self'"],
        // 2. 脚本规则：允许内联脚本（开发环境）+ Blob 协议（Worker）+ 自身域名
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // 允许内联脚本（开发环境可用，生产建议用哈希）
          'blob:', // 允许 Blob 协议的 Web Worker 脚本
        ],
        // 3. 显式配置 Worker 规则：允许 Blob 协议（解决 Worker 拦截）
        workerSrc: ["'self'", 'blob:'],
        // 4. 图片规则：允许自身域名 + base64 + 外部图片域名（dcloud 官网）
        imgSrc: [
          "'self'",
          'data:', // 允许 base64 图片
          'https://cdn.dcloud.net.cn', // 允许加载 dcloud 官网的图片
        ],
        // 5. 样式规则：允许内联样式（若有需要）
        styleSrc: ["'self'", "'unsafe-inline'"],
        // 6. 其他规则（按需添加）
        connectSrc: ["'self'"], // 允许自身域名的 AJAX/fetch 请求
        fontSrc: ["'self'", 'data:', 'https://at.alicdn.com'], // 允许字体资源
      },
    },
  }),
);

// const corsOptions = {
//   origin: '*', // 允许的域
//   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // 允许的 HTTP 方法
//   allowedHeaders: 'Content-Type,Authorization', // 允许的头部
//   credentials: true, // 是否允许发送 Cookie
//   optionsSuccessStatus: 204, // 用于预检请求的状态码
//   preflightContinue: false, // 是否将预检请求传递给后续中间件
//   maxAge: 172800, // 预检缓存
// };
// app.use(cors(corsOptions));

// 配置并挂载 Session 中间件，用于管理用户会话
// app.use(
//   session({
//     resave: true, // 即使 session 未修改，也重新保存（注：生产环境建议设为 false，提升性能）
//     saveUninitialized: false, // 不保存未初始化的 session（避免空会话存储，提升性能并符合隐私规范）
//     secret: process.env.SESSION_SECRET, // 用于加密 session 数据的密钥（必须保密，生产环境建议使用强随机字符串）
//     name: 'startercookie', // 自定义 session cookie 的名称（避免使用默认的 connect.sid，提升安全性）
//     cookie: {
//       maxAge: 1209600000, // Cookie 过期时间：14 天（毫秒数）
//       secure: secureTransfer, // 仅在 HTTPS 环境下传输 Cookie（生产环境 HTTPS 必须启用，防止 Cookie 被窃取）
//     },
//     // 配置 session 存储到 MongoDB（当前已注释，默认存储在内存中，生产环境必须启用持久化存储）
//     // store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
//   }),
// );

// 配置静态资源托管：将 public 目录下的文件（CSS、JS、图片等）暴露为静态资源
// maxAge: 31557600000 表示静态资源缓存 1 年（提升前端加载速度，减少服务器请求）
app.use('/', express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));

// JWT 认证中间件配置（当前已注释，未启用）
// 作用：验证请求头中的 JWT Token，验证通过后将用户信息挂载到 req.user
app.use(
  expressjwt({
    secret: process.env.TOKEN_SECRET, // JWT 签名密钥（必须与生成 Token 时的密钥一致）
    algorithms: ['HS256'], // 指定签名算法为 HS256（HMAC-SHA256）
  }).unless({
    // 配置无需认证的路由（排除登录、注册接口）
    path: [/^\/auth/, /^\/test/, /^\/upload/, /^\/noAuth/],
    methods: ['GET', 'POST'],
  }),
);

// 禁用 Express 默认的 X-Powered-By 响应头，防止泄露应用使用的框架信息（提升安全性）
app.disable('x-powered-by');

/**
 * Analytics IDs needed thru layout.pug; set as express local so we don't have to pass them with each render call
 * 配置全局模板变量（供 layout.pug 等公共模板使用）
 * 无需在每个路由的 render 方法中单独传递，提升开发效率
 */
app.locals.FACEBOOK_ID = process.env.FACEBOOK_ID ? process.env.FACEBOOK_ID : null;
app.locals.GOOGLE_ANALYTICS_ID = process.env.GOOGLE_ANALYTICS_ID ? process.env.GOOGLE_ANALYTICS_ID : null;
app.locals.FACEBOOK_PIXEL_ID = process.env.FACEBOOK_PIXEL_ID ? process.env.FACEBOOK_PIXEL_ID : null;

/**
 * Primary app routes. (核心应用路由定义)
 * 定义前端可访问的路由，关联对应的业务逻辑
 */
const testRouter = require('./router/test');
const uploadRouter = require('./router/upload');
const authRouter = require('./router/auth');
const noAuthRouter = require('./router/noAuth');

app.use('/test', testRouter);
app.use('/upload', uploadRouter);
app.use('/auth', authRouter);
app.use('/noAuth', noAuthRouter);

// 以下为注释的业务路由，可根据需求启用
// app.get('/', homeController.index);
// app.get('/login', userController.getLogin);
// app.get('/login/verify/:token', loginLimiter, userController.getLoginByEmail);
// app.get('/logout', userController.logout);
// app.post('/api/upload', strictLimiter, apiController.uploadMiddleware, apiController.postFileUpload);

/**
 * 开发环境错误处理中间件（当前已注释）
 * 仅在开发环境启用，提供详细的错误堆栈信息，方便调试
 */
// if (process.env.NODE_ENV === 'development') {
//   app.use(errorHandler());
// }

/**
 * Global Error Handler. (全局错误处理中间件)
 * 捕获应用中所有未处理的异常，返回统一的错误响应（防止应用崩溃）
 * 注：Express 错误处理中间件必须包含 4 个参数 (err, req, res, next)
 * 同步代码错误：自动被Express捕获并传递给错误处理中间件
异步代码错误：必须通过next(err)手动传递
未处理路由：通过404中间件捕获（放在所有路由之后）
 */
app.use((err, req, res, next) => {
  // 记录错误详情
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    ip: req.ip,
    error: {
      message: err.message,
      stack: err.stack,
      status: err.status || 500,
    },
  };
  console.error('catchError: ', JSON.stringify(errorLog, null, 2)); // 控制台打印错误堆栈，方便调试
  if (err.isOperational) {
    res.error(err.statusCode, err.message); // 自定义错误
  } else if (err.name === 'UnauthorizedError') {
    res.error(401, '请先完成登录');
  } else {
    res.error(err.status || 500, err.msg || err.message); // 系统错误，向客户端返回 500 状态码和错误提示
  }
});

// socket
const { createServer } = require('http');
const { Server } = require('socket.io');
const httpServer = createServer(app);
const util = require('util');

const io = new Server(httpServer, {
  /* options */
  cors: {
    origin: '*',
  },
});

io.engine.on('connection_error', (err) => {
  console.log('连接失败原因：', err.message);
});

io.on('connection', (socket) => {
  socket.emit(
    'client',
    `
    连接成功：
    socket:${util.inspect(socket.handshake, { depth: null, colors: false })},
    `,
  );
  socket.on('server', (data) => {
    socket.emit('client', 'from server');
  });
  // 每个 socket 自己的定时器！
  const timer = setInterval(() => {
    socket.broadcast.emit('client', `来自${socket.handshake.auth.user}的广播`);
    socket.emit('client', `from server：${socket.rooms}`);
  }, 5000);

  // 断开时清理自己的定时器
  socket.on('disconnect', () => {
    clearInterval(timer);
  });
});
/**
 * Start Express server. (启动 Express 服务器，监听指定端口)
 */
httpServer.listen(app.get('port'), async () => {
  const { BASE_URL } = process.env;

  // 连接数据库
  try {
    const { verifyPoolConnection, pool } = require('./models/db');
    await verifyPoolConnection();
    app.locals.pool = pool;
  } catch (error) {
    console.error('数据库连接失败，服务终止：', error);
    process.exit(1); // 连接失败则退出进程，避免启动无效服务
  }

  // 端口/域名匹配校验：给出警告提示，避免 CSRF 不匹配、Oauth 认证失败等问题
  if (!BASE_URL.startsWith('http://localhost')) {
    console.log(
      `The BASE_URL env variable is set to ${BASE_URL}. If you directly test the application through http://localhost:${app.get('port')} instead of the BASE_URL, it may cause a CSRF mismatch or an Oauth authentication failure. To avoid the issues, change the BASE_URL or configure your proxy to match it.\n`,
    );
  }
  // 服务器启动成功提示：打印访问地址、运行环境
  console.log(`App is running on http://localhost:${app.get('port')} in ${app.get('env')} mode.`);
  console.log('Press CTRL-C to stop.'); // 提示停止服务器的快捷键
});

/**
 * 导出 Express 应用实例
 * 作用：用于单元测试、集成测试，或在其他模块中复用该应用实例
 */
module.exports = app;
