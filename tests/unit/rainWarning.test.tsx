import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RainWarning from '../../src/components/shared/RainWarning';

describe('RainWarning', () => {
  it('renders nothing when probability is below threshold', () => {
    const { container } = render(
      <RainWarning precipitationProbability={40} minutesUntilRain={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when probability is exactly 60', () => {
    const { container } = render(
      <RainWarning precipitationProbability={60} minutesUntilRain={30} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders banner when probability exceeds 60', () => {
    render(
      <RainWarning precipitationProbability={80} minutesUntilRain={30} />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Lluvia probable en ~30 min/)).toBeInTheDocument();
  });

  it('shows "pronto" when minutesUntilRain is null', () => {
    render(
      <RainWarning precipitationProbability={90} minutesUntilRain={null} />,
    );
    expect(screen.getByText(/pronto/)).toBeInTheDocument();
  });

  it('shows "pronto" when minutesUntilRain is 0', () => {
    render(
      <RainWarning precipitationProbability={85} minutesUntilRain={0} />,
    );
    expect(screen.getByText(/pronto/)).toBeInTheDocument();
  });

  it('can be dismissed by clicking the close button', () => {
    render(
      <RainWarning precipitationProbability={75} minutesUntilRain={15} />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Cerrar aviso de lluvia'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('displays the probability percentage', () => {
    render(
      <RainWarning precipitationProbability={85} minutesUntilRain={15} />,
    );
    expect(screen.getByText(/85%/)).toBeInTheDocument();
  });
});
