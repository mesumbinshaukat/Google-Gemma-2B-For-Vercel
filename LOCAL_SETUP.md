# Local Development Setup with Phi-3 Mini

This branch (`local`) is configured to run Phi-3 Mini locally using Ollama.

## Prerequisites

1. **Node.js 18+**
2. **Ollama** - Local LLM runtime

## Installation Steps

### 1. Install Ollama

**Windows:**
Download and install from: https://ollama.com/download/windows

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Pull Phi-3 Mini Model

```bash
ollama pull phi3
```

This will download the Phi-3 Mini 4K Instruct model (~2.3GB).

### 3. Start Ollama Service

**Windows:**
Ollama starts automatically after installation. Check if it's running:
```powershell
curl http://localhost:11434
```

**macOS/Linux:**
```bash
ollama serve
```

### 4. Install Project Dependencies

```bash
npm install
```

### 5. Configure Environment

Create `.env.local`:
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
# MongoDB Atlas Connection String (required)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gemma-chat?retryWrites=true&w=majority

# Ollama API URL (optional, defaults to http://localhost:11434)
OLLAMA_API_URL=http://localhost:11434
```

### 6. Run Development Server

```bash
npm run dev
```

The API will be available at: `http://localhost:3000/api/chat`

## Testing the API

### Test with curl:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is artificial intelligence?"}'
```

### Test with PowerShell:

```powershell
$body = '{"message":"What is artificial intelligence?"}' 
Invoke-RestMethod -Uri "http://localhost:3000/api/chat" -Method POST -Body $body -ContentType "application/json"
```

## Troubleshooting

### Error: "Ollama is not running"

**Solution:**
1. Check if Ollama is running: `curl http://localhost:11434`
2. Start Ollama service (see step 3 above)
3. Verify model is installed: `ollama list`

### Error: "model 'phi3' not found"

**Solution:**
```bash
ollama pull phi3
```

### Slow first response

**Normal behavior:** First request takes 5-10 seconds as the model loads into memory. Subsequent requests are much faster (<1 second).

### MongoDB connection error

**Solution:**
- Verify `MONGODB_URI` in `.env.local`
- Check IP whitelist in MongoDB Atlas (add `0.0.0.0/0` or your IP)
- Test connection: `mongosh "your_connection_string"`

## Model Information

- **Model**: Microsoft Phi-3 Mini 4K Instruct
- **Size**: ~2.3GB (quantized)
- **Context**: 4096 tokens
- **Quality**: High-quality instruction-tuned responses
- **Speed**: ~20-50 tokens/second (depends on hardware)

## Architecture

```
User Request
    ↓
Next.js API Route (/api/chat)
    ↓
lib/gemma.ts (Ollama client)
    ↓
Ollama (http://localhost:11434)
    ↓
Phi-3 Mini Model
    ↓
Response
```

## Advantages of Local Setup

✅ **No API costs** - Everything runs locally
✅ **Privacy** - Data never leaves your machine
✅ **High quality** - Phi-3 Mini is instruction-tuned
✅ **Fast responses** - No network latency
✅ **Offline capable** - Works without internet
✅ **Full control** - Adjust parameters as needed

## Production Deployment

**Note**: This local setup is for development only. For production on Vercel, switch back to the `main` branch which uses smaller models compatible with serverless constraints.

```bash
git checkout main
```

## System Requirements

- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 5GB free space
- **CPU**: Modern multi-core processor
- **GPU**: Optional (Ollama can use GPU if available)

## Next Steps

1. ✅ Verify Ollama is running
2. ✅ Pull phi3 model
3. ✅ Start dev server
4. ✅ Test API endpoint
5. 🎉 Start building!
