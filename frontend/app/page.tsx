async function getBackendMessage(): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api';

  try {
    const response = await fetch(baseUrl, { cache: 'no-store' });
    if (!response.ok) {
      return `Backend error: ${response.status}`;
    }
    return await response.text();
  } catch {
    return 'Cannot connect to backend.';
  }
}

export default async function HomePage() {
  const backendMessage = await getBackendMessage();

  return (
    <main>
      <h1>Frontend Next.js (port 3000)</h1>
      <div className="card">
        <p>
          <strong>Backend URL:</strong> {process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api'}
        </p>
        <p>
          <strong>Backend response:</strong> {backendMessage}
        </p>
      </div>
    </main>
  );
}
