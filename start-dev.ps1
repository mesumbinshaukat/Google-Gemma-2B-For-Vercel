#!/usr/bin/env pwsh
# Development Server Startup Script
# This script checks and starts Ollama, then starts the Next.js dev server

Write-Host "=== Starting Development Environment ===" -ForegroundColor Cyan

# Step 1: Check if Ollama is running
Write-Host "`n[1/3] Checking Ollama status..." -ForegroundColor Yellow

try {
    $ollamaCheck = Invoke-WebRequest -Uri "http://localhost:11434" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✓ Ollama is already running" -ForegroundColor Green
} catch {
    Write-Host "⚠ Ollama is not running. Starting Ollama..." -ForegroundColor Yellow
    
    # Set environment variables for D: drive
    $env:OLLAMA_MODELS = "D:\ollama-models"
    $env:OLLAMA_HOME = "D:\Ollama"
    
    # Start Ollama
    Start-Process -FilePath "D:\Ollama\bin\ollama.exe" -ArgumentList "serve" -WindowStyle Hidden
    
    # Wait for Ollama to start
    Write-Host "Waiting for Ollama to start..." -ForegroundColor Gray
    $maxAttempts = 10
    $attempt = 0
    $started = $false
    
    while ($attempt -lt $maxAttempts -and -not $started) {
        Start-Sleep -Seconds 1
        try {
            $test = Invoke-WebRequest -Uri "http://localhost:11434" -Method GET -TimeoutSec 1 -ErrorAction Stop
            $started = $true
            Write-Host "✓ Ollama started successfully" -ForegroundColor Green
        } catch {
            $attempt++
            Write-Host "." -NoNewline -ForegroundColor Gray
        }
    }
    
    if (-not $started) {
        Write-Host "`n✗ Failed to start Ollama" -ForegroundColor Red
        Write-Host "Please start Ollama manually: D:\Ollama\bin\ollama.exe serve" -ForegroundColor Yellow
        exit 1
    }
}

# Step 2: Verify Phi3 model is available
Write-Host "`n[2/3] Verifying Phi3 model..." -ForegroundColor Yellow

try {
    $env:OLLAMA_MODELS = "D:\ollama-models"
    $testBody = @{
        model = "phi3"
        messages = @(@{role="user"; content="test"})
        stream = $false
    } | ConvertTo-Json -Depth 3
    
    $testResponse = Invoke-RestMethod -Uri "http://localhost:11434/api/chat" -Method POST -Body $testBody -ContentType "application/json" -TimeoutSec 10
    Write-Host "✓ Phi3 model is ready" -ForegroundColor Green
} catch {
    Write-Host "✗ Phi3 model not found or not responding" -ForegroundColor Red
    Write-Host "Please run: D:\Ollama\bin\ollama.exe pull phi3" -ForegroundColor Yellow
    exit 1
}

# Step 3: Start Next.js dev server
Write-Host "`n[3/3] Starting Next.js development server..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Gray

# Start the dev server
npm run dev
