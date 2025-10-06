// Edge-compatible MongoDB client using fetch API
const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DATA_API_KEY = process.env.MONGODB_DATA_API_KEY || '';
const MONGODB_DATA_API_URL = process.env.MONGODB_DATA_API_URL || '';

interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export async function saveToMongoDB(
  sessionId: string,
  userMessage: string,
  modelResponse: string
): Promise<void> {
  // If MongoDB Data API is configured, use it (Edge-compatible)
  if (MONGODB_DATA_API_URL && MONGODB_DATA_API_KEY) {
    try {
      const messages: Message[] = [
        {
          role: 'user',
          content: userMessage,
          timestamp: new Date().toISOString()
        },
        {
          role: 'model',
          content: modelResponse,
          timestamp: new Date().toISOString()
        }
      ];

      const response = await fetch(`${MONGODB_DATA_API_URL}/action/updateOne`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': MONGODB_DATA_API_KEY
        },
        body: JSON.stringify({
          dataSource: 'Cluster0',
          database: 'gemma-chat',
          collection: 'chatsessions',
          filter: { sessionId },
          update: {
            $push: {
              messages: { $each: messages }
            },
            $setOnInsert: {
              sessionId,
              createdAt: new Date().toISOString()
            },
            $set: {
              updatedAt: new Date().toISOString()
            }
          },
          upsert: true
        })
      });

      if (!response.ok) {
        throw new Error(`MongoDB Data API error: ${response.statusText}`);
      }

      console.log('Chat saved to MongoDB via Data API');
    } catch (error) {
      console.error('MongoDB Data API save failed:', error);
      // Fail silently - don't block the response
    }
  } else {
    // Fallback: log to console (for local dev without MongoDB)
    console.log('MongoDB not configured. Chat session:', {
      sessionId,
      userMessage: userMessage.substring(0, 50),
      modelResponse: modelResponse.substring(0, 50)
    });
  }
}
