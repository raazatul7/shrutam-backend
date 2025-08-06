import dotenv from 'dotenv';
import { testConnection } from './config/database';

// Load environment variables
dotenv.config();


async function healthCheck(): Promise<void> {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('Database connection failed');
      process.exit(1);
    }

    console.log('Health check passed');
    process.exit(0);
  } catch (error) {
    console.error('Health check failed:', error);
    process.exit(1);
  }
}

// Run health check if this file is executed directly
if (require.main === module) {
  healthCheck();
}

export default healthCheck; 