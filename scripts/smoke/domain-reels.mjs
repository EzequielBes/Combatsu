// Parte 5 do `domain.smoke.mjs`, vista do Jackpot (JAC-06, JAC-03.5): os tambores na `uiLayer` lidos dos `Text` vivos
// (L-076): o texto `Riichi NN%` igual à chance do snapshot no giro, três faces iguais no `jackpot:hit` e pelo menos uma
// diferente no `jackpot:miss`, "GARANTIDO" com a piedade armada, e os tambores somem no fim do Domínio. Não é um
// cenário (o runner só roda `*.smoke.mjs`). Lê `domainFx.reels`, `domain.jackpot`, `domain.active` e os eventos
// `domain:jackpot`, `jackpot:hit`, `jackpot:miss` e `domainEnd:jackpot`.

/** Seed cujo 1º sorteio do `domainRng` dá jackpot; a seed 1 do `fight-kit` dá falha (ver `domain-jackpot.mjs`). */
const HIT_SEED = 4;

const fresh = (s, from) => s.events.slice(from.events.length);

/** Ativa o Jackpot (sem inimigos) e passa o giro conferindo o texto vivo a cada quadro; devolve o quadro da parada. */
async function spinAndStop(kit, query, check) {
  await kit.boot(query);
  let before = await kit.settle();
  for (let f = 0; f < 30 && before.hitstop.frozen; f++) before = await kit.frame();
  await kit.down('KeyP');
  let s = await kit.frame();
  await kit.up('KeyP');
  kit.assert(fresh(s, before).includes('domain:jackpot'), `a ativação do Jackpot: ${JSON.stringify(s.domain)}`);
  const seen = new Set();
  for (let f = 0; f < 240; f++) {
    const ev = fresh(s, before);
    if (ev.includes('jackpot:hit') || ev.includes('jackpot:miss')) break;
    const r = s.domainFx.reels;
    kit.assert(r?.spinning === true, `os tambores giram: ${JSON.stringify(s.domainFx)}`);
    check(s, r);
    seen.add(r.faces.join(''));
    s = await kit.frame();
  }
  kit.assert(seen.size > 1, `no giro o símbolo troca com o relógio: ${JSON.stringify([...seen])}`);
  const ev = fresh(s, before);
  const result = ev.includes('jackpot:hit') ? 'hit' : ev.includes('jackpot:miss') ? 'miss' : null;
  kit.assert(result !== null, `os tambores deveriam parar: ${JSON.stringify(ev)}`);
  kit.assert(s.domainFx.reels?.spinning === false, `parados na parada: ${JSON.stringify(s.domainFx.reels)}`);
  return { s, result, before };
}

/** Passa o efeito até o fim do Domínio e confere que os tambores somem. */
async function untilGone(kit, s, before) {
  for (let f = 0; f < 600 && s.domain.active; f++) s = await kit.frame();
  kit.assert(fresh(s, before).includes('domainEnd:jackpot'), 'o Domínio acaba pelo tempo');
  kit.assert(s.domainFx.reels === null, `os tambores somem no fim: ${JSON.stringify(s.domainFx)}`);
}

const sameChance = (kit) => (s, r) =>
  kit.assert(
    r.chance === s.domain.jackpot.chance && r.label === `Riichi ${Math.round(s.domain.jackpot.chance * 100)}%`,
    `o texto do giro mostra a chance do snapshot: ${JSON.stringify({ r, j: s.domain.jackpot })}`,
  );

/** Jackpot (seed 4): o texto mostra a chance do snapshot; na parada, três faces iguais; no fim, somem. */
async function hitReels(kit, base) {
  const q = `${base}&domain=jackpot&charge=100&spawn=0&seed=${HIT_SEED}`;
  const { s, result, before } = await spinAndStop(kit, q, sameChance(kit));
  kit.assert(result === 'hit', `a seed ${HIT_SEED} deixou de dar jackpot no 1º sorteio do domainRng`);
  const faces = s.domainFx.reels.faces;
  kit.assert(new Set(faces).size === 1, `três faces iguais no jackpot: ${JSON.stringify(faces)}`);
  await untilGone(kit, s, before);
}

/** Falha com 1 falha seguida (seed 1): o texto mostra a chance; na parada, pelo menos uma face diferente. */
async function missReels(kit, base) {
  const q = `${base}&domain=jackpot&charge=100&spawn=0&jackpotMisses=1`;
  const { s, result, before } = await spinAndStop(kit, q, (snap, r) => {
    sameChance(kit)(snap, r);
    kit.assert(!snap.domain.jackpot.guaranteed, `com 1 falha não é garantido: ${JSON.stringify(snap.domain.jackpot)}`);
  });
  kit.assert(result === 'miss', 'a seed 1 deixou de dar falha no 1º sorteio do domainRng');
  const faces = s.domainFx.reels.faces;
  kit.assert(new Set(faces).size > 1, `pelo menos uma face diferente na falha: ${JSON.stringify(faces)}`);
  await untilGone(kit, s, before);
}

/** Piedade (JAC-06.11, JAC-03.5): com 2 falhas o texto é "GARANTIDO", o snapshot dá chance 1 e a parada é jackpot. */
async function pityReels(kit, base) {
  const q = `${base}&domain=jackpot&charge=100&spawn=0&jackpotMisses=2`;
  const { s, result } = await spinAndStop(kit, q, (snap, r) => {
    const view = JSON.stringify({ r, j: snap.domain.jackpot });
    kit.assert(r.label === 'GARANTIDO' && r.chance === 1, `o texto do giro é GARANTIDO: ${view}`);
    kit.assert(snap.domain.jackpot.guaranteed && snap.domain.jackpot.chance === 1, `snapshot garantido: ${view}`);
  });
  kit.assert(result === 'hit', `a piedade dá jackpot (seed 1 daria falha): ${JSON.stringify(s.domain.jackpot)}`);
  kit.assert(new Set(s.domainFx.reels.faces).size === 1, `três iguais: ${JSON.stringify(s.domainFx.reels)}`);
  kit.assert(s.domain.jackpot.misses === 0, `o jackpot zera as falhas: ${JSON.stringify(s.domain.jackpot)}`);
}

export async function jackpotReels(kit, base) {
  await hitReels(kit, base);
  await missReels(kit, base);
  await pityReels(kit, base);
}
