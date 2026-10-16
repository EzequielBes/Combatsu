import type { AxisItem, BodyAxisId, BodyBranchId, RedAxisId, RedBranchId } from '../data/techAxes';

/** Campos do snapshot de debug dos itens com eixo da F30, fora do `debugApi.ts` para ele não crescer. */

/**
 * O Vermelho no snapshot (VRM-10): nível, pontos por eixo, ramo e Despertar, mais os números resolvidos que o smoke
 * `red-axes` confere (custo, recarga, tempos, raio e os dois danos).
 */
export interface RedBuildSnapshot {
  level: number;
  axes: Record<RedAxisId, number>;
  branch: RedBranchId | null;
  awakened: boolean;
  stats: {
    cost: number;
    cooldownMs: number;
    signMs: number;
    chargeMs: number;
    radius: number;
    touch: number;
    detonation: number;
  };
}

/** O Corpo Amaldiçoado no snapshot (CRP-14); a Fúria e a Cadência ficam zeradas até o diretor do Corpo. */
export interface BodyBuildSnapshot {
  level: number;
  axes: Record<BodyAxisId, number>;
  branch: BodyBranchId | null;
  awakened: boolean;
  fury: { stacks: number; bonus: number };
  cadence: number;
  /** Meia largura desenhada da aura da Fúria (CRP-07.11); 0 com ela apagada. */
  aura: number;
}

/** Campo `choice` do snapshot (CRD-09): o painel do ramo aberto ou fechado e a página que ele mostra. */
export interface ChoiceSnapshot {
  open: boolean;
  page: ChoicePage | null;
}

/** Campo `build` do snapshot: build deduzida, pontos por linha, passivas (BLD-*) e os dois itens com eixo. */
export interface BuildSnapshot {
  build: string | null;
  points: Record<string, number>;
  perks: string[];
  shadowArmed: boolean;
  /** `null` sem o Vermelho equipado. */
  vermelho: RedBuildSnapshot | null;
  corpo: BodyBuildSnapshot;
}

/** Uma página do painel de ramo (CRD-08): o item e o texto das duas opções, na ordem `a`/`b`. */
export interface ChoicePage {
  item: AxisItem;
  options: [string, string];
}
