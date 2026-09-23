/**
 * Paleta noturna única do jogo (ART-01): toda arte (sprites, tiles, fundos, efeitos) usa só estas cores.
 * Chave = 1 caractere usado nas folhas de texto; '.' é reservado para transparente e não entra aqui.
 * Minúscula = tom base/escuro, maiúscula = tom claro da mesma família, quando houver.
 * Sem `phaser` aqui: o módulo roda nos testes em Node.
 */
export const PALETTE: Readonly<Record<string, number>> = {
  // Contornos
  k: 0x0b0d1a, // contorno quase preto azulado
  K: 0x181c33, // sombra profunda, contorno interno
  // Azul-marinho e cinza-azulado (pedra, uniforme)
  n: 0x1f2747, // marinho escuro (uniforme, pedra na sombra)
  N: 0x2f3a66, // marinho (uniforme, corpo da pedra)
  s: 0x4a5780, // cinza-azulado (pedra)
  S: 0x7584ad, // cinza-azulado claro (borda de topo, brilho)
  // Pele
  p: 0xf0c8a0, // pele clara
  P: 0xc98f6b, // pele na sombra
  q: 0x8a5641, // pele sombra profunda
  // Cabelo
  h: 0x241a29, // cabelo escuro
  H: 0x44354d, // brilho do cabelo
  // Roxo amaldiçoado (escuro -> brilho)
  v: 0x3b1d59, // roxo escuro
  u: 0x7b3fb8, // roxo
  U: 0xcf94ff, // roxo brilho
  // Destaque de golpe forte
  a: 0xd9822b, // laranja
  A: 0xffc857, // âmbar claro
  // Destaque frio
  c: 0x3fa7d6, // azul-claro
  C: 0x9ef0ff, // ciano brilho
  // Neutros claros
  w: 0xfff4e0, // branco quente
  // Madeira (cadeira)
  m: 0x5c3a21, // madeira escura
  M: 0x8f5e34, // madeira clara
  // Verde-garrafa
  g: 0x1f5c45, // verde-garrafa escuro
  G: 0x3f9c72, // verde-garrafa claro
  // Céu noturno
  e: 0x0e1326, // céu profundo (topo)
  E: 0x1a2345, // céu médio
  f: 0x2a3863, // céu perto do horizonte
  // Lua
  l: 0xece7c9, // lua
  L: 0xbab497, // crateras / sombra da lua
  // Acento quente
  r: 0xb3314f, // vermelho escuro (olho, boca, dano)
  // Cinza-arroxeado do espírito amaldiçoado: tons médio e claro, para destacar do fundo noturno escuro
  i: 0x8e7fa6, // cinza-arroxeado (corpo)
  I: 0xc4b6da, // cinza-arroxeado claro (luz de cima)
};

export const PALETTE_KEYS: ReadonlySet<string> = new Set(Object.keys(PALETTE));

/** Escala de texel (ART-03): 1 pixel de arte = 2 px de mundo, para todo sprite, tile e parte de ragdoll. */
export const ART_SCALE = 2;
