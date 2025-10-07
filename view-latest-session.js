const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/gemma-chat';

async function viewLatestSession() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    const ChatSession = mongoose.model('ChatSession', new mongoose.Schema({}, { strict: false }), 'chatsessions');
    
    const latest = await ChatSession.findOne().sort({ createdAt: -1 }).lean();
    
    if (latest) {
      console.log('\n=== LATEST CHAT SESSION ===\n');
      console.log(`Session ID: ${latest.sessionId}`);
      console.log(`Created: ${latest.createdAt}`);
      console.log(`Updated: ${latest.updatedAt}`);
      console.log(`Total Messages: ${latest.messages?.length || 0}\n`);
      
      if (latest.messages && latest.messages.length > 0) {
        console.log('--- CONVERSATION ---\n');
        latest.messages.forEach((msg, i) => {
          const role = msg.role === 'user' ? '👤 USER' : '🤖 AI';
          console.log(`${role}:`);
          console.log(`${msg.content}\n`);
        });
      }
    } else {
      console.log('No sessions found');
    }
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

viewLatestSession();
