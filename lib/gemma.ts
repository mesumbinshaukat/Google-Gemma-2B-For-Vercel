import { pipeline, env } from '@xenova/transformers';

// Configure for serverless environment (Vercel)
if (typeof window === 'undefined') {
  env.allowLocalModels = false;
  env.useBrowserCache = false;
  env.allowRemoteModels = true;
  // Use /tmp for cache in serverless (writable directory)
  env.cacheDir = '/tmp/.cache';
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
  const generator = await initializeModel();
  
  // Check if message needs CoT
  const needsCoT = /\b(solve|calculate|explain|why|how|step)\b/i.test(message);
  const processedMessage = needsCoT ? `Think step-by-step: ${message}` : message;
  
  const prompt = formatGemmaPrompt(history, processedMessage);
  
  try {
    const output = await generator(prompt, {
      max_new_tokens: 150,
      temperature: 0.7,
      top_p: 0.9,
      do_sample: true,
      return_full_text: false
    });
    
    let response = output[0]?.generated_text || '';
    
    // Clean up response - stop at question markers
    response = response
      .split('\nQuestion:')[0]
      .split('\n\n')[0]
      .trim();
    
    return response || 'I apologize, but I could not generate a response.';
  } catch (error) {
    console.error('Generation error:', error);
    throw new Error('Failed to generate response');
  }
}
