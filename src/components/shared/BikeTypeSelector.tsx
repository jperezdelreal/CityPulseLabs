import type { BikeType } from '../../services/bikeTypeFilter.ts';

interface BikeTypeSelectorProps {
  selectedType: BikeType;
  onTypeChange: (type: BikeType) => void;
}

const BIKE_TYPE_OPTIONS: { value: BikeType; label: string; icon: string }[] = [
  { value: 'any', label: 'Todas', icon: '🚲' },
  { value: 'FIT', label: 'Mecánica', icon: '🔧' },
  { value: 'EFIT', label: 'Eléctrica', icon: '⚡' },
  { value: 'BOOST', label: 'Turbo', icon: '🚀' },
];

export default function BikeTypeSelector({ selectedType, onTypeChange }: BikeTypeSelectorProps) {
  return (
    <div
      className="flex gap-1 bg-white/90 backdrop-blur rounded-lg shadow-md p-1"
      role="radiogroup"
      aria-label="Tipo de bicicleta"
      data-testid="bike-type-selector"
    >
      {BIKE_TYPE_OPTIONS.map(({ value, label, icon }) => {
        const isSelected = selectedType === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={isSelected}
            onClick={() => onTypeChange(value)}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium
              transition-all cursor-pointer
              ${
                isSelected
                  ? 'bg-secondary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }
            `}
            data-testid={`bike-type-${value}`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
