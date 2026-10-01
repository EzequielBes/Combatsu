import { UPPERCUT_JUMP_CANCEL_MS } from '../data/moves';

/** Apertos de golpe lidos no frame (JustDown já resolvido por quem chama). */
export interface StrikePresses {
  lightPressed: boolean;
  heavyPressed: boolean;
  bothPressed: boolean;
}

/**
 * Leve (`J`/`X`), forte (`K`/`Z`) e os dois no mesmo frame (CTL-01, CTL-02, CTL-04): quando os dois botões
 * chegam juntos, sai UM `both` e nenhum leve nem forte separado.
 */
export function combineStrikePresses(light: boolean, heavy: boolean): StrikePresses {
  const both = light && heavy;
  return { lightPressed: light && !both, heavyPressed: heavy && !both, bothPressed: both };
}

/**
 * AD-011: `W` é pulo e "cima" ao mesmo tempo. `wJumpAgeMs` = tempo desde que o pulo iniciado com `W` saiu do chão
 * (`null` se o pulo não veio de `W`, ex.: `Space`/`↑`, ou se não há pulo). O `J` dentro da janela (100 ms, inclusive)
 * cancela o pulo e sai o `ganchoAscendente`; depois dela vira `socoAereo`.
 */
export function shouldCancelJumpForUppercut(wJumpAgeMs: number | null): boolean {
  return wJumpAgeMs !== null && wJumpAgeMs >= 0 && wJumpAgeMs <= UPPERCUT_JUMP_CANCEL_MS;
}
