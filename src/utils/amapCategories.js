// Smart Trip 分类 id → 高德 POI typecode(大类)。空串表示不按类型过滤。
const MAP = {
  dining: '050000',
  cafe: '050500',
  attractions: '110000',
  shopping: '060000',
  lodging: '100000',
};

export function amapTypeForCategory(categoryId) {
  return MAP[categoryId] || '';
}
