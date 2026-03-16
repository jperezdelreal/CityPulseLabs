import type { BikeType } from '../../services/bikeTypeFilter.ts';

interface BikeTypeSelectorProps {
  selectedType: BikeType;
  onTypeChange: (type: BikeType) => void;
}

const BIKE_TYPE_OPTIONS: { value: BikeType; label: string; icon: string; shortLabel: string }[] = [
  { value: 'any', label: 'Todas', shortLabel: 'Todas', icon: '🚲' },
  { value: 'FIT', label: 'Mecánica', shortLabel: 'Mec.', icon: '🔧' },
  { value: 'EFIT', label: 'Eléctrica', shortLabel: 'Eléc.', icon: '⚡' },
  { value: 'BOOST', label: 'Turbo', shortLabel: 'Turbo', icon: '🚀' },
];

export default function BikeTypeSelector({ selectedType, onTypeChange }: BikeTypeSelectorProps) {
  return (
    <div
      className="flex gap-1 bg-white/90 backdrop-blur rounded-xl shadow-md p-1"
      role="radiogroup"
      aria-label="Tipo de bicicleta"
      data-testid="bike-type-selector"
    >
      {BIKE_TYPE_OPTIONS.map(({ value, label, shortLabel, icon }) => {
        const isSelected = selectedType === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={isSelected}
            aria-label={label}
            onClick={() => onTypeChange(value)}
            className={`
              flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium
              transition-all cursor-pointer min-w-[44px] min-h-[44px] justify-center
              ${
                isSelected
                  ? 'bg-primary-600 text-white shadow-sm scale-[1.02]'
                  : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
              }
            `}
            data-testid={`bike-type-${value}`}
          >
            <span className="text-base sm:text-lg">{icon}</span>
            <span className="text-[10px] sm:text-xs leading-tight">
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{shortLabel}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
