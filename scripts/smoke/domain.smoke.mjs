// Expansão de Domínio (DOM-*, DDB-*, DHD-*) no mundo modular em HD, com `?debug&hd=1&area=modular&seed=1`. Cada parte
// abre a sua própria página pelo `fight-kit` (que acrescenta `seed=1`, `maxAlive=1` e `shove=0`).
import { domainBar } from './domain-bar.mjs';
import { chargeFromStrikes } from './domain-charge.mjs';
import { domainEnds } from './domain-ends.mjs';
import { domainKeys } from './domain-keys.mjs';
import { activationStrike } from './domain-strike.mjs';
import { chargeFromTechniques } from './domain-tech.mjs';
import { veilPending } from './domain-veil.mjs';
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

  // A run velha esvazia para 40 (8 s sem carga, DOM-03); a nova volta aos 50 do parâmetro.
  s = await kit.boot(`${BASE}&domain=jackpot:3&charge=50&spawn=0`);
  s = await kit.snap(8200);
  kit.assert(s.domain.charge === 40, `a run velha deveria esvaziar para 40: ${s.domain.charge}`);
  s = await dieAndRestart(kit);
  kit.assert(
    s.domain.owned?.id === 'jackpot' && s.domain.owned.level === 3 && s.domain.charge === 50 && !s.domain.active,
    `R na derrota: o Domínio do parâmetro de novo: ${JSON.stringify(s.domain)}`,
  );
}

export default async function ({ page, baseUrl, assert }) {
  const kit = makeKit({ page, baseUrl, assert });
  await debugParams(kit);
  await chargeFromStrikes(kit, BASE);
  await chargeFromTechniques(kit, BASE);
  await domainBar(kit, BASE);
  await domainKeys(kit, BASE);
  await activationStrike(kit, BASE);
  await domainEnds(kit, BASE);
  await veilPending(kit, BASE);
}
