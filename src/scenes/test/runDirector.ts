import { bossRewardSlot } from '../../core/bossReward';
import { type MasterySlot } from '../../core/mastery';
import { ElixirRoll, Loot, type LootOverrides } from '../../core/loot';
import { type RunCommand } from '../../core/run';
import { isBossRound } from '../../core/waves';
import { FULL_SHOP_CATALOG } from '../../data/shop';
import { TECHNIQUES, type TechId } from '../../data/techniques';
import { ECONOMY, ELIXIR, RUN } from '../../data/tuning';
import { isDebug } from '../../game/debug';
import { CAMERA_FEEL } from '../../data/feel';
import { debugParam, debugIntParam, isDroppedTool } from './params';
import type { TestScene } from '../TestScene';

/** Duração (ms) do banner do upgrade grátis do chefe: o fim da faixa "Chefe derrotado!", sem atrasar "Rodada N concluída" (BFX-10). */
export const BOSS_UPGRADE_BANNER_MS = 800;

/** Diretor da run e das rodadas: comandos da `Run`, nova run, banners, maestria e overrides de debug. */
export class RunDirector {
  constructor(readonly s: TestScene) {}

  /** Chefe derrotado espera o fim do hitstop da vitória para sumir (não é destruído dentro do próprio golpe). */
  bossDefeatedPending = false;

  /** Na rodada de chefe, "Rodada N concluída" entra depois da faixa "Chefe derrotado!" (BHUD-03 + RHUD-03). */
  clearedBanner: { round: number; afterMs: number; upgradeText: string | null } | null = null;

  /** Seed da run: fixa por `?seed=N` só em `?debug` (design); senão o relógio (runs variadas). */
  seedForNewRun = (): number => {
    if (isDebug()) {
      const raw = new URLSearchParams(window.location.search).get('seed');
      if (raw !== null) {
        const n = Number(raw);
        if (Number.isFinite(n)) return n;
      }
    }
    return Date.now();
  };

  /** Rodada inicial da run: `?round=N` só em `?debug` (design); sem a opção, a run começa na rodada 1. */
  firstRoundForDebug(): number | undefined {
    if (!isDebug()) return undefined;
    const raw = new URLSearchParams(window.location.search).get('round');
    if (raw === null) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }

  applyRunCommand(cmd: RunCommand): void {
    // Mundo modular (ARE-09..11, TRV-03, KON-01/03): o `AreaDirector` reconstrói a área antes do tratamento de hoje; na sala é inerte.
    this.s.area.onCommand(cmd);
    switch (cmd.type) {
      case 'startRun':
        this.onStartRun();
        break;
      case 'spawn':
        // FXL-01: nenhuma onda nasce no laboratório de efeitos - só os bonecos de treino (FXL-05). `?debug&spawn=0`
        // faz o mesmo na cena comum, para os cenários que medem a vida do player sem ninguém batendo nele.
        if (this.s.fxLab || debugParam('spawn') === '0') break;
        if (cmd.kind === 'boss') this.s.spawner.spawnBoss(cmd.round);
        // SPN-07..09: comum nasce fora da câmera (worldView real, facing do player); o chefe segue no mais distante.
        else this.s.spawner.spawnFromCommand(this.s.spawner.pickEnemySpawnPoint(), cmd.round);
        break;
      case 'roundStart':
        // Volta da tela de título ou de game over: some com o texto central da rodada anterior.
        this.s.hud.setCenter(null);
        this.s.hud.banner(`Rodada ${cmd.round}`, RUN.bannerMs);
        break;
      case 'roundCleared':
        // Fica até o próximo `roundStart` (RHUD-03). Na rodada de chefe, ela entra depois de "Chefe derrotado!",
        // que o `onBossDefeated` já mostrou (BHUD-03).
        if (!isBossRound(cmd.round)) this.s.hud.banner(`Rodada ${cmd.round} concluída`, Infinity);
        // REG-05: fechar a rodada devolve uma fatia da vida.
        this.s.recovery.roundCleared();
        // CAM-08: o último inimigo da onda morreu, câmera lenta curta.
        this.s.effects.slowMo.trigger(CAMERA_FEEL.slowScale, CAMERA_FEEL.slowMs);
        break;
      case 'shopOpen':
        // SHOP-47: `?debug&noshop=1` pula a loja sem varrer nada (cenários da F1/F3 que atravessam rodadas).
        if (debugParam('noshop') === '1') this.s.run.closeShop();
        else this.s.shopDirector.openShop(cmd.round);
        break;
      case 'gameOver':
        this.s.hud.setCenter([
          `Rodada alcançada: ${cmd.round}`,
          `Abates: ${cmd.kills}`,
          `Fragmentos: ${this.s.wallet.fragments}`,
          'J / Enter para tentar de novo',
        ]);
        break;
    }
  }

  /**
   * Nova run (RUN-01/05): remove os inimigos restantes na hora e devolve o player ao spawn com a vida cheia.
   * Também remove o chefe e os projéteis dele, se algum estiver vivo (edge case: game over em plena luta de
   * chefe, com o chefe e/ou projéteis dele ainda em cena).
   */
  onStartRun(): void {
    for (const e of this.s.enemies) e.destroyNow();
    this.s.enemies = [];
    this.s.boss?.destroyNow();
    this.s.boss = null;
    this.bossDefeatedPending = false;
    this.clearedBanner = null;
    this.s.spawner.spawnLastUsed.clear();
    this.s.attackGate.reset();
    // Higiene: uma loja não deveria sobreviver a um game over (gameOver só sai de roundActive/intermission), mas
    // uma run nova nunca deve carregar a loja da anterior.
    if (this.s.shopDirector.shop) this.s.matter.world.resume();
    this.s.shopDirector.shop = null;
    this.s.shopPanel.hide();
    this.s.hud.hideBossBar();
    for (const proj of this.s.projectiles) proj.destroyNow();
    this.s.projectiles = [];
    this.s.player.resetForRun();
    this.s.recovery.reset();
    // Edge case: nova run zera o combo e a câmera lenta (estruturas zeram no reset do player e dos inimigos).
    this.s.comboCounter.reset();
    this.s.effects.slowMo.reset();
    // EDG-03, EDG-04: a leitura e o foco não sobrevivem à run anterior (a janela de Contra e o abaixar zeram no
    // `player.resetForRun`, EDG-01 e EDG-02).
    this.s.reading.reset();
    this.s.focusId = null;
    this.s.lastPlayerHp = this.s.player.hp;
    // ECO-14/27: carteira zerada e nenhum pickup/texto flutuante sobrevive à run anterior.
    this.s.wallet.reset();
    // SHOP-23: `?debug&fragments=N` (inteiro >= 0) começa a run com N fragmentos; inválido é ignorado.
    const startFragments = Number(debugParam('fragments'));
    if (debugParam('fragments') !== null && Number.isInteger(startFragments)) this.s.wallet.add(startFragments);
    this.s.pickups.clear();
    this.s.floatTexts.clear();
    // ARM-18: nenhuma ferramenta largada sobrevive à run anterior (a cadeira/garrafa do mapa não são drops).
    for (const prop of this.s.props) if (isDroppedTool(prop.def.key)) prop.destroyNow();
    this.s.props = this.s.props.filter((prop) => !prop.isGone);
    this.s.droppedTools.clear();
    // MOD-01/MOD-10: upgrades da run anterior não sobrevivem (AD-004).
    this.s.modifiers.reset();
    // CE-01/TEC-01: energia e slots voltam ao início da run; `?debug&tech=` equipa por cima (TEC-02).
    this.s.energy.reset();
    this.s.loadout.reset();
    this.s.mastery.reset();
    this.s.build.reset();
    this.equipDebugTech();
    this.applyDebugMastery();
    // ECO-17: o stream de loot nasce com a seed desta run, já criado pelo `Run.update` que despachou este comando.
    this.s.lootRng = this.s.run.lootRng!;
    this.s.loot = new Loot(this.s.lootRng, ECONOMY, this.lootOverrides(), this.s.modifiers);
    this.s.elixir = new ElixirRoll(this.s.run.elixirRng!, ELIXIR);
  }

  /**
   * `?debug&tech=<id>[,<id>]` (TEC-02): equipa em nível 1, na ordem, ignorando ids desconhecidos e o segundo id
   * quando os dois slots já couberam; sem o parâmetro, os dois slots ficam vazios (TEC-01, AD-005).
   */
  equipDebugTech(): void {
    const raw = debugParam('tech');
    if (raw === null) return;
    const ids = raw.split(',').filter((id): id is TechId => id in TECHNIQUES);
    let slot = 0;
    for (const id of ids) {
      if (slot > 1) break;
      if (this.s.loadout.equip(slot as 0 | 1, id, 1)) slot++;
    }
  }

  /** `?debug&mastery=N` (inteiro >= 0): cada técnica equipada começa a run com N pontos de maestria; inválido é ignorado. */
  applyDebugMastery(): void {
    const n = debugIntParam('mastery', 0);
    if (n === undefined) return;
    for (const slot of [0, 1] as const) if (this.s.loadout.slotsView[slot]) this.s.mastery.setPoints(slot, n);
  }

  /** Nome da técnica como a loja mostra, para os banners de nível (MST-07, BFX-10). */
  techName(id: TechId): string {
    return FULL_SHOP_CATALOG.find((e) => e.id === id)?.name ?? TECHNIQUES[id].name;
  }

  /**
   * Acerto de técnica em alvo real (MST-01..07): soma maestria ao slot e, no limiar, sobe 1 nível com o banner
   * `"{nome} Nv {n}!"`. No laboratório de efeitos (bonecos de treino) não há maestria.
   */
  onMasteryHit(slot: MasterySlot, castId: number, targetId: number, isBoss: boolean): void {
    if (this.s.fxLab) return;
    const equipped = this.s.loadout.slotsView[slot];
    if (!equipped) return;
    const { levelUp } = this.s.mastery.registerHit(slot, equipped.level, castId, targetId, isBoss);
    if (levelUp && this.s.loadout.upgrade(equipped.id)) {
      this.s.hud.banner(`${this.techName(equipped.id)} Nv ${this.s.loadout.levelOf(equipped.id)}!`, RUN.bannerMs);
    }
  }

  /**
   * Upgrade grátis da vitória sobre o chefe (BFX-09): sobe 1 nível a técnica equipada de menor nível abaixo do 3
   * (empate: slot 0). Devolve o texto do banner (BFX-10), ou `null` se nada era upável.
   */
  bossRewardUpgrade(): string | null {
    const slot = bossRewardSlot(this.s.loadout.slotsView);
    const pick = slot === null ? null : this.s.loadout.slotsView[slot];
    if (!pick || !this.s.loadout.upgrade(pick.id)) return null;
    return `${this.techName(pick.id)} Nv ${this.s.loadout.levelOf(pick.id)}!`;
  }

  /** Overrides de debug dos sorteios (HEAL-06, ARM-15, RAR-05): `heal=N`, `armed=knife|club` e `rare=1`. */
  lootOverrides(): LootOverrides {
    if (!isDebug()) return {};
    const params = new URLSearchParams(window.location.search);
    const overrides: LootOverrides = {};
    const heal = params.get('heal');
    if (heal !== null) {
      const n = Number(heal);
      if (Number.isFinite(n)) overrides.healChance = n;
    }
    const armed = params.get('armed');
    if (armed === 'knife') overrides.armed = 'cursedKnife';
    else if (armed === 'club') overrides.armed = 'cursedClub';
    const rare = params.get('rare');
    if (rare !== null) overrides.rare = rare === '1' || rare === 'true';
    return overrides;
  }

  /** Chefe por quadro (vitória pendente, barra de vida) e a faixa "Rodada N concluída" depois dele. */
  updateBoss(dt: number): void {
    this.s.boss?.update(dt, this.s.player.sprite.x);
    if (this.bossDefeatedPending) {
      this.s.boss?.destroyNow();
      this.s.boss = null;
      this.bossDefeatedPending = false;
    }
    if (this.s.boss) this.s.hud.setBossHp(this.s.boss.hp, this.s.boss.maxHp);
    if (this.clearedBanner) {
      this.clearedBanner.afterMs -= dt;
      // BFX-10: o banner do upgrade grátis ocupa o fim da faixa "Chefe derrotado!", antes de "Rodada N concluída".
      if (this.clearedBanner.upgradeText && this.clearedBanner.afterMs <= BOSS_UPGRADE_BANNER_MS) {
        this.s.hud.banner(this.clearedBanner.upgradeText, BOSS_UPGRADE_BANNER_MS);
        this.clearedBanner.upgradeText = null;
      }
      if (this.clearedBanner.afterMs <= 0) {
        if (this.s.run.state === 'intermission' || this.s.run.state === 'traverse')
          this.s.hud.banner(`Rodada ${this.clearedBanner.round} concluída`, Infinity);
        this.clearedBanner = null;
      }
    }
  }
}
