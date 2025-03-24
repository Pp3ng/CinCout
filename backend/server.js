const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const app = express();
const port = 9527;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../frontend')));

// Import routes
const compileRouter = require('./routes/compile');
const memcheckRouter = require('./routes/memcheck');
const formatRouter = require('./routes/format');
const styleCheckRouter = require('./routes/styleCheck');

// Use routes
app.use('/api/compile', compileRouter);
app.use('/api/memcheck', memcheckRouter);
app.use('/api/format', formatRouter);
app.use('/api/styleCheck', styleCheckRouter);

// Server startup
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 