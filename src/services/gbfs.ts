import type { GBFSResponse, StationInfo, StationStatus } from '../types';

const API_BASE = '/api';

export async function fetchStationInfo(): Promise<StationInfo[]> {
  const res = await fetch(`${API_BASE}/stations/info`);
  const data: GBFSResponse<{ stations: StationInfo[] }> = await res.json();
  return data.data.stations;
}

export async function fetchStationStatus(): Promise<StationStatus[]> {
  const res = await fetch(`${API_BASE}/stations/status`);
  const data: GBFSResponse<{ stations: StationStatus[] }> = await res.json();
  return data.data.stations;
}
