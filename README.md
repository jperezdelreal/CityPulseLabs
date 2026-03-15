# BiciCoruña 🚲

Smart bike-sharing route planner for A Coruña.
A [CityPulse Labs](https://github.com/jperezdelreal/CityPulseLabs) product by [Syntax Sorcery](https://github.com/jperezdelreal/Syntax-Sorcery).

## What it does

Finds the best bike-sharing route using real-time station data from BiciCoruña.
Walk → pick up bike → ride → drop off bike → walk to destination.

## Tech Stack

- React 19 / Vite / TypeScript
- Leaflet + react-leaflet (maps)
- Tailwind CSS (styling)
- Azure Static Web Apps + Functions (hosting + API)
- Azure Cosmos DB Serverless (historical data)
- BiciCoruña GBFS v2 API (real-time station data)

## Development

```bash
npm install
npm run dev
```

## Testing

```bash
npm test
```

## License

MIT
