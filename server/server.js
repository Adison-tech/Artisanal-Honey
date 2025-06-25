require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mpesaRoutes = require('./routes/mpesaRoutes');
const { connectDB } = require('./config/daraja-db');

const app = express();
const PORT = process.env.PORT || 5000;

//connect to PostgreSQL
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/mpesa', mpesaRoutes);

// Route for testing
app.get('/', (req, res) => {
  res.send('Daraja Backend running!');
});

// Error handling middleware 
app.use((err, req, res, next) => {
  console.error(error.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});