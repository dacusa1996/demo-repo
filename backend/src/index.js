require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const assetsRoutes = require('./routes/assets');
const usersRoutes = require('./routes/users');
const requestsRoutes = require('./routes/requests');
const dashboardRoutes = require('./routes/dashboard');
const maintenanceRoutes = require('./routes/maintenance');

const app = express();

const allowedOrigins = [
  'https://dacusa1996.github.io',
  'https://proscribable-ann-galleried.ngrok-free.dev',
  'http://localhost:3308',
  'http://127.0.0.1:3308',
  'http://localhost:53308',
  'http://127.0.0.1:53308'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  }
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(bodyParser.json());

app.get('/health', (req, res) => res.json({ ok: true, time: new Date() }));

app.use('/api/auth', authRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/maintenance', maintenanceRoutes);

// default to 3308 to avoid conflicts with common local ports
const port = process.env.PORT || 3308;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
