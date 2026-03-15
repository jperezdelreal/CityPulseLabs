import { useState, useEffect } from 'react';

interface LiveIndicatorProps {
  lastUpdated: Date | null;
}

export default function LiveIndicator({ lastUpdated }: LiveIndicatorProps) {
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  useEffect(() => {
    if (!lastUpdated) return;

    const update = () => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  if (secondsAgo === null) return null;

  return (
    <div
      className="absolute top-3 right-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md flex items-center gap-2 text-xs font-medium"
      data-testid="live-indicator"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
      </span>
      <span className="text-gray-700">
        En vivo &bull; hace {secondsAgo}s
      </span>
    </div>
  );
}
