import "../config/dotenv"
import mongoose from 'mongoose';
async function connectMongoDB() {
     try {
          await mongoose.connect(process.env.MONGO_URI as string);
     } catch (err) {
          console.error('❌ MongoDB connection error in workers:', err);
          process.exit(1);
     }
}
process.on('SIGTERM', async () => {
     console.log('SIGTERM received, closing MongoDB connection...');
     await mongoose.disconnect();
     process.exit(0);
});

process.on('SIGINT', async () => {
     console.log('SIGINT received, closing MongoDB connection...');
     await mongoose.disconnect();
     process.exit(0);
});

connectMongoDB().then(() => {
     require('./worker.emails');
     console.log('⛁  MongoDB connected for workers');
     console.log('🚀 All workers started successfully!');
});
