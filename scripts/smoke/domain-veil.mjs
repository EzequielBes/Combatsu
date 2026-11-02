// Parte 3 do `domain.smoke.mjs` (VEU-01, VEU-04): a pendência do Baú do Véu no fim da r3. Não é um cenário (o runner
// só roda `*.smoke.mjs`). Lê `domain.*` e `run` do snapshot vivo.

/** Golpe forte de teste (tecla 2) em todos até a rodada acabar; devolve o snapshot na travessia. */
async function clearRound(kit) {
  let s = await kit.snap(0);
  for (let i = 0; i < 400 && s.run.state === 'roundActive'; i++) {
    await kit.tap('Digit2', 20);
    s = await kit.snap(60);
  }
  for (let i = 0; i < 200 && s.run.state !== 'traverse'; i++) s = await kit.snap(50);
  kit.assert(s.run.state === 'traverse', `a rodada deveria acabar na travessia: ${JSON.stringify(s.run)}`);
  return s;
}

/** Anda para a direita até `stop(s)`; devolve o snapshot. */
async function walkUntil(kit, stop, what) {
  let s = await kit.snap(0);
  await kit.down('KeyD');
  for (let i = 0; i < 900 && !stop(s); i++) s = await kit.snap(50);
  await kit.up('KeyD');
  kit.assert(stop(s), `esperava ${what}: ${JSON.stringify(s.run)}`);
  return s;
}

/**
 * Pendência (VEU-01, VEU-04): com `noshop=1`, limpar a r3 marca o Baú do Véu e ele segue marcado na r4; com o Domínio
 * já possuído não marca; o `R` com a pendência começa a run sem ela.
 */
export async function veilPending(kit, base) {
  let s = await kit.boot(`${base}&round=3&noshop=1`);
  kit.assert(!s.domain.veilPending, `antes da r3 limpa, sem pendência: ${JSON.stringify(s.domain)}`);
  s = await clearRound(kit);
  kit.assert(s.domain.veilPending && s.domain.owned === null, `r3 limpa marca o véu: ${JSON.stringify(s.domain)}`);
  s = await walkUntil(kit, (x) => x.run.round === 4 && x.run.state === 'roundActive', 'a r4');
  kit.assert(s.domain.veilPending, `a pendência segue na r4 (VEU-04.6): ${JSON.stringify(s.domain)}`);

  await kit.tap('KeyR');
  await kit.snap(100);
  await kit.tap('KeyJ');
  s = await kit.snap(100);
  kit.assert(s.run.state === 'roundActive', `a run nova deveria começar: ${JSON.stringify(s.run)}`);
  kit.assert(!s.domain.veilPending, `R com a pendência começa sem ela (VEU-04.8): ${JSON.stringify(s.domain)}`);

  await kit.boot(`${base}&round=3&noshop=1&domain=santuario`);
  s = await clearRound(kit);
  kit.assert(!s.domain.veilPending, `com Domínio a r3 limpa não marca (VEU-04.7): ${JSON.stringify(s.domain)}`);
}
