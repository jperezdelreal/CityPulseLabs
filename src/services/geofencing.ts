import type {
  GBFSResponse,
  GBFSDiscoveryData,
  GBFSFeed,
  GeofencingZonesCollection,
  GeofencingZoneFeature,
} from '../types/index.ts';

const GBFS_DISCOVERY_URL =
  'https://acoruna.publicbikesystem.net/customer/gbfs/v2/gbfs.json';
const DEFAULT_LANGUAGE = 'en';

/** Discover the geofencing_zones feed URL from the GBFS discovery endpoint */
export async function discoverGeofencingUrl(
  language = DEFAULT_LANGUAGE,
): Promise<string | null> {
  const res = await fetch(GBFS_DISCOVERY_URL);
  if (!res.ok) throw new Error(`GBFS discovery failed: ${res.status}`);
  const json: GBFSResponse<GBFSDiscoveryData> = await res.json();

  const feeds =
    json.data[language]?.feeds ?? json.data[Object.keys(json.data)[0]!]?.feeds;
  if (!feeds) return null;

  const geofencingFeed = feeds.find(
    (f: GBFSFeed) => f.name === 'geofencing_zones',
  );
  return geofencingFeed?.url ?? null;
}

/** Fetch geofencing zones from the GBFS geofencing_zones endpoint */
export async function fetchGeofencingZones(
  url: string,
): Promise<GeofencingZonesCollection> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`geofencing_zones fetch failed: ${res.status}`);
  const json: GBFSResponse<{ geofencing_zones: GeofencingZonesCollection }> =
    await res.json();
  return json.data.geofencing_zones;
}

/** Parse and validate GeoJSON features from the zones collection */
export function parseGeofencingFeatures(
  collection: GeofencingZonesCollection,
): GeofencingZoneFeature[] {
  if (collection.type !== 'FeatureCollection') return [];
  return collection.features.filter(
    (f) =>
      f.type === 'Feature' &&
      f.geometry != null &&
      (f.geometry.type === 'MultiPolygon' || f.geometry.type === 'Polygon') &&
      f.properties != null,
  );
}

/** Classify a zone based on its rules for styling purposes */
export function classifyZone(
  feature: GeofencingZoneFeature,
): 'service-area' | 'restricted' | 'speed-limit' | 'no-parking' | 'unknown' {
  const rules = feature.properties.rules;
  if (!rules || rules.length === 0) return 'service-area';

  for (const rule of rules) {
    if (!rule.ride_allowed && !rule.ride_through_allowed) return 'restricted';
    if (!rule.ride_allowed) return 'restricted';
    if (rule.maximum_speed_kph != null) return 'speed-limit';
    if (rule.station_parking === false) return 'no-parking';
  }

  return 'service-area';
}

/** Get style config for a zone classification */
export function getZoneStyle(classification: ReturnType<typeof classifyZone>) {
  const styles = {
    'service-area': {
      color: '#22C55E',
      fillColor: '#22C55E',
      fillOpacity: 0.1,
      weight: 2,
      dashArray: undefined as string | undefined,
    },
    restricted: {
      color: '#EF4444',
      fillColor: '#EF4444',
      fillOpacity: 0.15,
      weight: 2,
      dashArray: '8 4',
    },
    'speed-limit': {
      color: '#F59E0B',
      fillColor: '#F59E0B',
      fillOpacity: 0.1,
      weight: 2,
      dashArray: '4 4',
    },
    'no-parking': {
      color: '#8B5CF6',
      fillColor: '#8B5CF6',
      fillOpacity: 0.12,
      weight: 2,
      dashArray: '6 3',
    },
    unknown: {
      color: '#6B7280',
      fillColor: '#6B7280',
      fillOpacity: 0.08,
      weight: 1,
      dashArray: undefined as string | undefined,
    },
  };
  return styles[classification];
}

/** Build a tooltip description from zone properties */
export function getZoneTooltip(feature: GeofencingZoneFeature): string {
  const name = feature.properties.name || 'Unnamed zone';
  const rules = feature.properties.rules;
  if (!rules || rules.length === 0) return name;

  const descriptions: string[] = [name];
  for (const rule of rules) {
    if (!rule.ride_allowed) descriptions.push('🚫 Riding not allowed');
    else if (!rule.ride_through_allowed)
      descriptions.push('⚠️ Ride-through not allowed');
    if (rule.maximum_speed_kph != null)
      descriptions.push(`🏎️ Max speed: ${rule.maximum_speed_kph} km/h`);
    if (rule.station_parking === false)
      descriptions.push('🅿️ No parking');
  }

  return descriptions.join('\n');
}
