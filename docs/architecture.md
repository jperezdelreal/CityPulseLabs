# BiciCoruña Architecture & Infrastructure

This document provides a technical overview of the BiciCoruña system design, data flows, API endpoints, and Azure infrastructure.

---

## System Architecture

### High-Level Design

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Browser                                                                │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  React Frontend (TypeScript + Tailwind CSS)                    │    │
│  │  - Interactive map (Leaflet.js)                               │    │
│  │  - Route planner UI                                            │    │
│  │  - Real-time weather alerts                                    │    │
│  │  - Demand prediction visualization                             │    │
│  └────────────────────┬─────────────────────────────────────────┘    │
└───────────────────────┼───────────────────────────────────────────────┘
                        │ HTTPS
                        │
        ┌───────────────┼───────────────┐
        │               │               │
   ┌────▼────┐     ┌───▼────┐     ┌───▼──────┐
   │ Stations│     │Predict │     │ Weather  │
   │API      │     │API     │     │ API      │
   └────┬────┘     └───┬────┘     └───┬──────┘
        │              │              │
        └──────────┬───┴──────────────┘
                   │
        ┌──────────▼────────────┐
        │ Azure Functions       │
        │ (Node.js + Express)   │
        │                       │
        │ - Route optimization  │
        │ - Data transform      │
        │ - Cache logic         │
        │ - Prediction service  │
        └──────────┬────────────┘
                   │
        ┌──────────┴────────────┐
        │                       │
    ┌───▼────────┐      ┌──────▼──┐
    │ GBFS API   │      │ Cosmos   │
    │ (BiciCoruña)      │ DB       │
    │ 55 stations│      │          │
    │ (live)     │      │ Cache    │
    └────────────┘      │ Time-    │
                        │ series   │
                        │ Demand   │
                        └──────────┘
        │
    ┌───▼──────────────────┐
    │ Timer Trigger Fn     │
    │ (Every 60s)          │
    │ - Poll GBFS          │
    │ - Store in DB        │
    │ - Compute predictions│
    └──────────────────────┘

External APIs:
├─ BiciCoruña GBFS (55 stations)
├─ Open-Meteo (weather)
└─ openrouteservice (routing)
```

### Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | React 18, TypeScript, Tailwind, Leaflet.js | User-facing web app |
| **API Layer** | Azure Functions, Node.js, Express.js | REST API for data access |
| **Database** | Cosmos DB (NoSQL, MongoDB API) | Time-series storage, predictions, cache |
| **Data Ingestion** | Azure Function (Timer Trigger) | GBFS polling, data enrichment |
| **Hosting** | Azure App Service | Frontend deployment |
| **CDN** | Azure CDN (optional) | Edge caching for static assets |

---

## Data Flow

### 1. Station Data (Real-Time)

```
BiciCoruña GBFS API
        │
        │ (Poll every 60s)
        │
Timer Trigger Function
├─ Fetch station list (55 stations)
├─ Fetch real-time vehicle counts
├─ Fetch dock availability
└─ Store raw data in Cosmos DB
        │
   Cosmos DB Collection: "stations_raw"
   ├─ station_id: string
   ├─ name: string
   ├─ lat: number
   ├─ lon: number
   ├─ bikes_available: number
   ├─ docks_available: number
   ├─ timestamp: ISO8601
   └─ ttl: 3600 (expires after 1 hour)
        │
   GET /api/stations (live endpoint)
        │
   Frontend renders map with markers
```

### 2. Demand Prediction

```
Cosmos DB (historical data)
        │
Timer Trigger Function (hourly)
├─ Aggregate historical patterns (7-day window)
├─ Run ML model (currently: simple time-series forecast)
├─ Compute confidence scores
└─ Store predictions in Cosmos DB
        │
   Cosmos DB Collection: "predictions"
   ├─ station_id: string
   ├─ timestamp: ISO8601
   ├─ predicted_bikes: number
   ├─ confidence: number (0-100)
   ├─ horizon_minutes: number
   └─ model_version: string
        │
   GET /api/predict?station={id}&horizon={mins}
        │
   Frontend displays confidence as color/badge
```

### 3. Weather Integration

```
Open-Meteo API (free, no key required)
        │
        │ GET /forecast (hourly)
        │
Timer Trigger Function (every 30 mins)
├─ Fetch weather for A Coruña (43.3623, -8.2147)
├─ Extract precipitation, temperature
├─ Compute rain risk for next 3 hours
└─ Cache in Cosmos DB
        │
   Cosmos DB Collection: "weather"
   ├─ timestamp: ISO8601
   ├─ temp_c: number
   ├─ humidity: number
   ├─ precipitation_mm: number
   ├─ rain_probability: number (0-100)
   └─ ttl: 1800
        │
   GET /api/weather
        │
   Frontend shows weather alert if rain > 60%
```

---

## API Endpoints

### 1. GET /api/stations

Returns live availability data for all 55 BiciCoruña stations.

**Request:**
```http
GET /api/stations HTTP/1.1
Host: api.bicoruna.app
Accept: application/json
```

**Response (200 OK):**
```json
{
  "timestamp": "2026-03-15T14:30:00Z",
  "stations": [
    {
      "id": "1001",
      "name": "Praia de Riazor",
      "latitude": 43.3672,
      "longitude": -8.2428,
      "bikes_available": 8,
      "docks_available": 14,
      "total_capacity": 22,
      "is_returning": true,
      "is_renting": true,
      "last_updated": "2026-03-15T14:29:50Z"
    },
    {
      "id": "1002",
      "name": "Avenida de los Ángeles",
      "latitude": 43.3610,
      "longitude": -8.2285,
      "bikes_available": 0,
      "docks_available": 12,
      "total_capacity": 12,
      "is_returning": true,
      "is_renting": false,
      "last_updated": "2026-03-15T14:29:52Z"
    }
  ],
  "count": 55
}
```

**Cache**: 30 seconds (updates every 60s from GBFS)

---

### 2. GET /api/predict

Returns AI-powered demand predictions for a station.

**Request:**
```http
GET /api/predict?station=1001&horizon=30 HTTP/1.1
Host: api.bicoruna.app
Accept: application/json
```

**Parameters:**
- `station` (required): Station ID (e.g., "1001")
- `horizon` (optional): Minutes into future (default: 30, max: 240)

**Response (200 OK):**
```json
{
  "station_id": "1001",
  "station_name": "Praia de Riazor",
  "timestamp": "2026-03-15T14:30:00Z",
  "horizon_minutes": 30,
  "prediction": {
    "predicted_bikes_available": 6,
    "confidence": 87,
    "confidence_interval": {
      "min": 3,
      "max": 10
    },
    "predicted_availability": "GOOD"
  },
  "current": {
    "bikes_available": 8,
    "docks_available": 14
  },
  "model_info": {
    "version": "v0.2-arima",
    "last_trained": "2026-03-14T00:00:00Z",
    "accuracy_rmse": 2.4
  }
}
```

**Confidence Ranges:**
- **90+**: Very High
- **70-89**: High
- **50-69**: Medium
- **<50**: Low

---

### 3. GET /api/weather

Returns current weather and rain forecast for A Coruña.

**Request:**
```http
GET /api/weather HTTP/1.1
Host: api.bicoruna.app
Accept: application/json
```

**Response (200 OK):**
```json
{
  "timestamp": "2026-03-15T14:30:00Z",
  "location": {
    "name": "A Coruña, Spain",
    "latitude": 43.3623,
    "longitude": -8.2147
  },
  "current": {
    "temperature_celsius": 14,
    "humidity_percent": 72,
    "precipitation_mm": 0,
    "wind_speed_kmh": 12,
    "condition": "Partly Cloudy"
  },
  "forecast": {
    "next_3_hours": {
      "rain_probability": 35,
      "precipitation_mm": 1.2,
      "temperature_celsius": 13,
      "alert": null
    },
    "next_6_hours": {
      "rain_probability": 65,
      "precipitation_mm": 4.5,
      "temperature_celsius": 12,
      "alert": "⚠️ Rain expected. Consider alternative transport."
    }
  },
  "data_source": "Open-Meteo (free API)"
}
```

---

### 4. GET /api/health

Health check endpoint for monitoring.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "timestamp": "2026-03-15T14:30:00Z",
  "dependencies": {
    "cosmosdb": "connected",
    "gbfs_api": "reachable",
    "openrouteservice": "ok"
  }
}
```

---

## Azure Infrastructure

### Services

| Service | Purpose | Tier | Monthly Cost |
|---------|---------|------|--------------|
| **Azure App Service** | Frontend hosting | B1 (Basic) | €10-15 |
| **Azure Functions** | Backend API + timers | Consumption | €0-5 |
| **Cosmos DB** | Time-series database | Free tier (25 GB RU/s) | €0 |
| **Azure CDN** | Static asset caching | Standard | €0-5 |
| **Application Insights** | Monitoring | Free tier | €0 |

**Total Monthly Cost**: €6–€15 (within free/cheap tiers)
**Maximum with heavy usage**: ~€100/month

### Infrastructure as Code

The infrastructure is defined in Bicep templates (Azure's ARM template language):

```
infrastructure/
├─ main.bicep              # Main orchestration template
├─ modules/
│  ├─ app-service.bicep    # Frontend hosting
│  ├─ functions.bicep      # Backend API
│  ├─ cosmos-db.bicep      # Database
│  └─ cdn.bicep            # CDN
└─ parameters.json         # Deployment variables
```

### Deployment Flow

```
azd up
    │
    ├─ Provision Azure Resources (Bicep)
    │  ├─ Create Resource Group
    │  ├─ Deploy App Service
    │  ├─ Deploy Functions
    │  ├─ Deploy Cosmos DB
    │  └─ Configure networking
    │
    ├─ Build Frontend
    │  └─ npm run build
    │
    ├─ Deploy Frontend
    │  └─ Push to App Service
    │
    ├─ Deploy Backend
    │  ├─ npm install
    │  └─ func azure functionapp publish
    │
    └─ Configure Environment
       ├─ Set secrets in Key Vault
       ├─ Configure CORS
       └─ Enable Application Insights
```

---

## Environment Variables

### Frontend (.env.local)

```env
REACT_APP_API_URL=https://api.bicoruna.app
REACT_APP_MAP_CENTER_LAT=43.3623
REACT_APP_MAP_CENTER_LON=-8.2147
REACT_APP_MAP_ZOOM=12
REACT_APP_VERSION=0.1.0
```

### Backend (local.settings.json)

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "COSMOS_CONNECTION_STRING": "AccountEndpoint=https://...",
    "GBFS_API_URL": "https://gbfs.bicoruna.gal/gbfs.json",
    "OPENROUTESERVICE_API_KEY": "your_key_here",
    "OPENMETEO_API_URL": "https://api.open-meteo.com",
    "ENVIRONMENT": "development"
  }
}
```

### Deployed (Azure Key Vault)

Secrets are stored securely in Azure Key Vault:
- `cosmos-connection-string`
- `openrouteservice-api-key`
- `app-insights-key`

---

## Performance & Scalability

### Caching Strategy

| Endpoint | Cache TTL | Refresh Rate |
|----------|-----------|--------------|
| `/api/stations` | 30s | GBFS every 60s |
| `/api/predict` | 5m | Computed hourly |
| `/api/weather` | 10m | Open-Meteo every 30m |

### Rate Limiting

Current limits (to prevent abuse):
- **Unauthenticated**: 100 requests/minute per IP
- **Authenticated**: 1000 requests/minute

### Scaling

- **Frontend**: Automatic scaling via App Service (scales 1-3 instances)
- **Backend**: Serverless auto-scaling (scales 0-100 concurrent executions)
- **Database**: Cosmos DB free tier (25 GB, 400 RU/s guaranteed)

---

## Monitoring & Logging

### Application Insights

Key metrics tracked:
- API response times (target: <500ms)
- Error rates (target: <0.1%)
- GBFS polling success rate (target: >99%)
- Cosmos DB throughput usage
- Cold start times (Azure Functions)

### Alerts

Auto-triggers on:
- Error rate > 1%
- Response time > 1s (p95)
- GBFS polling failures (>3 consecutive)
- Database throttling

### Logs

Structured logging to Application Insights:
- API requests/responses
- GBFS sync events
- Prediction model runs
- Cosmos DB operations

---

## Security

### HTTPS/TLS

All endpoints require HTTPS (TLS 1.2+). Certificates managed by Azure.

### CORS

Frontend requests to API are authorized via CORS:
```
Access-Control-Allow-Origin: https://bicoruna.app
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Max-Age: 3600
```

### Input Validation

All API inputs are validated:
- Station IDs: alphanumeric, max 10 chars
- Horizon: integer, 1-240 minutes

### No Authentication

Currently, all endpoints are public (no API keys required). Future versions may add optional authentication for power users.

---

## Next Steps (v0.2+)

- [ ] Implement advanced ML model (Prophet, ARIMA)
- [ ] Add batch predictions (all stations, next 24h)
- [ ] Implement API rate limiting with API keys
- [ ] Add POST endpoint for user feedback/data labeling
- [ ] Set up automated model retraining pipeline
- [ ] Implement GraphQL alternative to REST API
- [ ] Add WebSocket support for real-time updates

---

## Troubleshooting

**Issue**: GBFS API unreachable
- Check network connectivity
- Verify GBFS_API_URL is correct
- Check Application Insights for errors

**Issue**: Predictions showing low confidence
- Model may need retraining (needs 7+ days data)
- Check if new station added (no historical data)

**Issue**: High API latency
- Check Cosmos DB throughput (RU usage)
- Look for cold starts in Functions (consider premium plan)
- Verify CDN is working for static assets

**Issue**: Weather alerts not showing
- Verify Open-Meteo API is reachable
- Check latitude/longitude in config

---

**Last Updated**: 2026-03-15
**Maintainer**: CityPulse Labs (Syntax Sorcery)
