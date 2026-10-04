import type Phaser from 'phaser';
import type { EnemyVariant } from '../../core/enemyVariant';
import { parseSheet } from '../../core/pixelGrid';
import { ENEMY_VARIANTS } from '../../core/enemyVariant';
import { TEX, createPlaceholderTextures, enemyTex, ragTex, type RagPart } from '../textures';
import { ENEMY_BAR, HUD_BAR } from './hud';
import { PALETTE_KEYS } from './palette';
import { registerSheet } from './render';
import { ENEMY_ANIMS, ENEMY_RAG_VARIANTS, ENEMY_VARIANT_FRAMES } from './sprites/enemy';
import { KANJI_FRAMES } from './sprites/kanji';
import { PLAYER_ANIMS, PLAYER_FRAMES, animFrameConfigs, type AnimDef } from './sprites/player';
import { PLAYER_MOVE_FRAMES } from './sprites/playerMoves';
import { currentSearch, rigTallSheet, withRigFrames } from './rig/flag';
import { PLAYER_TECH_FRAMES } from './sprites/playerTech';
import { AURA_FRAMES, BLUE_ORB_FRAME, RED_ORB_FRAMES, RED_ORB_SIZES, TECH_SPARK_FRAMES } from './sprites/techFx';
import { PROP_SHARDS, PROP_SPRITES, SMOKE, SMOKE_CURSE } from './sprites/props';
import { FRAGMENT_FRAMES, FRAGMENT_ICON, HEAL_FRAMES } from './sprites/economy';
import { TELEGRAPH_FRAMES } from './sprites/telegraph';
import { TOOL_FRAMES, TOOL_SHARDS } from './sprites/tools';
import { BOSS_ANIMS, BOSS_FRAMES, PROJECTILE_FRAME, SHOCKWAVE_FRAME, TECELA_FRAMES, bossAnimKey } from './sprites/boss';
import { registerTiles } from './tiles';

/** Chave da animação do player no AnimationManager (global do jogo). */
export const playerAnimKey = (name: string): string => `player-${name}`;
/** Chave da animação do inimigo no AnimationManager. */
export const enemyAnimKey = (v: EnemyVariant, name: string): string => `enemy-${v}-${name}`;

/** Textura dos estilhaços de um objeto, pela textura do próprio objeto (PRP-01). */
export const shardsKey = (texture: string): string => `${texture}-shards`;

/**
 * Registra toda a arte da cena: tileset, folhas do player e do inimigo, partes do ragdoll, objetos com os seus
 * estilhaços, fumaça e as animações. O placeholder do player fica, porque é a textura do corpo físico invisível
 * (o tamanho dela define o corpo).
 */
export function createArt(scene: Phaser.Scene): void {
  createPlaceholderTextures(scene);
  registerTiles(scene);
  // Folha do player + os frames de conjuração das técnicas (CAST-18) e do combate estilo luta (MOV-14), na
  // mesma textura (CAST-13/MOV-18 trocam de frame).
  registerSheet(
    scene,
    TEX.playerArt,
    parseSheet(
      'player',
      { ...PLAYER_FRAMES, ...PLAYER_TECH_FRAMES, ...withRigFrames(PLAYER_MOVE_FRAMES, currentSearch()) },
      PALETTE_KEYS,
    ),
  );
  registerAnims(scene, TEX.playerArt, PLAYER_ANIMS, playerAnimKey);
  // Heroico alto do boneco articulado (PRA-08): folha própria de 40x40 (o parseSheet exige frames do mesmo tamanho),
  // só com `?debug&rig=1`.
  const tall = rigTallSheet(currentSearch());
  if (tall) registerSheet(scene, TEX.playerRig, parseSheet('player-rig', tall, PALETTE_KEYS));
  // Uma folha, as animações e as 3 partes do ragdoll por aparência (EVR-06), nas cores da folha (CHR-04).
  for (const v of ENEMY_VARIANTS) {
    const tex = enemyTex(v);
    registerSheet(scene, tex, parseSheet(tex, ENEMY_VARIANT_FRAMES[v], PALETTE_KEYS));
    registerAnims(scene, tex, ENEMY_ANIMS, (name) => enemyAnimKey(v, name));
    for (const [part, grid] of Object.entries(ENEMY_RAG_VARIANTS[v]) as [RagPart, string[] | readonly string[]][]) {
      const key = ragTex(part, v);
      registerSheet(scene, key, parseSheet(key, { [key]: grid }, PALETTE_KEYS));
    }
  }
  // Objetos: a textura de 1 frame define o corpo físico (26x26 e 8x20 px, iguais aos placeholders antigos).
  const props = { [TEX.chair]: 'chair', [TEX.bottle]: 'bottle' } as const;
  for (const [texture, key] of Object.entries(props)) {
    registerSheet(scene, texture, parseSheet(key, { [key]: PROP_SPRITES[key] }, PALETTE_KEYS));
    const shards = Object.fromEntries(PROP_SHARDS[key].map((s) => [s.key, s.grid]));
    registerSheet(scene, shardsKey(texture), parseSheet(shardsKey(key), shards, PALETTE_KEYS));
  }
  registerSheet(scene, TEX.smoke, parseSheet('smoke', { smoke: SMOKE }, PALETTE_KEYS));
  registerSheet(scene, TEX.smokeCurse, parseSheet('smoke-curse', SMOKE_CURSE, PALETTE_KEYS));
  // Economia (ECO-23, HEAL): fragmento, gota de cura e o ícone do contador.
  registerSheet(scene, TEX.fragment, parseSheet('fragment', FRAGMENT_FRAMES, PALETTE_KEYS));
  registerSheet(scene, TEX.healDrop, parseSheet('heal-drop', HEAL_FRAMES, PALETTE_KEYS));
  registerSheet(scene, TEX.fragmentIcon, parseSheet('fragment-icon', { icon: FRAGMENT_ICON }, PALETTE_KEYS));
  // Marcador do tipo do golpe inimigo (HGT-09): 3 frames de 7x7 texels, `white`, `red` e `low`.
  registerSheet(scene, TEX.fxTelegraph, parseSheet('telegraph', TELEGRAPH_FRAMES, PALETTE_KEYS));
  // Ferramentas amaldiçoadas (ARM-19): comum, rara e as poses na mão, com os estilhaços do frame comum.
  const tools = { [TEX.cursedKnife]: 'cursedKnife', [TEX.cursedClub]: 'cursedClub' } as const;
  for (const [texture, key] of Object.entries(tools)) {
    registerSheet(scene, texture, parseSheet(key, TOOL_FRAMES[key], PALETTE_KEYS));
    const shards = Object.fromEntries(TOOL_SHARDS[key].map((s) => [s.key, s.grid]));
    registerSheet(scene, shardsKey(texture), parseSheet(shardsKey(key), shards, PALETTE_KEYS));
  }
  // Kanji das técnicas (TEC-09, CAST-16): ícones de slot do HUD e a chamada da conjuração, na mesma folha.
  registerSheet(scene, TEX.kanji, parseSheet('kanji', KANJI_FRAMES, PALETTE_KEYS));
  // Aura de conjuração (CAST-14): 2 frames de chama por cor (blue-a/b, red-a/b, white-a/b).
  registerSheet(scene, TEX.techAura, parseSheet('tech-aura', AURA_FRAMES, PALETTE_KEYS));
  // Faíscas de técnica (KOK-23): kokusen (preta/vermelha), redOut, blueIn.
  registerSheet(scene, TEX.techSpark, parseSheet('tech-spark', TECH_SPARK_FRAMES, PALETTE_KEYS));
  // Orbe Vermelho (RED-02): um frame por terço da carga, cada tamanho na sua própria textura (parseSheet exige
  // frames do mesmo tamanho dentro de uma folha, e os 3 tamanhos são diferentes).
  const redOrbTex = { 4: TEX.techOrbRed4, 8: TEX.techOrbRed8, 12: TEX.techOrbRed12 } as const;
  for (const size of RED_ORB_SIZES) {
    registerSheet(scene, redOrbTex[size], parseSheet(`red-orb-${size}`, { orb: RED_ORB_FRAMES[size] }, PALETTE_KEYS));
  }
  // Orbe Azul ativo (BLU-08): um frame só.
  registerSheet(scene, TEX.techOrbBlue, parseSheet('blue-orb', { orb: BLUE_ORB_FRAME }, PALETTE_KEYS));
  registerSheet(scene, TEX.hudBar, parseSheet('hud-bar', { bar: HUD_BAR }, PALETTE_KEYS));
  registerSheet(scene, TEX.enemyBar, parseSheet('enemy-bar', { bar: ENEMY_BAR }, PALETTE_KEYS));
  // Chefe (BTIER-06): uma folha por arquétipo, com o mesmo conjunto de frames e animações.
  registerSheet(scene, TEX.bossOni, parseSheet('boss-oni', BOSS_FRAMES, PALETTE_KEYS));
  registerAnims(scene, TEX.bossOni, BOSS_ANIMS, (name) => bossAnimKey('oni', name));
  registerSheet(scene, TEX.bossTecela, parseSheet('boss-tecela', TECELA_FRAMES, PALETTE_KEYS));
  registerAnims(scene, TEX.bossTecela, BOSS_ANIMS, (name) => bossAnimKey('tecela', name));
  registerSheet(
    scene,
    TEX.bossProjectile,
    parseSheet('boss-projectile', { projectile: PROJECTILE_FRAME }, PALETTE_KEYS),
  );
  registerSheet(scene, TEX.bossShockwave, parseSheet('boss-shockwave', { shockwave: SHOCKWAVE_FRAME }, PALETTE_KEYS));
}

/**
 * Cria as animações de uma folha. Lança erro na inicialização se uma animação citar um frame que não existe.
 * No reinício da cena a textura é recriada, então a animação antiga (que aponta para os frames velhos) sai antes.
 */
export function registerAnims(
  scene: Phaser.Scene,
  textureKey: string,
  anims: Record<string, AnimDef>,
  keyOf: (name: string) => string,
): void {
  const texture = scene.textures.get(textureKey);
  for (const [name, def] of Object.entries(anims)) {
    const configs = animFrameConfigs(name, def);
    for (const frame of def.frames) {
      if (!texture.has(frame)) {
        throw new Error(`Animação '${name}' cita o frame '${frame}', que não existe na textura '${textureKey}'`);
      }
    }
    const key = keyOf(name);
    if (scene.anims.exists(key)) scene.anims.remove(key);
    scene.anims.create({
      key,
      frames: configs.map(({ frame, duration }) =>
        duration ? { key: textureKey, frame, duration } : { key: textureKey, frame },
      ),
      frameRate: def.frameRate,
      repeat: def.repeat,
    });
  }
}
