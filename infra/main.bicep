targetScope = 'subscription'

// ──────────────────────────────────────────────────────────────────────────────
// CityPulse Labs — BiciCoruña Azure Infrastructure
// SWA (Free) + Functions (Consumption) + Cosmos DB (Serverless) + App Insights
// Target: €6–15/mo typical | Budget ceiling: €100/mo
// ──────────────────────────────────────────────────────────────────────────────

@minLength(1)
@maxLength(64)
@description('Environment name used to generate unique resource names (e.g., dev, prod)')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string = 'westeurope'

@description('Contact email for budget alerts')
param budgetContactEmail string = ''

// Optional overrides
param resourceGroupName string = ''
param staticWebAppName string = ''
param cosmosAccountName string = ''
param applicationInsightsName string = ''
param logAnalyticsName string = ''
param functionAppName string = ''
param appServicePlanName string = ''
param storageAccountName string = ''

var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = {
  project: 'citypulse-labs'
  product: 'bicicoruña'
  'managed-by': 'syntax-sorcery'
  environment: environmentName
  'azd-env-name': environmentName
}

// ─── Resource Group ──────────────────────────────────────────────────────────

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: !empty(resourceGroupName) ? resourceGroupName : 'rg-citypulse-${environmentName}'
  location: location
  tags: tags
}

// ─── Static Web App (Free tier) ─────────────────────────────────────────────

module swa 'modules/static-web-app.bicep' = {
  name: 'static-web-app'
  scope: rg
  params: {
    name: !empty(staticWebAppName) ? staticWebAppName : 'swa-citypulse-${resourceToken}'
    location: location
    tags: union(tags, { 'azd-service-name': 'web' })
  }
}

// ─── Cosmos DB (Serverless, NoSQL API) ──────────────────────────────────────

module cosmos 'modules/cosmos.bicep' = {
  name: 'cosmos-db'
  scope: rg
  params: {
    accountName: !empty(cosmosAccountName) ? cosmosAccountName : 'cosmos-citypulse-${resourceToken}'
    location: location
    tags: tags
  }
}

// ─── Functions (Consumption plan) ───────────────────────────────────────────

module functions 'modules/functions.bicep' = {
  name: 'functions'
  scope: rg
  params: {
    functionAppName: !empty(functionAppName) ? functionAppName : 'func-citypulse-${resourceToken}'
    appServicePlanName: !empty(appServicePlanName) ? appServicePlanName : 'plan-citypulse-${resourceToken}'
    storageAccountName: !empty(storageAccountName) ? storageAccountName : 'stcitypulse${resourceToken}'
    location: location
    tags: union(tags, { 'azd-service-name': 'api' })
    applicationInsightsConnectionString: monitoring.outputs.applicationInsightsConnectionString
    cosmosAccountEndpoint: cosmos.outputs.endpoint
    cosmosAccountName: cosmos.outputs.accountName
    staticWebAppDefaultHostname: swa.outputs.defaultHostname
  }
}

// ─── Monitoring (Application Insights + Log Analytics) ──────────────────────

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  scope: rg
  params: {
    applicationInsightsName: !empty(applicationInsightsName) ? applicationInsightsName : 'appi-citypulse-${resourceToken}'
    logAnalyticsName: !empty(logAnalyticsName) ? logAnalyticsName : 'log-citypulse-${resourceToken}'
    location: location
    tags: tags
  }
}

// ─── Budget alerts (€100/mo ceiling) ────────────────────────────────────────

module budget 'modules/budget.bicep' = {
  name: 'budget-alerts'
  scope: rg
  params: {
    budgetName: 'budget-citypulse-${environmentName}'
    budgetAmount: 100
    contactEmail: budgetContactEmail
  }
}

// ─── Outputs ────────────────────────────────────────────────────────────────

output AZURE_LOCATION string = location
output AZURE_RESOURCE_GROUP string = rg.name

output SWA_NAME string = swa.outputs.name
output SWA_DEFAULT_HOSTNAME string = swa.outputs.defaultHostname
output SWA_URL string = 'https://${swa.outputs.defaultHostname}'

output COSMOS_ENDPOINT string = cosmos.outputs.endpoint
output COSMOS_DATABASE_NAME string = cosmos.outputs.databaseName

output FUNCTION_APP_NAME string = functions.outputs.functionAppName
output FUNCTION_APP_URL string = functions.outputs.functionAppUrl

output APPLICATIONINSIGHTS_CONNECTION_STRING string = monitoring.outputs.applicationInsightsConnectionString
