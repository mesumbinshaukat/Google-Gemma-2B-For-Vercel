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

// Few-shot examples for priming - clear and accurate
const FEW_SHOT_EXAMPLES = `Question: What is 2+2?
Answer: 2+2 equals 4.

Question: What is the capital of France?
Answer: The capital of France is Paris.

Question: What is AI?
Answer: AI (Artificial Intelligence) is the simulation of human intelligence by machines, enabling them to learn, reason, and solve problems.

`;

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
      // Using GPT-2 which is proven to work with text-generation pipeline
      // Smaller model (124M params) that fits Vercel constraints
      generatorInstance = await pipeline(
        'text-generation',
        'Xenova/gpt2',
        {
          quantized: true
        }
      );
      console.log('Text generation model loaded successfully');
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

export function formatGemmaPrompt(history: Message[], newMessage: string): string {
  let prompt = FEW_SHOT_EXAMPLES;
  
  // Add conversation history in Q&A format (keep only last 3 for context)
  const recentHistory = history.slice(-3);
  for (const msg of recentHistory) {
    if (msg.role === 'user') {
      prompt += `Question: ${msg.content}\n`;
    } else {
      prompt += `Answer: ${msg.content}\n\n`;
    }
  }
  
  // Add new user message
  prompt += `Question: ${newMessage}\nAnswer:`;
  
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
    
    // Check if message needs CoT
    const needsCoT = /\b(solve|calculate|explain|why|how|step)\b/i.test(trimmedMessage);
    const processedMessage = needsCoT ? `Think step-by-step: ${trimmedMessage}` : trimmedMessage;
    
    let prompt = formatGemmaPrompt(truncatedHistory, processedMessage);
    
    // Truncate prompt if too long
    if (prompt.length > MAX_PROMPT_LENGTH) {
      prompt = prompt.substring(prompt.length - MAX_PROMPT_LENGTH);
    }
    
    // Calculate appropriate max_new_tokens based on message length
    const baseTokens = 100;
    const messageLength = trimmedMessage.length;
    const maxTokens = messageLength > 500 ? 200 : messageLength > 200 ? 150 : baseTokens;
    
    const output = await generator(prompt, {
      max_new_tokens: maxTokens,
      temperature: 0.3,  // Lower temperature for more focused responses
      top_p: 0.85,
      top_k: 40,
      do_sample: true,
      return_full_text: false,
      repetition_penalty: 1.2  // Reduce repetition
    });
    
    if (!output || !Array.isArray(output) || output.length === 0) {
      throw new Error('Model returned empty output');
    }
    
    let response = output[0]?.generated_text || '';
    
    // Clean up response - stop at question markers or newlines
    response = response
      .split('\nQuestion:')[0]
      .split('\nAnswer:')[0]
      .split('\n\nQuestion:')[0]
      .split('\n\n\n')[0]
      .trim();
    
    // Remove incomplete sentences at the end
    if (response.length > 50 && !response.match(/[.!?]$/)) {
      const lastSentence = response.lastIndexOf('.');
      if (lastSentence > response.length / 2) {
        response = response.substring(0, lastSentence + 1);
      }
    }
    
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
