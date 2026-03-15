# BiciCoruña 🚲 — Smart Bike-Sharing Route Planner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/jperezdelreal/CityPulseLabs/actions/workflows/ci.yml/badge.svg)](https://github.com/jperezdelreal/CityPulseLabs/actions)

**BiciCoruña** is an intelligent bike-sharing route planner for A Coruña, Spain. It helps commuters find the fastest and most reliable routes combining walking, biking, and public transit. Real-time station availability, weather alerts, and AI-powered demand predictions keep you informed.

> **⚠️ Disclaimer:** This is an experimental, educational project developed by [CityPulse Labs](https://github.com/jperezdelreal/CityPulseLabs) (Syntax Sorcery). It is **not** an official product of BiciCoruña, the Ayuntamiento de A Coruña, or any government entity. Use at your own risk.

---

## Project Status

🟢 **LIVE** — App deployed at [https://icy-cliff-065550703.2.azurestaticapps.net](https://icy-cliff-065550703.2.azurestaticapps.net)

### Implementation Summary
- **v0.1 (MVP)**: 7 issues — scaffolding, Azure IaC, GBFS, map, routing, data pipeline, CI/CD
- **v0.2 (Smart Features)**: 6 issues — confidence score, prediction, bike types, rain, stats, geofencing
- **v0.3 (Enhanced Intelligence)**: 4 issues — enhanced prediction, predictive confidence, routing optimization, PWA
- **Quality Sprint**: Code review, UI polish, geolocation, error handling hardening
- **Cross-cutting**: 2 issues — docs, UI/UX design
- **Totals**: 19+ issues closed, ~18 PRs merged, 231+ tests passing
- **UI Language**: All text in Spanish (Planificador inteligente de rutas en bici)
- **Built by**: Syntax Sorcery's AI team

| Component | Status | Notes |
|-----------|--------|-------|
| **v0.1 Components** | | |
| Project scaffolding | ✅ Done | React 19 + Vite + TypeScript + Tailwind + Leaflet |
| Azure infrastructure (IaC) | ✅ Done | Bicep templates for SWA + Functions + Cosmos DB |
| GBFS data integration | ✅ Done | TypeScript service with types, hooks, proxy function (12 tests) |
| Data collection pipeline | ✅ Done | Timer Trigger → Cosmos DB (15 tests) |
| Interactive map | ✅ Done | Live station markers, popups, live indicator (15 tests) |
| Route calculator | ✅ Done | Multi-modal routing (Walk→Bike→Walk, 19 tests) |
| CI/CD pipeline | ✅ Done | GitHub Actions for SWA deployment |
| UI/UX design system | ✅ Done | Color tokens, responsive breakpoints, map styling |
| Documentation | ✅ Done | Architecture & data sources documentation |
| **v0.2 Components** | | |
| Confidence score | ✅ Done | Heuristic 🟢🟡🔴 availability badges for pickup/dropoff (18 tests) |
| Bike type filtering | ✅ Done | FIT/EFIT/BOOST selector with station-level counts (17 tests) |
| Rain warning | ✅ Done | Real-time precipitation alerts via Open-Meteo (7 tests) |
| Route stats | ✅ Done | Distance, time, calories, CO₂ savings per route (16 tests) |
| Geofencing | ✅ Done | Service area overlay with out-of-zone warnings (29 tests) |
| Availability prediction | ✅ Done | Server-side prediction function (255 tests) |
| **v0.3 Components** | | |
| Enhanced prediction | ✅ Done | Improved forecasting with confidence levels (95+ tests) |
| PWA with offline support | ✅ Done | Service worker, offline indicator, manifest (61+ tests) |
| Routing optimization | ✅ Done | Multi-leg route scoring and alternative paths |
| Predictive confidence | ✅ Done | Visual badges for route reliability |
| **Quality Sprint** | | |
| Geolocation | ✅ Done | Browser geolocation with nearest station, permission handling |
| Error handling hardening | ✅ Done | Retry logic, graceful degradation, safety guards |
| UI polish | ✅ Done | Mobile responsiveness, visual consistency, Spanish text |
| Code quality audit | ✅ Done | TypeScript strict, template literals, dead code removal |
| **Deployment** | | |
| Azure deployment | ✅ Live | [icy-cliff-065550703.2.azurestaticapps.net](https://icy-cliff-065550703.2.azurestaticapps.net) |

**Total Test Coverage**: 231+ tests across all modules

---

## What It Does

BiciCoruña helps you plan intermodal journeys combining multiple transportation modes. **All features are now implemented and ready for testing:**

```
Example Flow (Fully Working):
  Walk 100m → Bike Station A (live availability: 5 bikes ✅)
  Ride 2.5km → Bike Station B (predicted availability: 87% 🟢)
  Walk 50m → Destination
  
Real-time data + AI predictions = confident route planning
Rain warning: ☂️ 65% chance in 15 minutes
Offline mode: Works without internet connection
```

### Key Features (All Implemented ✅)

- **Live Station Data**: Real-time bike and dock availability across 55 BiciCoruña stations ✅
- **Geolocation**: Browser-based location with nearest station finder ✅
- **Confidence Scores**: 🟢🟡🔴 heuristic availability badges so you know if a bike/dock will still be there ✅
- **Bike Type Filtering**: Filter stations by FIT, EFIT, or BOOST bike types ✅
- **Weather Integration**: Rain warnings and precipitation alerts via Open-Meteo ✅
- **Route Stats**: Distance, time, calories burned, and CO₂ savings per route ✅
- **Geofencing**: Service area overlay with out-of-zone warnings ✅
- **Intermodal Routes**: Seamless walking + biking combinations with multi-leg optimization ✅
- **Demand Prediction**: AI forecasts station occupancy with confidence levels ✅
- **Progressive Web App**: Offline support, installable on mobile devices ✅
- **Responsive Web UI**: Works on desktop and mobile devices, all text in Spanish ✅

---

## Tech Stack

| Layer | Technology | Purpose | Status |
|-------|-----------|---------|--------|
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS, Leaflet.js | Interactive map UI, route planning interface | ✅ Done |
| **Backend** | Azure Functions (Node.js) | REST API for stations, predictions, weather | 🔄 In Progress |
| **Database** | Azure Cosmos DB Serverless (NoSQL) | Time-series data, demand predictions, cache | ✅ IaC Done |
| **Data Ingestion** | Azure Functions (Timer Trigger) | GBFS polling, data enrichment, preprocessing | ✅ Done |
| **Infrastructure** | Azure (IaC via Bicep) | Serverless deployment templates | ✅ Done |
| **CI/CD** | GitHub Actions | Automated SWA deployment | ✅ Done |

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

### v0.1 — MVP (Complete ✅)
- ✅ Project scaffolding (React 19 + Vite + TS + Tailwind + Leaflet)
- ✅ Azure IaC (Bicep templates for SWA, Functions, Cosmos DB Serverless)
- ✅ GBFS integration service (TypeScript, hooks, proxy function, auto-polling)
- ✅ Data collection pipeline (Timer Trigger → Cosmos DB)
- ✅ Interactive map with live station markers
- ✅ Multi-modal route calculator (Walk→Bike→Walk)
- ✅ CI/CD pipeline (GitHub Actions for SWA deployment)
- ✅ UI/UX design system (colors, tokens, responsive breakpoints)
- ✅ Documentation (architecture, data sources)

### v0.2 — Smart Features (Complete ✅)
- ✅ Confidence scores for route availability (heuristic 🟢🟡🔴 badges)
- ✅ Bike type filtering (FIT / EFIT / BOOST)
- ✅ Rain warnings and weather integration
- ✅ Route stats (distance, time, calories, CO₂)
- ✅ Geofencing zones overlay
- ✅ Availability prediction (server-side function with 255+ tests)

### v0.3 — Enhanced Intelligence (Complete ✅)
- ✅ Enhanced prediction with confidence levels
- ✅ Predictive confidence indicators
- ✅ Routing optimization with multi-leg scoring
- ✅ Progressive Web App (PWA) with offline support

### Quality Sprint (Complete ✅)
- ✅ Geolocation with nearest station and permission handling
- ✅ Error handling hardening (retry logic, graceful degradation)
- ✅ UI polish (mobile responsiveness, visual consistency, design tokens)
- ✅ Code quality audit (TypeScript strict, template literals, dead code removal)
- ✅ All UI text in Spanish

### Deployment (Live ✅)
- ✅ Azure Static Web Apps deployment at [icy-cliff-065550703.2.azurestaticapps.net](https://icy-cliff-065550703.2.azurestaticapps.net)

### Next Steps
- **Historical Data**: Enable more accurate predictions after 30+ days of data collection
- **User Feedback**: Gather feedback and optimize route algorithms

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
