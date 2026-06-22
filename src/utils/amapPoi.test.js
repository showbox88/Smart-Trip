import { describe, it, expect } from 'vitest';
import { amapTipToPlace, amapPoiToPlace } from './amapPoi';

describe('amapTipToPlace', () => {
  it('maps an AutoComplete tip with location to a place', () => {
    const tip = { name: '故宫博物院', id: 'B000A8UIN8', district: '北京市东城区', address: '景山前街4号', location: { lng: 116.397, lat: 39.918 } };
    expect(amapTipToPlace(tip)).toEqual({
      name: '故宫博物院', vicinity: '北京市东城区', amap_poi_id: 'B000A8UIN8',
      _gcj: { lat: 39.918, lng: 116.397 }, types: [],
    });
  });
  it('returns null for a tip without location (模糊词条)', () => {
    expect(amapTipToPlace({ name: '故宫', location: '' })).toBeNull();
    expect(amapTipToPlace({ name: '故宫' })).toBeNull();
  });
});

describe('amapPoiToPlace', () => {
  it('maps a PlaceSearch poi to a place', () => {
    const poi = { name: '耙牛肉店', id: 'B0M6RO2XMZ', address: '王府井大街1号', type: '餐饮服务;中餐厅', location: { lng: 116.405, lat: 39.905 } };
    expect(amapPoiToPlace(poi)).toEqual({
      name: '耙牛肉店', vicinity: '王府井大街1号', amap_poi_id: 'B0M6RO2XMZ',
      _gcj: { lat: 39.905, lng: 116.405 }, types: ['餐饮服务', '中餐厅'],
    });
  });
  it('returns null for a poi without location', () => {
    expect(amapPoiToPlace({ name: 'x' })).toBeNull();
  });
});
