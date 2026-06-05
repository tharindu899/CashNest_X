import { useEffect } from 'react';
import { createPortal } from 'react-dom';

let mountedModalCount = 0;

function syncBodyModalClass() {
  if (typeof document === 'undefined' || !document.body) return;
  document.body.classList.toggle('modal-portal-open', mountedModalCount > 0);
}

export default function ModalPortal({ children }) {
  useEffect(() => {
    mountedModalCount += 1;
    syncBodyModalClass();

    return () => {
      mountedModalCount = Math.max(0, mountedModalCount - 1);
      syncBodyModalClass();
    };
  }, []);

  if (typeof document === 'undefined' || !document.body) return children;
  return createPortal(children, document.body);
}
