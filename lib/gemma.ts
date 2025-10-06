import { pipeline, env } from '@xenova/transformers';

// Configure for serverless environment (Vercel)
if (typeof window === 'undefined') {
  env.allowLocalModels = false;
  env.useBrowserCache = false;
  env.allowRemoteModels = true;
  // Use /tmp for cache in serverless (writable directory)
  env.cacheDir = '/tmp/.cache';
  
  // Suppress ONNX Runtime warnings (3 = ERROR level only, suppresses warnings)
  process.env.ORT_LOGGING_LEVEL = '3';
}

let generatorInstance: any = null;
let isInitializing = false;
let initPromise: Promise<any> | null = null;

interface Message {
  role: 'user' | 'model';
  content: string;
}

export async function initializeModel() {
  if (generatorInstance) return generatorInstance;
  
  if (isInitializing) {
    return initPromise;
  }

  isInitializing = true;
  initPromise = (async () => {
    try {
      // Using Microsoft Phi-3 Mini (3.8B params, instruction-tuned)
      // ONNX optimized for web/edge, much better quality than GPT-2
      generatorInstance = await pipeline(
        'text-generation',
        'Xenova/Phi-3-mini-4k-instruct'
      );
      console.log('Phi-3 Mini model loaded successfully');
      return generatorInstance;
    } catch (error) {
      console.error('Failed to load model:', error);
      isInitializing = false;
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

export function formatPhi3Messages(history: Message[], newMessage: string): any[] {
  // Phi-3 expects messages in chat format: [{role: 'user', content: '...'}, {role: 'assistant', content: '...'}]
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
    const MAX_PROMPT_LENGTH = 4000;
    let truncatedHistory = history;
    
    // If history is too long, keep only recent messages
    if (history.length > 10) {
      truncatedHistory = history.slice(-10);
    }

    const generator = await initializeModel();
    
    // Format messages for Phi-3 (uses chat format, not plain text)
    const messages = formatPhi3Messages(truncatedHistory, trimmedMessage);
    
    // Calculate appropriate max_new_tokens based on message length
    const baseTokens = 150;
    const messageLength = trimmedMessage.length;
    const maxTokens = messageLength > 500 ? 300 : messageLength > 200 ? 200 : baseTokens;
    
    const output = await generator(messages, {
      max_new_tokens: maxTokens,
      temperature: 0.7,
      top_p: 0.9,
      do_sample: false  // Phi-3 works better with greedy decoding
    });
    
    if (!output || !Array.isArray(output) || output.length === 0) {
      throw new Error('Model returned empty output');
    }
    
    // Phi-3 returns messages in format: [{generated_text: [{role, content}]}]
    const generatedMessage = output[0]?.generated_text;
    let response = '';
    
    if (Array.isArray(generatedMessage)) {
      // Get the last assistant message
      const lastMessage = generatedMessage[generatedMessage.length - 1];
      response = lastMessage?.content || '';
    } else if (typeof generatedMessage === 'string') {
      response = generatedMessage;
    }
    
    response = response.trim();
    
    // Ensure we have a valid response
    if (!response || response.length < 2) {
      return 'I apologize, but I could not generate a meaningful response. Please try rephrasing your question.';
    }
    
    return response;
  } catch (error: any) {
    console.error('Generation error:', error);
    
    // Provide specific error messages
    if (error.message?.includes('out of memory')) {
      throw new Error('Request too large. Please try a shorter message.');
    } else if (error.message?.includes('timeout')) {
      throw new Error('Request timed out. Please try again.');
    } else if (error.message?.includes('Model')) {
      throw new Error('Model initialization failed. Please try again in a moment.');
    }
    
    throw new Error(`Failed to generate response: ${error.message || 'Unknown error'}`);
  }
}
