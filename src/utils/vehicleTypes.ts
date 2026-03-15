/** Shared vehicle type metadata for consistent display across components */
export const VEHICLE_TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  FIT: { icon: '🔧', label: 'Mecánica' },
  EFIT: { icon: '⚡', label: 'Eléctrica' },
  BOOST: { icon: '🚀', label: 'Boost' },
};

/** Get the icon for a vehicle type, with a fallback */
export function getVehicleTypeIcon(vehicleTypeId: string): string {
  return VEHICLE_TYPE_LABELS[vehicleTypeId]?.icon ?? '🚲';
}
