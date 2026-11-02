// Parte 3 do `domain.smoke.mjs` (VEU-01 a VEU-04): a pendência do Baú do Véu no fim da r3 e a página dele na konbini.
// Não é um cenário (o runner só roda `*.smoke.mjs`). Lê `domain.*`, `choice`, `run`, `wallet`, `vows`, `hud.domainBar`
// e os eventos `veil:<id>`, `buy:*` e `domain:<id>` do snapshot vivo.

const fresh = (s, from) => s.events.slice(from.events.length);

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

/** Da travessia até a konbini aberta, com o fade de entrada acabado e o painel de votos (se abriu) recusado. */
async function reachKonbini(kit) {
  let s = await walkUntil(kit, (x) => x.run.state === 'shop', 'a konbini');
  for (let i = 0; i < 40 && s.area.transitioning; i++) s = await kit.snap(50);
  if (s.vows.panelCards > 0) s = await kit.tap('Enter');
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

/** Boota na r3, limpa e entra na konbini; devolve o snapshot com a página do véu aberta. */
async function openVeilPage(kit, base) {
  await kit.boot(`${base}&round=3&fragments=200`);
  await clearRound(kit);
  const s = await reachKonbini(kit);
  kit.assert(s.run.state === 'shop' && s.choice.open, `a konbini abre o painel: ${JSON.stringify(s.choice)}`);
  return s;
}

/**
 * A página `veu` na konbini (VEU-02, VEU-03): 2 Domínios diferentes, o mesmo par na mesma seed, as teclas da loja não
 * compram antes do `Enter`; `D` e `Enter` dão `veil:<id>`, o Domínio no Nv 1 com a carga cheia e a barra piscando; o 1º
 * `P` da r4 ativa.
 */
export async function veilPage(kit, base) {
  let s = await openVeilPage(kit, base);
  const page = s.choice.page;
  kit.assert(page.item === 'veu', `a página é a do véu: ${JSON.stringify(page)}`);
  const [a, b] = page.options;
  kit.assert(a !== b && page.lines?.length === 2, `2 opções diferentes, com linha de efeito: ${JSON.stringify(page)}`);

  // As teclas da loja não compram nada com a página aberta (VEU-03.5).
  const before = s;
  for (const key of ['Digit1', 'Digit2', 'Digit3']) s = await kit.tap(key);
  const bought = fresh(s, before).filter((e) => e.startsWith('buy'));
  kit.assert(bought.length === 0, `a loja não compra antes do Enter: ${JSON.stringify(bought)}`);
  kit.assert(s.wallet.fragments === before.wallet.fragments, `carteira igual: ${s.wallet.fragments}`);
  kit.assert(s.choice.open && s.choice.page.item === 'veu', `a página segue aberta: ${JSON.stringify(s.choice)}`);

  await kit.tap('KeyD');
  s = await kit.tap('Enter');
  const id = s.events.find((e) => e.startsWith('veil:'))?.slice('veil:'.length);
  kit.assert(id !== undefined && s.choice.page?.item !== 'veu', `Enter dá veil:<id>: ${JSON.stringify(s.events)}`);
  const d = s.domain;
  kit.assert(
    d.owned?.level === 1 && d.charge === 100 && d.ready && !d.veilPending,
    `Domínio no Nv 1 com a carga cheia (VEU-03): ${JSON.stringify(d)}`,
  );
  kit.assert(
    s.hud.domainBar.visible && s.hud.domainBar.blinking,
    `a barra aparece piscando: ${JSON.stringify(s.hud.domainBar)}`,
  );

  // O 1º `P` da r4 ativa o Domínio do baú.
  const shop = await kit.tap('Enter');
  s = shop;
  for (let i = 0; i < 200 && s.run.state !== 'roundActive'; i++) s = await kit.frame();
  // A tecla só chega ao jogo fora do fade da área nova (o input é neutro na transição).
  for (let i = 0; i < 120 && (s.area.transitioning || s.hitstop.frozen); i++) s = await kit.frame();
  for (let f = 0; f < 3; f++) s = await kit.frame();
  const ready = s;
  await kit.down('KeyP');
  s = await kit.frame();
  await kit.up('KeyP');
  kit.assert(fresh(s, ready).includes(`domain:${id}`), `o 1º P da r4 dá domain:${id}: ${JSON.stringify(s.events)}`);

  // A mesma seed mostra o mesmo par (VEU-02.3).
  const again = await openVeilPage(kit, base);
  kit.assert(
    JSON.stringify(again.choice.page.options) === JSON.stringify(page.options),
    `a mesma seed dá o mesmo par: ${JSON.stringify(page.options)} / ${JSON.stringify(again.choice.page.options)}`,
  );
  return id;
}
