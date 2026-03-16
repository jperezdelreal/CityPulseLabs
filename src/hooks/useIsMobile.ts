import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 1024;

function getInitialValue(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.innerWidth < MOBILE_BREAKPOINT;
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(getInitialValue);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
