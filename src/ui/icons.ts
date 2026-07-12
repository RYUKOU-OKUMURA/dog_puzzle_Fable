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
export const PANEL_ICONS: Record<string, string> = {
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

export const PANEL_LABELS: Record<string, string> = {
  straight: 'まっすぐ',
  corner: 'まがりかど',
  tee: 'Tじろ',
};
