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
