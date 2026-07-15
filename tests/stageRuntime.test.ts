import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { Hud } from '../src/ui/hud';
import { StageRuntime } from '../src/game/stageRuntime';
import type { SceneContext } from '../src/scene/renderer';
import { w1s1 } from '../src/stage/w1s1';
import { w1s2 } from '../src/stage/w1s2';
import { w1s3 } from '../src/stage/w1s3';
import { w1s4 } from '../src/stage/w1s4';

/**
 * StageRuntime の生成/破棄ライフサイクルをブラウザなしで検証する。
 * Three.js のオブジェクト生成(buildTown/createPanelMesh)と、ステージ差し替え時の
 * グループ破棄・タップリスナ解除が例外を投げないかがここでわかる(WebGL描画は不要)。
 */

// 全メソッド no-op の Hud モック(PuzzleController が hud を呼んでも爆発しない)
function hudStub(): Hud {
  return new Proxy(
    {},
    {
      get: () => () => {},
    },
  ) as unknown as Hud;
}

// addEventListener/removeEventListener だけ持つ canvas モック(タップリスナ登録/解除の検証用)
function canvasStub(): HTMLCanvasElement {
  const listeners: Record<string, ((e: unknown) => void) | undefined> = {};
  return {
    addEventListener: (type: string, fn: (e: unknown) => void) => {
      listeners[type] = fn;
    },
    removeEventListener: (type: string) => {
      delete listeners[type];
    },
  } as unknown as HTMLCanvasElement;
}

function makeSceneContext(): SceneContext {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  return {
    renderer: {} as THREE.WebGLRenderer,
    scene,
    camera,
    onFrame: () => {},
    capturePhotoAt: () => '',
    fitToStage: () => {},
  };
}

describe('StageRuntime: 生成と破棄のライフサイクル', () => {
  it('W1の全ステージが盤面を実行時オブジェクトとして構築できる', () => {
    const ctx = makeSceneContext();
    for (const stage of [w1s1, w1s2, w1s3, w1s4]) {
      const runtime = new StageRuntime(stage, {
        sceneContext: ctx,
        hud: hudStub(),
        canvas: canvasStub(),
      });
      expect(runtime.stage.id).toBe(stage.id);
      expect(runtime.town.group.parent).toBe(ctx.scene); // 街がシーンに追加されている
      expect(runtime.grid.stage.id).toBe(stage.id);
      expect(runtime.boardView).toBeDefined();
      expect(runtime.puzzle).toBeDefined();
      runtime.dispose();
    }
  });

  it('dispose で街がシーンから取り除かれる', () => {
    const ctx = makeSceneContext();
    const runtime = new StageRuntime(w1s1, {
      sceneContext: ctx,
      hud: hudStub(),
      canvas: canvasStub(),
    });
    expect(ctx.scene.children.length).toBeGreaterThan(0);
    runtime.dispose();
    expect(runtime.town.group.parent).toBeNull();
  });

  it('reset は盤面を初期化できる(例外なく)', () => {
    const ctx = makeSceneContext();
    const runtime = new StageRuntime(w1s1, {
      sceneContext: ctx,
      hud: hudStub(),
      canvas: canvasStub(),
    });
    expect(() => runtime.reset()).not.toThrow();
    runtime.dispose();
  });

  it('ステージ差し替え(A→B)で古い街が消え、新しい街がシーンに乗る', () => {
    const ctx = makeSceneContext();
    const rt1 = new StageRuntime(w1s1, {
      sceneContext: ctx,
      hud: hudStub(),
      canvas: canvasStub(),
    });
    const firstTown = rt1.town.group;
    rt1.dispose();
    const rt2 = new StageRuntime(w1s2, {
      sceneContext: ctx,
      hud: hudStub(),
      canvas: canvasStub(),
    });
    expect(firstTown.parent).toBeNull(); // 古い街はシーンから外れている
    expect(rt2.town.group.parent).toBe(ctx.scene); // 新しい街が乗っている
    expect(rt2.stage.id).toBe('w1-s2');
    rt2.dispose();
  });
});
