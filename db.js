const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://pinkypreranaws:q9AqdpWzMcOhEzJY@cluster0.rnbkuue.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully!');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};


module.exports = connectDB;
