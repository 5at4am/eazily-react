import { useCallback, useEffect, useState } from 'react';
import { IN_APP_BACK_EVENT } from './nativeShell.js';

// Keep nested views (a conversation or form step) in the same browser/Android history.
export function useHistoryPanel(initialValue, scope) {
  const read = useCallback(() => history.state?.eazilyLayer?.scope === scope ? history.state.eazilyLayer.value : initialValue, [scope, initialValue]);
  const [value, update] = useState(read);
  const change = useCallback((next, options = {}) => {
    const resolved = typeof next === 'function' ? next(read()) : next;
    const state = { ...history.state, eazilyLayer: { scope, value: resolved } };
    if (!options.replace) {
      state.eazilyDepth = Number(state.eazilyDepth || 0) + 1;
      if (state.eazilyCustomerIndex != null) state.eazilyCustomerIndex += 1;
    }
    history[options.replace ? 'replaceState' : 'pushState'](state, '', window.location.href);
    update(resolved);
    window.dispatchEvent(new Event('eazily-navigation-change'));
  }, [scope, read]);
  const close = useCallback(() => {
    if (history.state?.eazilyLayer?.scope === scope && Number(history.state?.eazilyDepth || 0) > 0) history.back();
    else { update(initialValue); history.replaceState({ ...history.state, eazilyLayer: undefined }, '', window.location.href); }
  }, [scope, initialValue]);
  useEffect(() => {
    const pop = () => update(read());
    const nativeBack = event => {
      if (event.detail.handled || value === initialValue) return;
      event.detail.handled = true;
      event.stopImmediatePropagation();
      close();
    };
    window.addEventListener('popstate', pop);
    window.addEventListener(IN_APP_BACK_EVENT, nativeBack, true);
    return () => { window.removeEventListener('popstate', pop); window.removeEventListener(IN_APP_BACK_EVENT, nativeBack, true); };
  }, [read, value, initialValue, close]);
  return [value, change, close, update];
}
