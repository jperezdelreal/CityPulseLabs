# Data Sources & Attribution

This document provides detailed information about external APIs, data licensing, attribution requirements, and rate limits used by BiciCoruña.

---

## Overview

BiciCoruña is built on open data and free APIs. All data sources are documented here with proper attribution as required by their licenses.

| Source | License | Attribution Required | Free Tier |
|--------|---------|----------------------|-----------|
| BiciCoruña GBFS | CC-BY-4.0 | ✅ Yes | ✅ Yes |
| openrouteservice | AGPL v3 | ✅ Yes (free use OK) | ✅ Yes |
| Open-Meteo | Custom (Free) | ❌ No | ✅ Yes |
| OpenStreetMap | ODbL 1.0 | ✅ Yes | ✅ Yes |

---

## BiciCoruña GBFS v2 API

### Overview

**GBFS** (General Bikeshare Feed Specification) is a standardized, open-data format for bikesharing systems. BiciCoruña publishes real-time station status via a public GBFS v2 feed.

- **Operator**: BiciCoruña (managed by Ayuntamiento de A Coruña)
- **Endpoint**: https://gbfs.bicoruna.gal/gbfs.json
- **Format**: JSON (GBFS v2.2)
- **Update Frequency**: Every 5-10 seconds
- **Stations**: 55 across A Coruña
- **License**: [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)

### Attribution Requirements

Because BiciCoruña GBFS data is licensed under **CC-BY-4.0**, you must:

1. **In the app UI**: Display "Data: BiciCoruña" or "Powered by BiciCoruña"
2. **In documentation**: Credit the source with license info
3. **In data dumps**: Include attribution metadata

**Example UI Attribution:**
```
Map data © BiciCoruña (CC-BY-4.0) | Powered by openrouteservice
```

### Data Schema

#### Station Information (`station_information.json`)

```json
{
  "data": {
    "stations": [
      {
        "station_id": "1001",
        "name": "Praia de Riazor",
        "short_name": "Riazor",
        "lat": 43.3672,
        "lon": -8.2428,
        "address": "Avenida de Linares Rivas, 190",
        "capacity": 22,
        "is_virtual_station": false,
        "is_valet_station": false,
        "station_area": null,
        "post_code": "15002"
      }
    ]
  }
}
```

#### Station Status (`station_status.json`)

Real-time availability (updates every 5-10 seconds):

```json
{
  "data": {
    "stations": [
      {
        "station_id": "1001",
        "num_bikes_available": 8,
        "num_bikes_disabled": 1,
        "num_docks_available": 14,
        "num_docks_disabled": 0,
        "is_installed": true,
        "is_renting": true,
        "is_returning": true,
        "last_reported": 1710512990,
        "eightd_active_station_services": []
      }
    ]
  },
  "last_updated": 1710512997,
  "ttl": 10,
  "version": "2.2"
}
```

### Polling Strategy

BiciCoruña's recommended polling interval is **10 seconds**. CityPulse Labs uses **60-second intervals** for cost efficiency:

```
Why 60s instead of 10s?
┌─────────────────────────────────────────┐
│ 10s polling:                            │
│ - 8,640 requests/day per client         │
│ - Real-time updates (not always needed) │
│ - Higher bandwidth                      │
├─────────────────────────────────────────┤
│ 60s polling:                            │
│ - 1,440 requests/day per client         │
│ - Still very fresh data (1m max stale)  │
│ - Suitable for route planning UX       │
│ - More efficient                        │
└─────────────────────────────────────────┘
```

### Integration Example

```javascript
// Fetch GBFS feed endpoint
const response = await fetch('https://gbfs.bicoruna.gal/gbfs.json');
const gbfs = await response.json();

// Get URLs for station_information and station_status
const infoUrl = gbfs.data.en.feeds.find(f => f.name === 'station_information').url;
const statusUrl = gbfs.data.en.feeds.find(f => f.name === 'station_status').url;

// Fetch both endpoints
const stations = await fetch(infoUrl).then(r => r.json());
const status = await fetch(statusUrl).then(r => r.json());

// Merge data: combine station info with real-time status
const enriched = stations.data.stations.map(station => ({
  ...station,
  ...status.data.stations.find(s => s.station_id === station.station_id)
}));
```

---

## openrouteservice

### Overview

**openrouteservice** provides free route optimization and accessibility routing powered by OpenStreetMap data.

- **Provider**: HeiGIT (Heidelberg Institute for Geoinformation Technology)
- **Endpoint**: https://api.openrouteservice.org
- **License**: [AGPL v3](https://www.gnu.org/licenses/agpl-3.0.html) (free use permitted)
- **Free Tier**: 40 requests/second, 1000 requests/day
- **API Key**: [Register here](https://openrouteservice.org/dev/#/signup)

### Features Used

| Feature | Use Case | Rate Limit |
|---------|----------|-----------|
| Directions API | Route planning (walking, biking) | 40 req/s |
| Isochrones API | Service area mapping | 5 req/s |
| Matrix API | Travel time calculations | 2 req/s |

### Rate Limits

```
Free Tier:
├─ Requests per second: 40
├─ Requests per day: 1,000
├─ Concurrent requests: 1
└─ Timeout: 60 seconds

Typical Usage (CityPulse):
├─ ~10 route requests per user session (5 sec avg response)
├─ ~2 isochrone requests per hour (global)
└─ Estimated daily: 50-100 requests (well within limits)
```

### Example Request

```bash
curl -X GET 'https://api.openrouteservice.org/v2/directions/foot' \
  -H 'Accept: application/json, application/geo+json' \
  -H 'Authorization: YOUR_API_KEY' \
  -d 'start=8.681495,49.41461&end=8.687872,49.420318'
```

### Attribution

In your app and documentation, credit:

```
Routing by openrouteservice
© HeiGIT, OpenStreetMap contributors
```

---

## Open-Meteo

### Overview

**Open-Meteo** provides free weather forecasts without API key or attribution requirements.

- **Provider**: Open-Meteo AG (Switzerland)
- **Endpoint**: https://api.open-meteo.com/v1/forecast
- **License**: Free (no attribution required, but appreciated)
- **Rate Limits**: Unlimited (for reasonable use)
- **Data Freshness**: Hourly updates

### Weather Data Used

```json
{
  "latitude": 43.3623,
  "longitude": -8.2147,
  "timezone": "Europe/Madrid",
  "current": {
    "temperature": 14.2,
    "relative_humidity": 72,
    "apparent_temperature": 12.8,
    "precipitation": 0.0,
    "weather_code": 2,
    "wind_speed": 12.5,
    "wind_direction": 240
  },
  "hourly": {
    "time": ["2026-03-15T14:00", "2026-03-15T15:00", ...],
    "precipitation": [0, 1.2, 2.5, ...],
    "precipitation_probability": [0, 35, 65, ...]
  }
}
```

### Usage in CityPulse

- **Forecast**: 3-hour and 6-hour precipitation forecasts
- **Alerts**: Rain warnings for cyclists (>60% probability)
- **Routing**: Temperature-aware route suggestions

### Example Request

```bash
curl "https://api.open-meteo.com/v1/forecast?latitude=43.3623&longitude=-8.2147&hourly=precipitation,precipitation_probability&timezone=Europe%2FMadrid"
```

### Cost

- **Monthly**: €0 (unlimited free API)
- **Premium tier**: Optional (for higher rate limits)

---

## OpenStreetMap

### Overview

**OpenStreetMap** provides free, editable maps of the world. Tiles power the interactive map in the BiciCoruña UI.

- **Provider**: OpenStreetMap Foundation
- **License**: [ODbL 1.0](https://opendatacommons.org/licenses/odbl/)
- **Tile Server**: Various providers (Leaflet.js defaults)
- **Free Tier**: Yes (with attribution)

### Attribution Requirements

Display the ODbL attribution on every map:

```html
<div class="map-attribution">
  © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>
</div>
```

**Why?** ODbL requires attribution to the data contributors.

### Tile Providers

Common free tile providers:

| Provider | URL | Attribution |
|----------|-----|-------------|
| OpenStreetMap Carto | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` | © OpenStreetMap |
| Stamen Terrain | `https://tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png` | © OpenStreetMap |

### Integration with Leaflet.js

```javascript
import L from 'leaflet';

const map = L.map('map').setView([43.3623, -8.2147], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
  maxZoom: 19
}).addTo(map);
```

---

## Data License Compliance

### Legal Summary

| Data | License | What You Can Do | What You Must Do |
|------|---------|-----------------|------------------|
| **BiciCoruña GBFS** | CC-BY-4.0 | Use freely | **Credit source** |
| **openrouteservice routes** | AGPL v3 | Use freely | **Credit source** |
| **Open-Meteo weather** | Free | Use freely | (Optional credit) |
| **OpenStreetMap tiles** | ODbL 1.0 | Use freely | **Credit contributors** |

### Attribution Checklist

- [ ] BiciCoruña credit visible in app UI
- [ ] openrouteservice credit visible in app/docs
- [ ] OpenStreetMap credit in map copyright
- [ ] License link in README (MIT for CityPulse code)
- [ ] CONTRIBUTING.md mentions data sources

### Export/Redistribution

If you export station data or create derived datasets:

1. **Include attribution**: "Data from BiciCoruña (CC-BY-4.0)"
2. **Include license**: Provide a copy or link to CC-BY-4.0
3. **Document changes**: What was modified from original?

---

## Data Freshness & SLAs

### Service Level Expectations

| Source | Availability | Support |
|--------|--------------|---------|
| **BiciCoruña GBFS** | ~99.5% (public service) | Best effort, no SLA |
| **openrouteservice** | ~99.5% (commercial) | Email support |
| **Open-Meteo** | ~99.9% | No SLA (free tier) |
| **OpenStreetMap** | ~99.9% | Community-supported |

### Fallback Strategy

If GBFS is unavailable:

```
1. Show last known data (cache 1h)
2. Add disclaimer: "Data may be outdated"
3. Log to Application Insights
4. Alert dev team after 30 mins downtime
5. Switch to "read-only" mode (no bike availability)
```

---

## Privacy & Data Rights

### What CityPulse Collects

**From GBFS**: Only public station data (aggregated, no personal info)
**From users**: Optional feedback (anonymized, opt-in)
**Logs**: Error tracking only (no user data)

### Data Retention

| Data | Retention | Purpose |
|------|-----------|---------|
| Station snapshots | 7 days | Demand prediction |
| User sessions | 24 hours | Analytics |
| Error logs | 30 days | Debugging |
| API logs | 7 days | Rate limiting |

### GDPR Compliance

- ✅ No personal data collected by default
- ✅ Optional feedback is anonymized
- ✅ Data deletion request: Contact [email]
- ✅ Privacy policy available on website

---

## Dependency Updates

Track upstream API changes:

- **BiciCoruña GBFS**: Monitor for schema changes (v2.2+ stable)
- **openrouteservice**: Check changelog monthly
- **Open-Meteo**: Stable API, rarely changes
- **OpenStreetMap**: Tile updates continuous, transparent

---

## References

- [GBFS Spec](https://github.com/MobilityData/gbfs)
- [openrouteservice Docs](https://openrouteservice.org/dev/#/api-docs)
- [Open-Meteo Docs](https://open-meteo.com/en/docs)
- [OpenStreetMap License](https://www.openstreetmap.org/copyright)
- [CC-BY-4.0 License](https://creativecommons.org/licenses/by/4.0/)
- [ODbL 1.0 License](https://opendatacommons.org/licenses/odbl/)

---

**Last Updated**: 2026-03-15
**Maintainer**: CityPulse Labs (Syntax Sorcery)
