import type { TechId } from '../../data/techniques';
import type { TechTarget } from '../../game/TechRunner';
import type { TestScene } from '../TestScene';

/** Técnicas por quadro: conjuração, execução, energia, recarga, aura, chamada e zoom da conjuração. */
export class TechDirector {
  constructor(readonly s: TestScene) {}

  /** Parte técnica do `update` da cena (fora de hitstop e da loja), na ordem original. */
  update(dt: number): void {
    this.s.techCaster.update(dt);
    // FXL-02/KOK-03: a tecla 3 arma o Kokusen sem timing manual - injeta a "tecla apertada de novo" no exato
    // frame em que a janela abre (o `windowOpen` já reflete o começo deste frame, antes do `techRunner.update`).
    if (this.s.fxLab?.consumeKokusenAutoPress(this.s.techRunner.kokusenSnapshot.windowOpen))
      this.s.techCaster.forcePress(0);
    this.s.snapshot.debugEvents.push(...this.s.techCaster.events);
    // T28: no laboratório, o Vermelho/Azul/Desmantelar também miram os bonecos de treino, não só os inimigos.
    const techTargets: readonly TechTarget[] = this.s.fxLab
      ? [...this.s.enemies, ...this.s.fxLab.dummies]
      : this.s.enemies;
    // T22+: executa a técnica a partir do estado de conjuração, dos eventos deste frame e do slot apertado (Kokusen).
    this.s.techRunner.update(
      dt,
      this.s.techCaster.cast,
      this.s.techCaster.events,
      this.s.techCaster.slotPressed,
      techTargets,
      this.s.boss,
    );
    this.s.snapshot.debugEvents.push(...this.s.techRunner.events);
    // TEC-10: a barra pisca quando uma conjuração é recusada por falta de energia.
    if (this.s.techCaster.events.includes('techDenied:energy')) this.s.energyHud.flashDenied();
    // TSH-10/11: níveis de `energia`/`fluxo` lidos na hora, sem cache (mesmo padrão de `modifiers.runSpeed`).
    this.s.energy.setLevels(this.s.modifiers.level('energia'), this.s.modifiers.level('fluxo'));
    this.s.loadout.tick(dt);
    // CE-04/05: sem regen enquanto há uma conjuração em andamento.
    this.s.energy.update(dt, this.s.techCaster.cast !== null);
    // FXL-07/09: no laboratório a energia fica sempre no teto e a recarga do slot 0 sempre zerada - nenhuma
    // técnica de teste gasta ou deixa recarga pendente, mesmo enquanto uma conjuração está no meio do caminho.
    if (this.s.fxLab) {
      this.s.energy.gain(this.s.energy.max);
      this.s.loadout.clearCooldown(0);
      this.s.loadout.clearCooldown(1);
    }
    this.s.fxLab?.update(dt);
    // CAST-14: aura por técnica em sign/charge, sobre o player; tecla 1 do fxlab mostra só a aura. Ela fica presa
    // ao sprite (posição de desenho), não ao corpo: senão anda meio passo à frente dele ao correr (ITP-10).
    const drawn = this.s.player.renderPos;
    this.s.aura.update(dt, this.s.techCaster.cast ?? this.s.fxLab?.auraDemoCast() ?? null, drawn.x, drawn.y);
    // KOK-27: aura preta com faíscas vermelhas no player enquanto a zona do Kokusen está ativa.
    this.s.kokusenFx.zoneAura(
      dt,
      this.s.techRunner.kokusenSnapshot.zone,
      this.s.player.sprite.x,
      this.s.player.sprite.y,
    );
    // CAST-16: a chamada aparece exatamente no frame em que a soltura começa (`techCast:<id>`).
    for (const ev of this.s.techCaster.events) {
      if (ev.startsWith('techCast:')) this.s.callout.show(ev.slice('techCast:'.length) as TechId);
    }
    this.s.callout.update(dt);
    this.s.camera.updateCastZoom();
  }
}
