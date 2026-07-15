import * as THREE from 'three';

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  /** 毎フレーム呼ばれる更新関数を登録する */
  onFrame(callback: (deltaSeconds: number) => void): void;
  /** 指定ワールド座標にズームして正方形の記念写真を撮る(JPEG dataURL) */
  capturePhotoAt(targetX: number, targetZ: number, zoom: number, size: number): string;
  /** ステージサイズに合わせてカメラの表示範囲と影の範囲を更新(ステージ切替で呼ぶ) */
  fitToStage(w: number, h: number): void;
}

/**
 * 8×8(盤面の広がり = セル数-1 = 7)のときの基準ビューサイズ。
 * 8×8 はこの値で現状の見た目と完全一致させる(M10「既存8×8は現状と同一」)。
 * 大きい盤面は広がりに比例して引きで映す。記念写真の構図もこの基準に固定する。
 */
const BASE_VIEW_SIZE = 10.5;
/** 8×8 の広がり。viewSize の比率計算の分母 */
const BASE_SPAN = 7;

/** 古典的アイソメトリック: 方位45°・仰角約35° */
const CAMERA_OFFSET = new THREE.Vector3(10, 10, 10);

export function createSceneContext(canvas: HTMLCanvasElement): SceneContext {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbde3ff);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.copy(CAMERA_OFFSET);
  camera.lookAt(0, 0, 0);

  const ambient = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff3e0, 1.7);
  sun.position.set(6, 12, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.far = 40;
  scene.add(sun);

  // 盤面サイズに連動する値。既定は 8×8(現状の見た目)。
  let viewSize = BASE_VIEW_SIZE;
  let shadowExtent = 8;

  function applyShadowExtent(): void {
    sun.shadow.camera.left = -shadowExtent;
    sun.shadow.camera.right = shadowExtent;
    sun.shadow.camera.top = shadowExtent;
    sun.shadow.camera.bottom = -shadowExtent;
    sun.shadow.camera.updateProjectionMatrix();
  }

  /** 指定ビューサイズでカメラの錐台を画面アスペクトに合わせて設定 */
  function applyFrustum(vs: number): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;
    // 縦長画面でも盤面全体が入るよう、狭い方に合わせる
    const halfHeight = aspect >= 1 ? vs / 2 : vs / 2 / aspect;
    const halfWidth = halfHeight * aspect;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
  }

  function resize(): void {
    renderer.setSize(window.innerWidth, window.innerHeight);
    applyFrustum(viewSize);
  }

  applyShadowExtent();
  window.addEventListener('resize', resize);
  resize();

  const frameCallbacks: ((deltaSeconds: number) => void)[] = [];
  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.1);
    for (const callback of frameCallbacks) callback(delta);
    renderer.render(scene, camera);
  });

  return {
    renderer,
    scene,
    camera,
    onFrame(callback) {
      frameCallbacks.push(callback);
    },
    capturePhotoAt(targetX, targetZ, zoom, size) {
      // 平行投影なので、カメラを平行移動するだけで対象が中心に来る
      const originalPosition = camera.position.clone();
      const originalZoom = camera.zoom;
      camera.position.set(
        targetX + CAMERA_OFFSET.x,
        0.35 + CAMERA_OFFSET.y,
        targetZ + CAMERA_OFFSET.z,
      );
      camera.zoom = zoom;
      // 構図をステージサイズに左右されないよう、写真は常に8×8基準の錐台で撮る(M10)
      applyFrustum(BASE_VIEW_SIZE);

      // preserveDrawingBuffer なしでも、描画直後の同期読み出しなら取得できる
      renderer.render(scene, camera);
      const source = renderer.domElement;
      const crop = Math.min(source.width, source.height);
      const canvas2d = document.createElement('canvas');
      canvas2d.width = size;
      canvas2d.height = size;
      const context = canvas2d.getContext('2d')!;
      context.drawImage(
        source,
        (source.width - crop) / 2,
        (source.height - crop) / 2,
        crop,
        crop,
        0,
        0,
        size,
        size,
      );

      camera.position.copy(originalPosition);
      camera.zoom = originalZoom;
      applyFrustum(viewSize);
      return canvas2d.toDataURL('image/jpeg', 0.85);
    },
    fitToStage(w, h) {
      // 盤面のワールド広がり(セル数-1)に比例。8×8(span7)で BASE_VIEW_SIZE → 見た目不変
      const span = Math.max(w, h) - 1;
      viewSize = BASE_VIEW_SIZE * (span / BASE_SPAN);
      // 影範囲は盤の対角半径+余裕。8〜10マスは従来 ±8 のまま(下限で固定 → 影見た目不変)
      shadowExtent = Math.max(8, Math.SQRT2 * (Math.max(w, h) / 2 + 0.5));
      applyShadowExtent();
      applyFrustum(viewSize);
    },
  };
}
