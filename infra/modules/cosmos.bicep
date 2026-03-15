// ──────────────────────────────────────────────────────────────────────────────
// Cosmos DB — Serverless, NoSQL API
// Database: bici-coruna | Container: station-snapshots
// Partition key: /stationId | TTL: 90 days (7776000s)
// Estimated cost: €5–12/mo (pay-per-request, no provisioned RU/s)
// ──────────────────────────────────────────────────────────────────────────────

@description('Cosmos DB account name')
param accountName string

@description('Location for the Cosmos DB account')
param location string = resourceGroup().location

@description('Tags to apply to all resources')
param tags object = {}

@description('Database name')
param databaseName string = 'bici-coruna'

@description('Station snapshots container name')
param containerName string = 'station-snapshots'

@description('Partition key path for station snapshots')
param partitionKeyPath string = '/stationId'

@description('Default TTL in seconds (90 days = 7776000)')
param defaultTtl int = 7776000

// ─── Cosmos DB Account (Serverless) ─────────────────────────────────────────

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: accountName
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      { name: 'EnableServerless' }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    enableFreeTier: false
  }
}

// ─── SQL Database ───────────────────────────────────────────────────────────

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmosAccount
  name: databaseName
  properties: {
    resource: {
      id: databaseName
    }
  }
}

// ─── Station Snapshots Container ────────────────────────────────────────────

resource container 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: containerName
  properties: {
    resource: {
      id: containerName
      partitionKey: {
        paths: [partitionKeyPath]
        kind: 'Hash'
      }
      defaultTtl: defaultTtl
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          { path: '/*' }
        ]
        excludedPaths: [
          { path: '/"_etag"/?' }
        ]
      }
    }
  }
}

// ─── Outputs ────────────────────────────────────────────────────────────────

output accountName string = cosmosAccount.name
output endpoint string = cosmosAccount.properties.documentEndpoint
output databaseName string = database.name
