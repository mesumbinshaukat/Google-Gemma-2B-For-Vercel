export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Gemma Chat API</h1>
      <p>AI-powered chat backend using Google Gemma 2B</p>
      
      <h2>API Endpoint</h2>
      <code style={{ background: '#f4f4f4', padding: '0.5rem', display: 'block', marginBottom: '1rem' }}>
        POST /api/chat
      </code>
      
      <h3>Example Request:</h3>
      <pre style={{ background: '#f4f4f4', padding: '1rem', overflow: 'auto' }}>
{`{
  "message": "Explain quantum computing",
  "history": [],
  "sessionId": "optional-session-id"
}`}
      </pre>
      
      <h3>Test the API:</h3>
      <p>Use curl, Postman, or any HTTP client to send POST requests to <code>/api/chat</code></p>
      
      <a href="/api/chat" style={{ color: '#0070f3', textDecoration: 'none' }}>
        View API Info →
      </a>
    </main>
  );
}
