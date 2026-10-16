// Painel do ramo na entrada da konbini (CRD-08, CRD-09), cenários do `shop-axes.smoke.mjs`. Não é um cenário próprio
// (o runner só roda `*.smoke.mjs`): o arquivo existe para o `shop-axes` caber no teto de 400 linhas.
import { BASE } from './shop-axes-kit.mjs';

/** `ramo=` põe um ramo no começo; sem ele o Nv 2 do `axes=` deixa o ramo pendente. */
const PENDING = (axes) => `${BASE}&axes=${axes}`;

/** Ramo pendente do debug: o painel abre antes da loja, a loja ignora as teclas e `Enter` aplica o ramo (CRD-08). */
async function pendingFromDebug({ assert }, kit) {
  let s = await kit.open(PENDING('vermelho.potencia:1'));
  s = await kit.clearAndReachShop(s);
  assert(s.run.state === 'shop', `deveria chegar à konbini: ${JSON.stringify(s.run)}`);
  assert(
    s.choice.open === true && s.choice.page.item === 'vermelho',
    `CRD-08: o painel do Vermelho deveria abrir antes da loja: ${JSON.stringify(s.choice)}`,
  );
  assert(
    JSON.stringify(s.choice.page.options) === '["Ricochete","Contido"]',
    `CRD-09: opções da página: ${JSON.stringify(s.choice.page)}`,
  );
  assert(kit.shopCards(s) === 0, `CRD-08: a loja não deveria aparecer com o painel aberto: ${kit.shopCards(s)}`);
  // A loja não lê teclas com o painel aberto: compra, reroll e seleção ficam parados.
  const wallet = s.wallet.fragments;
  const selected = s.shop.selected;
  for (const key of ['Digit1', 'KeyR', 'KeyS']) s = await kit.tap(key);
  assert(
    s.wallet.fragments === wallet && !s.events.some((e) => e.startsWith('buy')) && s.shop.rerollCost === 5,
    `CRD-08: a loja leu teclas com o painel aberto: ${JSON.stringify(s.events)}`,
  );
  assert(s.shop.selected === selected, `CRD-08: a seleção da loja mexeu: ${selected} -> ${s.shop.selected}`);
  assert(
    s.build.vermelho.branch === null,
    `o ramo não deveria estar aplicado ainda: ${JSON.stringify(s.build.vermelho)}`,
  );
  // `D` escolhe a opção B (Contido) e `Enter` confirma: o ramo vale na hora, o painel fecha e a loja abre.
  s = await kit.tap('KeyD');
  s = await kit.tap('Enter');
  assert(
    s.events.includes('branch:vermelho:contido'),
    `CRD-08: esperava branch:vermelho:contido: ${JSON.stringify(s.events)}`,
  );
  assert(s.build.vermelho.branch === 'contido', `CRD-08: o ramo deveria valer: ${JSON.stringify(s.build.vermelho)}`);
  assert(
    s.choice.open === false && s.choice.page === null && kit.shopCards(s) === 4,
    `CRD-08: o painel fecha e a loja abre: ${JSON.stringify(s.choice)} cartas ${kit.shopCards(s)}`,
  );
}

/** Vermelho e Corpo pendentes: duas páginas, o Vermelho primeiro, e a loja só depois da última (CRD-08). */
async function twoPages({ assert }, kit) {
  let s = await kit.open(PENDING('vermelho.potencia:1,corpo.impacto:1'));
  s = await kit.clearAndReachShop(s);
  assert(
    s.choice.open && s.choice.page.item === 'vermelho',
    `CRD-08: 1ª página do Vermelho: ${JSON.stringify(s.choice)}`,
  );
  s = await kit.tap('Enter'); // opção A
  assert(
    s.build.vermelho.branch === 'ricochete',
    `CRD-08: a opção A é o Ricochete: ${JSON.stringify(s.build.vermelho)}`,
  );
  assert(
    s.choice.open &&
      s.choice.page.item === 'corpo' &&
      JSON.stringify(s.choice.page.options) === '["Cadência","Onda do Punho"]',
    `CRD-08: 2ª página do Corpo: ${JSON.stringify(s.choice)}`,
  );
  assert(kit.shopCards(s) === 0, `CRD-08: a loja espera a última página: ${kit.shopCards(s)}`);
  s = await kit.tap('KeyD');
  s = await kit.tap('Enter');
  assert(
    s.build.corpo.branch === 'ondaDoPunho',
    `CRD-08: a opção B é a Onda do Punho: ${JSON.stringify(s.build.corpo)}`,
  );
  assert(!s.choice.open && kit.shopCards(s) === 4, `CRD-08: a loja abre depois da última página: ${kit.shopCards(s)}`);
}

/**
 * Comprar o 1º ponto na loja deixa o ramo pendente; na konbini seguinte (rodada de chefe) o `VowPanel` vem antes do
 * `ChoicePanel`, e a loja só depois dos dois (CRD-08, edge case).
 */
async function purchaseThenBoss({ assert }, kit) {
  const boss = 'bossArch=oni&bossAffix=none&finger=0';
  let s = await kit.open(`${BASE}&${boss}`);
  s = await kit.clearAndReachShop(s);
  assert(s.run.state === 'shop' && !s.choice.open, `a loja da rodada 4 abre sem painel: ${JSON.stringify(s.choice)}`);
  s = await kit.rerollToRedCard(s);
  s = await kit.selectCard(s, 0);
  s = await kit.tap('Digit1');
  assert(
    s.events.includes('axis:vermelho.potencia') && s.events.includes('branchPending:vermelho'),
    `CRD-08: o 1º ponto deveria deixar o ramo pendente: ${JSON.stringify(s.events)}`,
  );
  s = await kit.tap('Enter');
  // Na konbini a saída escurece a câmera antes de fechar a loja.
  for (let i = 0; i < 40 && s.run.state === 'shop'; i++) s = await kit.step(50);
  assert(
    s.run.state === 'roundActive' && s.run.round === 5,
    `a rodada 5 (chefe) deveria começar: ${JSON.stringify(s.run)}`,
  );
  s = await kit.clearAndReachShop(s);
  assert(
    s.run.state === 'shop' && s.vows.panelCards === 3,
    `o VowPanel vem antes na rodada de chefe: ${JSON.stringify(s.vows)}`,
  );
  assert(!s.choice.open, `CRD-08: o ChoicePanel espera o VowPanel: ${JSON.stringify(s.choice)}`);
  s = await kit.tap('Enter'); // recusa o voto
  assert(
    s.choice.open && s.choice.page.item === 'vermelho',
    `CRD-08: depois do voto, o painel do ramo: ${JSON.stringify(s.choice)}`,
  );
  assert(kit.shopCards(s) === 0, `CRD-08: a loja espera o painel do ramo: ${kit.shopCards(s)}`);
  s = await kit.tap('Enter');
  assert(
    s.build.vermelho.branch === 'ricochete' && !s.choice.open && kit.shopCards(s) > 0,
    `CRD-08: o ramo vale e a loja abre: ${JSON.stringify(s.build.vermelho)}`,
  );
}

export async function branchScenarios(ctx, kit) {
  await pendingFromDebug(ctx, kit);
  await twoPages(ctx, kit);
  await purchaseThenBoss(ctx, kit);
}
