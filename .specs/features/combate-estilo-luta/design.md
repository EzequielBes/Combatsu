# Combate estilo luta — Design

**Spec**: `.specs/features/combate-estilo-luta/spec.md` (84 ACs)
**Decisões usadas**: AD-001 (regra pura em `src/core`), AD-002 (grades de texto), AD-003 (câmera de UI), AD-006 (RNG com seed para o bloqueio dos inimigos).
**Lições confirmadas**: L-010 — limiares dos dois lados (janela 260/261 ms, carregado 399/400 ms, parry 149/150 e anti-spam 299/300 ms, invencibilidade 179/180 ms, recarga 449/450 ms, estrutura 1499/1500 e 999/1000 ms, combo 1499/1500 ms, meia-lua 299/300 ms).

## Abordagem

Três máquinas puras novas e um resolvedor de golpe recebido; a camada Phaser só lê o input, aplica física e desenha.

```
PlayerInput (J/K/U/Q/E + direção) ─► Player
                                      ├─ MoveMachine (grafo de golpes, janela, buffer, carregado, aéreo)  [core]
                                      ├─ Defense (guarda, janela de parry, anti-spam)                    [core]
                                      ├─ Dodge (dash, invencibilidade, recarga, perfeita, bônus)          [core]
                                      └─ Structure do jogador                                           [core]
Golpe inimigo/chefe/projétil ─► Player.receiveHit ─► resolveIncomingHit(...) → 'parry'|'block'|'chip'|'dodged'|'hit'  [core]
Golpe do jogador ─► Enemy.receiveHit ─► Structure do inimigo + EnemyGuard + reação (derrubar/lançar/empurrar)
TestScene: câmera lenta (SlowMo) nos 3 timeScales, finalizador, ComboCounter, eventos, snapshot, HUD
```

## Code Reuse Analysis

| Componente | Onde | Uso |
| --- | --- | --- |
| `ComboTracker` (fases startup/active/recovery/window, buffer de 1 aperto) | `src/core/combo.ts:36-127` | Base da `MoveMachine`: mesma máquina de fases, mas o próximo golpe vem do grafo (botão + direção + ar) em vez do índice; `ComboTracker` segue para o swing com objeto (`propSwing`) |
| `AttackStep`/`HitboxShape` | `src/core/combo.ts:3-20` | `MoveDef` estende `AttackStep` com entrada, follow-ups e efeito |
| `Player.receiveHit` (ponto único de dano) | `src/game/Player.ts:161-172` | Chama `resolveIncomingHit` antes de `health.receive` |
| `Player.pushHorizontal` / `setVelocity` | `src/game/Player.ts:209-214, 309-312` | Dash da esquiva (velocidade dirigida a cada step, lição L-001) |
| `Player.meleePhase/cancelMelee/isBusyForCast` (F5) | `src/game/Player.ts:314-330` | Passam a ler a `MoveMachine`; CAST-10 continua valendo |
| `EnemyBrain` (`ragdollStun`, `hitstun`, `interrupt`) | `src/core/enemyBrain.ts:54-93`, `src/core/enemyAI.ts:145-155` | Derrubar (ragdollStun com duração do golpe), desequilíbrio e atordoamento (novo temporizador `suppressedMs` que bloqueia a IA) |
| `Enemy.enterRagdoll` + `Ragdoll.impulse` | `src/game/Enemy.ts:322-332` | Lançar (impulso para cima) e empurrões |
| `Enemy.updateBar` | `src/game/Enemy.ts:202-215` | Padrão da 2ª barra (estrutura) |
| `BossBrain.poise` | `src/core/bossBrain.ts:59-100` | Parry reduz poise em 30 (PAR-07) |
| `Hitstop.trigger` | `src/core/hitstop.ts:17-19` | Parry 80 ms, finalizador 150 ms |
| Câmera lenta nos 3 timeScales | `src/game/FxLab.ts:144-146, 222-224` | Extraída para `SlowMo` e usada na esquiva perfeita |
| `Modifiers.meleeDamage`, `energy.gain` (F4/F5) | `src/scenes/TestScene.ts:~974` | Todo golpe novo passa pelo mesmo `onConnect` (MOV-15) |
| Partes do player (`ARM_GUARD`, `ARM_COCK`, `ARM_UP`, `LEGS_WIDE`, `armStraight`, `legStraight`, `compose`, `pose`) | `src/game/art/sprites/player.ts` | Frames dos golpes, guarda, esquiva e atordoamento |

### Integration Points

- `Hit` ganha `unblockable?: boolean` e `moveName?: string`. O chefe marca o `shockwave` do pouso como imbloqueável (é o golpe que ensina a esquivar).
- `InputSnapshot` passa a ter `lightPressed`, `heavyPressed`, `heavyHeld`, `bothPressed`, `upHeld`, `guardHeld`, `guardPressed`, `dodgePressed`, `interactPressed` (agora `E`). `attackPressed` some; o swing com objeto usa `lightPressed || heavyPressed`.
- `TechCaster` (F5) não muda de tecla; `isBusyForCast` inclui guarda e esquiva ativas.
- Texto do painel de controles em `TestScene.ts:1051-1056`.
- Smokes: toda interação por `KeyK` passa para `KeyE`; ataques continuam em `KeyJ` (T10 faz a varredura).

## Components (núcleo puro)

| Módulo | Responsabilidade | ACs |
| --- | --- | --- |
| `src/data/moves.ts` | `MoveDef` (nome, entrada, dano, força, tempos, hitbox, follow-ups por botão, efeito `knockdown`/`launch`/`push`/`unblockableToGuard`, bônus de estrutura), `MOVES`, `MOVE_WINDOW_MS=260`, `CHARGE_MS=400`, números de defesa (`DEFENSE`), estrutura (`STRUCTURE`), combo e bloqueio | MOV-01, MOV-04, MOV-12, AIR-*, SPC-* (dados) |
| `src/core/moveMachine.ts` | `MoveMachine.press(button, ctx)`, `release(button, heldMs)`, `update(dt)` → eventos `moveStart/hitboxOn/hitboxOff/moveEnd`; escolha do golpe inicial por botão+direção+ar; follow-up na janela; buffer de 1; carregado; um aéreo por pulo; `cancel()`; `hitLanded` para o cancelamento por esquiva | MOV-02..09, MOV-16..18, AIR-01..04, DOD-06 (regra) |
| `src/core/motionInput.ts` | buffer de direções com tempo; detecta ↓, frente, leve em ≤ 300 ms | SPC-01 |
| `src/core/defense.ts` | `Guard` (segurando, janela de parry 150 ms, anti-spam 300 ms), `resolveIncomingHit({ hit, attackerInFront, isBoss, guard, dodgeInvulnerable })` → `{ outcome, damage }` | GRD-01..07, PAR-01..06, PAR-09 |
| `src/core/dodge.ts` | `Dodge`: início (direção), 96 px em 200 ms, invencível 0–180 ms, recarga 450 ms, recusa no ar, perfeita uma vez, bônus ×1,5 uma vez em 1000 ms | DOD-01..05, DOD-07..10 |
| `src/core/slowMo.ts` | 0,3 por 400 ms reais e volta a 1 | DOD-07 |
| `src/core/structure.ts` | `Structure`: ganho com teto, queda após atraso, quebra + atordoamento, reset | STR-01..11 (regra) |
| `src/core/comboCounter.ts` | hits, golpes distintos, nota, expiração 1500 ms, zera ao levar dano | CMB-01..03 |
| `src/core/enemyGuard.ts` | chance por rodada, guarda de 600 ms, resolve leve/forte/carregado | EBL-01..05 (regra) |

## Components (Phaser)

| Módulo | Responsabilidade |
| --- | --- |
| `src/game/input.ts` | Teclas novas (J/X, K/Z, U/Shift, Q, E) e `both` no mesmo frame |
| `src/game/Player.ts` | `MoveMachine` no lugar do combo de punho; guarda (pose, velocidade 40%), esquiva (dash), estrutura, atordoamento da guarda quebrada; `receiveHit` chama `resolveIncomingHit`; interação com `E` |
| `src/game/Enemy.ts` | Reações por efeito do golpe (derrubar 900 ms, lançar ≥ 64 px, empurrar), `suppressedMs` (desequilíbrio 400 ms, quebra 1500 ms com estrelas), estrutura e 2ª barra, guarda do inimigo com pose |
| `src/game/Boss.ts` | Parry reduz poise; `shockwave` imbloqueável |
| `src/scenes/TestScene.ts` | `SlowMo` aplicado aos 3 timeScales, finalizador (hitstop 150 ms + zoom 1,7), `ComboCounter` + HUD, eventos, snapshot, painel de controles |
| `src/game/art/sprites/playerMoves.ts` | Frames `<move>-wind/hit/recover` de todos os golpes + `guard`, `parry`, `dodge-0/1`, `stunned-0/1` |
| `src/game/art/combatColors.ts` | Cores das barras de estrutura e do combo (só `PALETTE`) |

## Data Models

Snapshot: exatamente o contrato da spec. Eventos: `move:<nome>`, `block`, `parry`, `guardBreak:player|<id>`, `finisher:<id>`, `dodge`, `perfectDodge`, `enemyBlock:<id>`.

## Error Handling Strategy

- Entrada inválida (golpe sem regra para a combinação) cai no golpe base do botão; nunca trava o jogador.
- `resolveIncomingHit` é a única decisão de dano: ordem fixa parry → esquiva → guarda → golpe cheio (edge case "parry e esquiva no mesmo frame": só o parry).
- Nova run zera estruturas, combo e `SlowMo` (edge case).

## Risks & Concerns

| Risco | Mitigação |
| --- | --- |
| Trocar `K` de "pegar" para "forte" quebra quase todos os smokes | T10 faz a varredura `KeyK`→`KeyE` onde era interação, com o suite completo verde no gate |
| Regressão da F5 (CAST-10 cancel na recovery, CE-06 +3) | `meleePhase`/`cancelMelee` passam a ler a `MoveMachine`; `tech.smoke`/`kokusen.smoke` no gate de T11 |
| Muitos frames de arte (≈ 50) | Worker de arte em worktree paralelo, compondo partes existentes; prévia em PNG antes do commit |
| Câmera lenta interferindo no hitstop e no `step` do harness | `SlowMo` em tempo real (como o Kokusen), aplicado ao `dt` de gameplay e aos 3 timeScales; smoke lê `timeScale` do snapshot |
| Ragdoll do inimigo em corpo Matter ao lançar/derrubar | Reusa `enterRagdoll` com impulso próprio; knockdown usa `ragdollStun` com duração do golpe |

## Tech Decisions

- `MoveMachine` nova em vez de estender `ComboTracker`: o grafo precisa de entrada (botão, direção, ar, carregado) e follow-ups nomeados; o `ComboTracker` segue servindo o swing com objeto.
- Defesa resolvida numa função pura com entradas explícitas (lado do atacante, chefe, imbloqueável, estados), testável sem Phaser.
