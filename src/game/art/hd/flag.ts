/*
 * Chave do spike de sprites em alta densidade (fase 1 de docs/plano-sprites-hd.md): `?hd=1` na URL liga a tela de
 * 1280x720 com zoom 2 e a folha `player-hd` (1 texel = 1 px de mundo). Sem a chave, o jogo não muda.
 * Funções puras sobre a query string, para o Vitest testar sem navegador.
 */

/** `?hd=1` na URL (com ou sem `debug`). */
export function hdEnabled(search: string): boolean {
  return new URLSearchParams(search).get('hd') === '1';
}

/** Query string da página, ou vazia fora do navegador (testes em Node). */
const currentSearch = (): string => (typeof window === 'undefined' ? '' : window.location.search);

/** `?hd=1` na página aberta (avaliado uma vez, na carga). */
export const HD_ON = hdEnabled(currentSearch());
