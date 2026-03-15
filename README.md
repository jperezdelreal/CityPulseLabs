# BiciCoruña 🚲 — Smart Bike-Sharing Route Planner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/jperezdelreal/CityPulseLabs/actions/workflows/ci.yml/badge.svg)](https://github.com/jperezdelreal/CityPulseLabs/actions)

**BiciCoruña** is an intelligent bike-sharing route planner for A Coruña, Spain. It helps commuters find the fastest and most reliable routes combining walking, biking, and public transit. Real-time station availability, weather alerts, and AI-powered demand predictions keep you informed.

> **⚠️ Disclaimer:** This is an experimental, educational project developed by [CityPulse Labs](https://github.com/jperezdelreal/CityPulseLabs) (Syntax Sorcery). It is **not** an official product of BiciCoruña, the Ayuntamiento de A Coruña, or any government entity. Use at your own risk.

---

## What It Does

BiciCoruña helps you plan intermodal journeys combining multiple transportation modes:

```
Example Flow:
  Walk 100m → Bike Station A (check availability: 5 bikes)
  Ride 2.5km → Bike Station B (predicted availability: 87%)
  Walk 50m → Destination
  
Real-time data + AI predictions = confident route planning
Rain warning: ☂️ 65% chance in 15 minutes
```

### Key Features

- **Live Station Data**: Real-time bike and dock availability across 55 BiciCoruña stations
- **Demand Prediction**: AI forecasts station occupancy (confidence scores included)
- **Weather Integration**: Rain and temperature alerts for better trip planning
- **Intermodal Routes**: Seamless walking + biking combinations
- **Responsive Web UI**: Works on desktop and mobile devices

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Leaflet.js | Interactive map UI, route planning interface |
| **Backend** | Azure Functions (Node.js), Express.js | REST API for stations, predictions, weather |
| **Database** | Azure Cosmos DB (NoSQL) | Time-series data, demand predictions, cache |
| **Data Ingestion** | Azure Functions (Timer trigger) | GBFS polling, data enrichment, preprocessing |
| **Infrastructure** | Azure (App Service, Functions, Cosmos, CDN) | Scalable serverless deployment |
| **Monitoring** | Application Insights | Performance tracking, error logging |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│                   Hosted on Azure App Service                   │
│  ┌────────────┐    ┌──────────────┐    ┌──────────────┐        │
│  │ Route      │    │ Station      │    │ Weather      │        │
│  │ Planner    │    │ Map View     │    │ Alerts       │        │
│  └────────────┘    └──────────────┘    └──────────────┘        │
└──────────────────────────┬──────────────────────────────────────┘
                          │ HTTPS
        ┌─────────────────┼──────────────────┐
        │                 │                  │
   ┌────▼────────┐  ┌────▼───────┐  ┌──────▼──────┐
   │ GET /api/   │  │ GET /api/  │  │ GET /api/   │
   │ stations    │  │ predict    │  │ weather     │
   │             │  │            │  │             │
   │ Live Data   │  │ AI Forecast│  │ Rain/Temp   │
   └────┬────────┘  └────┬───────┘  └──────┬──────┘
        │                │                 │
        └────────────┬───┴─────────────────┘
                    │
      ┌─────────────▼──────────────┐
      │  Azure Functions (API)     │
      │  - Route optimization      │
      │  - Data transformation     │
      │  - Caching layer           │
      └──────────┬──────────────────┘
                 │
      ┌──────────┴──────────────────┐
      │                             │
   ┌──▼──────────┐        ┌────────▼───┐
   │ GBFS API    │        │ Cosmos DB   │
   │ (BiciCoruña)│        │ (TimeSeries)│
   │ 55 stations │        │ Predictions │
   └─────────────┘        └─────────────┘
        │
   ┌────▼──────────────────────┐
   │ Timer Trigger Function    │
   │ (Polls GBFS every 60s)    │
   └───────────────────────────┘
```

### Data Flow

1. **Ingestion**: Timer-triggered Azure Function polls BiciCoruña GBFS API every 60 seconds
2. **Enrichment**: Data is normalized, enriched with weather, and stored in Cosmos DB
3. **API**: REST endpoints serve live data, predictions, and weather alerts
4. **Frontend**: React app fetches data and renders interactive map with route suggestions

---

## Data Sources & Attribution

### BiciCoruña GBFS v2 API
- **Source**: [BiciCoruña Public GBFS Feed](https://www.bicoruna.gal/)
- **License**: [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
- **Data**: 55 bike stations across A Coruña, real-time availability
- **Polling**: Every 60 seconds via Azure Function timer trigger
- **Attribution Required**: Yes — must credit "BiciCoruña" in UI/docs

### openrouteservice
- **Source**: [openrouteservice](https://openrouteservice.org/)
- **License**: Free API tier (AGPL v3, but free usage allowed)
- **Data**: Route optimization, travel times, distance calculations
- **Rate Limits**: 40 requests/second, generous free tier

### Open-Meteo
- **Source**: [Open-Meteo](https://open-meteo.com/)
- **License**: Free, no attribution required
- **Data**: Weather forecasts, precipitation predictions, temperature
- **Rate Limits**: Unlimited (free tier)

### OpenStreetMap Tiles
- **Source**: [OpenStreetMap](https://www.openstreetmap.org/)
- **License**: [ODbL 1.0](https://opendatacommons.org/licenses/odbl/)
- **Data**: Base map tiles for Leaflet.js
- **Attribution**: "© OpenStreetMap contributors"

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** 9+
- **Azure Account** (for deployment; optional for local development)
- **Git**

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/jperezdelreal/CityPulseLabs.git
   cd CityPulseLabs
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file (or set environment variables):
   ```env
   REACT_APP_API_URL=http://localhost:3001
   REACT_APP_MAPBOX_TOKEN=your_mapbox_token_here
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Run tests:**
   ```bash
   npm test
   ```

6. **Build for production:**
   ```bash
   npm run build
   ```

### Running the Backend Locally

The backend (Azure Functions) requires the Azure Functions Core Tools:

```bash
npm install -g azure-functions-core-tools@4

# In the backend directory
cd backend
func start
```

This starts the API at `http://localhost:7071`.

---

## Azure Deployment

Deploy to Azure using the Azure Developer CLI:

```bash
# Ensure you're logged in
az login

# Deploy the entire stack (frontend + backend + infrastructure)
azd up
```

**What `azd up` does:**
- Creates/provisions Azure resources (App Service, Functions, Cosmos DB, CDN)
- Deploys React frontend to Azure App Service
- Deploys Azure Functions backend
- Configures environment variables and secrets
- Deploys infrastructure-as-code (Bicep templates)

**Typical Monthly Cost**: €6–€15 (free tier eligible for most services)
- **Maximum**: ~€100/month with heavy usage (generous free tiers available)

For detailed deployment options, see [docs/architecture.md](docs/architecture.md).

---

## Project Roadmap

### v0.1 — MVP (Current)
- ✅ Live station availability via GBFS
- ✅ Simple route planning (walking + biking)
- ✅ Real-time weather integration
- ✅ React UI with Leaflet map
- ✅ Basic Azure deployment

### v0.2 — Demand Prediction (In Progress)
- 🚧 AI-powered station occupancy forecasting
- 🚧 Confidence scores for predictions
- 🚧 Historical demand analytics
- 🚧 Demand heatmaps

### v0.3 — Smart Recommendations
- 📋 Personalized route suggestions
- 📋 Seasonal demand patterns
- 📋 Event-based predictions (concerts, sports, holidays)
- 📋 Multi-day trip planning
- 📋 Mobile app (iOS/Android)

---

## Documentation

- **[Architecture & Infrastructure](docs/architecture.md)** — System design, API endpoints, deployment guide
- **[Data Sources & Attribution](docs/data-sources.md)** — Detailed info on external APIs and data licensing
- **[Contributing](CONTRIBUTING.md)** — How to contribute to this project

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) file for details.

**Data Attribution:**
- BiciCoruña GBFS data is licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
- OpenStreetMap data is licensed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/)
- See [docs/data-sources.md](docs/data-sources.md) for full attribution details

---

## Credits

**CityPulse Labs** by [Syntax Sorcery](https://github.com/SyntaxSorcery)

An experimental, educational project exploring smart city data and route optimization.

---

## Support & Contact

- 📧 [GitHub Issues](https://github.com/jperezdelreal/CityPulseLabs/issues) — bug reports, feature requests
- 💬 [GitHub Discussions](https://github.com/jperezdelreal/CityPulseLabs/discussions) — questions, ideas
- 🐛 Found a bug? Please [open an issue](https://github.com/jperezdelreal/CityPulseLabs/issues/new)

---

**Made with ❤️ for sustainable urban mobility**
