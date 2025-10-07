# API Documentation

## Base URL
- **Local Development**: `http://localhost:3000`
- **Production**: `https://your-vercel-deployment.vercel.app`

---

## Endpoints

### 1. Health Check
**GET** `/api/chat`

**Use Case**: Check if the API is running and available

**Request**:
```bash
curl http://localhost:3000/api/chat
```

**Response**:
```json
{
  "message": "Gemma Chat API",
  "version": "1.0.0",
  "endpoints": {
    "POST": "/api/chat - Send a chat message"
  }
}
```

**Status Codes**:
- `200` - API is running

---

### 2. Send Chat Message
**POST** `/api/chat`

**Use Case**: Send a message to the AI and get a response. Supports conversation history for multi-turn conversations.

**Request Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "message": "What is artificial intelligence?",      // Required: User's message (max 10,000 chars)
  "history": [                                        // Optional: Conversation history (max 50 messages)
    {
      "role": "user",                                 // Required: "user" or "model"
      "content": "Hello"                              // Required: Message content (max 5,000 chars)
    },
    {
      "role": "model",
      "content": "Hi! How can I help you?"
    }
  ],
  "sessionId": "session_123456789"                    // Optional: Session ID for continuity
}
```

**Response**:
```json
{
  "response": "Artificial Intelligence (AI) refers to...",  // AI-generated response
  "sessionId": "session_1759804030125_zuw8ao67q"           // Session ID (new or provided)
}
```

**Status Codes**:
- `200` - Success
- `400` - Bad Request (invalid input)
- `429` - Rate Limit Exceeded (10 requests/minute per IP)
- `500` - Internal Server Error

**Error Response**:
```json
{
  "error": "Message is required and must be a non-empty string"
}
```

---

## Usage Examples

### Example 1: Simple Question
**Use Case**: Ask a single question without context

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is 2+2?"
  }'
```

**PowerShell**:
```powershell
$body = '{"message":"What is 2+2?"}'
Invoke-RestMethod -Uri "http://localhost:3000/api/chat" -Method POST -Body $body -ContentType "application/json"
```

---

### Example 2: Conversation with History
**Use Case**: Continue a conversation with context

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What about Germany?",
    "history": [
      {"role": "user", "content": "What is the capital of France?"},
      {"role": "model", "content": "The capital of France is Paris."}
    ]
  }'
```

**PowerShell**:
```powershell
$body = @{
    message = "What about Germany?"
    history = @(
        @{role="user"; content="What is the capital of France?"},
        @{role="model"; content="The capital of France is Paris."}
    )
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:3000/api/chat" -Method POST -Body $body -ContentType "application/json"
```

---

### Example 3: Session Continuity
**Use Case**: Maintain a session across multiple requests

```bash
# First request
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, my name is John"}'
# Returns: {"response": "...", "sessionId": "session_123"}

# Second request with same session
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is my name?",
    "sessionId": "session_123"
  }'
```

---

### Example 4: Long Prompt
**Use Case**: Send detailed instructions or long text

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain quantum computing in detail, including its principles, applications, and future potential. Include examples of quantum algorithms and compare with classical computing."
  }'
```

---

## Request Limits

| Parameter | Limit | Description |
|-----------|-------|-------------|
| **Message Length** | 10,000 characters | Maximum length for a single message |
| **History Size** | 50 messages | Maximum number of messages in history |
| **History Message** | 5,000 characters | Maximum length per history message |
| **Rate Limit** | 10 requests/minute | Per IP address |
| **Timeout** | 60 seconds | Maximum request duration |

---

## Response Time

| Scenario | Expected Time |
|----------|---------------|
| **First Request** | 3-5 seconds (model loading) |
| **Subsequent Requests** | 1-2 seconds |
| **Long Responses** | 2-5 seconds |

---

## Error Handling

### Common Errors

**400 Bad Request**:
```json
{"error": "Message too long. Maximum 10000 characters."}
{"error": "History too long. Maximum 50 messages."}
{"error": "Invalid JSON in request body"}
```

**429 Rate Limit**:
```json
{"error": "Rate limit exceeded. Please try again later."}
```

**500 Internal Server Error**:
```json
{"error": "Failed to generate response: Ollama is not running"}
{"error": "Request timed out. Please try again."}
```

---

## Data Storage

All chat sessions are automatically stored in MongoDB:

- **Database**: `gemma-chat`
- **Collection**: `chatsessions`
- **Stored Data**:
  - Session ID
  - User messages with timestamps
  - AI responses with timestamps
  - Created/Updated timestamps

**View stored sessions**:
```bash
node check-mongodb.js          # View all sessions
node view-latest-session.js    # View latest conversation
```

---

## Testing Tools

### Quick Test Script
```powershell
# Test health check
Invoke-WebRequest -Uri "http://localhost:3000/api/chat" -Method GET

# Test chat
$body = '{"message":"Hello, how are you?"}'
Invoke-RestMethod -Uri "http://localhost:3000/api/chat" -Method POST -Body $body -ContentType "application/json"
```

### Automated Startup
```powershell
# Start Ollama and Next.js dev server automatically
.\start-dev.ps1
```

---

## Notes

- **Local Development**: Uses Ollama with Phi-3 Mini model (3.8B parameters)
- **Production**: Uses smaller models compatible with Vercel serverless constraints
- **Model Location**: `D:\ollama-models` (2.03GB)
- **Ollama API**: `http://localhost:11434`
- **MongoDB**: `mongodb://localhost:27017/gemma-chat`

---

## Support

For issues or questions:
1. Check Ollama is running: `http://localhost:11434`
2. Check dev server: `http://localhost:3000/api/chat`
3. View logs in terminal
4. Check MongoDB: `node check-mongodb.js`
