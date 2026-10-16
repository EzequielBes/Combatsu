// Expansão de Domínio (DOM-*, DDB-*, DHD-*) no mundo modular em HD, com `?debug&hd=1&area=modular&seed=1`. Cada parte
// abre a sua própria página pelo `fight-kit` (que acrescenta `seed=1`, `maxAlive=1` e `shove=0`).
import { makeKit } from './fight-kit.mjs';

const BASE = 'hd=1&area=modular';

/** Morre (tecla 3 do debug), espera o `gameOver` destravar e reinicia a cena com `R`; começa a run nova com `J`. */
async function dieAndRestart(kit) {
  await kit.tap('Digit3');
  let s = await kit.snap(0);
  for (let i = 0; i < 40 && s.run.state !== 'gameOver'; i++) s = await kit.snap(100);
  kit.assert(s.run.state === 'gameOver', `esperava gameOver: ${JSON.stringify(s.run)}`);
  await kit.snap(1200);
  await kit.tap('KeyR');
  await kit.snap(100);
  await kit.tap('KeyJ');
  s = await kit.snap(100);
  kit.assert(s.run.state === 'roundActive', `a run nova deveria começar: ${JSON.stringify(s.run)}`);
  return s;
}

/** Parte 0 (DDB-01, DDB-02, DOM-05): o Domínio do debug no snapshot, os parâmetros inválidos e o `R` da derrota. */
async function debugParams(kit) {
  let s = await kit.boot(BASE);
  kit.assert(s.domain.owned === null && s.domain.charge === 0, `sem parâmetro: ${JSON.stringify(s.domain)}`);
  kit.assert(
    s.domain.active === null && s.domain.ready === false,
    `sem Domínio nada ativo: ${JSON.stringify(s.domain)}`,
  );

  s = await kit.boot(`${BASE}&domain=santuario:2&charge=50`);
  kit.assert(
    s.domain.owned?.id === 'santuario' && s.domain.owned.level === 2 && s.domain.charge === 50,
    `domain=santuario:2&charge=50: ${JSON.stringify(s.domain)}`,
  );

  s = await kit.boot(`${BASE}&domain=xx&charge=50`);
  kit.assert(s.domain.owned === null && s.domain.charge === 0, `domain=xx ignorado: ${JSON.stringify(s.domain)}`);
  s = await kit.boot(`${BASE}&domain=santuario&charge=101`);
  kit.assert(
    s.domain.owned?.id === 'santuario' && s.domain.owned.level === 1 && s.domain.charge === 0,
    `charge=101 ignorado: ${JSON.stringify(s.domain)}`,
  );

  s = await kit.boot(`${BASE}&domain=jackpot:3&charge=50`);
  s = await dieAndRestart(kit);
  kit.assert(
    s.domain.owned?.id === 'jackpot' && s.domain.owned.level === 3 && s.domain.charge === 50 && !s.domain.active,
    `R na derrota: o Domínio do parâmetro de novo: ${JSON.stringify(s.domain)}`,
  );
}

export default async function ({ page, baseUrl, assert }) {
  const kit = makeKit({ page, baseUrl, assert });
  await debugParams(kit);
}
