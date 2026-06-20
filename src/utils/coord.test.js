import { describe, it, expect } from 'vitest';
import { wgs84ToGcj02, gcj02ToWgs84, outOfChina } from './coord';

describe('coord', () => {
  // 天安门 WGS-84 ≈ (39.90750, 116.39125) → GCJ-02 ≈ (39.90874, 116.39750)
  it('wgs84ToGcj02 shifts a Beijing point by ~100-700m', () => {
    const { lat, lng } = wgs84ToGcj02(39.90750, 116.39125);
    expect(lat).toBeCloseTo(39.90874, 3);
    expect(lng).toBeCloseTo(116.39750, 3);
  });

  it('gcj02ToWgs84 is the approximate inverse', () => {
    const g = wgs84ToGcj02(31.2304, 121.4737); // 上海
    const w = gcj02ToWgs84(g.lat, g.lng);
    expect(w.lat).toBeCloseTo(31.2304, 4);
    expect(w.lng).toBeCloseTo(121.4737, 4);
  });

  it('outOfChina returns true for non-China points (no shift)', () => {
    expect(outOfChina(40.7128, -74.0060)).toBe(true); // 纽约
    const same = wgs84ToGcj02(40.7128, -74.0060);
    expect(same.lat).toBe(40.7128);
    expect(same.lng).toBe(-74.0060);
  });
});
