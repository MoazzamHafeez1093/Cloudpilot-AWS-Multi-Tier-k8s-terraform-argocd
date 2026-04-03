const express    = require('express');
const nodemailer = require('nodemailer');
const Database   = require('better-sqlite3');
const { z }      = require('zod');

const app  = express();
const PORT = process.env.PORT || 4003;

app.use(express.json());

const db = new Database(process.env.DB_PATH || '/data/notifications.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT NOT NULL,
    recipient  TEXT NOT NULL,
    subject    TEXT,
    body       TEXT NOT NULL,
    status     TEXT DEFAULT 'pending',
    attempts   INTEGER DEFAULT 0,
    sent_at    TEXT,
    error      TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.ethereal.email',
  port:   Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const NotifySchema = z.object({
  type:      z.enum(['email', 'webhook']),
  recipient: z.string().min(1),
  subject:   z.string().optional(),
  body:      z.string().min(1),
});

async function processNotification(id) {
  const n = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
  if (!n || n.status === 'sent') return;

  db.prepare(
    "UPDATE notifications SET status = 'processing', attempts = attempts + 1 WHERE id = ?"
  ).run(id);

  try {
    if (n.type === 'email') {
      await transporter.sendMail({
        from:    process.env.FROM_EMAIL || 'noreply@cloudpilot.local',
        to:      n.recipient,
        subject: n.subject || 'CloudPilot Notification',
        text:    n.body,
      });
    }
    db.prepare(
      "UPDATE notifications SET status = 'sent', sent_at = datetime('now'), error = NULL WHERE id = ?"
    ).run(id);
  } catch (err) {
    const nextStatus = n.attempts >= 3 ? 'failed' : 'pending';
    db.prepare(
      'UPDATE notifications SET status = ?, error = ? WHERE id = ?'
    ).run(nextStatus, err.message, id);
  }
}

app.post('/notifications/send', async (req, res) => {
  const result = NotifySchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });
  const { type, recipient, subject, body } = result.data;
  const info = db.prepare(
    'INSERT INTO notifications (type, recipient, subject, body) VALUES (?, ?, ?, ?)'
  ).run(type, recipient, subject ?? null, body);
  setImmediate(() => processNotification(info.lastInsertRowid));
  res.status(202).json({ message: 'Notification queued', id: info.lastInsertRowid });
});

app.get('/notifications', (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  let query = 'SELECT * FROM notifications WHERE 1=1';
  const params = [];
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));
  res.json({ notifications: db.prepare(query).all(...params) });
});

app.get('/notifications/:id', (req, res) => {
  const n = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
  if (!n) return res.status(404).json({ error: 'Notification not found' });
  res.json({ notification: n });
});

app.post('/notifications/:id/retry', (req, res) => {
  const n = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
  if (!n) return res.status(404).json({ error: 'Not found' });
  db.prepare(
    "UPDATE notifications SET status = 'pending', attempts = 0, error = NULL WHERE id = ?"
  ).run(req.params.id);
  setImmediate(() => processNotification(Number(req.params.id)));
  res.json({ message: 'Retry queued', id: Number(req.params.id) });
});

app.get('/health', (req, res) => {
  const stats = db.prepare(
    'SELECT status, COUNT(*) as count FROM notifications GROUP BY status'
  ).all();
  res.json({ status: 'healthy', service: 'notification-service', stats, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => console.log(`[notification-service] listening on :${PORT}`));