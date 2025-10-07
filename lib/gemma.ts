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
      // Using Flan-T5-Small (80M params, instruction-tuned)
      // Specifically trained for Q&A and following instructions
      generatorInstance = await pipeline(
        'text2text-generation',
        'Xenova/flan-t5-small'
      );
      console.log('Flan-T5-Small model loaded successfully');
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

export function formatT5Prompt(history: Message[], newMessage: string): string {
  // Flan-T5 works best with direct questions
  // Just pass the question directly, optionally with context
  let prompt = newMessage;
  
  return prompt;
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
    
    // Format prompt for Flan-T5 (simple text format)
    const prompt = formatT5Prompt(truncatedHistory, trimmedMessage);
    
    // Calculate appropriate max_new_tokens based on message length
    const baseTokens = 150;
    const messageLength = trimmedMessage.length;
    const maxTokens = messageLength > 500 ? 256 : messageLength > 200 ? 200 : baseTokens;
    
    const output = await generator(prompt, {
      max_new_tokens: maxTokens,
      temperature: 0.7,
      top_p: 0.9,
      do_sample: true
    });
    
    if (!output || !Array.isArray(output) || output.length === 0) {
      throw new Error('Model returned empty output');
    }
    
    // Flan-T5 returns simple text
    let response = output[0]?.generated_text || '';
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
