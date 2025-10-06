import { NextRequest, NextResponse } from 'next/server';
import { generateResponse } from '@/lib/gemma';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/ratelimit';
import { connectDB } from '@/lib/mongodb';
import ChatSession from '@/models/ChatSession';

export const dynamic = 'force-dynamic';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface ChatRequest {
  message: string;
  history?: Message[];
  sessionId?: string;
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  
  // Rate limiting
  const rateLimitResult = checkRateLimit(clientIP);
  const rateLimitHeaders = getRateLimitHeaders(clientIP);
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { 
        status: 429,
        headers: rateLimitHeaders
      }
    );
  }

  try {
    // Parse request body
    const body: ChatRequest = await request.json();
    const { message, history = [], sessionId } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required and must be a non-empty string' },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message too long. Maximum 2000 characters.' },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    // Validate history format
    if (!Array.isArray(history)) {
      return NextResponse.json(
        { error: 'History must be an array' },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    for (const msg of history) {
      if (!msg.role || !msg.content || !['user', 'model'].includes(msg.role)) {
        return NextResponse.json(
          { error: 'Invalid history format. Each message must have role (user|model) and content.' },
          { status: 400, headers: rateLimitHeaders }
        );
      }
    }

    // Generate AI response
    const aiResponse = await generateResponse(message, history);

    // Store in MongoDB
    const sessionIdToUse = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      await connectDB();
      
      const userMessage = {
        role: 'user' as const,
        content: message,
        timestamp: new Date()
      };

      const modelMessage = {
        role: 'model' as const,
        content: aiResponse,
        timestamp: new Date()
      };

      await ChatSession.findOneAndUpdate(
        { sessionId: sessionIdToUse },
        {
          $push: {
            messages: {
              $each: [userMessage, modelMessage]
            }
          }
        },
        { upsert: true, new: true }
      );
    } catch (dbError) {
      console.error('MongoDB error:', dbError);
      // Continue even if DB fails
    }

    return NextResponse.json(
      {
        response: aiResponse,
        sessionId: sessionIdToUse
      },
      {
        status: 200,
        headers: {
          ...rateLimitHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error: any) {
    console.error('Chat API error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error. Please try again.' 
      },
      { 
        status: 500,
        headers: getRateLimitHeaders(clientIP)
      }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Gemma Chat API',
      version: '1.0.0',
      endpoints: {
        POST: '/api/chat - Send a chat message'
      }
    },
    { status: 200 }
  );
}
