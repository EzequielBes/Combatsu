// Alvos por golpe, cambaleio, queda e troca de alvo (TGT-03..07, PST-01..03, PST-05..08, PST-10, PST-13, PST-14, PST-16,
// GND-01..03, GND-05, GND-06, EDG-11) com `?debug&seed=1&shove=0&enemyGuard=0` (o kit). Os inimigos nascem fora da tela e perseguem
// o jogador: com `maxAlive=3` dois deles nascem no mesmo x (empilhados) e o terceiro fica uns 40 px atrás. Frames de jogo: os
// passos com o hitstop ligado não contam (o tempo da cena não anda neles). Lê `enemies[]`, `focusId`, `events`, `hud.heldItem` e
// `player` do snapshot vivo. O inimigo derrubado desliza uns 85 px para longe do jogador (o ragdoll leva o corpo junto): para
// bater nele no chão o jogador cobre a distância com a esquiva (`Q`, 96 px em 200 ms) feita no fim da rasteira. As posições variam
// uns poucos px de uma rodada para outra, então os cenários esperam por condições (alcance, estado) e não por frames fixos.
// Fora do smoke (sem cenário estável): PST-11 (dois fortes em 380 ms: o menor intervalo entre dois contatos de golpe forte é de
// ~28 frames, 467 ms) e TGT-05 no limite do chão e com o alvo morto (o caído escorrega para fora do alcance do golpe seguinte).
import { makeKit } from './fight-kit.mjs';

const FRAME_MS = 1000 / 60;
const STAGGER_MS = 380;
const LIGHT_STAGGER_MS = 220;
const GROUND_MS = 900; // `rasteira`: ragdollStun do golpe (effect knockdown)
const DECAY_DELAY_FRAMES = 90; // 1500 ms sem ganho de postura
const JAB = 6;
const KICK = 12;
const RASTEIRA = 10;
const CHAIR = 20;
const FINISHER = 40;

export default async function (ctx) {
  const { assert, snap, frame, down, up, count, boot, nearest, startDuel } = makeKit(ctx);

  const byId = (s, id) => s.enemies.find((e) => e.id === id);
  /** Aperta as teclas por um frame (as de `JustDown` precisam ficar um passo) e solta; devolve o snapshot. */
  const press = async (...keys) => {
    for (const k of keys) await down(k);
    const s = await frame();
    for (const k of keys.slice().reverse()) await up(k);
    return s;
  };
  /** Linha do tempo de uma cena: `step` conta só os frames de jogo (fora do hitstop); `free` = jogador sem golpe nem dano. */
  const track = (s0) => {
    const d = { s: s0, gf: 0, entered: {}, last: {} };
    /** Anota o frame de jogo em que cada inimigo entrou no estado em que está (`entered['id:estado']`, a entrada mais recente). */
    const note = () => {
      for (const e of d.s.enemies) {
        if (d.last[e.id] === e.state) continue;
        d.last[e.id] = e.state;
        d.entered[`${e.id}:${e.state}`] = d.gf;
      }
    };
    note();
    d.step = async () => {
      d.s = await frame();
      if (!d.s.hitstop.frozen) d.gf += 1;
      note();
      return d.s;
    };
    /** Frames de jogo do `ragdollStun` de `id` (da queda ao `gettingUp`), da última queda. */
    d.groundFrames = (id) => d.entered[`${id}:gettingUp`] - d.entered[`${id}:ragdollStun`];
    d.press = async (...keys) => {
      for (const k of keys) await down(k);
      await d.step();
      for (const k of keys.slice().reverse()) await up(k);
    };
    d.steps = async (n) => {
      for (let i = 0; i < n; i++) await d.step();
    };
    /** Passa frames até `pred(d.s)` valer (no máximo `max`); falha com `what`. */
    d.until = async (pred, max, what) => {
      for (let i = 0; i < max && !pred(d.s); i++) await d.step();
      assert(pred(d.s), `${typeof what === 'function' ? what() : what}: não aconteceu em ${max} frames (${JSON.stringify({ p: d.s.player.move, f: d.s.player.frame, en: d.s.enemies.map((e) => [e.id, e.state, e.hp, e.downHits]) })})`);
      return d.s;
    };
    d.free = () => d.s.player.move === null && !d.s.player.frame.startsWith('hurt') && !d.s.hitstop.frozen && !d.s.player.dodge.active;
    d.enemy = () => nearest(d.s);
    return d;
  };
  /** Pega a cadeira do mapa (x 240) andando para a direita e apertando `E`. */
  const grabChair = async () => {
    let s = await snap(0);
    const chair = s.worldProps.find((p) => p.key === 'chair');
    await down('KeyD');
    for (let i = 0; i < 200 && chair.x - s.player.x >= 20; i++) s = await frame();
    await up('KeyD');
    await snap(30);
    await press('KeyE');
    s = await snap(20);
    assert(s.hud.heldItem !== null && s.hud.heldItem.name === 'Cadeira' && s.hud.heldItem.pips === 4, `o jogador deveria segurar a cadeira: ${JSON.stringify(s.hud.heldItem)}`);
    return s;
  };
  /** Duelo com um inimigo isolado (`startDuel`: `f0` é o primeiro frame do preparo dele), com ou sem a cadeira na mão. */
  const duel = async (query, { chair = false } = {}) => {
    await boot(query);
    if (chair) await grabChair();
    const d = track(await startDuel());
    d.id = d.enemy().id;
    return d;
  };

  /**
   * Leva o jogador para dentro do grupo de três inimigos: dois empilhados (mesmo x) e o terceiro uns 40 px atrás. Para quando o
   * par está a menos de 20 px e o terceiro a menos de 52 px, solta, e deixa o jogador parar (ele desliza uns 13 px). Com `chair`
   * pega antes a cadeira do mapa. Devolve o snapshot com o jogador parado, de frente para o grupo.
   */
  const gather = async (query, { chair = false } = {}) => {
    await boot(query);
    if (chair) await grabChair();
    let s = await snap(0);
    await down('KeyD');
    for (let i = 0; i < 1500; i++) {
      s = await frame();
      const dx = s.enemies.map((e) => e.x - s.player.x).sort((a, b) => a - b);
      if (s.enemies.length === 3 && dx[0] < 20 && dx[2] < 52) break;
    }
    await up('KeyD');
    for (let i = 0; i < 20; i++) {
      const before = s.player.x;
      s = await frame();
      if (s.player.x === before) break;
    }
    assert(s.enemies.length === 3 && s.player.facing === 1, `três inimigos à frente: ${JSON.stringify(s.enemies.map((e) => e.x - s.player.x))}`);
    return s;
  };
  /** Os três do grupo: o par empilhado (mais perto, mesmo x, ordenado por id) e o terceiro (mais longe). */
  const group = (s) => {
    const sorted = s.enemies.slice().sort((a, b) => Math.abs(a.x - s.player.x) - Math.abs(b.x - s.player.x));
    const [a, b, third] = sorted;
    assert(Math.abs(a.x - b.x) < 0.5, `o par deveria estar empilhado (mesmo x): ${a.x} e ${b.x}`);
    assert(Math.abs(third.x - s.player.x) - Math.abs(a.x - s.player.x) >= 20, `o terceiro deveria estar bem mais longe que o par: ${third.x - s.player.x} contra ${a.x - s.player.x}`);
    return { pair: [a, b].sort((p, q) => p.id - q.id), third };
  };
  /** Aperta as teclas por um frame e devolve, por id, a vida perdida nos 14 frames seguintes (o golpe conecta em ~5 frames). */
  const strike = async (s0, keys, move) => {
    const hp0 = new Map(s0.enemies.map((e) => [e.id, e.hp]));
    let s = await press(...keys);
    assert(s.player.move === move, `esperava começar ${move}: ${s.player.move}`);
    for (let i = 0; i < 14; i++) s = await frame();
    return { s, lost: new Map(s0.enemies.map((e) => [e.id, hp0.get(e.id) - byId(s, e.id).hp])) };
  };

  // --- TGT-03/TGT-04/PST-13: o jab acerta só o mais perto; o chute frontal, os dois mais perto ------------------------------------
  {
    const s0 = await gather('enemyGuard=0&maxAlive=3');
    const { pair, third } = group(s0);
    assert(s0.focusId === null, `PST-13: antes de qualquer golpe não há foco: ${s0.focusId}`);
    const { s, lost } = await strike(s0, ['KeyJ'], 'jab');
    const hit = [...lost].filter(([, v]) => v > 0);
    assert(hit.length === 1, `TGT-03: o jab (maxTargets 1) deveria tirar vida de 1 alvo: ${JSON.stringify([...lost])}`);
    // Empate entre o par empilhado: vai para o de menor id (TGT-04); o terceiro, mais longe, não é atingido.
    assert(hit[0][0] === pair[0].id && hit[0][1] === JAB, `TGT-04: o jab deveria tirar ${JAB} do id ${pair[0].id} (menor id do par empatado): ${JSON.stringify([...lost])}`);
    assert(lost.get(pair[1].id) === 0 && lost.get(third.id) === 0, `TGT-03: o par e o terceiro não deveriam apanhar: ${JSON.stringify([...lost])}`);
    assert(s.focusId === pair[0].id, `PST-13: o foco deveria ser o alvo do jab (${pair[0].id}): ${s.focusId}`);
  }
  {
    const s0 = await gather('enemyGuard=0&maxAlive=3');
    const { pair, third } = group(s0);
    assert(pair[0].id < third.id && third.id < pair[1].id, `o terceiro deveria ter o id do meio, para a ordem por id dar outro resultado: ${pair.map((p) => p.id)} e ${third.id}`);
    const { s, lost } = await strike(s0, ['KeyK'], 'chuteFrontal');
    const hit = [...lost].filter(([, v]) => v > 0);
    assert(hit.length === 2, `TGT-03: o chute frontal (maxTargets 2) deveria tirar vida de exatamente 2 alvos: ${JSON.stringify([...lost])}`);
    // O terceiro tem o id do meio e é o mais longe: a ordem é pela distância, não pelo id (TGT-04).
    assert(lost.get(pair[0].id) === KICK && lost.get(pair[1].id) === KICK && lost.get(third.id) === 0, `TGT-04: o chute deveria tirar ${KICK} dos dois mais perto (${pair.map((p) => p.id)}) e nada do terceiro (${third.id}): ${JSON.stringify([...lost])}`);
    assert(pair.some((p) => p.id === s.focusId), `PST-13: o foco deveria ser um dos dois atingidos (${pair.map((p) => p.id)}): ${s.focusId}`);
  }

  // --- TGT-06: o leve segurado pela guarda gasta a vaga (nenhum outro alvo o recebe) ----------------------------------------------
  {
    await boot('enemyGuard=1&maxAlive=3');
    let s = await snap(0);
    // O par nasce a ~1100 px do jogador e anda uns 70 px/s: leva uns 700 frames para chegar.
    for (let i = 0; i < 1500 && !s.enemies.some((e) => e.ai === 'windup'); i++) s = await frame();
    assert(s.enemies.some((e) => e.ai === 'windup'), 'o par deveria chegar ao jogador');
    const before = new Map(s.enemies.map((e) => [e.id, { hp: e.hp, str: e.structure.cur }]));
    const blocks0 = new Map(s.enemies.map((e) => [e.id, count(s, `enemyBlock:${e.id}`)]));
    // O leve começa no frame seguinte ao do preparo, antes do compromisso (15 frames), e o par empilhado está ao alcance do jab.
    const near = s.enemies.filter((e) => e.x - s.player.x < 46 && e.x - s.player.x > 0);
    assert(near.length >= 2, `os dois do par deveriam estar ao alcance do jab: ${JSON.stringify(s.enemies.map((e) => e.x - s.player.x))}`);
    assert(!near.some((e) => e.committed), `o inimigo ao alcance não pode estar comprometido: ${JSON.stringify(near)}`);
    await press('KeyJ');
    for (let i = 0; i < 14; i++) s = await frame();
    const blocked = s.enemies.filter((e) => count(s, `enemyBlock:${e.id}`) > blocks0.get(e.id));
    assert(blocked.length === 1 && count(s, `enemyBlock:${blocked[0].id}`) === blocks0.get(blocked[0].id) + 1, `TGT-06: o jab segurado pela guarda deveria dar um único enemyBlock: ${JSON.stringify(s.events.filter((x) => x.startsWith('enemyBlock')))}`);
    for (const e of s.enemies) {
      assert(e.hp === before.get(e.id).hp, `TGT-06: ninguém deveria perder vida com o jab segurado: ${e.id} ${before.get(e.id).hp} -> ${e.hp}`);
      const gain = e.structure.cur - before.get(e.id).str;
      assert(e.id === blocked[0].id ? gain === 8 : gain === 0, `TGT-06: só quem bloqueou soma 8 de postura (${e.id}): +${gain}`);
    }
    assert(s.focusId === null, `PST-13: golpe segurado pela guarda não é aceito, o foco não muda: ${s.focusId}`);
  }

  /** Chute frontal antes do compromisso (frame 3 de 15): cambaleia. Devolve o frame de jogo do primeiro `stagger`. */
  const kickToStagger = async (d) => {
    await d.steps(3);
    assert(!d.enemy().committed, 'o chute deveria vir antes do compromisso');
    await d.press('KeyK');
    assert(d.s.player.move === 'chuteFrontal', `K deveria começar o chuteFrontal: ${d.s.player.move}`);
    await d.until(() => d.enemy().state === 'stagger', 30, 'PST-01: o chute frontal deveria cambalear o inimigo');
    return d.gf;
  };
  /** Passa frames até o inimigo sair do `stagger` e devolve o frame de jogo em que ele aparece em `idle`; confere PST-02 em todo frame. */
  const untilIdle = async (d) => {
    for (let i = 0; i < 80 && d.enemy().state === 'stagger'; i++) {
      assert(d.enemy().ragdollVisible === null, `PST-02: em stagger não há ragdoll: ${d.enemy().ragdollVisible}`);
      await d.step();
    }
    assert(d.enemy().state === 'idle', `PST-03: o cambaleio deveria terminar em idle: ${d.enemy().state}`);
    return d.gf;
  };

  // --- PST-01/02/03: o chute frontal cambaleia por 380 ms, sem ragdoll, e volta a idle --------------------------------------------
  {
    const d = await duel('enemyGuard=0&enemyVariant=corcunda');
    const g0 = await kickToStagger(d);
    assert(d.enemy().ragdollVisible === null, `PST-02: sem ragdoll no cambaleio: ${d.enemy().ragdollVisible}`);
    const g1 = await untilIdle(d);
    assert(Math.abs((g1 - g0) * FRAME_MS - STAGGER_MS) <= FRAME_MS, `PST-01/03: cambaleou por ${((g1 - g0) * FRAME_MS).toFixed(0)} ms, esperava ${STAGGER_MS} (±1 frame)`);
  }

  // --- PST-10: leve no cambaleio: continua em stagger com max(resto, 220) -----------------------------------------------------------
  {
    // Com 300 ms por vir (mais que 220) o resto não muda: o cambaleio acaba no mesmo frame de sempre.
    const d = await duel('enemyGuard=0&enemyVariant=corcunda');
    const g0 = await kickToStagger(d);
    while (d.gf < g0 + 4) await d.step();
    await d.press('Digit1');
    assert(d.enemy().state === 'stagger', `PST-10: o leve no cambaleio deveria mantê-lo em stagger: ${d.enemy().state}`);
    const g1 = await untilIdle(d);
    assert(Math.abs((g1 - g0) * FRAME_MS - STAGGER_MS) <= FRAME_MS, `PST-10: com mais de 220 ms por vir o leve não muda o tempo: ${((g1 - g0) * FRAME_MS).toFixed(0)} ms, esperava ${STAGGER_MS}`);
  }
  {
    // Com ~80 ms por vir (menos que 220) o resto vira 220 ms contados do leve.
    const d = await duel('enemyGuard=0&enemyVariant=corcunda');
    const g0 = await kickToStagger(d);
    while (d.gf < g0 + 14) await d.step();
    await d.press('Digit1');
    const gLight = d.gf;
    assert(d.enemy().state === 'stagger', `PST-10: o leve no cambaleio deveria mantê-lo em stagger: ${d.enemy().state}`);
    const g1 = await untilIdle(d);
    assert(Math.abs((g1 - gLight) * FRAME_MS - LIGHT_STAGGER_MS) <= FRAME_MS * 1.5, `PST-10: depois do leve o cambaleio deveria durar ${LIGHT_STAGGER_MS} ms: ${((g1 - gLight) * FRAME_MS).toFixed(0)} ms`);
    assert((g1 - g0) * FRAME_MS > STAGGER_MS + FRAME_MS, `PST-10: o cambaleio deveria passar dos ${STAGGER_MS} ms originais: ${((g1 - g0) * FRAME_MS).toFixed(0)} ms`);
  }

  /**
   * Mede a queda de postura de um inimigo que não ganha postura há um tempo: `gfGain` é o frame de jogo do último ganho. Confere
   * que nada cai nos 1500 ms do atraso e devolve o quanto caiu no 1 s seguinte (60 frames de jogo).
   */
  const decayAfterDelay = async (d, gfGain, label) => {
    const cur0 = d.enemy().structure.cur;
    while (d.gf < gfGain + DECAY_DELAY_FRAMES - 6) await d.step();
    assert(d.enemy().structure.cur === cur0, `${label}: a postura não deveria cair nos 1500 ms do atraso: ${cur0} -> ${d.enemy().structure.cur} em ${d.gf - gfGain} frames`);
    while (d.gf < gfGain + DECAY_DELAY_FRAMES) await d.step();
    const start = d.enemy().structure.cur;
    const g = d.gf;
    while (d.gf < g + 60) await d.step();
    return start - d.enemy().structure.cur;
  };

  // --- PST-16: a postura do foco cai 10 por segundo depois do atraso de 1500 ms sem ganho -------------------------------------------
  {
    const d = await duel('enemyGuard=0&enemyVariant=corcunda');
    await kickToStagger(d);
    assert(d.s.focusId === d.id, `PST-13: o foco deveria ser o alvo do chute: ${d.s.focusId}`);
    // O segundo chute sai quando o inimigo, empurrado pelo primeiro, volta ao alcance e começa um preparo novo (ainda sem
    // compromisso: o golpe é aceito de qualquer jeito, só muda se ele cambaleia).
    const hp1 = d.enemy().hp;
    for (let i = 0; i < 150 && !(d.free() && d.enemy().ai === 'windup' && d.enemy().x - d.s.player.x < 40); i++) {
      if (d.free() && d.enemy().x - d.s.player.x > 44) {
        await down('KeyD');
        await d.step();
        await up('KeyD');
      } else await d.step();
    }
    assert(d.free() && d.enemy().ai === 'windup' && d.enemy().x - d.s.player.x < 40, 'o inimigo deveria voltar ao alcance e preparar o golpe');
    await d.press('KeyK');
    assert(['chuteFrontal', 'chuteAlto'].includes(d.s.player.move), `K deveria começar um chute forte: ${d.s.player.move}`);
    await d.until(() => d.enemy().hp < hp1, 30, 'o segundo chute deveria ser aceito');
    const g2 = d.gf;
    assert(d.enemy().structure.cur >= 18 && d.enemy().structure.cur <= 20, `dois chutes dão 20 de postura: ${JSON.stringify(d.enemy().structure)}`);
    // PST-16: o inimigo é o foco (aceitou o último golpe) e a postura dele só começa a cair 1500 ms depois do último ganho.
    assert(d.s.focusId === d.id, `PST-16: o inimigo deveria seguir como foco: ${d.s.focusId}`);
    const drop = await decayAfterDelay(d, g2, 'PST-16');
    assert(Math.abs(drop - 10) <= 3, `PST-16: a postura do foco deveria cair 10 em 1 s: caiu ${drop}`);
    assert(d.s.focusId === d.id, `PST-16: o foco deveria continuar o mesmo durante a medição: ${d.s.focusId}`);
  }

  // --- PST-05 e GND-*: a rasteira derruba; no chão entra um golpe só; levantando nada entra; nova queda zera `downHits` ----------------
  /** Rasteira (`S`+`K`) e espera do `ragdollStun` do inimigo `id`; devolve o frame de jogo da queda. */
  const sweep = async (d, id = d.id) => {
    await down('KeyS');
    await d.press('KeyK');
    await up('KeyS');
    assert(d.s.player.move === 'rasteira', `S+K deveria começar a rasteira: ${d.s.player.move}`);
    await d.until(() => byId(d.s, id).state === 'ragdollStun', 30, 'PST-05: a rasteira (knockdown) deveria derrubar');
    return d.gf;
  };
  /** Frames de jogo do `ragdollStun` (da queda ao `gettingUp`), sem tocar no inimigo no chão. */
  let groundBaseline;
  {
    const d = await duel('enemyGuard=0&enemyVariant=corcunda');
    await d.steps(3);
    const gDown = await sweep(d);
    assert(d.enemy().downHits === 0, `GND-05: ao cair o downHits deveria ser 0: ${d.enemy().downHits}`);
    assert(d.enemy().hp === 60 - RASTEIRA && d.enemy().ragdollVisible !== null, `PST-05: a rasteira tira ${RASTEIRA} e o inimigo vai ao chão: ${JSON.stringify([d.enemy().hp, d.enemy().ragdollVisible])}`);
    await d.until(() => d.enemy().state === 'gettingUp', 90, 'o inimigo deveria começar a levantar');
    groundBaseline = d.groundFrames(d.id);
    assert(d.entered[`${d.id}:ragdollStun`] === gDown, 'a queda deveria estar anotada no frame em que o estado mudou');
    assert(Math.abs(groundBaseline * FRAME_MS - GROUND_MS) <= FRAME_MS * 1.5, `a rasteira deveria deixar ${GROUND_MS} ms no chão (±1,5 frame): ${(groundBaseline * FRAME_MS).toFixed(0)} ms`);
  }
  /** Esquiva para a frente no fim da rasteira: fecha a distância do inimigo que escorregou (ver o cabeçalho). */
  const dashForward = async (d) => {
    await d.until(() => d.s.player.frame === 'rasteira-recover' && !d.s.hitstop.frozen, 30, 'a rasteira deveria chegar ao fim');
    await down('KeyD');
    await d.press('KeyQ');
    for (let i = 0; i < 14 && d.s.player.dodge.active; i++) await d.step();
    await up('KeyD');
  };
  /**
   * Espera o jogador livre e o inimigo no alcance (andando um frame por vez se preciso) e dá um `socoBaixo` (`S`+`J`). Devolve
   * o que mudou no inimigo nos 14 frames seguintes (o golpe conecta uns 5 frames depois do aperto) e o estado dele em cada um.
   */
  const groundPunch = async (d) => {
    for (let i = 0; i < 80; i++) {
      if (!d.free()) {
        await d.step();
        continue;
      }
      const dx = d.enemy().x - d.s.player.x;
      if (dx <= 40) break;
      await down('KeyD');
      await d.step();
      await up('KeyD');
    }
    assert(d.free() && d.enemy().x - d.s.player.x <= 40, `o jogador deveria alcançar o inimigo: ${JSON.stringify([d.s.player.move, d.enemy().x - d.s.player.x])}`);
    const e0 = d.enemy();
    const before = { hp: e0.hp, state: e0.state, downHits: e0.downHits, str: e0.structure.cur };
    await down('KeyS');
    await d.press('KeyJ');
    await up('KeyS');
    assert(d.s.player.move === 'socoBaixo', `S+J deveria começar o socoBaixo: ${d.s.player.move}`);
    const states = [];
    for (let i = 0; i < 14; i++) {
      await d.step();
      states.push(d.enemy().state);
    }
    const e1 = d.enemy();
    return { before, lost: before.hp - e1.hp, downHits: e1.downHits, states, state: e1.state, str: e1.structure.cur };
  };
  {
    const d = await duel('enemyGuard=0&enemyVariant=corcunda');
    await d.steps(3);
    await sweep(d);
    assert(d.enemy().downHits === 0, `GND-05: ao cair o downHits deveria ser 0: ${d.enemy().downHits}`);
    await dashForward(d);
    // GND-01: o primeiro golpe no chão tira o dano do golpe (socoBaixo, 6) e conta um.
    const first = await groundPunch(d);
    assert(first.before.state === 'ragdollStun' && first.before.downHits === 0, `GND-01: o primeiro golpe deveria pegar o inimigo no chão, sem golpe antes: ${JSON.stringify(first.before)}`);
    assert(first.lost === JAB && first.downHits === 1, `GND-01: o primeiro socoBaixo no chão deveria tirar ${JAB} e dar downHits 1: tirou ${first.lost}, downHits ${first.downHits}`);
    assert(d.s.focusId === d.id, `PST-13: o golpe no chão aceito deveria dar o foco: ${d.s.focusId}`);
    // GND-02: o segundo golpe no mesmo `ragdollStun` é recusado.
    const second = await groundPunch(d);
    assert(second.before.state === 'ragdollStun' && second.before.downHits === 1, `GND-02: o segundo golpe deveria pegar o inimigo ainda no chão: ${JSON.stringify(second.before)}`);
    assert(second.lost === 0 && second.downHits === 1 && second.str === second.before.str, `GND-02: o segundo socoBaixo no chão não deveria tirar nada: tirou ${second.lost}, downHits ${second.downHits}`);
    assert(second.states.slice(0, 6).every((st) => st === 'ragdollStun'), `GND-02: o inimigo deveria seguir caído até o contato (a recusa é do limite, não do levantar): ${JSON.stringify(second.states)}`);
    // GND-03: levantando, nada entra.
    await d.until(() => d.enemy().state === 'gettingUp', 60, 'o inimigo deveria começar a levantar');
    const third = await groundPunch(d);
    assert(third.before.state === 'gettingUp', `GND-03: o terceiro golpe deveria pegar o inimigo levantando: ${third.before.state}`);
    assert(third.states.slice(0, 6).every((st) => st === 'gettingUp'), `GND-03: o inimigo deveria seguir levantando até o contato: ${JSON.stringify(third.states)}`);
    assert(third.lost === 0 && third.downHits === 1 && third.str === third.before.str, `GND-03: levantando nada entra: tirou ${third.lost}, downHits ${third.downHits}`);
    // GND-06: os golpes no chão não alongam o ragdollStun (a mesma duração da rasteira sozinha, ±1 frame).
    const groundFrames = d.groundFrames(d.id);
    assert(Math.abs(groundFrames - groundBaseline) <= 1, `GND-06: o tempo no chão deveria ficar em ${groundBaseline} frames de jogo: ficou ${groundFrames}`);
    // GND-05: uma nova queda zera o `downHits`.
    await d.until(() => d.enemy().state === 'idle', 60, 'o inimigo deveria voltar a idle');
    assert(d.enemy().downHits === 1, `o downHits só zera numa nova queda: ${d.enemy().downHits}`);
    for (let i = 0; i < 200 && !(d.free() && d.enemy().x - d.s.player.x < 46); i++) {
      if (d.free() && d.enemy().x - d.s.player.x > 46) {
        await down('KeyD');
        await d.step();
        await up('KeyD');
      } else await d.step();
    }
    await sweep(d);
    assert(d.enemy().downHits === 0, `GND-05: uma nova queda deveria zerar o downHits: ${d.enemy().downHits}`);
  }

  // --- TGT-05: o alvo que recusa o golpe (levantando) não gasta a vaga ---------------------------------------------------------------
  // O jogador derruba o de menor id do par com a rasteira, atravessa o grupo com a esquiva e anda mais um pouco: o caído escorrega
  // até parar à esquerda dele e o terceiro, em preparo, vem se colar uns 40 px atrás do caído. Virado para a esquerda, o caído é o
  // mais perto e o terceiro está ao alcance do jab: quem recusa é o primeiro da fila. O jab sai quando o caído começa a levantar.
  {
    const s0 = await gather('enemyGuard=0&maxAlive=3');
    const { pair, third } = group(s0);
    const d = track(s0);
    const a = pair[0].id;
    const b = pair[1].id;
    const c = third.id;
    await sweep(d, a);
    await dashForward(d);
    await down('KeyD');
    await d.steps(8);
    await up('KeyD');
    await d.press('KeyA'); // vira para a esquerda: o caído e o terceiro ficam à frente
    const dxOf = (id) => byId(d.s, id).x - d.s.player.x;
    await d.until(
      () => byId(d.s, a).state === 'gettingUp' && d.free() && d.s.player.facing === -1 && dxOf(a) <= 0 && dxOf(a) >= -40 && dxOf(c) >= -43,
      120,
      () => `o caído (${a}) deveria estar levantando, ao alcance e com o terceiro (${c}) ao alcance também (dx ${dxOf(a)} e ${dxOf(c)}, vira ${d.s.player.facing}, livre ${d.free()}, x ${d.s.player.x})`,
    );
    assert(dxOf(a) > dxOf(c), `o caído deveria ser o mais perto: ${dxOf(a)} contra ${dxOf(c)}`);
    assert(d.s.focusId === a, `PST-13: o foco deveria ser o alvo da rasteira (${a}): ${d.s.focusId}`);
    const before = new Map(d.s.enemies.map((e) => [e.id, { hp: e.hp, downHits: e.downHits }]));
    await d.press('KeyJ');
    assert(d.s.player.move === 'jab', `J deveria começar o jab: ${d.s.player.move}`);
    const states = [];
    for (let i = 0; i < 14; i++) {
      await d.step();
      states.push(byId(d.s, a).state);
    }
    // O jab conecta uns 5 frames depois do aperto, com o caído ainda levantando (são 350 ms).
    assert(states.slice(0, 7).every((st) => st === 'gettingUp'), `o caído deveria seguir levantando até o contato: ${JSON.stringify(states)}`);
    assert(byId(d.s, a).hp === before.get(a).hp && byId(d.s, a).downHits === before.get(a).downHits, `TGT-05/GND-03: o alvo levantando recusa o jab: ${JSON.stringify(byId(d.s, a))}`);
    assert(byId(d.s, c).hp === before.get(c).hp - JAB, `TGT-05: o jab recusado pelo alvo que levanta deveria ficar com o terceiro (${c}): ${before.get(c).hp} -> ${byId(d.s, c).hp}`);
    assert(byId(d.s, b).hp === before.get(b).hp, `TGT-03: o outro do par, longe, não deveria apanhar: ${byId(d.s, b).hp}`);
    assert(d.s.focusId === c, `PST-13: o foco deveria ir para o terceiro, o que aceitou o jab: ${d.s.focusId}`);
  }

  // --- PST-08: objeto balançado cambaleia; TGT-07: no máximo 2 alvos por balanço -------------------------------------------------------
  {
    const d = await duel('enemyGuard=0&enemyVariant=corcunda', { chair: true });
    assert(d.s.hud.heldItem !== null && !d.enemy().committed, `PST-08: o inimigo deveria estar em preparo, antes do compromisso, com a cadeira na mão: ${JSON.stringify(d.enemy())}`);
    const hp0 = d.enemy().hp;
    await d.press('KeyJ');
    await d.until(() => d.enemy().hp < hp0, 30, 'PST-08: a cadeirada deveria ser aceita');
    assert(d.enemy().state === 'stagger' && d.enemy().ragdollVisible === null, `PST-08: o objeto balançado deveria cambalear sem ragdoll: ${JSON.stringify([d.enemy().state, d.enemy().ragdollVisible])}`);
    assert(hp0 - d.enemy().hp === CHAIR, `PST-08: a cadeira tira ${CHAIR}: ${hp0} -> ${d.enemy().hp}`);
    assert(d.s.focusId === d.id, `PST-13: o foco deveria ser o alvo da cadeirada: ${d.s.focusId}`);
    const g0 = d.gf;
    const g1 = await untilIdle(d);
    assert(Math.abs((g1 - g0) * FRAME_MS - STAGGER_MS) <= FRAME_MS, `PST-08: a cadeirada deveria cambalear por ${STAGGER_MS} ms: ${((g1 - g0) * FRAME_MS).toFixed(0)} ms`);
  }
  {
    // O par ataca (o jogador segura a guarda, sem se machucar) e, no descanso dele, o terceiro ocupa a vaga e vem se colar: os três
    // ficam ao alcance do balanço (a cadeira, 26 px, a 22 px do jogador: alcança quem está a até uns 46 px) e só a vaga decide.
    const s0 = await gather('enemyGuard=0&maxAlive=3', { chair: true });
    const { pair, third } = group(s0);
    const d = track(s0);
    const dxOf = (id) => byId(d.s, id).x - d.s.player.x;
    const ready = () => pair.every((p) => byId(d.s, p.id).ai === 'rest' && dxOf(p.id) >= 0 && dxOf(p.id) <= 36) && dxOf(third.id) <= 42 && dxOf(third.id) > dxOf(pair[0].id);
    await down('KeyU');
    await d.until(ready, 600, 'TGT-07: o par deveria descansar e o terceiro chegar ao alcance');
    await up('KeyU');
    await d.until(() => d.s.player.guard === 'none' && d.free() && ready(), 30, 'TGT-07: o jogador deveria baixar a guarda com os três ao alcance');
    const hp0 = new Map(d.s.enemies.map((e) => [e.id, e.hp]));
    const hpPlayer = d.s.player.hp;
    await d.press('KeyJ');
    for (let i = 0; i < 24; i++) await d.step();
    const lost = d.s.enemies.map((e) => [e.id, hp0.get(e.id) - e.hp]);
    assert(lost.filter(([, v]) => v > 0).length === 2, `TGT-07: o balanço deveria tirar vida de exatamente 2 alvos: ${JSON.stringify(lost)}`);
    assert(lost.every(([id, v]) => (id === third.id ? v === 0 : v === CHAIR)), `TGT-07: a cadeira deveria tirar ${CHAIR} dos dois mais perto e nada do terceiro (${third.id}): ${JSON.stringify(lost)}`);
    assert(d.s.hud.heldItem !== null && d.s.hud.heldItem.pips === 2, `TGT-07: dois impactos na cadeira (4 -> 2): ${JSON.stringify(d.s.hud.heldItem)}`);
    assert(d.s.player.hp === hpPlayer, `o jogador não deveria ter apanhado: ${hpPlayer} -> ${d.s.player.hp}`);
  }

  // --- PST-07: objeto arremessado derruba ---------------------------------------------------------------------------------------------
  {
    const d = await duel('enemyGuard=0&enemyVariant=corcunda', { chair: true });
    const hp0 = d.enemy().hp;
    await d.press('KeyE');
    await d.until(() => d.enemy().hp < hp0, 40, 'PST-07: a cadeira arremessada deveria acertar');
    assert(d.enemy().state === 'ragdollStun', `PST-07: o objeto arremessado deveria derrubar: ${d.enemy().state}`);
    assert(hp0 - d.enemy().hp === CHAIR && d.s.focusId === d.id, `PST-07: a cadeira tira ${CHAIR} e dá o foco: ${hp0} -> ${d.enemy().hp}, foco ${d.s.focusId}`);
  }

  // --- Postura quebrada (três parries, 35 cada): PST-06 (finalizador) e EDG-11 (rasteira) ----------------------------------------------
  /** Um parry (`U`) no frame 23 do preparo do inimigo (o golpe conecta no 28); espera o evento `parry`. */
  const parry = async (d) => {
    let windup = -1; // índice do frame dentro do preparo (0 = o primeiro)
    for (let i = 0; i < 200; i++) {
      if (d.enemy().ai !== 'windup') windup = -1;
      else if (windup === -1) windup = 0;
      else if (!d.s.hitstop.frozen) windup += 1;
      if (windup >= 23) break;
      await d.step();
    }
    assert(windup >= 23, 'o preparo do inimigo deveria chegar ao frame 23');
    const before = count(d.s, 'parry');
    await d.press('KeyU');
    for (let i = 0; i < 40 && count(d.s, 'parry') === before; i++) await d.step();
    assert(count(d.s, 'parry') === before + 1, 'o parry não aconteceu');
  };
  const breakByParries = async (query) => {
    const d = await duel(query);
    for (let i = 0; i < 3; i++) {
      await parry(d);
      if (i < 2) assert(d.enemy().structure.cur === 35 * (i + 1) && !d.enemy().structure.broken, `cada parry soma 35 de postura: ${JSON.stringify(d.enemy().structure)}`);
    }
    assert(d.enemy().structure.broken && d.enemy().structure.cur === 100 && d.enemy().hp === 60, `três parries deveriam quebrar a postura, sem tirar vida: ${JSON.stringify(d.enemy())}`);
    await d.until(() => d.free() && !d.s.player.counter.open, 120, 'o jogador deveria ficar livre depois do parry');
    return d;
  };
  {
    const d = await breakByParries('enemyGuard=0&enemyVariant=corcunda');
    assert(d.s.focusId === null, `os parries não dão foco: ${d.s.focusId}`);
    const hp0 = d.enemy().hp;
    await d.press('KeyJ', 'KeyK');
    assert(count(d.s, `finisher:${d.id}`) === 1, `o finalizador (J+K) deveria ser aceito: ${JSON.stringify(d.s.events.slice(-4))}`);
    assert(d.enemy().state === 'ragdollStun', `PST-06: o finalizador num quebrado que sobrevive deveria derrubar: ${d.enemy().state}`);
    assert(hp0 - d.enemy().hp === FINISHER && d.enemy().hp > 0, `PST-06: o finalizador tira ${FINISHER} e o inimigo sobrevive: ${hp0} -> ${d.enemy().hp}`);
    assert(d.s.focusId === d.id, `PST-13: o finalizador aceito dá o foco: ${d.s.focusId}`);
  }
  {
    const d = await breakByParries('enemyGuard=0&enemyVariant=corcunda');
    const hp0 = d.enemy().hp;
    await down('KeyS');
    await d.press('KeyK');
    await up('KeyS');
    assert(d.s.player.move === 'rasteira', `S+K deveria começar a rasteira: ${d.s.player.move}`);
    // A janela inteira em que a rasteira poderia derrubar: do aperto até o fim da quebra (1500 ms).
    let accepted = false;
    for (let i = 0; i < 120 && d.enemy().structure.broken; i++) {
      await d.step();
      assert(d.enemy().state !== 'ragdollStun', `EDG-11: a rasteira num quebrado não deveria derrubar (frame ${i}): ${d.enemy().state}`);
      assert(d.enemy().ragdollVisible === null, `EDG-11: o quebrado não deveria virar ragdoll (frame ${i})`);
      if (d.enemy().hp < hp0) accepted = true;
    }
    assert(accepted && hp0 - d.enemy().hp === RASTEIRA, `EDG-11: a rasteira deveria ser aceita (tira ${RASTEIRA}): ${hp0} -> ${d.enemy().hp}`);
    assert(!d.enemy().structure.broken, 'a janela deveria cobrir a quebra inteira');
  }

  // --- PST-14: o inimigo que não é o foco perde 40 de postura por segundo depois do atraso -----------------------------------------------
  {
    const d = await duel('enemyGuard=0&enemyVariant=corcunda');
    await parry(d);
    await parry(d);
    const gGain = d.gf;
    assert(d.enemy().structure.cur === 70 && d.s.focusId !== d.id, `dois parries dão 70 de postura e nenhum foco: ${JSON.stringify(d.enemy().structure)}, foco ${d.s.focusId}`);
    const drop = await decayAfterDelay(d, gGain, 'PST-14');
    assert(d.s.focusId !== d.id, `PST-14: o inimigo não deveria virar foco durante a medição: ${d.s.focusId}`);
    assert(Math.abs(drop - 40) <= 3, `PST-14: a postura de quem não é o foco deveria cair 40 em 1 s: caiu ${drop}`);
  }
}
