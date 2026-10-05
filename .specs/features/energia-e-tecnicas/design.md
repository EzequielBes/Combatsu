# Energia e técnicas amaldiçoadas — Design

**Spec**: `.specs/features/energia-e-tecnicas/spec.md` (165 ACs)
**Decisões usadas**: AD-001 (regra pura em `src/core`), AD-002 (grades de texto), AD-003 (câmera de UI), AD-005 (técnicas pela loja, níveis 1–3), AD-006 (RNG com seed), AD-009 (geometria procedural + postFX com fallback), AD-010 (Kokusen por timing).
**Lições confirmadas**: L-010 — todo limiar testado dos dois lados (119/120 e 200/201 ms, 59/60 ms na zona, 7999/8000 ms, 419/420 px, 95/96/97 px, 129/130/131 px, 59/60 e 180/181 px).
**API do Phaser consultada (Context7, `/phaserjs/phaser/v3_90_0`)**: `camera.postFX.addColorMatrix()` devolve um `ColorMatrix` com `negative()`, `grayscale()`, `reset()`; `camera.postFX.remove(fx)`; o renderer é WebGL quando `game.renderer.type === Phaser.WEBGL` (o jogo usa `Phaser.AUTO`).

## Abordagem

Toda regra é uma máquina pura em `src/core` com relógio injetado (dt de jogo e dt real separados); a camada Phaser só desenha e aplica física. O snapshot lê o estado das máquinas, não das views.

```
Input (L/C, I/V) ─► TechCaster (src/game) ─► CastMachine (core) ─► on release: TechRunner executa a técnica
                        │                          │
                        ├─► Player hooks            ├─► CursedEnergy (core)   ◄── Loadout (core) ◄── Shop (F4) / ?tech=
                        │   (trava, gravidade 30%,  │
                        │    frame da técnica)      └─► FxTimeline (core): camadas nomeadas com duração em tempo
                        │                                de jogo ou real → `fx.layers`, views e TFX-05
                        └─► views: Aura, Callout, EnergyBar, RedOrbView, BlueOrbView, CutView, KokusenFx
```

### Dois relógios

- **Tempo de jogo** para: conjuração, cooldowns, energia, janela do Kokusen, orbes, cortes, zona. Para no hitstop (a cena já faz `if (this.frozen) return`).
- **Tempo real** para as camadas cinemáticas do Kokusen (`kokusen.invert`, `kokusen.duotone`, `kokusen.bolts`, card 黒閃). A cena chama `realtimeFx.update(delta)` **antes** do `if (this.frozen) return` do `update`, e é só isso que roda congelado (TFX-05).

## Code Reuse Analysis

### Existing Components to Leverage

| Componente | Onde | Uso |
| --- | --- | --- |
| `ComboTracker` fases e `isAttacking` | `src/core/combo.ts:36-127` | Saber se o golpe está em `startup/active` (CAST-09) ou `recovery` (CAST-10, cancel) |
| Hitbox do `direto` (cross) | `src/data/tuning.ts:42-51` | Hitbox do Punho Divergente (DIV-02) |
| `AttackHitbox` + `makeHitGate` | `src/game/hitbox.ts:39-96`, `src/core/hit.ts:30-45` | Soco do Divergente (1 alvo, DIV-11) |
| `Hit` e `receiveHit` | `src/core/hit.ts:12-19`, `Enemy.ts:169`, `Boss.ts:143` | Todo dano de técnica (strength light/heavy, force) |
| `Hitstop.trigger` (o mais longo vence) | `src/core/hitstop.ts:17-19` | Kokusen 220 ms (KOK-13) |
| `freeze/unfreeze` | `TestScene.ts:754-770` | Congelamento; a parte em tempo real roda antes do `return` |
| `Enemy.enterRagdoll(hit)` | `Enemy.ts:300-310` | Ragdoll do Vermelho e do Kokusen (knockback ×2) |
| `BossBrain` poise, fase, `roar`, `intro` | `src/core/bossBrain.ts:59-154` | KOK-08/12, invulnerabilidade (edge cases) |
| `Mover` + padrão do `Projectile` | `src/core/mover.ts`, `src/game/Projectile.ts:26-113` | Orbe Vermelho (sensor sem gravidade, parede detona) |
| `Fx.spark/shake/burst` | `src/game/fx.ts:62-168` | Faíscas, tremida, partículas (emitter destruído por `delayedCall`) |
| `parseSheet` + `registerSheet` | `src/core/pixelGrid.ts:21-55`, `src/game/art/render.ts` | Frames das técnicas, kanji, orbes |
| `Hud` + `uiLayer` | `src/game/Hud.ts:69-160` | Barra de energia sob a de HP, ícones, callout, card 黒閃 |
| `Modifiers`, `Shop`, `SHOP_CATALOG` | `src/core/modifiers.ts`, `src/core/shop.ts`, `src/data/shop.ts` | Técnicas e `energia`/`fluxo` na loja (TSH) |
| `debugParam`, `debugEvents`, `debugSnapshot` | `TestScene.ts:73, 131, 661` | `?tech=`, `?fxlab`, eventos e campos novos |
| `Rng` | `src/core/rng.ts` | Seeds dos raios (KOK-18..21) |

### Integration Points

- `Player`: novos ganchos públicos, sem lógica de técnica dentro dele:
  - `castLock: CastPose | null` — com valor, ignora input horizontal e pulo (CAST-12), usa o frame `<id>-<state>` (CAST-13), e `stepMovement` recebe `gravity × 0.3` enquanto `sign|charge` no ar (CAST-11).
  - `meleePhase(): 'none' | 'startup' | 'active' | 'recover'` e `cancelMelee()` para CAST-09/10.
  - `isBusyForCast()` = segurando objeto ou em hitstun (CAST-09).
  - evento `onDamaged` (já passa por `receiveHit`) para cancelar a conjuração (CAST-07).
  - golpe corpo a corpo aplicado → `energy.gain(3)` (CE-06); dano de técnica não passa por esse caminho (CE-08).
- `TestScene.update`: `realtimeFx.update(delta)` antes do `frozen`; `techCaster.update(dt)` depois do player; técnica viva (`techObjects`) atualiza junto dos projéteis.
- `onStartRun`: `energy.reset()`, `loadout.reset()` (ou `?tech=`), zona zerada, objetos de técnica e camadas destruídos (edge cases).
- `Shop` (F4): `eligible(catalog, modifiers, round, loadout)`; `BuyContext` ganha `applyTechnique(id)`; `Shop.draw` aplica a garantia do espaço 0 (TSH-05).

## Components

### `src/data/techniques.ts` (novo) e tuning

```ts
export type TechId = 'divergente' | 'vermelho' | 'azul' | 'corte';
export interface TechDef {
  id: TechId; name: string; kanji: 'kuro' | 'aka' | 'ao' | 'kai'; // grades 黒/赫/蒼/解 (閃 só no card)
  aura: PaletteKey;               // cor da aura
  cost: number; cooldownMs: number;
  signMs: number; chargeMs: number; releaseMs: number; recoverMs: number;
  damage: Record<string, number>; // valores de nível 1 (TEC-06 escala)
}
export const TECHNIQUES: Record<TechId, TechDef>;   // números de DIV-01, RED-01, BLU-01, CUT-01 e ACs de dano
export const LEVEL_FACTOR = [1, 1.25, 1.5];         // TEC-06; custo −5 por nível (TEC-14)
export const CE = { max: 100, regen: 8, meleeGain: 3, kokusenGain: 30, maxPerLevel: 20, maxCap: 200, regenPerLevel: 2, regenCap: 16 };
export const KOKUSEN = { windowFrom: 120, windowTo: 200, zoneFrom: 60, zoneMs: 8000, damage: 45, hitstopMs: 220, knockbackMul: 2, poiseMul: 3, invertMs: 33, duotoneMs: 66, boltsAfterMs: 150, cardMs: 800, zoomPeak: 1.68, zoomInMs: 60, zoomOutMs: 300 };
export const CAST_FX = { zoomBase: 1.5, zoomCharge: 1.6, zoomBackMs: 250, calloutMs: 900, airGravity: 0.3 };
```

### Núcleo puro (`src/core`)

| Módulo | Responsabilidade | ACs |
| --- | --- | --- |
| `energy.ts` — `CursedEnergy` | `cur/max/regen`, `update(dtMs, casting)`, `gain`, `trySpend`, `setLevels(energia, fluxo)`, `reset` | CE-01..09, TSH-10/11 |
| `loadout.ts` — `Loadout` | 2 slots, `equip`, `upgrade`, `levelOf`, `firstEmpty`, `cost(id)`, `damage(id, base)`, cooldowns (`tick`, `start`) | TEC-01..06, 13, 14 |
| `cast.ts` — `CastMachine` | `request(slot, ctx) → ok | denied(energy|cooldown|busy)`, estados com tempo 0 pulados, `update(dt) → events (enter:<state>, end)`, `damageTaken()` cancela em `sign/charge` | CAST-01..10, 20, 21 |
| `fxTimeline.ts` — `FxTimeline` | `add(name, ms, clock: 'game'|'real')`, `update(gameDt, realDt)`, `layers()`, `has(name)`; durações arredondadas para frames inteiros (L-003) | TFX-05, `fx.layers` |
| `divergent.ts` — `DivergentState` | 1º impacto → alvo, relógio, anel (`ringRadius(t)`), 2º impacto aos 200 ms, sem 2º se errou/matou | DIV-03..12 |
| `kokusen.ts` — `Kokusen` | `windowOpen(t)`, tentativa (`press(t)` → `hit|miss|ignored`), trava por tentativa, zona (8000 ms, renova), `streak` | KOK-01..05, 09..11, 30, 31 |
| `lightning.ts` — `lightningBolts(seed, origin, dir)` | 5–8 raios em zigue-zague, 40–110 px, vértices na grade de 2 px, determinístico | KOK-18..21, 33, TFX-02 |
| `redOrb.ts` — `RedOrbState` | avanço 560 px/s, alcance 420 px, set de atingidos, `detonationTargets(enemies, point)` raio 96 px | RED-05..10, 13, 14 |
| `blueOrb.ts` — `BlueOrbState` | posição (110 px ou parede − 16 px), 1400 ms, ticks a cada 250 ms, alvos no raio 130 px, puxão 150 px/s | BLU-02..07, 11, 12 |
| `cut.ts` — `CutSchedule` | cortes em 0/60/120 ms, retângulo 60–180 × 48 px, ângulos 20°/−25°/70° espelhados | CUT-02..05 |
| `shop.ts` (alterado) | entradas `technique`, `energia`/`fluxo`, garantia do espaço 0, prévias TSH | TSH-01..17 |

Todas recebem números de `src/data/techniques.ts`; nenhuma importa `phaser`.

### Camada Phaser (`src/game`)

| Módulo | Responsabilidade |
| --- | --- |
| `TechCaster.ts` | teclas `L/C` e `I/V` (slot 1 vence no mesmo frame), `CastMachine`, ganchos do `Player`, zoom da câmera na carga/soltura, chama `TechRunner` no `release`, eventos `techCast/techDenied/techCancel` |
| `TechRunner.ts` | executa cada técnica: Divergente (hitbox do cross + `DivergentState` + `Kokusen`), Vermelho (`RedOrb`), Azul (`BlueOrb`), Desmantelar (`CutSchedule`); dono de `techObjects` |
| `techFx/Aura.ts`, `Callout.ts` | aura de chama por técnica; faixa do HUD com kanji + nome (900 ms) |
| `techFx/KokusenFx.ts` | camadas em tempo real: `ColorMatrix.negative()` 2 frames → duotom (ColorMatrix de duas cores `b`/`R`) 4 frames → reset; silhueta `b` do alvo (`setTintFill`); raios em `Graphics` redesenhados a cada 2 frames com seed nova; faíscas + anel; zoom-punch; card 黒閃 revelado por máscara; aura da zona. Sem WebGL: pula só o `ColorMatrix` e marca `fx.degraded` |
| `techFx/RedOrb.ts`, `BlueOrb.ts`, `CutFx.ts` | views + física (sensor Matter com `canDamage('player', …)`) dirigidas pelos estados puros |
| `EnergyHud.ts` | barra sob a de HP, marcas de custo, ícones com overlay de recarga, flash `R` (na `uiLayer`) |
| `FxLab.ts` | `?debug&fxlab`: sem ondas, 3 bonecos que regeneram, teclas 1–6 e 0 (time scale), legenda |

### Arte (`src/game/art`)

- `palette.ts`: + `b` 0x050205, `R` 0xff3344, `W` 0xffffff, `d` 0x14307a (TFX-08).
- `sprites/playerTech.ts`: 16 frames `<id>-<state>` 32×24 + `kokusen-hit`, compostos com `compose` a partir das partes do player (CAST-18/22).
- `sprites/kanji.ts`: 黒 閃 赫 蒼 解 em 24×24 (KOK-29/34).
- `sprites/techFx.ts`: orbe vermelho 4/8/12 texels com núcleo `W`, núcleo azul `d`/`C`, chamas da aura (2 frames), faíscas.
- `techColors.ts`: constantes de cor da barra, ícones, overlay, flash (TEC-15).

## Data Models

Snapshot: exatamente o contrato da spec (`ce`, `tech`, `kokusen`, `techObjects`, `fx`) + `hud.callout`, `hud.kokusenCard`, `hud.techIgnoredByMain`, `hud.energy` (larguras para TEC-07/12/09).

## Error Handling Strategy

- Pedido de conjuração recusado nunca muda estado (energia, recarga, combo) — só emite `techDenied:<motivo>`.
- Custo é cobrado **só** na entrada de `release` (CAST-03); cancelamento antes disso não cobra nem inicia recarga.
- Sem WebGL: `KokusenFx` e qualquer glow checam `renderer.type` uma vez no `create`; o resto do efeito segue (TFX-06/10/11).
- Todo objeto de efeito é registrado num `FxRegistry` com `destroyAt`; `fx.live` é o tamanho do registro (TFX-03/09).

## Risks & Concerns

| Risco | Mitigação |
| --- | --- |
| postFX nunca usado no projeto; smoke pode cair em Canvas | `fx.degraded` no snapshot; smokes do Kokusen conferem camadas (não pixels) e aceitam os dois modos |
| Camadas em tempo real × `step()` do harness (o `step` avança o loop com delta fixo) | `realtimeFx` usa o `delta` do `update`, que no harness é o delta do step; os ACs de "frames" (33/66 ms) usam frames inteiros (L-003) |
| 16 frames de arte à mão | Compor a partir das partes existentes (`compose`), variando só braços/mãos; um task de arte por par de técnicas |
| `Player.ts` cresce demais | Ganchos finos; lógica em `TechCaster`/`TechRunner` |
| Azul puxando corpos Matter em ragdoll | Aplicar velocidade por step (lição L-001: velocidade dirigida pelo jogo a cada step) e só em inimigos não mortos |
| Loja da F4 muda assinatura (`eligible`) | Testes da F4 continuam; o parâmetro novo tem default vazio |

## Tech Decisions

- Máquina de conjuração separada do combo (`CastMachine`) em vez de estender o `ComboTracker`: estados e cancelamentos diferentes.
- Camadas nomeadas num `FxTimeline` puro: dão `fx.layers` testável, a regra de hitstop (TFX-05) e o fim garantido (TFX-03) num só lugar.
- Duotom do Kokusen via `ColorMatrix` com matriz própria (luminância → mistura `b`/`R`), não via shader novo.
