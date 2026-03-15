// ──────────────────────────────────────────────────────────────────────────────
// Monitoring — Application Insights + Log Analytics
// Free tier: 5 GB/month ingestion included
// Estimated cost: €0 (within free allowance for prototype traffic)
// ──────────────────────────────────────────────────────────────────────────────

@description('Application Insights resource name')
param applicationInsightsName string

@description('Log Analytics workspace name')
param logAnalyticsName string

@description('Location for monitoring resources')
param location string = resourceGroup().location

@description('Tags to apply to all resources')
param tags object = {}

// ─── Log Analytics Workspace ────────────────────────────────────────────────

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    workspaceCapping: {
      dailyQuotaGb: 1
    }
  }
}

// ─── Application Insights ───────────────────────────────────────────────────

resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: applicationInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    RetentionInDays: 30
  }
}

// ─── Outputs ────────────────────────────────────────────────────────────────

output applicationInsightsConnectionString string = applicationInsights.properties.ConnectionString
output applicationInsightsId string = applicationInsights.id
output logAnalyticsWorkspaceId string = logAnalytics.id
