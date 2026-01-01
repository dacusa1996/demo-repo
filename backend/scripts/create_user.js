/**
 * Create a user in the MySQL database with a bcrypt-hashed password.
 * Usage:
 *   node scripts/create_user.js --name "Jane Doe" --email jane@local --password Pass123! --role clerk
 * Reads DB connection from env (.env supported via dotenv).
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

function parseArgs() {
  const args = {};
  const raw = process.argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = raw[i+1] && !raw[i+1].startsWith('--') ? raw[++i] : 'true';
      args[key] = val;
    }
  }
  return args;
}

(async () => {
  const argv = parseArgs();
  const name = argv.name || argv.n;
  const email = argv.email || argv.e;
  const password = argv.password || argv.p;
  const roleName = argv.role || 'clerk';

  if (!name || !email || !password) {
    console.error('Missing required args. Example: node scripts/create_user.js --name "Jane" --email jane@x --password Pass123! --role clerk');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 4000,
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'admas_dev'
  });

  try {
    // ensure role exists
    const [rows] = await conn.execute('SELECT id FROM roles WHERE name = ? LIMIT 1', [roleName]);
    let roleId;
    if (rows && rows.length > 0) roleId = rows[0].id;
    else {
      const [res] = await conn.execute('INSERT INTO roles (name, description) VALUES (?,?)', [roleName, roleName + ' role']);
      roleId = res.insertId || res.lastInsertId || null;
    }

    const hash = bcrypt.hashSync(password, 10);
    await conn.execute('INSERT INTO users (name, email, password_hash, role_id) VALUES (?,?,?,?)', [name, email, hash, roleId]);
    console.log('User created:', email, 'role:', roleName);
  } catch (err) {
    console.error('Error creating user:', err.message || err);
  } finally {
    await conn.end();
  }
})();

