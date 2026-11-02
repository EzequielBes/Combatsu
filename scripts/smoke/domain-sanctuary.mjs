// Parte 4 do `domain.smoke.mjs`, Santuário Malevolente (SAN-01 a SAN-04): cada golpe do moveset e cada conjuração que
// acertam soltam um gatilho (no máximo 4 por segundo de jogo), e cada gatilho corta os alvos mais perto com um acerto
// `micro` de `round(6 × hpMul)`, sem `hitstun`, sem carga, maestria ou energia. Não é um cenário (o runner só roda
// `*.smoke.mjs`). Lê `domain`, `enemies[]`, `player`, `ce`, `tech.slots`, `hitstop`, `damageNumbers.last`, `fx.live`,
// `difficulty.hpMul` e os eventos `domain:<id>`, `domainCut:<id>`, `impact:<nível>` e `fistWave:<id>:<dano>`.
import { REGEN_PER_FRAME } from './cursed-body-fury.mjs';

const FRAME_MS = 1000 / 60;
/** Folga em px na ordem por distância: o snapshot dá o centro arredondado e o corpo anda no quadro do corte. */
const DIST_SLACK = 12;

export const alive = (s) => s.enemies.filter((e) => e.hp > 0 && e.state !== 'deadRagdoll' && e.state !== 'dissolving');
const dist = (s, e) => Math.hypot(e.x - s.player.x, e.y - s.player.y);
const cutIds = (events) => events.filter((e) => e.startsWith('domainCut:')).map((e) => Number(e.split(':')[1]));
const cutDamage = (s) => Math.round(6 * s.difficulty.hpMul);

/** Espera `n` comuns vivos na tela. */
async function waitCrowd(kit, n) {
  let s = await kit.snap(0);
  for (let i = 0; i < 100 && alive(s).length < n; i++) s = await kit.snap(200);
  kit.assert(alive(s).length >= n, `esperava ${n} comuns vivos: ${alive(s).length}`);
  return s;
}

/** Encosta no bando (se houver) e aperta `P` por um quadro (fora do hitstop); devolve o snapshot da ativação. */
export async function activate(kit, id = 'santuario') {
  if (alive(await kit.snap(0)).length > 0) await kit.approach(36);
  let before = await kit.snap(0);
  for (let f = 0; f < 30 && before.hitstop.frozen; f++) before = await kit.frame();
  await kit.down('KeyP');
  const s = await kit.frame();
  await kit.up('KeyP');
  kit.assert(s.events.slice(before.events.length).includes(`domain:${id}`), `ativação: ${JSON.stringify(s.domain)}`);
  return s;
}

/**
 * Um lote de cortes (o quadro em que saem os `domainCut`): até `max` alvos, sem repetir, os mais perto do player entre
 * os vivos a até 320 px no quadro anterior; cada um perde `round(6 × hpMul)` (ou o que restava) e não entra em
 * `hitstun` pelo corte; o número do quadro é `micro`; a carga, a maestria e a energia não sobem pelo corte (SAN-03,
 * SAN-04). `clean` diz que nenhum golpe do player conectou neste quadro (o HP e a energia só medem o corte).
 */
function checkBatch(kit, prev, s, ids, max, clean) {
  const view = JSON.stringify({ ids, en: alive(prev).map((e) => [e.id, Math.round(dist(prev, e)), e.hp]) });
  kit.assert(ids.length > 0 && ids.length <= max && new Set(ids).size === ids.length, `até ${max} alvos: ${view}`);
  const far = Math.max(
    ...ids.map((id) =>
      dist(
        prev,
        prev.enemies.find((e) => e.id === id),
      ),
    ),
  );
  for (const e of alive(prev)) {
    if (ids.includes(e.id) || dist(prev, e) > 320) continue;
    kit.assert(ids.length === max && dist(prev, e) >= far - DIST_SLACK, `os mais perto primeiro: ${view}`);
  }
  kit.assert(s.domain.charge === 0, `o corte não carrega a barra: ${s.domain.charge}`);
  const points = (x) => x.tech.slots.map((t) => t?.mastery?.points ?? 0).join(',');
  kit.assert(points(s) === points(prev), `o corte não dá maestria: ${points(prev)} → ${points(s)}`);
  if (!clean) return;
  // O número do alvo que ainda mostra o golpe soma o corte e fica com o tipo mais forte (`strongerKind`).
  const n = s.damageNumbers.last;
  kit.assert(n?.kind === 'micro' || n?.value > cutDamage(s), `número micro: ${JSON.stringify(n)}`);
  kit.assert(
    s.ce.cur - prev.ce.cur <= REGEN_PER_FRAME + 0.01,
    `o corte não rende energia: ${prev.ce.cur} → ${s.ce.cur}`,
  );
  for (const id of ids) {
    const was = prev.enemies.find((e) => e.id === id);
    const now = s.enemies.find((e) => e.id === id);
    const lost = was.hp - Math.max(0, now?.hp ?? 0);
    kit.assert(lost === Math.min(was.hp, cutDamage(s)), `comum ${id} perde ${cutDamage(s)} no corte, perdeu ${lost}`);
    if (now && now.hp > 0 && was.state !== 'hitstun')
      kit.assert(now.state !== 'hitstun', `o corte não dá hitstun: ${id}`);
  }
}

/**
 * Bate com `J` sem parar por `frames` quadros com o Domínio ativo, conferindo cada lote; devolve os lotes, os quadros
 * com golpe conectado e o maior `fx.live` e `triggersLastSecond` vistos.
 */
async function spamJab(kit, start, frames, max) {
  let s = start;
  const out = { batches: [], strikes: 0, maxLive: 0, maxTriggers: 0, microFull: [], micro: 0 };
  for (let f = 0; f < frames && s.domain.active; f++) {
    if (f % 6 === 0) await kit.down('KeyJ');
    if (f % 6 === 2) await kit.up('KeyJ');
    const prev = s;
    s = await kit.frame();
    const now = s.events.slice(prev.events.length);
    const struck = now.some((e) => e.startsWith('impact:'));
    if (struck) out.strikes++;
    const ids = cutIds(now);
    if (ids.length > 0) {
      checkBatch(kit, prev, s, ids, max, !struck);
      out.batches.push(ids);
      if (s.damageNumbers.last?.kind === 'micro') out.micro++;
      if (ids.length > 4) out.microFull.push(s.hitstop.microMs);
    }
    out.maxLive = Math.max(out.maxLive, s.fx.live);
    out.maxTriggers = Math.max(out.maxTriggers, s.domain.triggersLastSecond);
  }
  await kit.up('KeyJ');
  return { ...out, s };
}

/**
 * Nv 1 (SAN-01 a SAN-04): o Domínio dura 6000 ms; cada golpe que conecta solta um lote de até 4 cortes nos mais
 * perto, e o corte não solta outro (um lote por golpe conectado; nunca mais de 4 gatilhos no último segundo).
 */
async function levelOne(kit, base) {
  await kit.boot(`${base}&domain=santuario&charge=100&maxAlive=6&enemyGuard=0&tech=corte`);
  await waitCrowd(kit, 4);
  let s = await activate(kit);
  kit.assert(
    Math.abs(s.domain.active.remainingMs - 6000) <= FRAME_MS + 1,
    `Nv 1 dura 6000: ${s.domain.active.remainingMs}`,
  );
  for (let f = 0; f < 30 && s.hitstop.frozen; f++) s = await kit.frame();
  const r = await spamJab(kit, s, 300, 4);
  const view = JSON.stringify({ batches: r.batches, strikes: r.strikes });
  kit.assert(r.batches.length >= 2 && r.micro > 0, `os golpes deveriam soltar cortes micro: ${view}`);
  kit.assert(r.batches.length <= r.strikes, `um lote por golpe conectado, o corte não solta outro: ${view}`);
  kit.assert(r.maxTriggers <= 4, `no máximo 4 gatilhos por segundo: ${r.maxTriggers}`);
}

/**
 * Nv 3 (SAN-01, SAN-03, POW-14): dura 8000 ms; até 6 alvos por lote; com 5 ou 6 cortes no mesmo quadro o teto do
 * micro enche e os cortes de fora dele ainda acertam e mostram o número (o `checkBatch` confere cada alvo); `fx.live`
 * fica em 40 ou menos.
 */
async function levelThree(kit, base) {
  await kit.boot(`${base}&domain=santuario:3&charge=100&maxAlive=6&enemyGuard=0`);
  await waitCrowd(kit, 6);
  let s = await activate(kit);
  kit.assert(
    Math.abs(s.domain.active.remainingMs - 8000) <= FRAME_MS + 1,
    `Nv 3 dura 8000: ${s.domain.active.remainingMs}`,
  );
  for (let f = 0; f < 30 && s.hitstop.frozen; f++) s = await kit.frame();
  const r = await spamJab(kit, s, 420, 6);
  const view = JSON.stringify({ batches: r.batches, micro: r.microFull });
  kit.assert(r.batches.some((b) => b.length > 4) && r.micro > 0, `um lote com mais de 4 alvos no Nv 3: ${view}`);
  kit.assert(
    r.microFull.every((ms) => ms <= 60),
    `o teto do micro segura o hitstop: ${view}`,
  );
  kit.assert(r.maxLive <= 40, `fx.live até 40 no Santuário Nv 3: ${r.maxLive}`);
}

/** Espera o último segundo ficar sem gatilho, sem bater. */
async function quietWindow(kit) {
  let s = await kit.snap(0);
  for (let i = 0; i < 90 && s.domain.triggersLastSecond > 0; i++) s = await kit.frame();
  kit.assert(s.domain.triggersLastSecond === 0, `a janela deveria esvaziar: ${s.domain.triggersLastSecond}`);
  return s;
}

/**
 * Gatilhos soltos e alvos atingidos por outra coisa (perderam mais que os cortes deles) entre `from` (janela vazia) e
 * `s`, menos de 1000 ms de jogo depois.
 */
function tally(from, s) {
  const ev = s.events.slice(from.events.length);
  const ids = cutIds(ev);
  const other = from.enemies.filter((e) => {
    const now = s.enemies.find((x) => x.id === e.id);
    const lost = e.hp - Math.max(0, now?.hp ?? 0);
    return lost > ids.filter((id) => id === e.id).length * cutDamage(s) && lost > 0;
  });
  return { triggers: s.domain.triggersLastSecond, cuts: ids, others: other.map((e) => e.id), ev };
}

/**
 * SAN-02: uma conjuração do Corte que acerta comuns (3 cortes por alvo) solta 1 gatilho, não um por acerto. Repete com
 * a conjuração de novo se ela não conectar em pelo menos 2 comuns.
 */
async function castTrigger(kit, base) {
  await kit.boot(`${base}&domain=santuario:3&charge=100&maxAlive=3&enemyGuard=0&tech=corte`);
  await waitCrowd(kit, 3);
  await activate(kit);
  for (let attempt = 0; attempt < 4; attempt++) {
    let s = await kit.snap(0);
    for (let i = 0; i < 60 && (s.tech.cast !== null || s.tech.slots[0].cooldownMs > 0); i++) s = await kit.snap(50);
    if (!s.domain.active) break;
    await kit.approach(110);
    const from = await quietWindow(kit);
    await kit.down('KeyL');
    s = await kit.frame();
    await kit.up('KeyL');
    for (let f = 0; f < 40; f++) s = await kit.frame();
    const t = tally(from, s);
    const cuts = t.ev.filter((e) => e === 'cut').length;
    if (cuts === 0 || t.others.length < 2) continue;
    kit.assert(t.triggers === 1 && t.cuts.length > 0, `uma conjuração, um gatilho: ${JSON.stringify(t)}`);
    return;
  }
  kit.assert(false, 'a conjuração do Corte não acertou 2 comuns com o Santuário ativo');
}

/**
 * SAN-02.3: com o ramo Onda do Punho (F30) o forte que acerta solta a onda, que acerta o 2º comum como `micro`; o golpe
 * solta 1 gatilho e a onda nenhum.
 */
async function waveTrigger(kit, base) {
  await kit.boot(`${base}&domain=santuario:3&charge=100&maxAlive=2&enemyGuard=0&axes=corpo.fluxo:1&ramo=corpo:b`);
  await waitCrowd(kit, 2);
  await activate(kit);
  for (let attempt = 0; attempt < 6; attempt++) {
    await kit.approach();
    const from = await quietWindow(kit);
    // A rasteira (S+K) é o forte de um alvo só: a onda sai dela e vai ao outro comum.
    await kit.down('KeyS');
    await kit.tap('KeyK', 16);
    await kit.up('KeyS');
    let s = await kit.snap(0);
    for (let f = 0; f < 40; f++) s = await kit.frame();
    const t = tally(from, s);
    if (!t.ev.some((e) => /^fistWave:\d+:/.test(e))) continue;
    kit.assert(t.triggers === 1 && t.cuts.length > 0, `golpe com onda, 1 gatilho: ${JSON.stringify(t)}`);
    return;
  }
  kit.assert(false, 'a onda do punho não acertou o 2º comum com o Santuário ativo');
}

/**
 * Vista (SAN-06, DHD-05): durante o Santuário a vinheta lida do retângulo vivo tem alpha 0,35; 300 ms depois do fim é 0
 * (no quadro do fim ainda está apagando). O `R` com o Santuário ativo não deixa vinheta órfã: a cena nova tem os mesmos
 * objetos na `uiLayer` que a run anterior tinha antes da ativação, com a vinheta apagada.
 */
async function vignette(kit, base) {
  const q = `${base}&domain=santuario&charge=100&spawn=0`;
  let s = await kit.boot(q);
  const objects = s.domainFx.uiObjects;
  kit.assert(s.domainFx.vignette === 0, `sem Domínio, sem vinheta: ${JSON.stringify(s.domainFx)}`);
  await activate(kit);
  s = await kit.snap(400);
  kit.assert(s.domainFx.vignette === 0.35, `vinheta 0,35 no Santuário: ${JSON.stringify(s.domainFx)}`);
  kit.assert(s.domainFx.uiObjects === objects, `a vinheta já mora na uiLayer: ${s.domainFx.uiObjects} × ${objects}`);
  for (let f = 0; f < 400 && s.domain.active; f++) s = await kit.frame();
  kit.assert(
    s.domain.active === null && s.domainFx.vignette > 0,
    `no fim ainda apagando: ${JSON.stringify(s.domainFx)}`,
  );
  s = await kit.snap(300);
  kit.assert(s.domainFx.vignette === 0, `300 ms depois do fim é 0: ${JSON.stringify(s.domainFx)}`);

  await kit.boot(q);
  await activate(kit);
  s = await kit.snap(400);
  kit.assert(s.domainFx.vignette === 0.35, `ativa antes do R: ${JSON.stringify(s.domainFx)}`);
  await kit.tap('KeyR');
  await kit.snap(100);
  await kit.tap('KeyJ');
  s = await kit.snap(100);
  const view = JSON.stringify({ fx: s.domainFx, objects, run: s.run.state });
  kit.assert(s.run.state === 'roundActive' && s.domainFx.vignette === 0, `R sem vinheta: ${view}`);
  kit.assert(s.domainFx.uiObjects === objects, `R sem objeto órfão na uiLayer: ${view}`);
}

export async function sanctuaryCuts(kit, base) {
  await vignette(kit, base);
  await levelOne(kit, base);
  await levelThree(kit, base);
  await castTrigger(kit, base);
  await waveTrigger(kit, base);
}
