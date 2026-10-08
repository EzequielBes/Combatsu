import { VOW, VOW_IDS, type VowId } from '../data/vows';
import type { Rng } from './rng';

/** Votos tomados na run (VOW-05, VOW-08): cada um no máximo uma vez; `reset` a cada run nova. */
export class Vows {
  private readonly taken = new Set<VowId>();

  has(id: VowId): boolean {
    return this.taken.has(id);
  }

  /** `false` se já tinha. */
  take(id: VowId): boolean {
    if (this.taken.has(id)) return false;
    this.taken.add(id);
    return true;
  }

  /** Na ordem do catálogo (estável para o snapshot e o sorteio). */
  get list(): VowId[] {
    return VOW_IDS.filter((id) => this.taken.has(id));
  }

  reset(): void {
    this.taken.clear();
  }
}

/**
 * Sorteio do painel (VOW-05..07): até `count` votos distintos entre os ainda não tomados, na ordem do sorteio.
 * Com menos restantes que `count`, devolve todos os restantes; sem nenhum, lista vazia. Só consome o `rng` dado.
 */
export function drawVows(rng: Rng, taken: readonly VowId[], count: number = VOW.offers): VowId[] {
  const pool = VOW_IDS.filter((id) => !taken.includes(id));
  const out: VowId[] = [];
  while (out.length < count && pool.length > 0) out.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  return out;
}

/** Tudo que os votos mudam no combate, já agregado (VOW-10..18); 1 e `false` são "sem efeito". */
export interface VowEffects {
  /** Vida máxima (Corpo de vidro). */
  maxHpMul: number;
  /** Todo dano do player, golpe e técnica (Corpo de vidro, Fúria, Pele de pedra). */
  damageMul: number;
  /** Só golpe forte (Sem guarda). */
  heavyMul: number;
  /** Só golpe corpo a corpo (Pacto do feiticeiro). */
  meleeMul: number;
  /** Só técnica (Pacto do feiticeiro). */
  techDamageMul: number;
  /** Custo de energia das técnicas (Fluxo selado). */
  techCostMul: number;
  /** Guarda e parry desligados (Sem guarda). */
  guardOff: boolean;
  /** A Reversa não cura (Fluxo selado). */
  rctOff: boolean;
  /** Cura da Reversa (Cura proibida). */
  rctHealMul: number;
  /** A Reversa só cura abaixo desta fração da vida máxima (Cura proibida); `null` sem limite. */
  rctBelow: number | null;
  /** Valor das gotas de fragmento (Ganância). */
  fragmentMul: number;
  /** Dano que o player sofre (Ganância, Pele de pedra). */
  damageTakenMul: number;
  /** Regeneração passiva desligada (Fúria). */
  regenOff: boolean;
}

/**
 * Efeitos dos votos tomados (VOW-10..18). Votos que mudam o mesmo número multiplicam (VOW-18). A Fúria soma
 * `perKill` por abate da rodada em `damageMul`, até `max` (VOW-16).
 */
export function vowEffects(taken: readonly VowId[], ctx: { kills: number }): VowEffects {
  const has = (id: VowId): boolean => taken.includes(id);
  const fx: VowEffects = {
    maxHpMul: 1,
    damageMul: 1,
    heavyMul: 1,
    meleeMul: 1,
    techDamageMul: 1,
    techCostMul: 1,
    guardOff: false,
    rctOff: false,
    rctHealMul: 1,
    rctBelow: null,
    fragmentMul: 1,
    damageTakenMul: 1,
    regenOff: false,
  };
  if (has('corpoDeVidro')) {
    fx.maxHpMul *= VOW.corpoDeVidro.maxHpMul;
    fx.damageMul *= VOW.corpoDeVidro.damageMul;
  }
  if (has('semGuarda')) {
    fx.guardOff = true;
    fx.heavyMul *= VOW.semGuarda.heavyMul;
  }
  if (has('pactoDoFeiticeiro')) {
    fx.meleeMul *= VOW.pactoDoFeiticeiro.meleeMul;
    fx.techDamageMul *= VOW.pactoDoFeiticeiro.techDamageMul;
  }
  if (has('fluxoSelado')) {
    fx.techCostMul *= VOW.fluxoSelado.techCostMul;
    fx.rctOff = true;
  }
  if (has('curaProibida')) {
    fx.rctHealMul *= VOW.curaProibida.rctHealMul;
    fx.rctBelow = VOW.curaProibida.rctBelow;
  }
  if (has('ganancia')) {
    fx.fragmentMul *= VOW.ganancia.fragmentMul;
    fx.damageTakenMul *= VOW.ganancia.damageTakenMul;
  }
  if (has('furia')) {
    fx.damageMul *= 1 + Math.min(VOW.furia.max, VOW.furia.perKill * Math.max(0, ctx.kills));
    fx.regenOff = true;
  }
  if (has('peleDePedra')) {
    fx.damageTakenMul *= VOW.peleDePedra.damageTakenMul;
    fx.damageMul *= VOW.peleDePedra.damageMul;
  }
  return fx;
}
