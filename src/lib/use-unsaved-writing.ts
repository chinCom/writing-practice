'use client';

import { useEffect, useRef } from 'react';

// Protect explicit navigation without storing private writing in browser storage.
export function useUnsavedWriting(dirty: boolean, message: string) {
  const allowNavigation = useRef(false);
  useEffect(() => {
    if (!dirty) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      if (allowNavigation.current) return;
      event.preventDefault();
      event.returnValue = '';
    }
    function beforeLink(event: MouseEvent) {
      if (
        allowNavigation.current ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (
        !(target instanceof HTMLAnchorElement) ||
        target.target === '_blank' ||
        target.hasAttribute('download')
      )
        return;
      const destination = new URL(target.href, window.location.href);
      if (
        destination.origin === window.location.origin &&
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      )
        return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    const editorUrl = window.location.href;
    const editorHistoryState: unknown = window.history.state;
    function beforeHistory(event: PopStateEvent) {
      if (allowNavigation.current || window.location.href === editorUrl) return;
      if (!window.confirm(message)) {
        // Run before the router's bubbling listener so it never unmounts the editor.
        event.stopImmediatePropagation();
        window.history.pushState(editorHistoryState, '', editorUrl);
      }
    }
    function beforeTraverse(event: NavigateEvent) {
      if (
        allowNavigation.current ||
        event.navigationType !== 'traverse' ||
        !event.cancelable ||
        event.destination.url === editorUrl
      )
        return;
      if (!window.confirm(message)) event.preventDefault();
    }
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', beforeLink, true);
    // Navigation API cancels without changing history. Older browsers use popstate.
    if (window.navigation) window.navigation.addEventListener('navigate', beforeTraverse);
    else window.addEventListener('popstate', beforeHistory, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', beforeLink, true);
      if (window.navigation) window.navigation.removeEventListener('navigate', beforeTraverse);
      else window.removeEventListener('popstate', beforeHistory, true);
    };
  }, [dirty, message]);
  return () => {
    allowNavigation.current = true;
  };
}
