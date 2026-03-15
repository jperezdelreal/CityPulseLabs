import { CosmosClient, type Container } from '@azure/cosmos';

const DB_NAME = 'bici-coruna';
const CONTAINER_NAME = 'station-snapshots';

let container: Container | undefined;

export function getContainer(): Container {
  if (container) return container;

  const connectionString = process.env.COSMOS_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('COSMOS_CONNECTION_STRING environment variable is not set');
  }

  const client = new CosmosClient(connectionString);
  container = client.database(DB_NAME).container(CONTAINER_NAME);
  return container;
}

/** Reset the cached container (used in tests). */
export function resetContainer(): void {
  container = undefined;
}
