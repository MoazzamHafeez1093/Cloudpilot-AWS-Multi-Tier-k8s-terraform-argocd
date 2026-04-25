const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const Database = require('better-sqlite3');
const { z }    = require('zod');

const app        = express();
const PORT       = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

app.use(express.json());

const db = new Database(process.env.DB_PATH || '/data/users.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    UNIQUE NOT NULL,
    password   TEXT    NOT NULL,
    role       TEXT    DEFAULT 'user',
    created_at TEXT    DEFAULT (datetime('now')),
    updated_at TEXT    DEFAULT (datetime('now'))
  );
`);

const RegisterSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string(),
});

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalid or expired' });
  }
}

app.post('/users/register', async (req, res) => {
  const result = RegisterSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const { name, email, password } = result.data;
  const hashed = await bcrypt.hash(password, 12);

  try {
    const info = db.prepare(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
    ).run(name, email, hashed);
    const user = db.prepare(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?'
    ).get(info.lastInsertRowid);
    res.status(201).json({ message: 'User created successfully', user });
  } catch (err) {
    if (err.message.includes('UNIQUE'))
      return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/users/login', async (req, res) => {
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const { email, password } = result.data;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  const valid = user && await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get('/users/me', authenticate, (req, res) => {
  const user = db.prepare(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ?'
  ).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

app.get('/users', authenticate, (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin access required' });
  const users = db.prepare(
    'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json({ users, total: users.length });
});

app.get('/health', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  res.json({ status: 'healthy', service: 'user-service', users_registered: count, timestamp: new Date().toISOString() });
});

app.get('/users/health', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  res.json({ status: 'healthy', service: 'user-service', users_registered: count, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => console.log(`[user-service] listening on :${PORT}`));