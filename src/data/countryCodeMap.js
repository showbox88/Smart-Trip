/**
 * Maps country display names (English + Chinese + common variants) to ISO 3166-1 alpha-2 codes.
 * Used to look up emergency numbers and embassy data from destination country names.
 */

const NAME_TO_CODE = {
  // English names
  'afghanistan': 'AF', 'albania': 'AL', 'algeria': 'DZ', 'andorra': 'AD', 'angola': 'AO',
  'argentina': 'AR', 'armenia': 'AM', 'australia': 'AU', 'austria': 'AT', 'azerbaijan': 'AZ',
  'bahamas': 'BS', 'bahrain': 'BH', 'bangladesh': 'BD', 'barbados': 'BB', 'belarus': 'BY',
  'belgium': 'BE', 'belize': 'BZ', 'benin': 'BJ', 'bhutan': 'BT', 'bolivia': 'BO',
  'bosnia and herzegovina': 'BA', 'botswana': 'BW', 'brazil': 'BR', 'brunei': 'BN', 'bulgaria': 'BG',
  'cambodia': 'KH', 'cameroon': 'CM', 'canada': 'CA', 'chile': 'CL', 'china': 'CN',
  'colombia': 'CO', 'costa rica': 'CR', 'croatia': 'HR', 'cuba': 'CU', 'cyprus': 'CY',
  'czech republic': 'CZ', 'czechia': 'CZ', 'denmark': 'DK', 'dominican republic': 'DO',
  'ecuador': 'EC', 'egypt': 'EG', 'el salvador': 'SV', 'estonia': 'EE', 'ethiopia': 'ET',
  'fiji': 'FJ', 'finland': 'FI', 'france': 'FR', 'georgia': 'GE', 'germany': 'DE',
  'ghana': 'GH', 'greece': 'GR', 'guatemala': 'GT', 'honduras': 'HN',
  'hong kong': 'HK', 'hungary': 'HU', 'iceland': 'IS', 'india': 'IN', 'indonesia': 'ID',
  'iran': 'IR', 'iraq': 'IQ', 'ireland': 'IE', 'israel': 'IL', 'italy': 'IT',
  'jamaica': 'JM', 'japan': 'JP', 'jordan': 'JO', 'kazakhstan': 'KZ', 'kenya': 'KE',
  'north korea': 'KP', 'south korea': 'KR', 'korea': 'KR', 'kuwait': 'KW', 'kyrgyzstan': 'KG',
  'laos': 'LA', 'latvia': 'LV', 'lebanon': 'LB', 'lithuania': 'LT', 'luxembourg': 'LU',
  'macau': 'MO', 'macao': 'MO', 'madagascar': 'MG', 'malaysia': 'MY', 'maldives': 'MV',
  'malta': 'MT', 'mexico': 'MX', 'moldova': 'MD', 'monaco': 'MC', 'mongolia': 'MN',
  'montenegro': 'ME', 'morocco': 'MA', 'mozambique': 'MZ', 'myanmar': 'MM',
  'namibia': 'NA', 'nepal': 'NP', 'netherlands': 'NL', 'new zealand': 'NZ',
  'nicaragua': 'NI', 'nigeria': 'NG', 'norway': 'NO', 'oman': 'OM',
  'pakistan': 'PK', 'panama': 'PA', 'papua new guinea': 'PG', 'paraguay': 'PY',
  'peru': 'PE', 'philippines': 'PH', 'poland': 'PL', 'portugal': 'PT',
  'qatar': 'QA', 'romania': 'RO', 'russia': 'RU', 'saudi arabia': 'SA',
  'serbia': 'RS', 'singapore': 'SG', 'slovakia': 'SK', 'slovenia': 'SI',
  'south africa': 'ZA', 'spain': 'ES', 'sri lanka': 'LK', 'sweden': 'SE',
  'switzerland': 'CH', 'taiwan': 'TW', 'tajikistan': 'TJ', 'tanzania': 'TZ',
  'thailand': 'TH', 'turkey': 'TR', 'türkiye': 'TR', 'turkmenistan': 'TM',
  'ukraine': 'UA', 'united arab emirates': 'AE', 'uae': 'AE',
  'united kingdom': 'GB', 'uk': 'GB', 'england': 'GB', 'scotland': 'GB', 'wales': 'GB',
  'united states': 'US', 'usa': 'US', 'united states of america': 'US',
  'uruguay': 'UY', 'uzbekistan': 'UZ', 'venezuela': 'VE', 'vietnam': 'VN',
  'zambia': 'ZM', 'zimbabwe': 'ZW',

  // Chinese names
  '阿富汗': 'AF', '阿尔巴尼亚': 'AL', '阿尔及利亚': 'DZ', '安道尔': 'AD', '安哥拉': 'AO',
  '阿根廷': 'AR', '亚美尼亚': 'AM', '澳大利亚': 'AU', '澳洲': 'AU', '奥地利': 'AT', '阿塞拜疆': 'AZ',
  '巴哈马': 'BS', '巴林': 'BH', '孟加拉国': 'BD', '孟加拉': 'BD', '巴巴多斯': 'BB', '白俄罗斯': 'BY',
  '比利时': 'BE', '伯利兹': 'BZ', '贝宁': 'BJ', '不丹': 'BT', '玻利维亚': 'BO',
  '波黑': 'BA', '波斯尼亚和黑塞哥维那': 'BA', '博茨瓦纳': 'BW', '巴西': 'BR', '文莱': 'BN', '保加利亚': 'BG',
  '柬埔寨': 'KH', '喀麦隆': 'CM', '加拿大': 'CA', '智利': 'CL', '中国': 'CN', '中华人民共和国': 'CN',
  '哥伦比亚': 'CO', '哥斯达黎加': 'CR', '克罗地亚': 'HR', '古巴': 'CU', '塞浦路斯': 'CY',
  '捷克': 'CZ', '捷克共和国': 'CZ', '丹麦': 'DK', '多米尼加': 'DO', '多米尼加共和国': 'DO',
  '厄瓜多尔': 'EC', '埃及': 'EG', '萨尔瓦多': 'SV', '爱沙尼亚': 'EE', '埃塞俄比亚': 'ET',
  '斐济': 'FJ', '芬兰': 'FI', '法国': 'FR', '格鲁吉亚': 'GE', '德国': 'DE',
  '加纳': 'GH', '希腊': 'GR', '危地马拉': 'GT', '洪都拉斯': 'HN',
  '香港': 'HK', '中国香港': 'HK', '匈牙利': 'HU', '冰岛': 'IS', '印度': 'IN', '印度尼西亚': 'ID', '印尼': 'ID',
  '伊朗': 'IR', '伊拉克': 'IQ', '爱尔兰': 'IE', '以色列': 'IL', '意大利': 'IT',
  '牙买加': 'JM', '日本': 'JP', '约旦': 'JO', '哈萨克斯坦': 'KZ', '肯尼亚': 'KE',
  '朝鲜': 'KP', '韩国': 'KR', '大韩民国': 'KR', '科威特': 'KW', '吉尔吉斯斯坦': 'KG',
  '老挝': 'LA', '拉脱维亚': 'LV', '黎巴嫩': 'LB', '立陶宛': 'LT', '卢森堡': 'LU',
  '澳门': 'MO', '中国澳门': 'MO', '马达加斯加': 'MG', '马来西亚': 'MY', '马尔代夫': 'MV',
  '马耳他': 'MT', '墨西哥': 'MX', '摩尔多瓦': 'MD', '摩纳哥': 'MC', '蒙古': 'MN', '蒙古国': 'MN',
  '黑山': 'ME', '摩洛哥': 'MA', '莫桑比克': 'MZ', '缅甸': 'MM',
  '纳米比亚': 'NA', '尼泊尔': 'NP', '荷兰': 'NL', '新西兰': 'NZ',
  '尼加拉瓜': 'NI', '尼日利亚': 'NG', '挪威': 'NO', '阿曼': 'OM',
  '巴基斯坦': 'PK', '巴拿马': 'PA', '巴布亚新几内亚': 'PG', '巴拉圭': 'PY',
  '秘鲁': 'PE', '菲律宾': 'PH', '波兰': 'PL', '葡萄牙': 'PT',
  '卡塔尔': 'QA', '罗马尼亚': 'RO', '俄罗斯': 'RU', '沙特阿拉伯': 'SA', '沙特': 'SA',
  '塞尔维亚': 'RS', '新加坡': 'SG', '斯洛伐克': 'SK', '斯洛文尼亚': 'SI',
  '南非': 'ZA', '西班牙': 'ES', '斯里兰卡': 'LK', '瑞典': 'SE',
  '瑞士': 'CH', '台湾': 'TW', '中国台湾': 'TW', '塔吉克斯坦': 'TJ', '坦桑尼亚': 'TZ',
  '泰国': 'TH', '土耳其': 'TR', '土库曼斯坦': 'TM',
  '乌克兰': 'UA', '阿联酋': 'AE', '阿拉伯联合酋长国': 'AE',
  '英国': 'GB', '联合王国': 'GB',
  '美国': 'US', '美利坚合众国': 'US',
  '乌拉圭': 'UY', '乌兹别克斯坦': 'UZ', '委内瑞拉': 'VE', '越南': 'VN',
  '赞比亚': 'ZM', '津巴布韦': 'ZW',

  // Japanese names (common travel destinations for the app)
  'アメリカ合衆国': 'US', 'アメリカ': 'US', '日本国': 'JP',
  'フランス': 'FR', 'ドイツ': 'DE', 'イタリア': 'IT', 'スペイン': 'ES',
  'イギリス': 'GB', 'オーストラリア': 'AU', 'カナダ': 'CA', 'メキシコ': 'MX',
  'ブラジル': 'BR', 'タイ': 'TH', 'シンガポール': 'SG', 'マレーシア': 'MY',
  'インドネシア': 'ID', 'フィリピン': 'PH', 'ベトナム': 'VN', '韓国': 'KR',
  '台湾': 'TW', '中華人民共和国': 'CN',
};

/**
 * Resolve a country display name (in any language) to ISO 3166-1 alpha-2 code.
 * Falls back to trying the first two characters if nothing matches (for already-ISO inputs).
 */
export function getCountryCode(countryName) {
  if (!countryName) return null;
  // Already an ISO code?
  const upper = countryName.trim().toUpperCase();
  if (upper.length === 2 && /^[A-Z]{2}$/.test(upper)) return upper;

  const key = countryName.trim().toLowerCase();
  return NAME_TO_CODE[key] || null;
}

/**
 * Get all supported country codes (for dropdown/picker).
 */
export function getAllCountryCodes() {
  const seen = new Set();
  const result = [];
  for (const [, code] of Object.entries(NAME_TO_CODE)) {
    if (!seen.has(code)) {
      seen.add(code);
      result.push(code);
    }
  }
  return result.sort();
}

export default NAME_TO_CODE;
