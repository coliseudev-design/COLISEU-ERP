import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

export function PageFilters({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.getElementById('page-filters-container');
    if (el) {
      setTarget(el);
    }
  }, []);

  if (!target) return null;

  return createPortal(children, target);
}
