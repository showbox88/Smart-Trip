/**
 * Card styles barrel — re-exports all compact card style components
 * and the style registry used by TripCard and CompactStylePicker.
 */

export { SakuraCard } from './SakuraCard';
export { BoardingPassCard } from './BoardingPassCard';
export { PolaroidCard } from './PolaroidCard';
export { MagazineCard } from './MagazineCard';
export { HankoCard } from './HankoCard';
export { PostcardCard } from './PostcardCard';
export { MinimalCard } from './MinimalCard';
export { LuggageTagCard } from './LuggageTagCard';
export { FilmStripCard } from './FilmStripCard';

import { SakuraCard } from './SakuraCard';
import { BoardingPassCard } from './BoardingPassCard';
import { PolaroidCard } from './PolaroidCard';
import { MagazineCard } from './MagazineCard';
import { HankoCard } from './HankoCard';
import { PostcardCard } from './PostcardCard';
import { MinimalCard } from './MinimalCard';
import { LuggageTagCard } from './LuggageTagCard';
import { FilmStripCard } from './FilmStripCard';

export const COMPACT_STYLES = [
  { id: 'sakura',        label: '樱花水印',   labelEn: 'Sakura',        component: SakuraCard },
  { id: 'boarding-pass', label: '登机牌',     labelEn: 'Boarding Pass', component: BoardingPassCard },
  { id: 'polaroid',      label: '宝丽来',     labelEn: 'Polaroid',      component: PolaroidCard },
  { id: 'magazine',      label: '杂志编辑',   labelEn: 'Magazine',      component: MagazineCard },
  { id: 'hanko',         label: '日式印章',   labelEn: 'Hanko',         component: HankoCard },
  { id: 'postcard',      label: '明信片',     labelEn: 'Postcard',      component: PostcardCard },
  { id: 'minimal',       label: '瑞士极简',   labelEn: 'Minimal',       component: MinimalCard },
  { id: 'luggage-tag',   label: '行李牌',     labelEn: 'Luggage Tag',   component: LuggageTagCard },
  { id: 'filmstrip',     label: '胶片条',     labelEn: 'Film Strip',    component: FilmStripCard },
];

export function getCompactStyleComponent(id) {
  return (COMPACT_STYLES.find(s => s.id === id) || COMPACT_STYLES[0]).component;
}
