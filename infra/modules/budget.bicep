// ──────────────────────────────────────────────────────────────────────────────
// Budget Alerts — €100/mo ceiling with escalating notifications
// Alerts at €30 (30%), €60 (60%), €90 (90%)
// ──────────────────────────────────────────────────────────────────────────────

@description('Budget resource name')
param budgetName string

@description('Monthly budget amount in EUR')
param budgetAmount int = 100

@description('Contact email for budget notifications (leave empty to skip action group)')
param contactEmail string = ''

@description('Start date for budget tracking (first day of current month)')
param startDate string = utcNow('yyyy-MM-01')

// ─── Budget ─────────────────────────────────────────────────────────────────

resource budget 'Microsoft.Consumption/budgets@2023-11-01' = {
  name: budgetName
  properties: {
    category: 'Cost'
    amount: budgetAmount
    timeGrain: 'Monthly'
    timePeriod: {
      startDate: startDate
    }
    notifications: {
      warning30: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 30
        thresholdType: 'Actual'
        contactRoles: [
          'Owner'
          'Contributor'
        ]
        contactEmails: !empty(contactEmail) ? [contactEmail] : []
      }
      warning60: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 60
        thresholdType: 'Actual'
        contactRoles: [
          'Owner'
          'Contributor'
        ]
        contactEmails: !empty(contactEmail) ? [contactEmail] : []
      }
      critical90: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 90
        thresholdType: 'Actual'
        contactRoles: [
          'Owner'
          'Contributor'
        ]
        contactEmails: !empty(contactEmail) ? [contactEmail] : []
      }
    }
  }
}
