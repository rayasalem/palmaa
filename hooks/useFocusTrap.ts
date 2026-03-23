import { useEffect, RefObject } from 'react';

type FocusTrapOptions = {
  onEscape?: () => void;
};

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
    )
  );
  return nodes.filter((el) => {
    const disabled = (el as HTMLButtonElement).disabled;
    const ariaHidden = el.getAttribute('aria-hidden') === 'true';
    const tabIndex = el.getAttribute('tabindex');
    if (ariaHidden) return false;
    if (disabled) return false;
    if (tabIndex === '-1') return false;
    return true;
  });
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  isActive: boolean,
  options: FocusTrapOptions = {}
) {
  useEffect(() => {
    if (!isActive) return;
    const container = containerRef.current;
    if (!container) return;

    const previousActive = document.activeElement as HTMLElement | null;

    const focusables = getFocusableElements(container);
    const initial = focusables[0] ?? container;
    // Ensure element can receive focus if needed
    if (!initial.hasAttribute('tabindex')) initial.setAttribute('tabindex', '-1');
    initial.focus?.();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (options.onEscape) options.onEscape();
        return;
      }
      if (e.key !== 'Tab') return;

      const currentFocusables = getFocusableElements(container);
      if (currentFocusables.length === 0) {
        e.preventDefault();
        container.focus?.();
        return;
      }

      const first = currentFocusables[0];
      const last = currentFocusables[currentFocusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (!active || active === first || active === container) {
          e.preventDefault();
          last.focus?.();
        }
      } else {
        if (!active || active === last) {
          e.preventDefault();
          first.focus?.();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (previousActive && typeof previousActive.focus === 'function') previousActive.focus();
    };
  }, [containerRef, isActive, options.onEscape]);
}

