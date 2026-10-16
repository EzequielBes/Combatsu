// Parte 1 do `domain.smoke.mjs`, técnica (DOM-02.4): a conjuração que acerta carrega +1 uma vez, o Kokusen +15 e o
// tique chip não carrega. Não é um cenário (o runner só roda `*.smoke.mjs`). Lê `domain.charge`, `tech.cast`,
// `kokusen.windowOpen` e os eventos `kokusen`, `chip:<id>`, `blueImplode` e `enemyDied:<id>` do snapshot vivo.

const kills = (events) => events.filter((e) => e.startsWith('enemyDied:')).length;
const hpSum = (s) => s.enemies.reduce((n, e) => n + Math.max(0, e.hp), 0);

/** Espera o slot 1 livre (sem conjuração e sem recarga), encosta no comum mais perto e espera ele sair do ataque. */
async function ready(kit, far = false) {
  let s = await kit.snap(0);
  for (let i = 0; i < 60 && (s.tech.cast !== null || s.tech.slots[0].cooldownMs > 0); i++) s = await kit.snap(100);
  await kit.settle();
  // O Corte acerta de 60 a 180 px à frente (CUT-03): conjura a ~100 px, antes de o comum chegar ao alcance dele.
  if (far) return kit.approach(110);
  await kit.approach(40);
  // O golpe do comum cancela a conjuração (CAST-07): espera ele sair do ataque, encosta de novo e conjura na hora
  // (o preparo dele leva 27 quadros; a conjuração acerta antes).
  await kit.waitQuiet();
  return kit.approach(40);
}

/** Aperta `L` por um quadro; devolve o snapshot e se a conjuração começou. */
async function cast(kit) {
  await kit.down('KeyL');
  const s = await kit.frame();
  await kit.up('KeyL');
  return { s, started: s.tech.cast !== null };
}

/**
 * Uma conjuração do Divergente do começo ao fim (com Kokusen se `kokusen`): devolve a carga antes e depois, os eventos
 * da janela e se algum alvo perdeu vida. Repete a aproximação até 4 vezes se a conjuração for recusada ou cancelada.
 */
async function divergentCast(kit, kokusen) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const start = await ready(kit);
    const { s: first, started } = await cast(kit);
    if (!started) continue;
    let s = first;
    let pressed = false;
    for (let f = 0; f < 90 && (s.tech.cast !== null || f < 10); f++) {
      s = await kit.frame();
      if (kokusen && !pressed && s.kokusen.windowOpen) {
        pressed = true;
        await kit.down('KeyL');
        s = await kit.frame();
        await kit.up('KeyL');
      }
    }
    for (let f = 0; f < 10; f++) s = await kit.frame();
    const events = s.events.slice(start.events.length);
    const landed = kokusen ? events.includes('kokusen') : hpSum(s) < hpSum(start) || kills(events) > 0;
    if (!landed) continue;
    return { before: start.domain.charge, after: s.domain.charge, events };
  }
  throw new Error(`a conjuração do Divergente${kokusen ? ' com Kokusen' : ''} não acertou em 4 tentativas`);
}

/** Divergente: +1 por conjuração que acerta (o 1º e o 2º impactos são da mesma conjuração); com Kokusen, +16. */
async function divergent(kit, base) {
  await kit.boot(`${base}&domain=santuario&enemyGuard=0&noshop=1&tech=divergente`);
  const plain = await divergentCast(kit, false);
  kit.assert(
    plain.after - plain.before === 1 + kills(plain.events),
    `Divergente sem Kokusen: +1 (mais ${kills(plain.events)} abate(s)), subiu ${plain.after - plain.before}: ${JSON.stringify(plain.events.slice(-8))}`,
  );
  const kok = await divergentCast(kit, true);
  kit.assert(
    kok.after - kok.before === 16 + kills(kok.events),
    `Divergente com Kokusen: +16 (mais ${kills(kok.events)} abate(s)), subiu ${kok.after - kok.before}`,
  );
}

/** Azul: enquanto só os tiques chip acertam, a carga não muda. */
async function blue(kit, base) {
  await kit.boot(`${base}&domain=santuario&enemyGuard=0&noshop=1&tech=azul`);
  for (let attempt = 0; attempt < 4; attempt++) {
    const start = await ready(kit);
    const { s: first, started } = await cast(kit);
    if (!started) continue;
    let s = first;
    let chips = 0;
    for (let f = 0; f < 240; f++) {
      const prev = s;
      s = await kit.frame();
      const now = s.events.slice(prev.events.length);
      if (now.includes('blueImplode')) break;
      chips += now.filter((e) => e.startsWith('chip:')).length;
      kit.assert(
        s.domain.charge === start.domain.charge + kills(s.events.slice(start.events.length)),
        `Azul: o tique chip não carrega (${start.domain.charge} → ${s.domain.charge}): ${JSON.stringify(now)}`,
      );
    }
    if (chips > 0) return;
  }
  throw new Error('nenhum tique chip do Azul acertou em 4 tentativas');
}

/** Corte: +1 por conjuração que acerta. */
async function cut(kit, base) {
  await kit.boot(`${base}&domain=santuario&enemyGuard=0&noshop=1&tech=corte`);
  for (let attempt = 0; attempt < 4; attempt++) {
    const start = await ready(kit, true);
    const { s: first, started } = await cast(kit);
    if (!started) continue;
    let s = first;
    for (let f = 0; f < 90 && (s.tech.cast !== null || f < 10); f++) s = await kit.frame();
    for (let f = 0; f < 20; f++) s = await kit.frame();
    const events = s.events.slice(start.events.length);
    if (!(hpSum(s) < hpSum(start) || kills(events) > 0)) continue;
    kit.assert(
      s.domain.charge - start.domain.charge === 1 + kills(events),
      `Corte: +1 por conjuração (mais ${kills(events)} abate(s)), subiu ${s.domain.charge - start.domain.charge}`,
    );
    return;
  }
  throw new Error('a conjuração do Corte não acertou em 4 tentativas');
}

export async function chargeFromTechniques(kit, base) {
  await divergent(kit, base);
  await blue(kit, base);
  await cut(kit, base);
}
