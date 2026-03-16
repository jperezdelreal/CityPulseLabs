import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchBar from '../../src/components/SearchBar/SearchBar.tsx';

// Mock the useGeocode hook
const mockSearch = vi.fn();
const mockClear = vi.fn();
let mockResults: { display_name: string; lat: number; lon: number }[] = [];
let mockLoading = false;
let mockError: string | null = null;

vi.mock('../../src/hooks/useGeocode.ts', () => ({
  useGeocode: () => ({
    results: mockResults,
    loading: mockLoading,
    error: mockError,
    search: mockSearch,
    clear: mockClear,
  }),
}));

describe('SearchBar', () => {
  const defaultProps = {
    origin: null,
    destination: null,
    onSetOrigin: vi.fn(),
    onSetDestination: vi.fn(),
    onClearRoute: vi.fn(),
  };

  beforeEach(() => {
    mockResults = [];
    mockLoading = false;
    mockError = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render origin and destination inputs on desktop', () => {
    render(<SearchBar {...defaultProps} />);

    expect(screen.getByTestId('origin-input')).toBeInTheDocument();
    expect(screen.getByTestId('dest-input')).toBeInTheDocument();
  });

  it('should have correct placeholders', () => {
    render(<SearchBar {...defaultProps} />);

    const originInput = screen.getByTestId('origin-input');
    const destInput = screen.getByTestId('dest-input');

    expect(originInput).toHaveAttribute('placeholder', '¿Dónde estás?');
    expect(destInput).toHaveAttribute('placeholder', '¿A dónde vas?');
  });

  it('should call search when typing in origin', () => {
    render(<SearchBar {...defaultProps} />);

    const originInput = screen.getByTestId('origin-input');
    fireEvent.change(originInput, { target: { value: 'Calle Real' } });

    expect(mockSearch).toHaveBeenCalledWith('Calle Real');
  });

  it('should call search when typing in destination', () => {
    render(<SearchBar {...defaultProps} />);

    const destInput = screen.getByTestId('dest-input');
    fireEvent.focus(destInput);
    fireEvent.change(destInput, { target: { value: 'Plaza María Pita' } });

    expect(mockSearch).toHaveBeenCalledWith('Plaza María Pita');
  });

  it('should show loading state', () => {
    mockLoading = true;
    render(<SearchBar {...defaultProps} />);

    const originInput = screen.getByTestId('origin-input');
    fireEvent.focus(originInput);

    expect(screen.getByText('Buscando...')).toBeInTheDocument();
  });

  it('should display search results', () => {
    mockResults = [
      { display_name: 'Calle Real, 1, A Coruña, Galicia, España', lat: 43.371, lon: -8.396 },
      { display_name: 'Calle Real, 25, A Coruña, Galicia, España', lat: 43.372, lon: -8.397 },
    ];

    render(<SearchBar {...defaultProps} />);

    const originInput = screen.getByTestId('origin-input');
    fireEvent.focus(originInput);

    expect(screen.getByTestId('search-results')).toBeInTheDocument();
    expect(screen.getByTestId('search-result-0')).toBeInTheDocument();
    expect(screen.getByTestId('search-result-1')).toBeInTheDocument();
  });

  it('should call onSetOrigin when selecting an origin result', () => {
    mockResults = [
      { display_name: 'Calle Real, 1, A Coruña', lat: 43.371, lon: -8.396 },
    ];

    render(<SearchBar {...defaultProps} />);

    const originInput = screen.getByTestId('origin-input');
    fireEvent.focus(originInput);
    fireEvent.click(screen.getByTestId('search-result-0'));

    expect(defaultProps.onSetOrigin).toHaveBeenCalledWith({ lat: 43.371, lng: -8.396 });
  });

  it('should call onSetDestination when selecting a dest result', () => {
    mockResults = [
      { display_name: 'Plaza María Pita, A Coruña', lat: 43.3713, lon: -8.3965 },
    ];

    render(<SearchBar {...defaultProps} />);

    const destInput = screen.getByTestId('dest-input');
    fireEvent.focus(destInput);
    fireEvent.click(screen.getByTestId('search-result-0'));

    expect(defaultProps.onSetDestination).toHaveBeenCalledWith({ lat: 43.3713, lng: -8.3965 });
  });

  it('should show clear button when origin has text', () => {
    render(<SearchBar {...defaultProps} />);

    const originInput = screen.getByTestId('origin-input');
    fireEvent.focus(originInput);
    fireEvent.change(originInput, { target: { value: 'test' } });

    expect(screen.getByTestId('clear-origin')).toBeInTheDocument();
  });

  it('should clear origin and call onClearRoute when clear is clicked', () => {
    render(<SearchBar {...defaultProps} />);

    const originInput = screen.getByTestId('origin-input');
    fireEvent.focus(originInput);
    fireEvent.change(originInput, { target: { value: 'test' } });
    fireEvent.click(screen.getByTestId('clear-origin'));

    expect(mockClear).toHaveBeenCalled();
    expect(defaultProps.onClearRoute).toHaveBeenCalled();
  });

  it('should show error message', () => {
    mockError = 'Geocoding error: 429';
    render(<SearchBar {...defaultProps} />);

    const originInput = screen.getByTestId('origin-input');
    fireEvent.focus(originInput);

    expect(screen.getByText(/Geocoding error: 429/)).toBeInTheDocument();
  });

  it('should show "Mi ubicación" when origin matches geolocation', async () => {
    const geoPos = { lat: 43.362, lng: -8.411 };

    const { rerender } = render(
      <SearchBar {...defaultProps} geoPosition={geoPos} origin={geoPos} />,
    );

    // Re-render to trigger the effect
    rerender(<SearchBar {...defaultProps} geoPosition={geoPos} origin={geoPos} />);

    await waitFor(() => {
      expect(screen.getByTestId('origin-input')).toHaveValue('Mi ubicación');
    });
  });

  it('should have proper aria labels', () => {
    render(<SearchBar {...defaultProps} />);

    expect(screen.getByLabelText('Origen')).toBeInTheDocument();
    expect(screen.getByLabelText('Destino')).toBeInTheDocument();
  });
});
