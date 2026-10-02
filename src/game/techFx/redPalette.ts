/**
 * Chaves de cor da PALETTE usadas pelo efeito do Vermelho (RDA-03, RDA-14, AD-009): carmim, magenta, vermelho vivo,
 * branco e preto — nunca `a`/`A` (laranja/âmbar). O `RedOrbFx` lê só daqui. Sem `phaser`: roda no Vitest.
 */
export const RED_FX_COLORS = {
  /** Núcleo da esfera. */
  core: 'W',
  /** Halo (glow) e flash de tela. */
  glow: 't',
  /** Anel, arcos e onda de choque. */
  ring: 'T',
  /** Borda e faíscas vivas. */
  edge: 'R',
  /** Brasas da detonação. */
  ember: ['t', 'T', 'R'],
  /** Sombra da esfera na detonação. */
  shadow: 'b',
  /** Flash de tela. */
  flash: 't',
} as const;
