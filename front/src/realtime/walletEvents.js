const TARGET = typeof window !== 'undefined' ? window : null;

export const WALLET_UPDATED_EVENT = 'MangAfriq:wallet-updated';

export function emitWalletUpdated(detail) {
  if (!TARGET) return;
  try {
    TARGET.dispatchEvent(new CustomEvent(WALLET_UPDATED_EVENT, { detail }));
  } catch {
    // ignore
  }
}

export function onWalletUpdated(handler) {
  if (!TARGET) return () => {};
  const h = (e) => handler?.(e?.detail);
  TARGET.addEventListener(WALLET_UPDATED_EVENT, h);
  return () => TARGET.removeEventListener(WALLET_UPDATED_EVENT, h);
}

