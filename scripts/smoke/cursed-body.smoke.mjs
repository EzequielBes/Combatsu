// Corpo Amaldiçoado no jogo vivo (CRP-01 a CRP-15), no mundo modular em HD com
// `?debug&hd=1&area=modular&seed=1&maxAlive=1&enemyGuard=0`. Cada cenário abre a sua própria página e lê do motor o
// efeito dos pontos do Corpo (a vida e o estado do inimigo, a duração do golpe), não só o `build.corpo` do snapshot.
import { makeKit } from './fight-kit.mjs';

export const BASE = 'hd=1&area=modular&enemyGuard=0';

/**
 * Encosta no inimigo, aperta `key` e passa quadros até ele perder vida; devolve o dano levado, o estado dele logo
 * depois do acerto e o snapshot desse quadro.
 */
export async function strikeOnce(kit, ctx, key, label) {
  let s = await kit.approach();
  const before = new Map(s.enemies.map((e) => [e.id, e.hp]));
  await kit.down(key);
  let hit = null;
  for (let f = 0; f < 60 && hit === null; f++) {
    s = await kit.frame();
    if (f === 1) await kit.up(key);
    hit = s.enemies.find((e) => e.hp < (before.get(e.id) ?? e.hp)) ?? null;
  }
  await kit.up(key);
  ctx.assert(hit !== null, `${label}: o golpe deveria acertar: ${JSON.stringify(s.enemies.map((e) => [e.x, e.hp]))}`);
  return { damage: before.get(hit.id) - hit.hp, id: hit.id, s };
}

/** Estado do inimigo `id` ao longo de `frames` quadros: devolve se ele chegou a `ragdollStun`. */
async function fellWithin(kit, id, frames) {
  for (let f = 0; f < frames; f++) {
    const s = await kit.frame();
    if (s.enemies.find((e) => e.id === id)?.state === 'ragdollStun') return true;
  }
  return false;
}

/** CRP-03.5: com Peso 2 o forte (`K`, chute frontal) derruba o comum; com Peso 1 ele só cambaleia. */
async function weightKnockdown(ctx) {
  const kit = makeKit(ctx);
  await kit.boot(`${BASE}&axes=corpo.peso:2`);
  const heavy = await strikeOnce(kit, ctx, 'KeyK', 'Peso 2');
  ctx.assert(await fellWithin(kit, heavy.id, 6), `CRP-03.5: com Peso 2 o forte deveria derrubar o comum`);
  await kit.boot(`${BASE}&axes=corpo.peso:1`);
  const light = await strikeOnce(kit, ctx, 'KeyK', 'Peso 1');
  ctx.assert(!(await fellWithin(kit, light.id, 6)), `CRP-03.5: com Peso 1 o forte não deveria derrubar o comum`);
}

/** Jab (6) com Força 5 (+50 %): `round(6 × 1,5)` = 9; com Impacto 3, `round(6 × 1,5 × 1,3)` = 12 (CRP-02). */
const JAB_FORCA_5 = 9;
const JAB_FORCA_5_IMPACTO_3 = 12;

/** CRP-02: o Impacto 3 soma 3 pontos de força à Força 5 e multiplica o dano do `jab` por 1,3 sobre a Força. */
async function impactDamage(ctx) {
  const kit = makeKit(ctx);
  await kit.boot(`${BASE}&mods=forca:5`);
  const plain = await strikeOnce(kit, ctx, 'KeyJ', 'Força 5');
  ctx.assert(plain.damage === JAB_FORCA_5, `MOD-05: o jab com Força 5 deveria tirar ${JAB_FORCA_5}: ${plain.damage}`);
  const s = await kit.boot(`${BASE}&axes=corpo.impacto:3&mods=forca:5`);
  ctx.assert(s.power.points === 8, `CRP-02.3: Força 5 + Impacto 3 = 8 pontos: ${JSON.stringify(s.power)}`);
  const built = await strikeOnce(kit, ctx, 'KeyJ', 'Impacto 3');
  ctx.assert(
    built.damage === JAB_FORCA_5_IMPACTO_3,
    `CRP-02.2: o jab com Impacto 3 deveria tirar ${JAB_FORCA_5_IMPACTO_3}: ${built.damage}`,
  );
}

/** CRP-01: o Corpo começa no Nv 1, sobe com os pontos e volta ao Nv 1 na run nova (`R`). */
async function levelResets(ctx) {
  const kit = makeKit(ctx);
  let s = await kit.boot(BASE);
  ctx.assert(s.build.corpo.level === 1, `CRP-01: o Corpo começa no Nv 1: ${JSON.stringify(s.build.corpo)}`);
  s = await kit.boot(`${BASE}&axes=corpo.peso:2`);
  ctx.assert(s.build.corpo.level === 3, `CRP-01: Peso 2 dá o Nv 3: ${JSON.stringify(s.build.corpo)}`);
  // Sem o `axes=` na URL, a run nova do `R` não recebe os pontos de novo: o que sobrar viria da run anterior.
  await ctx.page.evaluate(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('axes');
    window.history.replaceState(null, '', url);
  });
  await kit.tap('KeyR');
  s = await kit.snap(50);
  if (s.run.state === 'title') s = await kit.tap('KeyJ');
  ctx.assert(
    s.build.corpo.level === 1 && s.build.corpo.axes.peso === 0,
    `CRP-01: o R volta o Corpo ao Nv 1: ${JSON.stringify(s.build.corpo)}`,
  );
}

export default async function (ctx) {
  await levelResets(ctx);
  await weightKnockdown(ctx);
  await impactDamage(ctx);
}
