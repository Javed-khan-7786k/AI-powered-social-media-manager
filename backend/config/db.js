const mongoose = require('mongoose');

// In-memory collection fallback store when MongoDB is disconnected or in standalone mode
const memoryStore = {
  users: [],
  linkedInAccounts: [],
  posts: [],
  drafts: [],
  media: [],
  schedules: [],
  logs: [],
  analytics: [],
  events: [],
  repositories: [],
  failedJobs: [],
};

let memoryIdCounter = 1;
const nextMemoryId = () => `mem_${Date.now()}_${memoryIdCounter++}`;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_social_media_manager';
  try {
    mongoose.set('strictQuery', false);

    // IMPORTANT: without this, Mongoose silently queues (buffers) every model
    // query while disconnected and waits indefinitely for a connection that
    // may never come. That turned every DB-backed route into a hang (and every
    // Jest test that hit one into a 5s timeout) instead of a fast, readable
    // error. Disabling buffering makes queries reject immediately when there's
    // no active connection.
    mongoose.set('bufferCommands', false);

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log('✅ MongoDB connected successfully to database:', mongoose.connection.name);
    return true;
  } catch (err) {
    console.warn('⚠️ MongoDB Connection Notice:', err.message);
    console.log('💡 Running in In-Memory / Standalone Fallback Data Mode for local testing.');
    return false;
  }
};

module.exports = {
  connectDB,
  memoryStore,
  nextMemoryId,
  isConnected: () => mongoose.connection.readyState === 1,
};
