// Local development with Ollama + Phi-3 Mini
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const MODEL_NAME = 'phi3';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export async function initializeModel() {
  // For Ollama, we don't need to initialize - just check if it's running
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/tags`);
    if (!response.ok) {
      throw new Error('Ollama is not running. Please start Ollama first.');
    }
    console.log('Ollama connection verified');
    return true;
  } catch (error) {
    console.error('Failed to connect to Ollama:', error);
    throw new Error('Ollama is not running. Please install and start Ollama, then run: ollama pull phi3');
  }
}

export function formatPhi3Messages(history: Message[], newMessage: string): any[] {
  // Phi-3 chat format for Ollama
  const messages: any[] = [];
  
  // Add conversation history (keep only last 5 for context)
  const recentHistory = history.slice(-5);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    });
  }
  
  // Add new user message
  messages.push({
    role: 'user',
    content: newMessage
  });
  
  return messages;
}

export async function generateResponse(
  message: string,
  history: Message[] = []
): Promise<string> {
  try {
    // Validate input
    if (!message || typeof message !== 'string') {
      throw new Error('Invalid message: must be a non-empty string');
    }

    // Trim message but allow long prompts
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      throw new Error('Message cannot be empty');
    }

    // Limit total prompt length to prevent memory issues
    let truncatedHistory = history;
    
    // If history is too long, keep only recent messages
    if (history.length > 10) {
      truncatedHistory = history.slice(-10);
    }

    // Check Ollama connection
    await initializeModel();
    
    // Format messages for Phi-3
    const messages = formatPhi3Messages(truncatedHistory, trimmedMessage);
    
    // Call Ollama API
    const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: messages,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 512
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.message?.content || '';
    
    if (!aiResponse || aiResponse.length < 2) {
      return 'I apologize, but I could not generate a meaningful response. Please try rephrasing your question.';
    }
    
    return aiResponse.trim();
  } catch (error: any) {
    console.error('Generation error:', error);
    
    // Provide specific error messages
    if (error.message?.includes('Ollama')) {
      throw error; // Re-throw Ollama-specific errors
    } else if (error.message?.includes('fetch')) {
      throw new Error('Could not connect to Ollama. Make sure Ollama is running on http://localhost:11434');
    }
    
    throw new Error(`Failed to generate response: ${error.message || 'Unknown error'}`);
  }
}
