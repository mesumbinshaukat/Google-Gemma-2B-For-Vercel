import { pipeline, env } from '@xenova/transformers';

// Configure for serverless environment (Vercel)
if (typeof window === 'undefined') {
  env.allowLocalModels = false;
  env.useBrowserCache = false;
  env.allowRemoteModels = true;
  // Use /tmp for cache in serverless (writable directory)
  env.cacheDir = '/tmp/.cache';
  
  // Suppress ONNX Runtime warnings
  if (process.env.NODE_ENV === 'production') {
    // Set ONNX log level to error only
    process.env.ORT_LOGGING_LEVEL = 'error';
  }
}

let generatorInstance: any = null;
let isInitializing = false;
let initPromise: Promise<any> | null = null;

// Few-shot examples for priming
const FEW_SHOT_EXAMPLES = `Example 1:
Question: Summarize: The quick brown fox jumps over the lazy dog.
Answer: A fox jumps over a dog.

Example 2:
Question: Think step-by-step: What is 15 + 27?
Answer: Step 1: Add the ones place: 5 + 7 = 12 (write 2, carry 1). Step 2: Add the tens place: 1 + 2 + 1 = 4. Result: 42

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
  
  // Add conversation history in Q&A format
  for (const msg of history) {
    if (msg.role === 'user') {
      prompt += `Question: ${msg.content}\n`;
    } else {
      prompt += `Answer: ${msg.content}\n\n`;
    }
  }
  
  // Add new user message with safety instruction
  const safeMessage = `${newMessage} (Respond helpfully and safely)`;
  prompt += `Question: ${safeMessage}\nAnswer:`;
  
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
    const baseTokens = 150;
    const messageLength = trimmedMessage.length;
    const maxTokens = messageLength > 500 ? 300 : messageLength > 200 ? 200 : baseTokens;
    
    const output = await generator(prompt, {
      max_new_tokens: maxTokens,
      temperature: 0.7,
      top_p: 0.9,
      do_sample: true,
      return_full_text: false,
      num_beams: 1,
      early_stopping: false
    });
    
    if (!output || !Array.isArray(output) || output.length === 0) {
      throw new Error('Model returned empty output');
    }
    
    let response = output[0]?.generated_text || '';
    
    // Clean up response - stop at question markers
    response = response
      .split('\nQuestion:')[0]
      .split('\nAnswer:')[0]
      .split('\n\n')[0]
      .trim();
    
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
