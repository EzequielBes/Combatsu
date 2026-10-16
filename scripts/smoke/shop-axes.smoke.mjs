// Loja com carta de eixo (CRD-01, CRD-04, CRD-05) no mundo modular em HD, com
// `?debug&hd=1&area=modular&fragments=200&round=4&tech=vermelho&axes=vermelho.potencia:1`: a konbini abre com 4 cartas,
// a carta do Vermelho traz dois eixos, `S` troca o eixo e a tecla do slot compra o ponto no eixo escolhido.
import { BASE, makeShopKit } from './shop-axes-kit.mjs';

/** Nome do eixo na carta (`AXIS_NAMES`), só dos eixos do Vermelho que o sorteio pode trazer. */
const NAMES = {
  potencia: 'Potência',
  escala: 'Escala',
  conjuracao: 'Conjuração',
  eficiencia: 'Eficiência',
  recarga: 'Recarga',
  perfuracao: 'Perfuração',
};

export default async function (ctx) {
  const { assert } = ctx;
  const kit = makeShopKit(ctx);

  // CRD-01: a konbini abre com 4 cartas distintas.
  let s = await kit.open(`${BASE}&axes=vermelho.potencia:1`);
  s = await kit.clearAndReachShop(s);
  assert(s.run.state === 'shop', `deveria chegar à loja: ${JSON.stringify(s.run)}`);
  assert(s.shop.offers.length === 4, `CRD-01: 4 cartas: ${JSON.stringify(s.shop.offers)}`);
  assert(
    new Set(s.shop.offers.map((o) => o.id)).size === 4,
    `CRD-01: cartas repetidas: ${JSON.stringify(s.shop.offers)}`,
  );
  assert(s.shop.panel.cards.length === 4, `CRD-01: o painel desenha 4 cartas: ${JSON.stringify(s.shop.panel)}`);

  // CRD-04: a carta do Vermelho traz o eixo-foco (Potência, o único com ponto) e outro eixo.
  s = await kit.rerollToRedCard(s);
  const red = s.shop.offers[0];
  assert(
    red.axes.length === 2 && red.axes[0] === 'potencia' && red.axes[1] !== 'potencia',
    `CRD-04: eixos da carta do Vermelho: ${JSON.stringify(red)}`,
  );
  assert(red.selectedAxis === 'potencia', `CRD-05: o eixo-foco começa escolhido: ${JSON.stringify(red)}`);
  assert(red.cost === 16 && red.level === 2, `PRC-02: o 2º ponto custa 16 no Nv 2: ${JSON.stringify(red)}`);
  const second = red.axes[1];
  s = await kit.selectCard(s, 0);
  const marked = (snap, axis) =>
    snap.shop.panel.cards[0].lines.some((l) => l.split('\n').some((x) => x.startsWith(`›${NAMES[axis]} `)));
  assert(marked(s, 'potencia'), `CRD-05: a Potência deveria levar o ›: ${JSON.stringify(s.shop.panel.cards[0])}`);

  // CRD-05: `S` troca para o 2º eixo e o ponto vai para ele.
  s = await kit.tap('KeyS');
  assert(
    s.shop.offers[0].selectedAxis === second,
    `CRD-05: S deveria escolher ${second}: ${JSON.stringify(s.shop.offers[0])}`,
  );
  assert(marked(s, second), `CRD-05: o ${second} deveria levar o ›: ${JSON.stringify(s.shop.panel.cards[0])}`);
  s = await kit.tap('KeyW');
  assert(s.shop.offers[0].selectedAxis === 'potencia', `CRD-05: W volta ao foco: ${JSON.stringify(s.shop.offers[0])}`);
  s = await kit.tap('KeyS');
  const wallet = s.wallet.fragments;
  s = await kit.tap('Digit1');
  assert(
    s.events.includes('buy:vermelho:16') && s.events.includes(`axis:vermelho.${second}`),
    `CRD-01: a tecla 1 deveria comprar o ponto em ${second}: ${JSON.stringify(s.events)}`,
  );
  assert(s.wallet.fragments === wallet - 16, `PRC-02: carteira ${wallet} - 16 != ${s.wallet.fragments}`);
  const axes = s.build.vermelho.axes;
  assert(
    axes.potencia === 1 && axes[second] === 1 && s.build.vermelho.level === 3,
    `CRD-05: o ponto deveria estar em ${second}: ${JSON.stringify(s.build.vermelho)}`,
  );
  assert(s.shop.offers[0].sold === true, `a carta 0 deveria ficar vendida: ${JSON.stringify(s.shop.offers)}`);
}
