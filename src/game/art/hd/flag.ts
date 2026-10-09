/*
 * Chave dos sprites em alta densidade (docs/plano-sprites-hd.md): o jogo abre em HD, com a tela de 1280x720, zoom 2
 * e a folha `player-hd` (1 texel = 1 px de mundo). `?hd=0` na URL volta à versão antiga, que só existe para os
 * cenários de smoke que ainda medem a geometria dela.
 * Funções puras sobre a query string, para o Vitest testar sem navegador.
 */

/** HD ligado: sempre, menos com `?hd=0` na URL (com ou sem `debug`). */
export function hdEnabled(search: string): boolean {
  return new URLSearchParams(search).get('hd') !== '0';
}

/** Query string da página, ou vazia fora do navegador (testes em Node). */
const currentSearch = (): string => (typeof window === 'undefined' ? '' : window.location.search);

/**
 * HD na página aberta (avaliado uma vez, na carga). Fora do navegador (Vitest em Node) fica desligado: os testes
 * unitários da arte antiga leem constantes que dependem desta chave, e os da arte HD não passam por ela.
 */
export const HD_ON = typeof window !== 'undefined' && hdEnabled(currentSearch());

/** Protagonista novo (folha `player-yuta`) ligado: sempre que o HD está, menos com `?yuta=0` na URL. */
export function yutaEnabled(search: string): boolean {
  return hdEnabled(search) && new URLSearchParams(search).get('yuta') !== '0';
}

/** Protagonista novo na página aberta (avaliado uma vez, na carga); desligado fora do navegador, como o `HD_ON`. */
export const YUTA_ON = typeof window !== 'undefined' && yutaEnabled(currentSearch());
