# Validation: personagem-e-vermelho - PASS

**Resultado da rodada 2**: aprovada. Os gaps da rodada 1 (EDG-02, EDG-03, RDA-07, RDA-10, RDA-12, M10, M11) têm agora asserção no valor da spec e mutantes mortos. Um resíduo baixo permanece (ver "Resíduos").
**Branch**: `feat/personagem-e-vermelho`
**Diff range**: `dev..HEAD` = `412b8fa..e7c0ada` (merge-base com `dev`; o `dev` atual `e64734e` já avançou com outra feature, então o range é medido do merge-base). Correções da rodada 2: `ae8fc72..e7c0ada` (6 commits: `4f18b80`, `1e76938`, `8ef6429`, `90bd0b4`, `16c6c37`, `e7c0ada`; 9 arquivos, +201/-22).
**Verifier**: independente (autor != verificador), Sonnet 5.5. Nenhum código de produção ou teste foi alterado.

## Resumo da rodada 1 (FAIL por cobertura)

Reprovou por evidence-or-zero em EDG-02, EDG-03, RDA-12, RDA-07 (período) e RDA-10 (duração); mutantes M10 (durações `REPULSE_MS`/`TRAIL_FADE_MS`/`DISTORT_PERIOD_MS`) e M11 (chefe na repulsão) sobreviveram. Os demais 10 mutantes (arte e núcleo) foram mortos e SPF-01..07, RDA-01..06, 08, 09, 11, 13, 15 estavam OK. Gaps de baixa severidade: RDA-04 sem medição no `release`, RDA-02 sem raios exatos, RDA-14 sem prova de uso, EDG-01 sem ramo sem WebGL.

## Re-verificação dos gaps da rodada 1

| Gap | Resultado definido na spec | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| EDG-03 (chefe fora da repulsão) | a repulsão nunca atinge o chefe | `tests/core/redOrb.test.ts:210-216` (`repulseTargetsFor(origin,1,[boss dx 10, enemy dx 40])` -> `targetId` `[2]`), `:218` (só chefe -> `[]`), `:222` (80 entra, 81 não, atrás não: `[1]`). Adaptador: `src/game/TechRunner.ts:349-354` monta `kind` e chama `repulseTargetsFor` | PASS na lógica (M11-core morto). Resíduo no mapeamento `kind` (ver abaixo) |
| EDG-02 (solta no ar) | repulsão igual; recuo de 12 px só no chão | `redOrb.test.ts:227` (`redReleaseEffects({grounded:true})` `toEqual({repulse:true,pushPx:12})`), `:231` (`grounded:false` -> `pushPx:0`). Adaptador `TechRunner.ts:322-325` usa `effects.pushPx`/`effects.repulse`. Smoke `red-anime.smoke.mjs` cenário C: no ar `hit.hp === hpBefore - 4` e `airRecoil < 2`; controle no chão `groundRecoil >= 8` | PASS (M12 unit e M12 adaptador mortos) |
| RDA-10 (120 ms) | `red.repulse` por 120 ms | `tests/game/redTiming.test.ts:5` (`REPULSE_MS toBe(120)`); smoke `red-anime.smoke.mjs` cenário B: `repulseFrames >= 7 && <= 8`. Adaptador `RedOrb.ts:249,252,270` usa `REPULSE_MS` | PASS (M10a morto; adaptador literal 500 morto pelo smoke: 21 frames) |
| RDA-12 (fantasma por frame, 180 ms) | um fantasma por frame, some em 180 ms | `redTiming.test.ts:9-11` (`TRAIL_EVERY_MS toBe(FRAME_MS)`, `TRAIL_FADE_MS toBe(180)`); adaptador `RedOrb.ts:293-300` | PASS (M10b morto). Spec-precision: o uso em runtime só é provado por import, não medido |
| RDA-07 (período 400 ms) | uma volta a cada 400 ms | `redTiming.test.ts:15` (`DISTORT_PERIOD_MS toBe(400)`); adaptador `RedOrb.ts:191` | PASS (M10c morto). Mesmo comentário de runtime |
| RDA-02 (raios) | W 0,3 / T 0,55 / R 0,8 / t borda | `tests/game/art.test.ts:352-368` (por pixel, tamanhos 8 e 12: `expected = r<=0.3?'W': r<=0.55?'T': r<=0.8?'R': r<=1?'t'`, `expect(cells[y][x]).toBe(expected)` e os 4 anéis existem) | PASS (M13 `0.55 -> 0.6` morto) |
| RDA-14 (uso só de `RED_FX_COLORS`) | só `b,t,T,R,W` | `tests/game/redOrbFxSource.test.ts:9-17` (regex em `RedOrb.ts?raw`: nenhum `PALETTE.<chave>` fora de `{b,t,T,R,W}`; todo `PALETTE[...]` casa `RED_FX_COLORS.\w+`) | PASS (teste de código-fonte; limite conhecido: não executa o efeito) |
| RDA-04 no release | orbe a <= 2 px da ponta do frame atual | smoke `red-anime.smoke.mjs:101-113`: `launchX = orb.x - facing*traveled`, `dist <= 2` contra `FINGERTIP[repulse.player.frame]` | PASS. Decisão do orquestrador aceita: o orbe nasce na ponta do frame em cena no tick da soltura (ainda `vermelho-charge`); a medição é coerente (usa o frame reportado no mesmo snapshot, recua o 1º passo de voo) |
| EDG-01 | sem WebGL: camadas sem `glow.active` | sem mudança: o headless roda com WebGL, o ramo `degraded` não executa | PARTIAL aceito (baixa, AD-009), não regrediu |

### L-043 confirmado (o adaptador usa as funções/constantes extraídas)

- `TechRunner.ts:11` importa `redReleaseEffects`, `repulseTargetsFor`; usados em `:323` e `:354`. `RED_PUSH_PX` removido (`grep` sem ocorrência em `src`).
- `RedOrb.ts:9` importa de `redTiming.ts`; usos reais em `:191` (período), `:249,252,270` (repulsão), `:293-300` (rastro). Nenhum literal 120/180/400 sobrou no adaptador.
- Prova empírica: trocar o literal no adaptador (`REPULSE_MS` -> 500) e `grounded` -> `true` é morto pelo smoke `red-anime`.

### Spot-check de regressão (ACs de maior risco)

`playerConsistency.test.ts` (SPF-01..06), `art.test.ts` (SPF-07, RDA-01..03), `redOrb.test.ts` (RDA-08/09/11) e smoke `red-anime`/`fight-integration` rodaram verdes no gate completo abaixo. Nenhuma asserção removida nem afrouxada nos 9 arquivos da diff de correção (só adições; o smoke acrescenta o cenário C e as medições RDA-04 release e RDA-10).

## Sensor de discriminação (rodada 2, leve, 9 mutantes + reaproveitando os 10 mortos da rodada 1)

Scratch: `git worktree add <scratchpad>\wt-f10-verify2 HEAD` com junction `node_modules`; cada mutante revertido por `git checkout -- src`. Worktree removida, `git status --porcelain` da WT igual ao baseline (`M .specs/LESSONS.md`, `M .specs/lessons.json`, `?? validation.md`), `node_modules` do repo principal intacto (58 entradas).

| # | Mutante | Alvo | Resultado |
| --- | --- | --- | --- |
| M10a | `REPULSE_MS` 120 -> 500 | `redTiming.ts` | MORTO (`redTiming.test.ts` RDA-10) |
| M10b | `TRAIL_FADE_MS` 180 -> 600 | `redTiming.ts` | MORTO (RDA-12) |
| M10c | `DISTORT_PERIOD_MS` 400 -> 900 | `redTiming.ts` | MORTO (RDA-07) |
| M10-adapt | `RedOrb.ts:249` `fx.add('red.repulse', 500)` (literal no adaptador) | `RedOrb.ts` | MORTO pelo smoke `red-anime`: "RDA-10: red.repulse deveria durar ~120 ms (7-8 frames): 21" |
| M12 | `pushPx` no ar passa a 12 (`state.grounded ? 12 : 12`) | `src/core/redOrb.ts` | MORTO (`redOrb.test.ts` "no ar repele igual e não recua") |
| M12-adapt | `redReleaseEffects({ grounded: true })` | `TechRunner.ts:323` | MORTO pelo smoke: "EDG-02/RED-15: no ar a soltura não deveria recuar o player: 12.00" |
| M13 | rampa `0.55 -> 0.6` | `techFx.ts:39` | MORTO (`art.test.ts` RDA-02) |
| M11-core | `repulseTargetsFor` sem o filtro do chefe | `redOrb.ts` | MORTO (2 testes EDG-03) |
| M11-adapt | `kind: e instanceof Boss ? 'boss' : 'enemy'` -> sempre `'enemy'` | `TechRunner.ts:~350` | SOBREVIVEU (1447/1447; não há smoke com chefe + Vermelho) |

**Resultado**: 8 de 9 mortos. O sobrevivente é o mapeamento de uma linha `instanceof Boss -> 'boss'` no adaptador.

## Resíduos (não bloqueantes)

1. M11-adapt: o mapeamento `Boss -> kind: 'boss'` em `TechRunner.ts:~350` não tem teste (a lógica de exclusão e o contrato `kind` estão cobertos). Risco baixo: uma linha, mesma `instanceof` que já existia. Correção opcional: smoke com chefe colado e HP inalterado.
2. Uso em runtime de `TRAIL_FADE_MS`/`DISTORT_PERIOD_MS` só provado por import (RDA-12/07); `REPULSE_MS` é medido no smoke.
3. EDG-01 ramo sem WebGL não exercitado no headless (AD-009).
4. SPF-03/04: só o lado "passa" nos dados reais (sem fixture de 9 que falhe); mutante M2 cobre o lado "falha".
5. Cosmético: sobrou o comentário `/** RED-15: recuo ... */` órfão em `TechRunner.ts:51` (sem constante abaixo).

## Gates

| Gate | Resultado |
| --- | --- |
| `npm run typecheck` | exit 0 |
| `npm test` | 72 arquivos, 1447 testes passam, 0 falhas, 0 skips (rodada 1: 70/1436; +11 testes, +2 arquivos: `redTiming.test.ts`, `redOrbFxSource.test.ts`); `lightning.test.ts` passou limpo |
| `npm run smoke` completo | 25 cenários ok, 0 falhas (incluindo `fight` e `armed`, sem flake nesta rodada; `fight` "y=462" segue registrado como intermitente sob carga) |
| Contagem antes (`dev`, `412b8fa`) | 69 arquivos, 1135 testes; delta total +312, nenhum removido |

## Qualidade do código

| Princípio | Status |
| --- | --- |
| Mínimo de código / sem scope creep | OK. Extrações puras (`repulseTargetsFor`, `redReleaseEffects`, `redTiming.ts`) sem `phaser`, comportamento do jogo idêntico |
| Mudanças cirúrgicas | OK. `TechRunner.ts` +12/-9, `RedOrb.ts` troca literais por import |
| Segue padrões existentes | OK |
| Asserções = valores da spec | OK (120, 180, 400, 12/0, 0,3/0,55/0,8, 4 de dano, 80/81) |
| Todo teste mapeia a AC | OK (nomes citam RDA/EDG/RED) |
| Diretrizes de projeto | AD-009/AD-012/AD-017, L-010 (limites nos dois lados), L-043 (adaptador) seguidas |

## Rastreabilidade (spec.md)

| Requisito | Rodada 1 | Rodada 2 |
| --- | --- | --- |
| SPF-01..07 | Verificado | Verificado |
| RDA-01..06, 08, 09, 11, 13, 15 | Verificado | Verificado |
| RDA-07, 10, 12, 14 | Parcial / Precisa correção | Verificado |
| EDG-02 | Precisa correção | Verificado |
| EDG-03 | Precisa correção | Verificado (resíduo baixo no mapeamento do adaptador) |
| EDG-01 | Parcial | Parcial aceito (AD-009) |

## Lições

Registrada 1: `L-043` (recorrência 3, confirmada) via `lessons.py --root`, sinal `surviving_mutant` M11-adapt. As lições L-047 e L-048 da rodada 1 permanecem; os gaps que as geraram agora estão fechados.

## Resumo

**Overall**: Pronto (PASS ✅, rodada 2 de até 3).
**Checagem ancorada**: 25 de 25 ACs com asserção no valor da spec (EDG-01 parcial aceito); spec-precision gaps residuais baixos.
**Sensor**: 8/9 mortos nesta rodada (M10 e M11 do núcleo mortos); 1 resíduo no adaptador.
**Gate**: typecheck ok; 1447 testes passam; smoke 25/25.


## Nota do orquestrador (02/10)

- **M11-adapt (sobrevivente) é um mutante equivalente.** O `TechRunner` recebe em `targets` só os inimigos comuns (`this.enemies` da cena), e essa lista nunca contém o `Boss`. Trocar o mapeamento `e instanceof Boss ? 'boss' : 'enemy'` por `'enemy'` não muda o comportamento observável. O EDG-03 continua fechado pelo filtro puro (`repulseTargetsFor`), que está coberto nos testes.
- **Comentário órfão** `RED-15` em `TechRunner.ts:51` removido no commit de fechamento.
- **Lições da rodada 1 (L-047/L-048 desta branch) e a recorrência da L-043** não entram por esta branch: os IDs colidem com as lições da F11 já em `dev`. Elas são regravadas em `dev` com `lessons.py add` depois do merge.
