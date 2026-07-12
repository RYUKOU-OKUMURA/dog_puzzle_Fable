import * as THREE from 'three';

/**
 * Object3D 配下のジオメトリとマテリアルを一括解放する。
 * 共有ジオメトリ(街の地面タイル等)を二重解放しないよう Set で一意に集めてから dispose する。
 * ステージ切り替えで古い街/盤面を破棄するときの GPU リーク防止。
 */
export function disposeObject(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      geometries.add(child.geometry);
      const material = child.material;
      if (Array.isArray(material)) {
        for (const m of material) materials.add(m);
      } else if (material) {
        materials.add(material);
      }
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}
