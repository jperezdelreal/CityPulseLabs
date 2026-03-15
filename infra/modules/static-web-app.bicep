// ──────────────────────────────────────────────────────────────────────────────
// Azure Static Web App — Free tier
// Includes integrated Azure Functions for API
// Estimated cost: €0/mo (Free tier)
// ──────────────────────────────────────────────────────────────────────────────

@description('Static Web App name')
param name string

@description('Location for the Static Web App')
param location string = resourceGroup().location

@description('Tags to apply')
param tags object = {}

// ─── Static Web App ─────────────────────────────────────────────────────────

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    buildProperties: {
      appLocation: '/'
      apiLocation: 'api'
      outputLocation: 'dist'
    }
  }
}

// ─── Outputs ────────────────────────────────────────────────────────────────

output name string = staticWebApp.name
output defaultHostname string = staticWebApp.properties.defaultHostname
output id string = staticWebApp.id
