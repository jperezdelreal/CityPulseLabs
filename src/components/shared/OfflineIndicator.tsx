import { useOnlineStatus } from '../../hooks/useOnlineStatus.ts';

interface OfflineIndicatorProps {
  lastUpdated?: Date | null;
}

export default function OfflineIndicator({ lastUpdated }: OfflineIndicatorProps) {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  const timestamp = lastUpdated
    ? lastUpdated.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-500 text-white text-center px-4 py-2 text-sm font-medium shrink-0"
    >
      📡 Sin conexión —{' '}
      {timestamp
        ? `datos de última actualización (${timestamp})`
        : 'datos de última actualización'}
    </div>
  );
}
