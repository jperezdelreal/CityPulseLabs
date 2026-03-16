import { CosmosClient, type Container } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

const DB_NAME = 'bici-coruna';
const CONTAINER_NAME = 'station-snapshots';

let container: Container | undefined;

export function getContainer(): Container {
  if (container) return container;

  const connectionString = process.env.COSMOS_CONNECTION_STRING;
  const endpoint = process.env.COSMOS_ENDPOINT;

  let client: CosmosClient;
  if (connectionString) {
    client = new CosmosClient(connectionString);
  } else if (endpoint) {
    // Use Managed Identity (AAD RBAC) when local auth is disabled
    client = new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() });
  } else {
    throw new Error(
      'Either COSMOS_CONNECTION_STRING or COSMOS_ENDPOINT must be set',
    );
  }

  container = client.database(DB_NAME).container(CONTAINER_NAME);
  return container;
}

/** Reset the cached container (used in tests). */
export function resetContainer(): void {
  container = undefined;
}
