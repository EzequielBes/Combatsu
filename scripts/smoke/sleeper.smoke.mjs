// Dorminhoco (NPC da rua) em HD, com `?debug&hd=1&modules=rua&maxAlive=0`: ele dorme calado, o golpe dado longe não
// o acorda, o golpe dado perto começa a frase letra por letra, e depois de dita ele volta a só dormir. Fora da rua
// (`modules=beco`) ele não existe.
const LINE = 'Preciso criar agentes, agentes... preciso agentes zzzz';

export default async function ({ page, baseUrl, assert }) {
  const load = async (modules) => {
    await page.goto(`${baseUrl}?debug&hd=1&seed=3&maxAlive=0&modules=${modules}`, { waitUntil: 'load' });
    await page.waitForFunction(
      () => {
        try {
          return !!window.__game.snapshot();
        } catch {
          return false;
        }
      },
      { timeout: 15_000 },
    );
    await page.evaluate(() => window.__game.step(20));
    await page.keyboard.press('KeyJ', { delay: 50 });
    return step(600);
  };
  const step = (ms) =>
    page.evaluate((m) => {
      window.__game.step(m);
      return window.__game.snapshot();
    }, ms);
  const jab = async () => {
    await page.keyboard.down('KeyJ');
    await step(50);
    await page.keyboard.up('KeyJ');
    return step(150);
  };

  let s = await load('rua');
  const npc = s.area.sleeper;
  assert(npc !== null, 'a rua deveria ter o dorminhoco');
  assert(!npc.talking && npc.text === '' && npc.frame === 'sleep', `deveria dormir calado: ${JSON.stringify(npc)}`);
  assert(npc.depth < s.area.layout.playerDepth, `deveria ficar atrás do player: ${npc.depth}`);

  // Golpe dado longe: continua dormindo.
  assert(Math.abs(s.player.x - npc.x) > 80, `o player deveria nascer longe do dorminhoco: ${s.player.x} / ${npc.x}`);
  s = await jab();
  assert(!s.area.sleeper.talking, 'o golpe dado longe não deveria fazê-lo falar');

  // Anda até ele e golpeia.
  const key = s.player.x < npc.x ? 'KeyD' : 'KeyA';
  await page.keyboard.down(key);
  for (let i = 0; i < 200 && Math.abs(s.player.x - npc.x) > 24; i++) s = await step(33);
  await page.keyboard.up(key);
  assert(Math.abs(s.player.x - npc.x) <= 40, `o player deveria ter chegado perto: ${s.player.x} / ${npc.x}`);
  s = await step(300);
  s = await jab();
  let said = s.area.sleeper;
  assert(said.talking, `o golpe dado perto deveria fazê-lo falar: ${JSON.stringify(said)}`);
  assert(said.text.length > 0 && LINE.startsWith(said.text), `a fala deveria ser o começo da frase: "${said.text}"`);
  assert(said.text.length < LINE.length, 'a frase deveria sair aos poucos');

  // A boca mexe enquanto fala.
  const frames = new Set();
  for (let i = 0; i < 20; i++) frames.add((await step(50)).area.sleeper.frame);
  assert(frames.has('talk-0') && frames.has('talk-1'), `a boca deveria alternar: ${[...frames].join(',')}`);

  s = await step(2500);
  said = s.area.sleeper;
  assert(said.talking && said.text === LINE, `a frase inteira deveria estar na tela: "${said.text}"`);

  s = await step(3000);
  said = s.area.sleeper;
  assert(
    !said.talking && said.text === '' && said.frame === 'sleep',
    `deveria voltar a dormir: ${JSON.stringify(said)}`,
  );

  // Fora da rua ele não existe.
  s = await load('beco');
  assert(s.area.sleeper === null, 'o beco não deveria ter o dorminhoco');
}
