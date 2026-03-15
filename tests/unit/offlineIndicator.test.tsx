import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import OfflineIndicator from '../../src/components/shared/OfflineIndicator.tsx';

describe('OfflineIndicator', () => {
  const originalNavigator = navigator.onLine;

  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('should not render when online', () => {
    const { container } = render(<OfflineIndicator />);
    expect(container.innerHTML).toBe('');
  });

  it('should render offline banner when offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });

    render(<OfflineIndicator />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();
  });

  it('should show timestamp when lastUpdated is provided', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });

    const lastUpdated = new Date('2025-01-15T14:30:00');
    render(<OfflineIndicator lastUpdated={lastUpdated} />);

    const status = screen.getByRole('status');
    expect(status.textContent).toContain('14:30');
  });

  it('should show generic message when no lastUpdated', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });

    render(<OfflineIndicator />);
    expect(
      screen.getByText(/datos de última actualización/i),
    ).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });

    render(<OfflineIndicator />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });
});
