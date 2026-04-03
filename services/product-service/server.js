const express  = require('express');
const Database = require('better-sqlite3');
const { z }    = require('zod');

const app  = express();
const PORT = process.env.PORT || 4002;

app.use(express.json());

const db = new Database(process.env.DB_PATH || '/data/products.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT,
    price       REAL    NOT NULL CHECK(price >= 0),
    stock       INTEGER DEFAULT 0,
    category    TEXT    DEFAULT 'general',
    image_url   TEXT,
    created_at  TEXT    DEFAULT (datetime('now')),
    updated_at  TEXT    DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS categories (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL
  );
  INSERT OR IGNORE INTO categories (name, slug) VALUES
    ('Electronics', 'electronics'),
    ('Books',       'books'),
    ('Clothing',    'clothing'),
    ('General',     'general');
`);

const ProductSchema = z.object({
  name:        z.string().min(1).max(200),
  description: z.string().optional(),
  price:       z.number().min(0),
  stock:       z.number().int().min(0).default(0),
  category:    z.string().default('general'),
  image_url:   z.string().url().optional(),
});

app.get('/products', (req, res) => {
  const { category, search, page = 1, limit = 20 } = req.query;
  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];
  if (category) { query += ' AND category = ?'; params.push(category); }
  if (search)   { query += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));
  const products = db.prepare(query).all(...params);
  const total    = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  res.json({ products, total, page: Number(page), limit: Number(limit) });
});

app.get('/products/categories/list', (req, res) => {
  res.json({ categories: db.prepare('SELECT * FROM categories ORDER BY name').all() });
});

app.get('/products/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ product });
});

app.post('/products', (req, res) => {
  const result = ProductSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });
  const { name, description, price, stock, category, image_url } = result.data;
  const info = db.prepare(
    'INSERT INTO products (name, description, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, description ?? null, price, stock, category, image_url ?? null);
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ message: 'Product created', product });
});

app.put('/products/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  const result = ProductSchema.partial().safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });
  const fields = Object.keys(result.data);
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  const set    = fields.map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(result.data), req.params.id];
  db.prepare(`UPDATE products SET ${set}, updated_at = datetime('now') WHERE id = ?`).run(...values);
  res.json({ message: 'Product updated', product: db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) });
});

app.delete('/products/:id', (req, res) => {
  const info = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Product not found' });
  res.json({ message: 'Product deleted' });
});

app.get('/health', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  res.json({ status: 'healthy', service: 'product-service', products_count: count, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => console.log(`[product-service] listening on :${PORT}`));