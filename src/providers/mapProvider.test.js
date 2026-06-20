// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { getMapProvider, setMapProvider, isAmap, MAP_PROVIDER_KEY } from './mapProvider';

beforeEach(() => { localStorage.clear(); });

describe('mapProvider', () => {
  it('defaults to google when nothing stored', () => {
    expect(getMapProvider()).toBe('google');
    expect(isAmap()).toBe(false);
  });

  it('setMapProvider persists and getMapProvider reads it', () => {
    setMapProvider('amap');
    expect(localStorage.getItem(MAP_PROVIDER_KEY)).toBe('amap');
    expect(getMapProvider()).toBe('amap');
    expect(isAmap()).toBe(true);
  });

  it('ignores invalid stored values, falls back to google', () => {
    localStorage.setItem(MAP_PROVIDER_KEY, 'bing');
    expect(getMapProvider()).toBe('google');
  });
});
