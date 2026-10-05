import { type TechId } from '../../data/techniques';
import { type GameSnapshot } from '../../game/debugApi';
import { renderAlpha } from '../../game/physics';
import { SPAWN_LIFT } from './params';
import type { TestScene } from '../TestScene';

/** Snapshot de debug lido por `debugApi` e pelos smokes, com os eventos e abates acumulados. */
export class DebugSnapshot {
  constructor(readonly s: TestScene) {}

  /** Eventos lidos pelo smoke no snapshot de debug, ex.: `enemyDied:7`. */
  debugEvents: string[] = [];

  debugDeaths: { id: number; x: number; y: number }[] = [];

  debugSnapshot(): GameSnapshot {
    return {
      player: {
        x: this.s.player.sprite.x,
        y: this.s.player.sprite.y,
        hp: this.s.player.hp,
        dead: this.s.player.dead,
        facing: this.s.player.facing,
        flash: this.s.player.activeFlash,
        maxHp: this.s.player.maxHp,
        vy: this.s.player.verticalSpeed,
        move: this.s.player.moveName,
        frame: this.s.player.frameName,
        sheet: this.s.player.sheetKey,
        view: this.s.player.spritePos,
        guard: this.s.player.guardState,
        structure: this.s.player.structureView,
        dodge: this.s.player.dodgeView,
        duck: this.s.player.duckView,
        counter: this.s.player.counterView,
        invulnerable: this.s.player.invulnerable,
      },
      enemies: this.s.enemies.map((e) => ({
        id: e.id,
        x: e.x,
        y: e.hurtRect().y,
        hp: e.hp,
        state: e.state,
        ai: e.aiState,
        maxHp: e.maxHp,
        damage: e.damage,
        chaseSpeed: e.chaseSpeed,
        weapon: e.weapon,
        weaponVisible: e.weaponVisible,
        structure: e.structureView,
        guarding: e.guarding,
        variant: e.variant,
        view: e.spritePos,
        frame: e.frame,
        spriteVisible: e.spriteVisible,
        ragdollVisible: e.ragdollVisible,
        ragdollTextures: e.ragdollTextures,
        slide: e.slideView,
        telegraph: e.telegraph,
        committed: e.committed,
        commitFlash: e.commitFlash,
        attack: e.attackView,
        downHits: e.downHits,
        lightStreak: e.lightStreak,
        guardRead: e.guardRead,
      })),
      focusId: this.s.focusId,
      reading: { ...this.s.reading.last },
      events: [...this.debugEvents],
      deaths: this.debugDeaths.map((d) => ({ ...d })),
      boss: this.s.boss
        ? {
            hp: this.s.boss.hp,
            maxHp: this.s.boss.maxHp,
            phase: this.s.boss.phase,
            state: this.s.boss.state,
            attack: this.s.boss.attackName,
            poise: this.s.boss.poise,
            archetype: this.s.boss.archetype,
            name: this.s.boss.name,
            x: this.s.boss.x,
            y: this.s.boss.y,
            view: this.s.boss.spritePos,
            finisherReady: this.s.boss.finisherReady,
          }
        : null,
      projectiles: this.s.projectiles.map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        dir: p.dir,
        speed: p.speed,
        kind: p.kind,
        height: p.height,
        traveled: p.traveled,
      })),
      run: {
        state: this.s.run.state,
        round: this.s.run.round,
        kills: this.s.run.kills,
        alive: this.s.run.alive,
        queued: this.s.run.queued,
        maxAlive: this.s.run.maxAlive,
      },
      attackers: this.s.enemies.filter((e) => e.aiState === 'windup' || e.aiState === 'attack').length,
      gate: { active: this.s.attackGate.activeCount(), queue: [...this.s.attackGate.queueOrder()] },
      hud: {
        ...this.s.hud.debugState(),
        ...this.s.energyHud.debugState(),
        callout: this.s.callout.debug(),
        kokusenCard: this.s.kokusenFx.cardDebug(),
      },
      combo: { hits: this.s.comboCounter.hits, grade: this.s.comboCounter.grade },
      timeScale: this.s.effects.slowMo.timeScale,
      hitstop: { frozen: this.s.effects.hitstop.frozen, remainingMs: this.s.effects.hitstop.remaining },
      level: { playerSpawn: { x: this.s.level.player.x, y: this.s.level.player.y - SPAWN_LIFT } },
      wallet: { fragments: this.s.wallet.fragments },
      shop: this.s.shopDirector.shopSnapshot(),
      modifiers: this.s.modifiers.levels,
      pickups: this.s.pickups.debug(),
      floatTexts: this.s.floatTexts.debug(),
      worldProps: this.s.props.map((p) => ({
        id: p.id,
        key: p.def.key,
        state: p.machine.state,
        x: p.sprite.x,
        y: p.sprite.y,
        durabilityLeft: p.def.durability - p.machine.impacts,
        rare: p.rare,
        vx: p.vx,
      })),
      ce: { cur: this.s.energy.cur, max: this.s.energy.max, regen: this.s.energy.regen },
      tech: this.techSnapshot(),
      kokusen: this.s.techRunner.kokusenSnapshot, // TFX-07, KOK-01/02/10/11/30/31
      techObjects: this.s.techRunner.techObjectsSnapshot, // RED-14, BLU-10
      fx: {
        live: this.s.fxRegistry.size,
        degraded: this.s.kokusenFx.degraded,
        layers: this.s.realtimeFx.layers(),
        red: this.s.techRunner.redDebugState,
        aura: this.s.aura.pos,
        trails: this.s.cursedFx.trails,
        focus: this.s.focusLines.view,
        lastImpact: this.s.impactFx.lastImpact,
      },
      // Desvio da Fase 6 (CAST-15/KOK-24): zoom da câmera principal, sem contrato prévio no snapshot.
      camera: {
        zoom: this.s.cameras.main.zoom,
        worldView: { left: this.s.cameras.main.worldView.left, right: this.s.cameras.main.worldView.right },
        // CAM-07: estado do seguidor novo e os dois interruptores do Phaser que ele substitui.
        center: { x: this.s.camera.camCenter.x, y: this.s.camera.camCenter.y },
        scroll: { x: this.s.cameras.main.scrollX, y: this.s.cameras.main.scrollY },
        roundPixels: this.s.cameras.main.roundPixels,
        phaserFollow: (this.s.cameras.main as unknown as { _follow: unknown })._follow != null,
      },
      // ITP-05/07: fração entre os dois últimos passos de física que este quadro desenha.
      physics: { alpha: renderAlpha(this.s) },
      // T23 (FIN-01/03): distância viva ao inimigo quebrado mais perto, a mesma que o finalizador usa; sem contrato prévio.
      finisher: { distPx: this.s.combat.nearestFinishable()?.dist ?? null },
      // T28: laboratório de efeitos, sem contrato prévio no snapshot; `null` fora do fxlab.
      fxlab: this.s.fxLab?.debug() ?? null,
    };
  }

  /** `tech` do snapshot (TEC-08): slots do loadout e a conjuração ativa (CAST-*). */
  techSnapshot(): GameSnapshot['tech'] {
    const [s0, s1] = this.s.loadout.slotsView;
    const slotView = (slot: 0 | 1, s: { id: TechId; level: 1 | 2 | 3 } | null) =>
      s
        ? {
            id: s.id,
            level: s.level,
            cooldownMs: this.s.loadout.cooldownOf(slot),
            mastery: { points: this.s.mastery.points(slot), threshold: this.s.mastery.threshold(s.level) },
          }
        : null;
    return { slots: [slotView(0, s0), slotView(1, s1)], cast: this.s.techCaster.cast };
  }
}
