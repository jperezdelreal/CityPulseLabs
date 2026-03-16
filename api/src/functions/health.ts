import { app } from '@azure/functions';
import type { HttpRequest, HttpResponseInit } from '@azure/functions';

async function healthHandler(
  _req: HttpRequest,
): Promise<HttpResponseInit> {
  const checks: Record<string, string> = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    runtime: 'node',
    version: process.env.FUNCTIONS_EXTENSION_VERSION ?? 'unknown',
  };

  // Verify Cosmos DB config is present
  const hasCosmosConfig = !!(
    process.env.COSMOS_CONNECTION_STRING || process.env.COSMOS_ENDPOINT
  );
  checks.cosmos = hasCosmosConfig ? 'configured' : 'missing';

  const allHealthy = hasCosmosConfig;

  return {
    status: allHealthy ? 200 : 503,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checks),
  };
}

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthHandler,
});
