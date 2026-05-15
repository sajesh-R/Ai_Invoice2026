const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
    
    if (!uri) {
      console.warn("⚠️  MongoDB connection URI is missing in .env");
      return;
    }

    const conn = await mongoose.connect(uri);
    console.log(`\n✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`\n❌ MongoDB Connection Failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB };
