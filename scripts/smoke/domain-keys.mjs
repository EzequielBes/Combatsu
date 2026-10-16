// Parte 2 do `domain.smoke.mjs`, tecla (DOM-03, DOM-06, DOM-07, DOM-10, DOM-11): `P`/`N`, as quatro recusas, o golpe
// cortado, o fim pelo tempo, a loja e o esvaziamento no jogo. Não é um cenário (o runner só roda `*.smoke.mjs`). Lê
// `domain.*`, `player.move`, `run.state`, `hitstop` e os eventos `domain:<id>`, `domainDenied:<motivo>` e
// `domainEnd:<id>` do snapshot vivo. `spawn=0` deixa a rodada sem inimigos quando o cenário só mede a tecla e o tempo.

const FRAME_MS = 1000 / 60;
const domainEvents = (events) => events.filter((e) => /^domain(Denied|End)?:/.test(e));

/** Aperta as teclas juntas por um quadro; devolve o snapshot desse quadro e os eventos do Domínio dele. */
async function press(kit, ...codes) {
  const before = await kit.snap(0);
  for (const c of codes) await kit.down(c);
  const s = await kit.frame();
  for (const c of codes) await kit.up(c);
  return { s, before, events: domainEvents(s.events.slice(before.events.length)) };
}

/** Uma recusa: um evento só, o motivo esperado e a carga igual (DOM-07). */
function assertDenied(kit, r, reason) {
  kit.assert(
    JSON.stringify(r.events) === JSON.stringify([`domainDenied:${reason}`]),
    `esperava só domainDenied:${reason}: ${JSON.stringify(r.events)}`,
  );
  kit.assert(
    r.s.domain.charge === r.before.domain.charge,
    `a recusa ${reason} não muda a carga: ${r.before.domain.charge} → ${r.s.domain.charge}`,
  );
}

/** `P` e `N` ativam; o segundo `P` recusa `active`; sem carga, `charge`; sem Domínio, `none`; conjurando, `busy`. */
async function keysAndDenials(kit, base) {
  await kit.boot(`${base}&domain=santuario&charge=100&spawn=0`);
  let r = await press(kit, 'KeyP');
  kit.assert(
    JSON.stringify(r.events) === JSON.stringify(['domain:santuario']) && r.s.domain.charge === 0,
    `P deveria ativar o Santuário e zerar a carga: ${JSON.stringify({ ev: r.events, d: r.s.domain })}`,
  );
  kit.assert(r.s.domain.active?.id === 'santuario', `Domínio ativo: ${JSON.stringify(r.s.domain.active)}`);
  await kit.frame();
  assertDenied(kit, await press(kit, 'KeyP'), 'active');

  await kit.boot(`${base}&domain=santuario&charge=100&spawn=0`);
  r = await press(kit, 'KeyN');
  kit.assert(JSON.stringify(r.events) === JSON.stringify(['domain:santuario']), `N também ativa: ${r.events}`);

  await kit.boot(`${base}&domain=santuario&spawn=0`);
  assertDenied(kit, await press(kit, 'KeyP'), 'charge');
  await kit.boot(`${base}&spawn=0`);
  assertDenied(kit, await press(kit, 'KeyP'), 'none');

  await kit.boot(`${base}&domain=santuario&charge=100&spawn=0&tech=corte`);
  const cast = await press(kit, 'KeyL');
  kit.assert(cast.s.tech.cast !== null, `o Corte deveria começar: ${JSON.stringify(cast.s.tech)}`);
  assertDenied(kit, await press(kit, 'KeyP'), 'busy');

  // P e N no mesmo quadro: uma tentativa só (sem o `domainDenied:active` da segunda).
  await kit.boot(`${base}&domain=santuario&charge=100&spawn=0`);
  r = await press(kit, 'KeyP', 'KeyN');
  kit.assert(JSON.stringify(r.events) === JSON.stringify(['domain:santuario']), `P+N: uma tentativa: ${r.events}`);
}

/** `P` no meio do `jab` termina o golpe na hora (DOM-07.4); o Domínio acaba pelo tempo em 6000 ms de jogo (DOM-10). */
async function cancelAndTimer(kit, base) {
  await kit.boot(`${base}&domain=santuario&charge=100&spawn=0`);
  await press(kit, 'KeyJ');
  const mid = await kit.frame();
  kit.assert(mid.player.move === 'jab', `o jab deveria estar em curso: ${mid.player.move}`);
  const r = await press(kit, 'KeyP');
  kit.assert(
    r.events.includes('domain:santuario') && r.s.player.move === null,
    `P no meio do jab: ativa e termina o golpe: ${JSON.stringify({ ev: r.events, move: r.s.player.move })}`,
  );
  const startMs = r.s.domain.active.remainingMs;
  kit.assert(startMs > 6000 - 2 * FRAME_MS && startMs <= 6000, `começa com ~6000 ms: ${startMs}`);
  let s = r.s;
  let gameFrames = 0;
  for (let f = 0; f < 600 && !s.events.slice(r.before.events.length).includes('domainEnd:santuario'); f++) {
    s = await kit.frame();
    if (!s.hitstop.frozen) gameFrames++;
  }
  kit.assert(s.events.includes('domainEnd:santuario'), 'o Domínio deveria acabar pelo tempo');
  const ms = (gameFrames + 1) * FRAME_MS;
  kit.assert(Math.abs(ms - 6000) <= 2 * FRAME_MS, `fim pelo tempo em ~6000 ms de jogo: ${ms.toFixed(0)}`);
  kit.assert(s.domain.active === null, `sem Domínio ativo depois do fim: ${JSON.stringify(s.domain.active)}`);
}

/** Vence a rodada (tecla 2 do debug) e anda até a konbini; devolve o snapshot com a loja aberta. */
async function reachShop(kit) {
  let s = await kit.snap(0);
  for (let i = 0; i < 400 && s.run.state === 'roundActive'; i++) {
    await kit.tap('Digit2', 20);
    s = await kit.snap(60);
  }
  for (let i = 0; i < 200 && s.run.state !== 'traverse' && s.run.state !== 'shop'; i++) s = await kit.snap(50);
  await kit.down('KeyD');
  for (let i = 0; i < 600 && s.run.state !== 'shop'; i++) s = await kit.snap(50);
  await kit.up('KeyD');
  kit.assert(s.run.state === 'shop', `a konbini deveria abrir: ${JSON.stringify(s.run)}`);
  for (let i = 0; i < 40 && s.area.transitioning; i++) s = await kit.snap(50);
  return s;
}

/** Da konbini aberta até o 3º quadro da rodada seguinte (com `Enter`); devolve os eventos do Domínio da janela. */
async function leaveShop(kit, shop) {
  let s = await kit.tap('Enter');
  for (let i = 0; i < 200 && s.run.state !== 'roundActive'; i++) s = await kit.frame();
  kit.assert(s.run.state === 'roundActive', `a rodada seguinte deveria começar: ${JSON.stringify(s.run)}`);
  for (let f = 0; f < 3; f++) s = await kit.frame();
  return { s, ev: domainEvents(s.events.slice(shop.events.length)) };
}

/**
 * `P` apertado na konbini não dá evento nenhum, nem no 1º quadro da rodada seguinte (DOM-06.2).
 * SPEC_DEVIATION: a T8 pede o `P` apertado e solto, com o smoke falhando sem o consumo no `ShopInput`; mas o
 * `Key.onUp` do Phaser já apaga a borda do `JustDown` ao soltar, então apertar e soltar nunca vaza. A borda só vaza com o
 * `P` ainda segurado quando a loja fecha: esse é o caso que falha sem o consumo (conferido com o consumo desligado).
 */
async function shopPress(kit, base) {
  await kit.boot(`${base}&domain=santuario&charge=100&maxAlive=3`);
  let shop = await reachShop(kit);
  await kit.tap('KeyP');
  let out = await leaveShop(kit, shop);
  kit.assert(out.ev.length === 0, `P apertado e solto na konbini não dá evento: ${JSON.stringify(out.ev)}`);
  kit.assert(out.s.domain.charge === 100 && !out.s.domain.active, `carga cheia: ${JSON.stringify(out.s.domain)}`);

  // Na sala de teste a loja fecha direto na rodada, sem o fade da konbini (no mundo modular o fade lê o input e o
  // descarta, e a borda nunca chegaria ao jogo): é aqui que a borda segurada vazaria sem o consumo do `ShopInput`.
  await kit.boot(`${base.replace('area=modular', 'area=sala')}&domain=santuario&charge=100&maxAlive=3`);
  shop = await reachShop(kit);
  await kit.down('KeyP');
  await kit.snap(50);
  out = await leaveShop(kit, shop);
  await kit.up('KeyP');
  kit.assert(out.ev.length === 0, `P segurado ao sair da konbini não dá evento: ${JSON.stringify(out.ev)}`);
}

/** `charge=50` parado em `roundActive`: 7,8 s depois ainda 50; passando de 8 s, 40 (DOM-03). */
async function drainInGame(kit, base) {
  await kit.boot(`${base}&domain=santuario&charge=50&spawn=0`);
  let s = await kit.snap(7800);
  kit.assert(s.domain.charge === 50, `antes de 8 s a carga não muda: ${s.domain.charge}`);
  s = await kit.snap(400);
  kit.assert(s.run.state === 'roundActive', `a rodada segue: ${s.run.state}`);
  kit.assert(s.domain.charge === 40, `depois de 8 s sem carga cai para 40: ${s.domain.charge}`);
}

export async function domainKeys(kit, base) {
  await keysAndDenials(kit, base);
  await cancelAndTimer(kit, base);
  await shopPress(kit, base);
  await drainInGame(kit, base);
}
