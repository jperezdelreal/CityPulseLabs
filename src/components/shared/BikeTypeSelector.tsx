import type { BikeType } from '../../services/bikeTypeFilter.ts';

interface BikeTypeSelectorProps {
  selectedType: BikeType;
  onTypeChange: (type: BikeType) => void;
}

const BIKE_TYPE_OPTIONS: { value: BikeType; label: string; icon: string; shortLabel: string }[] = [
  { value: 'any', label: 'Todas', shortLabel: 'Todas', icon: '🚲' },
  { value: 'FIT', label: 'Mecánica', shortLabel: 'Mec.', icon: '🔧' },
  { value: 'EFIT', label: 'Eléctrica', shortLabel: 'Eléc.', icon: '⚡' },
  // BOOST hidden until Turbo bikes are available in the network
  // { value: 'BOOST', label: 'Turbo', shortLabel: 'Turbo', icon: '🚀' },
];

export default function BikeTypeSelector({ selectedType, onTypeChange }: BikeTypeSelectorProps) {
  return (
    <div
      className="flex gap-1 bg-white rounded-xl shadow-sm border border-gray-200 p-1"
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
              flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
              transition-all cursor-pointer min-h-[36px]
              ${
                isSelected
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
              }
            `}
            data-testid={`bike-type-${value}`}
          >
            <span className="text-sm">{icon}</span>
            <span className={`text-xs leading-tight ${isSelected ? 'text-white' : 'text-gray-700'}`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
