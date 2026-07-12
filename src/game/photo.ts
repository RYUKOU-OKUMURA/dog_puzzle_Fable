/**
 * 出会い記念写真の zoom 計算。
 * 固定アイソメカメラの角度は変えず、友犬のモデル scale に応じて寄り具合だけ調整する。
 */

/** scale=1(柴犬サイズ)の友犬向け基準。2匹がフレームに収まる寄り */
const PHOTO_BASE_ZOOM = 4.0;
/** 大型犬でも図鑑サムネで判別できる下限 */
const PHOTO_ZOOM_MIN = 3.4;
/** 2匹が切れない上限(柴犬ポートレート4.2を目安) */
const PHOTO_ZOOM_MAX = 4.0;

/** 友犬の scale から記念写真の zoom を決める(小さいほど寄る) */
export function photoZoomForFriendScale(friendScale: number): number {
  const safe = Math.max(friendScale, 0.01);
  const zoom = PHOTO_BASE_ZOOM / safe;
  return Math.min(PHOTO_ZOOM_MAX, Math.max(PHOTO_ZOOM_MIN, zoom));
}
