import { connect } from "mongoose"
import os from 'node:os';

function getLocalIP(): any {
     const interfaces = os.networkInterfaces();
     for (const name in interfaces) {
          for (const iface of interfaces[name]!) {
               if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
               }
          }
     }
}

export const mongoDBConfig = async (retries = 5): Promise<void> => {
     const uri = process.env.MONGO_URI as string
     try {
          await connect(uri, { serverSelectionTimeoutMS: 5000 });
          console.log('✅ Success connected to EGYStay Database')
          console.log('ɪᴘ My IP Address:', getLocalIP());
     } catch (err) {
          if (retries > 0) {
               console.warn(`MongoDB connection failed. Retrying... (${retries} left)`);
               await new Promise(r => setTimeout(r, 3000));
               return mongoDBConfig(retries - 1);
          }
          console.error('MongoDB connection error:', err);
          process.exit(1);
     }
}
