const mongoose = require("mongoose");

const DEFAULT_MONGO_URI = "mongodb://127.0.0.1:27017/mybackend";

let isConnected = false;

const connectDatabase = async () => {
  if (isConnected) return mongoose.connection;

  const mongoUri = String(process.env.MONGO_URI || DEFAULT_MONGO_URI).trim();

  mongoose.set("bufferCommands", false);

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
  });

  isConnected = true;
  console.log(`[DB] Connected to MongoDB: ${mongoUri}`);

  mongoose.connection.on("error", (error) => {
    console.error("[DB] MongoDB error:", error.message);
  });

  mongoose.connection.on("disconnected", () => {
    isConnected = false;
    console.warn("[DB] MongoDB disconnected");
  });

  return mongoose.connection;
};

module.exports = connectDatabase;
