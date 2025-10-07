const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/gemma-chat';

async function checkDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Get collections
    const collections = await db.listCollections().toArray();
    console.log('\n📁 Collections:', collections.map(c => c.name).join(', '));
    
    // Get chat sessions
    const ChatSession = mongoose.model('ChatSession', new mongoose.Schema({}, { strict: false }), 'chatsessions');
    
    const count = await ChatSession.countDocuments();
    console.log(`\n💬 Total chat sessions: ${count}`);
    
    if (count > 0) {
      const sessions = await ChatSession.find().limit(3).lean();
      console.log('\n📝 Recent sessions:');
      sessions.forEach((session, i) => {
        console.log(`\n${i + 1}. Session ID: ${session.sessionId}`);
        console.log(`   Messages: ${session.messages?.length || 0}`);
        console.log(`   Created: ${session.createdAt}`);
        if (session.messages && session.messages.length > 0) {
          console.log(`   Last message: "${session.messages[session.messages.length - 1].content.substring(0, 50)}..."`);
        }
      });
    }
    
    await mongoose.connection.close();
    console.log('\n✓ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
