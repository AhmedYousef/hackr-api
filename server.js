const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT;

// setup db
mongoose
  .connect(process.env.DATABASE_CLOUD, {})
  .then(() => console.log('DB connected'))
  .catch((err) => console.log('DB Error => ', err));

// import routes
const authRoute = require('./routes/auth');
const userRoute = require('./routes/user');
const categoryRoute = require('./routes/category');
const linkRoute = require('./routes/link');

// app middlewares
app.use(morgan('dev'));
// app.use(bodyParser.json());
app.use(bodyParser.json({ limit: '5mb', type: 'application/json' }));
app.use(cors({ origin: process.env.CLIENT_URL }));

// middlewares
app.use('/api', authRoute);
app.use('/api', userRoute);
app.use('/api', categoryRoute);
app.use('/api', linkRoute);

app.listen(PORT, () => {
  console.log(`API is running on port ${PORT}`);
});
