/**
 * Cores do painel da loja (SHOP-24): cada valor é uma chave de `PALETTE`, nunca um número solto. Dado puro (sem
 * `phaser` como valor), testado em `tests/game/shopPanel.test.ts` contra `PALETTE_KEYS`.
 */
export const SHOP_PANEL_COLORS = {
  /** Fundo que escurece a arena atrás do painel (SHOP-01: câmera de UI). */
  bg: 'k',
  /** Fundo de cada carta. */
  cardBg: 'K',
  /** Borda de uma carta comum, sem seleção. */
  borderCommon: 'g',
  /** Borda de uma carta rara, sem seleção. */
  borderRare: 'U',
  /** Borda realçada do slot `selected` (SHOP-31), vence a cor de raridade. */
  borderSelected: 'A',
  /** Texto normal (nome, nível, prévia, custo, dica) — mesma cor do `Hud`. */
  text: 'w',
  /** Custo sem saldo suficiente (T11, feel "sem saldo"). */
  textDanger: 'r',
  /** Flash branco da carta comprada (T11). */
  flash: 'w',
} as const;

export type ShopPanelColorKey = keyof typeof SHOP_PANEL_COLORS;
