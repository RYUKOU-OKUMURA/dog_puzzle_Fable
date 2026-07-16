import type { PlayerPanelKind } from '../core/types';
import type { ProfileIconId } from '../save/profiles';

const ROAD = '#f7efdf';
const BG = '#a9dd9d';

function frame(inner: string): string {
  return (
    `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="1" y="1" width="38" height="38" rx="8" fill="${BG}"/>` +
    inner +
    `</svg>`
  );
}

/** パレットに表示する道パネルのアイコン */
export const PANEL_ICONS: Record<PlayerPanelKind, string> = {
  straight: frame(`<rect x="14" y="1" width="12" height="38" fill="${ROAD}"/>`),
  corner: frame(
    `<rect x="14" y="1" width="12" height="25" fill="${ROAD}"/>` +
      `<rect x="14" y="14" width="25" height="12" fill="${ROAD}"/>`,
  ),
  tee: frame(
    `<rect x="1" y="14" width="38" height="12" fill="${ROAD}"/>` +
      `<rect x="14" y="1" width="12" height="25" fill="${ROAD}"/>`,
  ),
};

export const PANEL_LABELS: Record<PlayerPanelKind, string> = {
  straight: 'まっすぐ',
  corner: 'まがりかど',
  tee: 'Tじろ',
};

/**
 * プロフィール作成時にえらぶ犬アイコン。
 * id は save/profiles.ts の PROFILE_ICON_IDS と対応(絵文字は子供向けのアクセント)。
 */
export const PROFILE_ICONS: ReadonlyArray<{ id: ProfileIconId; emoji: string; label: string }> = [
  { id: 'shiba', emoji: '🐕', label: 'しばいぬ' },
  { id: 'puppy', emoji: '🐶', label: 'こいぬ' },
  { id: 'poodle', emoji: '🐩', label: 'プードル' },
  { id: 'shepherd', emoji: '🦮', label: 'おおきな いぬ' },
  { id: 'paw', emoji: '🐾', label: 'にくきゅう' },
  { id: 'bone', emoji: '🦴', label: 'ほね' },
];

/** アイコンid → 絵文字(見つからなければ柴犬) */
export function iconEmoji(id: string): string {
  return PROFILE_ICONS.find((p) => p.id === id)?.emoji ?? '🐕';
}
