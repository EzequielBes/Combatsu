// Cenário 1 do `power.smoke.mjs` (POW-13, POW-01): a run começa com a Força comprada pelo `?debug&mods=` e o
// snapshot lê os pontos, o patamar e os atributos da folha. Não é um cenário (o runner só roda `*.smoke.mjs`); fica à
// parte para o `power.smoke` caber no teto de linhas.
import { makeKit } from './fight-kit.mjs';

const BASE = 'hd=1&area=modular&enemyGuard=0&noshop=1';
const MANOPLAS_3 = 'arsenal=manoplas,manoplas,manoplas';
const near = (a, b) => Math.abs(a - b) < 1e-9;

/** Abre a run com a query e devolve o primeiro snapshot da rodada 1. */
async function runWith(kit, query) {
  return kit.boot(query ? `${BASE}&${query}` : BASE);
}

/** POW-13.4: Força 5 e Manoplas Nv 3 são 11 pontos (patamar 3, escala no teto de 10); só a Força, patamar 2. */
async function boughtForceTiers(kit, assert) {
  let s = await runWith(kit, `mods=forca:5&${MANOPLAS_3}`);
  assert(
    s.modifiers.forca === 5 && s.power.points === 11 && s.power.tier === 3 && near(s.power.impactScale, 1.5),
    `POW-13.4: esperava 11 pontos, patamar 3 e escala 1,5: ${JSON.stringify(s.modifiers)} ${JSON.stringify(s.power)}`,
  );
  // POW-01: as Manoplas Nv 3 entram no forte (×1,3); a Força da loja fica no dano base, fora do multiplicador.
  assert(
    near(s.stats.meleeMul, 1.3) && s.stats.techDamageMul === 1 && s.stats.costMul === 1,
    `POW-01/13: com Manoplas Nv 3 os atributos deveriam ser 1,3 / 1 / 1: ${JSON.stringify(s.stats)}`,
  );

  s = await runWith(kit, 'mods=forca:5');
  assert(
    s.power.points === 5 && s.power.tier === 2,
    `POW-13.4: só a Força 5 deveria dar patamar 2: ${JSON.stringify(s.power)}`,
  );
  assert(
    s.stats.meleeMul === 1 && s.stats.techDamageMul === 1 && s.stats.costMul === 1,
    `POW-01/13: sem Manoplas os atributos deveriam ser 1: ${JSON.stringify(s.stats)}`,
  );
}

/** POW-13.2/3: sem `mods=` nada sobe; entrada inválida some; o nível para no teto do `apply` (Força 5). */
async function invalidAndCapped(kit, assert) {
  let s = await runWith(kit, '');
  assert(
    s.modifiers.forca === 0 && s.power.points === 0 && s.power.tier === 0,
    `POW-13.4: sem nada deveria ser patamar 0: ${JSON.stringify(s.power)}`,
  );

  s = await runWith(kit, 'mods=xx:2,forca:-1');
  assert(
    s.modifiers.forca === 0 && s.power.points === 0,
    `POW-13.3: entradas inválidas deveriam ser ignoradas: ${JSON.stringify(s.modifiers)} ${JSON.stringify(s.power)}`,
  );

  s = await runWith(kit, 'mods=forca:9');
  assert(
    s.modifiers.forca === 5 && s.power.points === 5,
    `POW-13.2: forca:9 deveria parar no nível 5: ${JSON.stringify(s.modifiers)} ${JSON.stringify(s.power)}`,
  );

  // README: `vida:N` sobe o teto no `sync` sem curar.
  s = await runWith(kit, 'mods=vida:2');
  assert(
    s.modifiers.vida === 2 && s.player.maxHp > s.player.hp,
    `vida:2 deveria subir a vida máxima sem curar: ${JSON.stringify(s.modifiers)} hp=${s.player.hp}/${s.player.maxHp}`,
  );
}

export async function boughtModifiers(ctx) {
  const kit = makeKit(ctx);
  await boughtForceTiers(kit, ctx.assert);
  await invalidAndCapped(kit, ctx.assert);
}
