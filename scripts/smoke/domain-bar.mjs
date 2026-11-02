// Parte 1 do `domain.smoke.mjs`, barra (DHD-01 a DHD-03, DDB-01): a barra do Domínio sob a energia, lida do retângulo
// vivo (`hud.domainBar.fill` é a largura desenhada sobre a largura da barra, L-043 e L-076). Não é um cenário (o runner
// só roda `*.smoke.mjs`).

/** Sem Domínio escondida; `charge=50` meia; `charge=100` piscando; ativa, encolhe de 1 a 0 com o tempo do Domínio. */
export async function domainBar(kit, base) {
  let s = await kit.boot(`${base}&spawn=0`);
  kit.assert(!s.hud.domainBar.visible, `sem Domínio a barra some (DHD-01): ${JSON.stringify(s.hud.domainBar)}`);

  s = await kit.boot(`${base}&domain=santuario&charge=50&spawn=0`);
  const half = s.hud.domainBar;
  kit.assert(
    half.visible && half.fill === 0.5 && !half.blinking,
    `charge=50 enche metade (DHD-01): ${JSON.stringify(half)}`,
  );

  s = await kit.boot(`${base}&domain=santuario&charge=100&spawn=0`);
  kit.assert(
    s.hud.domainBar.fill === 1 && s.hud.domainBar.blinking,
    `cheia pisca (DHD-02): ${JSON.stringify(s.hud.domainBar)}`,
  );

  await kit.down('KeyP');
  s = await kit.frame();
  await kit.up('KeyP');
  for (let f = 0; f < 30 && s.hitstop.frozen; f++) s = await kit.frame();
  const start = s.hud.domainBar;
  kit.assert(
    start.fill > 0.97 && !start.blinking,
    `ativa começa cheia e sem piscar (DHD-03): ${JSON.stringify(start)}`,
  );
  s = await kit.snap(3000);
  const mid = s.hud.domainBar;
  const want = s.domain.active.remainingMs / 6000;
  kit.assert(
    Math.abs(mid.fill - want) <= 1 / 104 + 1e-9 && mid.fill < 0.6 && mid.fill > 0.4,
    `na metade do tempo, metade da barra (DHD-03): ${JSON.stringify(mid)} / ${want}`,
  );
  for (let i = 0; i < 40 && s.domain.active; i++) s = await kit.snap(100);
  kit.assert(s.domain.active === null && s.hud.domainBar.fill === 0, `acaba vazia: ${JSON.stringify(s.hud.domainBar)}`);
}
