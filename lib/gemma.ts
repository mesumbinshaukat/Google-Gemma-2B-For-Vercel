import { pipeline, env } from '@xenova/transformers';

// Configure for serverless environment
if (typeof window === 'undefined') {
  env.allowLocalModels = false;
  env.useBrowserCache = false;
  env.allowRemoteModels = true;
}

let generatorInstance: any = null;
let isInitializing = false;
let initPromise: Promise<any> | null = null;

// Few-shot examples for priming
const FEW_SHOT_EXAMPLES = `Example 1:
<start_of_turn>user
Summarize: The quick brown fox jumps over the lazy dog.<end_of_turn>
<start_of_turn>model
A fox jumps over a dog.<end_of_turn>

Example 2:
<start_of_turn>user
Think step-by-step: What is 15 + 27?<end_of_turn>
<start_of_turn>model
Step 1: Add the ones place: 5 + 7 = 12 (write 2, carry 1)
Step 2: Add the tens place: 1 + 2 + 1 = 4
Result: 42<end_of_turn>

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
      // Load text generation model with quantization for memory efficiency
      // Using LaMini-Flan-T5-783M as Gemma 2B IT is not available in Xenova
      generatorInstance = await pipeline(
        'text-generation',
        'Xenova/LaMini-Flan-T5-783M',
        {
          quantized: true
        }
      );
      console.log('Text generation model loaded successfully');
      return generatorInstance;
    } catch (error) {
      console.error('Failed to load Gemma model:', error);
      isInitializing = false;
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

export function formatGemmaPrompt(history: Message[], newMessage: string): string {
  let prompt = FEW_SHOT_EXAMPLES;
  
  // Add conversation history
  for (const msg of history) {
    prompt += `<start_of_turn>${msg.role}\n${msg.content}<end_of_turn>\n`;
  }
  
  // Add new user message with safety instruction
  const safeMessage = `${newMessage}\nRespond helpfully and safely, avoiding harm.`;
  prompt += `<start_of_turn>user\n${safeMessage}<end_of_turn>\n<start_of_turn>model\n`;
  
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
      max_new_tokens: 512,
      temperature: 0.7,
      top_p: 0.9,
      do_sample: true,
      return_full_text: false,
      stop_strings: ['</s>', '<end_of_turn>']
    });
    
    let response = output[0]?.generated_text || '';
    
    // Clean up response
    response = response
      .split('</s>')[0]
      .split('<end_of_turn>')[0]
      .trim();
    
    return response || 'I apologize, but I could not generate a response.';
  } catch (error) {
    console.error('Generation error:', error);
    throw new Error('Failed to generate response');
  }
}
