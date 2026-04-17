const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan('combined'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

const USER_SERVICE_URL    = process.env.USER_SERVICE_URL    || 'http://user-service:4001';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:4002';
const NOTIFY_SERVICE_URL  = process.env.NOTIFY_SERVICE_URL  || 'http://notification-service:4003';

app.use('/api/users', createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/users': '/users' },
}));

app.use('/api/products', createProxyMiddleware({
  target: PRODUCT_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/products': '/products' },
}));

app.use('/api/notifications', createProxyMiddleware({
  target: NOTIFY_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/notifications': '/notifications' },
}));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'api-gateway',
    version: process.env.APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

app.listen(PORT, () => console.log(`[api-gateway] listening on :${PORT}`));
// ci trigger
