// Ajudantes do `cursed-body.smoke.mjs` e dos módulos de cenário dele. Não é um cenário (o runner só roda `*.smoke.mjs`).

/** Query comum dos cenários no mundo modular em HD (o kit acrescenta `seed=1`, `maxAlive=1` e `shove=0`). */
export const BASE = 'hd=1&area=modular&enemyGuard=0';

/** Boneco de treino do laboratório (parado, x 392) usado quando o alvo precisa ficar parado. */
export const DUMMY_X = 392;

/**
 * Encosta no inimigo, aperta `key` e passa quadros até ele perder vida; devolve o dano levado, o id do atingido e o
 * snapshot desse quadro.
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

/**
 * Abre o laboratório (`?debug&hd=1&fxlab`) e leva o player para a direita do boneco de x 392, de frente para ele, a
 * `dist` px (passos de um quadro no fim, ~0,3 px); devolve o snapshot.
 */
export async function walkToDummy(kit, ctx, query, dist) {
  let s = await kit.boot(`hd=1&fxlab&${query}`);
  await kit.down('KeyD');
  for (let i = 0; i < 400 && s.player.x < DUMMY_X + dist + 40; i++) s = await kit.frame();
  await kit.up('KeyD');
  await kit.snap(300);
  await kit.tap('KeyA', 16);
  s = await kit.snap(300);
  for (let i = 0; i < 200 && s.player.x - DUMMY_X > dist; i++) {
    await kit.tap('KeyA', 16);
    s = await kit.snap(100);
  }
  const at = s.player.x - DUMMY_X;
  ctx.assert(s.player.facing === -1 && Math.abs(at - dist) < 1, `o player deveria parar a ${dist} px: ${at}`);
  return s;
}
