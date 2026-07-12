import * as THREE from 'three';

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  /** 毎フレーム呼ばれる更新関数を登録する */
  onFrame(callback: (deltaSeconds: number) => void): void;
  /** 指定ワールド座標にズームして正方形の記念写真を撮る(JPEG dataURL) */
  capturePhotoAt(targetX: number, targetZ: number, zoom: number, size: number): string;
}

/** 画面に収めたい盤面の広がり(ワールド単位) */
const VIEW_SIZE = 10.5;

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
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  sun.shadow.camera.far = 40;
  scene.add(sun);

  function resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);

    const aspect = width / height;
    // 縦長画面でも盤面全体が入るよう、狭い方に合わせる
    const halfHeight = aspect >= 1 ? VIEW_SIZE / 2 : VIEW_SIZE / 2 / aspect;
    const halfWidth = halfHeight * aspect;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
  }

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
      camera.updateProjectionMatrix();

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
      camera.updateProjectionMatrix();
      return canvas2d.toDataURL('image/jpeg', 0.85);
    },
  };
}
