require('dotenv').config();
const mongoose = require('mongoose');

async function testMongoDBConnection() {
  console.log('🔍 Testing MongoDB Connection...');
  console.log('📝 Environment:', process.env.NODE_ENV || 'development');
  
  // Check if MONGO_URI is set
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI environment variable is not set!');
    console.log('💡 Please set MONGO_URI in your environment variables');
    return;
  }
  
  console.log('🔗 MONGO_URI:', MONGO_URI ? 'Set (hidden for security)' : 'Not set');
  
  try {
    console.log('🔄 Attempting to connect...');
    
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ MongoDB connection successful!');
    console.log('📊 Database:', mongoose.connection.name);
    console.log('🌐 Host:', mongoose.connection.host);
    console.log('🔌 Port:', mongoose.connection.port);
    console.log('👤 User:', mongoose.connection.user);
    
    // Test a simple query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📚 Collections found:', collections.length);
    collections.forEach(col => console.log(`  - ${col.name}`));
    
  } catch (error) {
    console.error('❌ MongoDB connection failed!');
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error name:', error.name);
    
    // Provide specific guidance based on error type
    if (error.code === 'ENOTFOUND') {
      console.log('\n🔍 Troubleshooting ENOTFOUND:');
      console.log('1. Check if your MongoDB URI is correct');
      console.log('2. Verify your network connection');
      console.log('3. Make sure the MongoDB cluster is accessible');
      console.log('4. Check if your IP is whitelisted in MongoDB Atlas');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n🔍 Troubleshooting ECONNREFUSED:');
      console.log('1. Check if MongoDB service is running');
      console.log('2. Verify the port number in your connection string');
      console.log('3. Check firewall settings');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n🔍 Troubleshooting ETIMEDOUT:');
      console.log('1. Check your network connection');
      console.log('2. Try increasing connection timeout');
      console.log('3. Check if MongoDB Atlas is experiencing issues');
    } else if (error.message.includes('Authentication failed')) {
      console.log('\n🔍 Troubleshooting Authentication:');
      console.log('1. Check your username and password');
      console.log('2. Verify your MongoDB Atlas credentials');
      console.log('3. Make sure the user has proper permissions');
    }
    
    console.log('\n💡 Common MongoDB URI format:');
    console.log('mongodb+srv://username:password@cluster.abc123.mongodb.net/database?retryWrites=true&w=majority');
  } finally {
    // Close the connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Connection closed');
    }
  }
}

// Run the test
testMongoDBConnection().catch(console.error); 