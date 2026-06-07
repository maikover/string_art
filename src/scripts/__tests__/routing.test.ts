/**
 * Regression test for: "Cannot read properties of null (reading 'folder')"
 * thrown by Routing.navigateToDialog when called from a fresh state
 * (history.state === null).
 *
 * Reproduces what happens when a user clicks "PATRONES GUARDADOS" on the
 * landing page — the handler calls routing.navigateToDialog('saved_patterns')
 * with no prior navigation, so history.state is null. The original code
 * dereferenced history.state.folder in the pushState payload, throwing
 * TypeError.
 *
 * The test exercises the REAL routing.ts by mocking its heavy dependencies
 * (Persistance, dialogs, helpers/url_utils, helpers/pattern_utils) which
 * would otherwise try to touch DOM globals that jsdom doesn't fully set up.
 */
import { jest } from '@jest/globals';

// Mock heavy deps BEFORE importing routing. These modules reach for global
// state (window.localStorage, document, etc.) that jest's jsdom env doesn't
// fully prime for the constructors that routing.ts transitively runs.
jest.mock('../helpers/pattern_utils', () => ({
  findPatternById: jest.fn(),
}));
jest.mock('../helpers/url_utils', () => {
  const actual = jest.requireActual('../helpers/url_utils') as any;
  return {
    ...actual,
    getQueryParams: jest.fn(() => ({})),
    getPatternURL: jest.fn(() => '/'),
    serializeQueryParams: jest.fn(() => 'dialog=saved_patterns'),
  };
});
jest.mock('../Serialize', () => ({
  deserializeConfig: jest.fn(),
  serializeConfig: jest.fn(() => undefined),
}));
jest.mock('../Persistance', () => ({ default: {} }));

// routing.ts runs the constructor at import time, which adds a popstate
// listener. Make sure window exists for that.
beforeAll(() => {
  if (typeof window === 'undefined') {
    (global as any).window = {};
  }
});

// Now import the REAL routing module
import routing from '../routing';

describe('routing.navigateToDialog — history.state null regression', () => {
  beforeEach(() => {
    // Reset history.state to null to simulate fresh app load
    window.history.replaceState(null, '');
    // routing is a singleton (one Routing instance for the whole app);
    // make sure no dialog is already open from a previous test
    routing.closeDialog(false);
  });

  test('does not throw when called from a fresh state (history.state === null)', () => {
    expect(window.history.state).toBeNull();

    // The exact code path triggered by clicking "PATRONES GUARDADOS" on
    // the landing. Before the fix, this threw TypeError on history.state.folder
    expect(() => routing.navigateToDialog('saved_patterns')).not.toThrow();
  });

  test('emits the dialog event when a handler is registered', () => {
    const handler = jest.fn();
    routing.addEventListener('dialog', handler);

    routing.navigateToDialog('saved_patterns');

    expect(handler).toHaveBeenCalledWith('saved_patterns');
  });

  test('is idempotent for the same dialog id', () => {
    const handler = jest.fn();
    routing.addEventListener('dialog', handler);

    routing.navigateToDialog('saved_patterns');
    routing.navigateToDialog('saved_patterns');

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
