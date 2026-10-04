import { armFor } from '../../core/armed';
import { bossSpecFor } from '../../core/bossTier';
import { scaleFor, type EnemyBase } from '../../core/difficulty';
import { type Vec2 } from '../../core/hit';
import { attackKindFor, parseAttackKind, parseStringLength } from '../../core/attackKind';
import { parseVariant, pickEnemyVariant } from '../../core/enemyVariant';
import { pickSpawnPoint } from '../../core/spawnPoint';
import { farthestPoint } from '../../core/waves';
import { BOSS_DEFEAT_HITSTOP_MS } from '../../data/fx';
import { READING } from '../../data/moves';
import { ARMED, BOSS, DIFFICULTY, ENEMY, ENEMY_AI, ENEMY_ATTACK, RUN, WAVE, SPAWN } from '../../data/tuning';
import { Boss } from '../../game/Boss';
import { Projectile } from '../../game/Projectile';
import { Enemy } from '../../game/Enemy';
import { debugParam, SPAWN_LIFT } from './params';
import type { TestScene } from '../TestScene';

/** Margem (px) além da borda da câmera em que um ponto ainda conta como visível (SPN-07). */
export const SPAWN_VIEW_MARGIN = 32;

/** Nascimento de inimigos comuns, do chefe e dos projéteis dele; a vitória sobre o chefe. */
export class Spawner {
  constructor(readonly s: TestScene) {}

  /** Instante (`clockMs`) do último spawn comum em cada índice de ponto `E` (SPN-08). */
  spawnLastUsed = new Map<number, number>();

  /** Ponto `E` do próximo inimigo comum (SPN-07..09) e registro do uso para o intervalo entre usos (SPN-08). */
  pickEnemySpawnPoint(): number {
    const view = this.s.cameras.main.worldView;
    const point = pickSpawnPoint({
      points: this.s.level.enemies,
      viewLeft: view.left,
      viewRight: view.right,
      margin: SPAWN_VIEW_MARGIN,
      playerX: this.s.player.sprite.x,
      playerFacing: this.s.player.facing,
      lastUsedAt: this.spawnLastUsed,
      nowMs: this.s.clockMs,
      gapMs: WAVE.pointGapMs,
      rng: this.s.run.spawnRng!,
      preferBackChance: SPAWN.preferBackChance,
    });
    this.spawnLastUsed.set(point, this.s.clockMs);
    return point;
  }

  /** Onda da rodada (WAVE-02): tuning escalado pela rodada (DIF-04) e graça ao nascer (WAVE-09). */
  spawnFromCommand(point: number, round: number): void {
    const at = this.s.level.enemies[point];
    const spawnAt: Vec2 = { x: at.x, y: at.y - SPAWN_LIFT };
    const scaled = scaleFor(round, { brain: ENEMY, ai: ENEMY_AI, attack: ENEMY_ATTACK }, DIFFICULTY);
    // ARM-01..03: sorteado depois da escala da rodada (armFor multiplica o dano já escalado).
    const armedRoll = this.s.loot.rollArmed(round);
    const armed = armedRoll ? armFor(armedRoll.tool, scaled, ARMED) : scaled;
    // EVR-04/05: o sorteio sempre consome o stream próprio (a sequência não muda com o override); `?debug&enemyVariant=`
    // com um id válido manda no resultado, um inválido cai no sorteio normal.
    const drawn = this.s.run.variantRng ? pickEnemyVariant(this.s.run.variantRng) : 'corcunda';
    const variant = parseVariant(debugParam('enemyVariant')) ?? drawn;
    // HGT-13, EDG-08: `?debug&enemyAttack=white|red|low` manda no tipo do golpe; inválido cai no `attackKindFor`.
    // DFL-14, EDG-09: `?debug&enemyString=1..4` manda no tamanho da sequência; inválido vale a sequência da arma (DFL-01).
    const kind =
      parseAttackKind(debugParam('enemyAttack')) ?? attackKindFor({ variant, weapon: armedRoll?.tool ?? null });
    const hits = parseStringLength(debugParam('enemyString')) ?? armed.ai.hits;
    const tuning: EnemyBase = { ...armed, attack: { ...armed.attack, kind }, ai: { ...armed.ai, hits } };
    const enemy = new Enemy(
      this.s,
      spawnAt,
      tuning,
      RUN.spawnGraceMs,
      (dead) => {
        this.s.enemies = this.s.enemies.filter((e) => e !== dead);
        this.s.attackGate.release(dead.id);
      },
      // A garra que acerta o player também é um golpe que conecta.
      (hit, hitPoint) => this.s.combat.onConnect(hit, hitPoint, hit.strength),
      // Drop do inimigo comum (design.md): sai daqui, não do onEnemyDied (que o chefe também chama).
      (dead, x, y) => {
        this.s.combat.onEnemyDied(dead.id, x, y);
        this.s.applyDrop(this.s.loot.enemyDrop(this.s.run.round, dead.weapon !== null), x, y);
        if (dead.weapon) this.s.dropTool(dead.weapon, dead.weaponRare, x, y);
      },
      armedRoll,
      variant,
    );
    enemy.onEvent = (ev) => this.s.debugEvents.push(ev);
    enemy.guardRng = this.s.run.guardRng;
    // RDG-23: `?debug&shove=N` fixa a chance do empurrão; RDG-19: o empurrão chega ao jogador pelo `shoved`.
    enemy.shoveChance = this.debugShoveChance();
    enemy.onShove = (dir) => this.s.player.shoved(dir);
    enemy.isWall = (box) => this.s.matter.query.region(this.s.terrain, box).length > 0;
    enemy.onSlideResidue = (at) => this.s.cursedFx.residue(at);
    enemy.slideTouch = (self) => this.s.combat.enemiesTouching(self);
    enemy.onBlock = (at) => {
      this.s.fx.spark(at.x, at.y, 'guard');
      this.s.realtimeFx.add('guard.spark', 100);
    };
    this.s.enemies.push(enemy);
    this.s.debugEvents.push(`spawnFx:${enemy.id}`);
    this.s.fx.curseSmoke(spawnAt.x, spawnAt.y);
  }

  /** `?debug&shove=N` (número de 0 a 1): chance do empurrão no 4º leve seguido (RDG-23); ausente ou inválido vale o padrão. */
  debugShoveChance(): number {
    const raw = debugParam('shove');
    if (raw === null || raw.trim() === '') return READING.shoveChance;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= 1 ? n : READING.shoveChance;
  }

  /**
   * Onda de chefe (BOSS-01/03): nasce no ponto `E` mais distante do player no momento do spawn, com o `BossSpec`
   * escalado pela rodada/tier (T2). Se um chefe anterior ainda estivesse por aqui (não deveria, mas por hygiene),
   * ele é removido antes - só existe um por vez.
   */
  spawnBoss(round: number): void {
    this.s.boss?.destroyNow();
    const point = farthestPoint(this.s.level.enemies, this.s.player.sprite.x);
    const at = this.s.level.enemies[point];
    const spawnAt: Vec2 = { x: at.x, y: at.y - SPAWN_LIFT };
    const spec = bossSpecFor(round);
    this.s.boss = new Boss(
      this.s,
      spawnAt,
      spec,
      this.s.terrain,
      // O golpe que conecta (do player ou do teste de debug) também é um golpe que conecta (faísca + hitstop).
      (hit, hitPoint) => this.s.combat.onConnect(hit, hitPoint, hit.strength),
      // Rugido (BAI-13): empurra o player para longe do chefe.
      (dir) => this.s.player.pushHorizontal(dir, BOSS.roarImpulse),
      // Pouso do salto (BAT-03): duas ondas de choque, uma para cada lado, rente ao chão.
      (x, y, damage) => {
        this.spawnProjectile('shockwave', x, y, 1, BOSS.shockwave.speed, BOSS.shockwave.maxDist, damage);
        this.spawnProjectile('shockwave', x, y, -1, BOSS.shockwave.speed, BOSS.shockwave.maxDist, damage);
      },
      // Disparo da rajada (BAT-04, BTIER-05/07): um projétil por evento `fire`, já com o `speed` do arquétipo.
      (x, y, dir, speed, damage) => this.spawnProjectile('projectile', x, y, dir, speed, BOSS.volley.maxDist, damage),
      (dead, x, y) => this.onBossDefeated(dead, x, y),
    );
    // Entrada (BHUD-01/05): barra cheia com o nome e a faixa do chefe durante a intro.
    this.s.hud.showBossBar(spec.name);
    this.s.hud.banner(`Chefe: ${spec.name}`, BOSS.introMs);
  }

  /**
   * Vitória (BWIN-01..03, BHUD-03): conta o abate, cura 30% do maxHp, hitstop de 250 ms (o `trigger` fica com o
   * maior, então o golpe fatal de 90 ms não encurta), tremida e fumaça na posição do chefe. O chefe some no fim
   * do hitstop, fora do próprio `receiveHit` que o matou.
   */
  onBossDefeated(dead: Boss, x: number, y: number): void {
    this.s.combat.onEnemyDied(dead.id, x, y);
    this.s.applyDrop(this.s.loot.bossDrop(this.s.run.round), x, y);
    this.s.player.heal(Math.round(BOSS.healFraction * this.s.player.maxHp));
    this.s.effects.hitstop.trigger(BOSS_DEFEAT_HITSTOP_MS);
    this.s.effects.freeze();
    this.s.fx.shake();
    this.s.fx.curseSmoke(x, y);
    this.s.debugEvents.push('bossDefeatedFx');
    this.s.hud.hideBossBar();
    // BHUD-03: a faixa entra na hora da morte; "Rodada N concluída" vem depois dela (RHUD-03).
    this.s.hud.banner('Chefe derrotado!', BOSS.defeatBannerMs);
    this.s.clearedBanner = {
      round: this.s.run.round,
      afterMs: BOSS.defeatBannerMs,
      upgradeText: this.s.bossRewardUpgrade(),
    };
    this.s.bossDefeatedPending = true;
  }

  /** Cria um projétil ou onda de choque do chefe e o adiciona à lista da cena (BAT-03/04/06/12). */
  spawnProjectile(
    kind: 'projectile' | 'shockwave',
    x: number,
    y: number,
    dir: 1 | -1,
    speed: number,
    maxDist: number,
    damage: number,
  ): void {
    this.s.projectiles.push(
      new Projectile(this.s, kind, x, y, dir, speed, maxDist, damage, (hit, hitPoint) =>
        this.s.combat.onConnect(hit, hitPoint, hit.strength),
      ),
    );
  }
}
