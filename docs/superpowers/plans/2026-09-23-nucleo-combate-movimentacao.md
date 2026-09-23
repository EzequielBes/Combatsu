# Núcleo de Combate e Movimentação — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uma demo web jogável (Phaser 3 + Matter.js) com um player que corre, pula, dá um combo corpo a corpo e pega/bate/arremessa dois tipos de objeto físico contra inimigos que reagem a golpes leves (animação) e fortes (ragdoll) e morrem em ragdoll seguido de dissolução.

**Architecture:** Toda regra de jogo que dá para isolar vive em módulos TypeScript puros (`src/core/`, `src/data/`) sem importar Phaser — movimento, combo, cérebro do inimigo, máquina de estados do objeto, filtros de colisão, parser de level — e é coberta por testes Vitest rodando em Node. Uma camada fina de adaptadores (`src/game/`, `src/scenes/`) traduz esses estados para corpos Matter.js, sprites e input do Phaser; essa camada é validada jogando, com checklists manuais explícitos em cada task.

**Tech Stack:** Phaser 3 (plugin Matter.js nativo), TypeScript (strict), Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-23-nucleo-combate-movimentacao-design.md`

## Global Constraints

- Phaser **3.x** (`phaser@3`, ≥ 3.60 por causa da API de partículas usada) — não usar Phaser 4. Física só pelo Matter.js embutido no Phaser; não instalar `matter-js` separado.
- TypeScript com `strict: true`; `npm run build` (typecheck + build Vite) e `npm test` precisam passar ao fim de cada task.
- `src/core/**` e `src/data/**` **nunca** importam `phaser` como valor (só `import type`), para rodarem no Vitest em Node. `src/game/bodyTags.ts` e `src/game/textures.ts` seguem a mesma regra.
- Unidades: a lógica pura trabalha em **px/s** e **ms**. Velocidades passadas ao Matter (px por step de 1/60 s) só são convertidas via `PX_PER_S_TO_STEP` (`src/game/physics.ts`).
- O `delta` de frame é limitado a **50 ms** (`MAX_FRAME_MS`) antes de entrar na lógica.
- Objeto em **Repouso**, **Segurando** ou **Quebrando** nunca colide fisicamente com Player ou Inimigo (requisito central do spec). Em Repouso colide só com terreno e outros objetos.
- Bater com objeto ou arremessá-lo conta **sempre** como golpe **forte**; o último hit do combo desarmado é **forte**, os anteriores **leves**.
- Todo acerto carrega o `ownerId` de quem bateu/arremessou; um hit nunca atinge o próprio dono.
- Arte: placeholders gerados em código (retângulos coloridos) registrados por chave em `TEX` (`src/game/textures.ts`). Trocar por pixel art depois = carregar PNGs com as mesmas chaves. Nenhum download de asset neste sub-projeto.
- Todo texto visível ao jogador em pt-BR.
- Fora do escopo: energia amaldiçoada, técnicas, progressão, mundo grande, roguelike, IA de inimigo, dano ao player. Dash/esquiva é stretch goal e **não** está neste plano.

## Review Focus

1. **Arremessar encostado numa parede** — o objeto nasce dentro do terreno; o esperado é ele cair em espaço livre perto do player, nunca ficar preso na parede nem ser "cuspido" em alta velocidade. (Task 10, passo de verificação manual + `lastSafe` = centro do player no arremesso.)
2. **Objeto quebra na mão no meio do golpe** — o player precisa ficar livre (sem referência a um objeto morto, sem ficar travado em ataque) e poder socar/pegar outro objeto em seguida. (Task 9, teste "quebrar durante o golpe solta o holder"; Task 10, verificação manual.)
3. **Spam do botão de ataque** — apertar J várias vezes seguidas deve encadear no máximo um golpe por vez, e um aperto sobrando no último golpe não pode iniciar um combo "fantasma". (Task 5, testes de spam e de buffer no último golpe.)
4. **Golpes em inimigo caído, morrendo ou dissolvendo, e um golpe tocando várias partes do ragdoll** — sem morte dupla, sem dano depois de morto, e cada ataque acerta cada alvo uma vez só. (Task 6, testes de hits pós-morte; Task 2, teste do `makeHitGate`.)
5. **Hitch de frame (aba em segundo plano, GC)** — um `delta` enorme não pode fazer o player atravessar o chão ou disparar a velocidade. (Task 3, teste com dt de 50 ms; Task 4 aplica o clamp.)

---

## Estrutura de arquivos

```
package.json, tsconfig.json, vite.config.ts, vitest.config.ts, index.html, .gitignore, README.md
src/
  main.ts                  # config do Phaser.Game
  core/                    # lógica pura, sem Phaser
    level.ts               # parser do mapa ASCII → sólidos + spawns
    collision.ts           # categorias/máscaras Matter + função collides()
    hit.ts                 # tipo Hit, normalize(), makeHitGate()
    movement.ts            # stepMovement(): corrida, pulo variável, coyote, buffer
    combo.ts               # ComboTracker: startup/active/recovery/window
    enemyBrain.ts          # EnemyBrain: hp, leve/forte, ragdoll, morte, dissolução
    props.ts               # PropDef, PropMachine (repouso/segurando/uso/quebra)
  data/                    # dados de tuning, sem Phaser
    level1.ts              # a sala de teste
    tuning.ts              # números de movimento, combo, inimigo
    props.ts               # cadeira e garrafa
  game/                    # adaptadores Phaser/Matter
    textures.ts            # TEX + placeholders gerados em código
    physics.ts             # PX_PER_S_TO_STEP, bodyOf, applyFilter, setIgnoreGravity
    bodyTags.ts            # tag de cada corpo Matter + roteamento de contato
    input.ts               # teclado → InputSnapshot
    Player.ts
    Enemy.ts
    Ragdoll.ts
    Prop.ts
  scenes/
    TestScene.ts           # monta a sala e liga tudo
tests/
  core/*.test.ts, data/*.test.ts, game/bodyTags.test.ts
```

---

### Task 1: Scaffold do projeto, parser de level e sala renderizada

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `.gitignore`
- Create: `src/main.ts`, `src/core/level.ts`, `src/data/level1.ts`, `src/game/textures.ts`, `src/scenes/TestScene.ts`
- Test: `tests/core/level.test.ts`, `tests/data/level1.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `TILE = 32`
  - `interface Rect { x: number; y: number; width: number; height: number }` (canto superior esquerdo)
  - `interface Spawn { x: number; y: number }` (centro do tile)
  - `interface PropSpawn extends Spawn { key: string }`
  - `interface LevelData { widthPx: number; heightPx: number; solids: Rect[]; player: Spawn; enemies: Spawn[]; props: PropSpawn[] }`
  - `parseLevel(rows: readonly string[]): LevelData`
  - `LEVEL_1: readonly string[]`
  - `TEX` (chaves de textura), `SIZE` (`{ player: {w,h}, enemy: {w,h} }`), `createPlaceholderTextures(scene)`
  - `class TestScene extends Phaser.Scene` com chave `'TestScene'`

- [x] **Step 1: Criar `package.json` e instalar dependências**

`package.json`:

```json
{
  "name": "surgue",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

Run:

```bash
npm install phaser@3
npm install -D typescript vite vitest
```

Expected: `node_modules/` criado, `package.json` ganha `dependencies.phaser` (3.x) e `devDependencies`.

- [x] **Step 2: Criar configs e `.gitignore`**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": []
  },
  "include": ["src", "tests"]
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
});
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
```

`.gitignore`:

```
node_modules/
dist/
```

- [x] **Step 3: Escrever os testes do parser (falhando)**

`tests/core/level.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TILE, parseLevel } from '../../src/core/level';

describe('parseLevel', () => {
  it('junta blocos sólidos vizinhos da mesma linha num retângulo só', () => {
    const lvl = parseLevel(['###.##', '..P...']);
    expect(lvl.solids).toEqual([
      { x: 0, y: 0, width: 3 * TILE, height: TILE },
      { x: 4 * TILE, y: 0, width: 2 * TILE, height: TILE },
    ]);
  });

  it('calcula o tamanho em pixels', () => {
    const lvl = parseLevel(['###.##', '..P...']);
    expect(lvl.widthPx).toBe(6 * TILE);
    expect(lvl.heightPx).toBe(2 * TILE);
  });

  it('coloca spawns no centro do tile', () => {
    const lvl = parseLevel(['P.cbE']);
    expect(lvl.player).toEqual({ x: 16, y: 16 });
    expect(lvl.props).toEqual([
      { key: 'chair', x: 80, y: 16 },
      { key: 'bottle', x: 112, y: 16 },
    ]);
    expect(lvl.enemies).toEqual([{ x: 144, y: 16 }]);
  });

  it('rejeita level sem player, com dois players, com caractere desconhecido ou linhas desiguais', () => {
    expect(() => parseLevel(['....'])).toThrow(/P/);
    expect(() => parseLevel(['P..P'])).toThrow(/P/);
    expect(() => parseLevel(['P.x.'])).toThrow(/x/);
    expect(() => parseLevel(['P...', '..'])).toThrow(/colunas/);
    expect(() => parseLevel([])).toThrow();
  });
});
```

`tests/data/level1.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseLevel } from '../../src/core/level';
import { LEVEL_1 } from '../../src/data/level1';

describe('LEVEL_1', () => {
  it('é uma sala fechada de 40x17 tiles', () => {
    expect(LEVEL_1).toHaveLength(17);
    for (const row of LEVEL_1) {
      expect(row).toHaveLength(40);
      expect(row[0]).toBe('#');
      expect(row[row.length - 1]).toBe('#');
    }
    expect(LEVEL_1[0]).toBe('#'.repeat(40));
    expect(LEVEL_1[LEVEL_1.length - 1]).toBe('#'.repeat(40));
  });

  it('tem 1 player, 2 inimigos, 2 cadeiras e 2 garrafas', () => {
    const lvl = parseLevel(LEVEL_1);
    expect(lvl.enemies).toHaveLength(2);
    expect(lvl.props.filter((p) => p.key === 'chair')).toHaveLength(2);
    expect(lvl.props.filter((p) => p.key === 'bottle')).toHaveLength(2);
  });
});
```

- [x] **Step 4: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `Cannot find module '../../src/core/level'` (e `level1`).

- [x] **Step 5: Implementar o parser e o level**

`src/core/level.ts`:

```ts
export const TILE = 32;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Spawn {
  x: number;
  y: number;
}

export interface PropSpawn extends Spawn {
  key: string;
}

export interface LevelData {
  widthPx: number;
  heightPx: number;
  solids: Rect[];
  player: Spawn;
  enemies: Spawn[];
  props: PropSpawn[];
}

const PROP_CHARS: Record<string, string> = { c: 'chair', b: 'bottle' };

/**
 * Legenda: '#' sólido, '.' vazio, 'P' player, 'E' inimigo, 'c' cadeira, 'b' garrafa.
 * Sólidos vizinhos na mesma linha viram um retângulo só, para o player não
 * enganchar nas emendas entre tiles.
 */
export function parseLevel(rows: readonly string[]): LevelData {
  if (rows.length === 0) throw new Error('Level vazio');
  const width = rows[0].length;
  const solids: Rect[] = [];
  const enemies: Spawn[] = [];
  const props: PropSpawn[] = [];
  let player: Spawn | null = null;

  for (let ty = 0; ty < rows.length; ty++) {
    const row = rows[ty];
    if (row.length !== width) {
      throw new Error(`Linha ${ty} tem ${row.length} colunas; esperado ${width}`);
    }
    let runStart = -1;
    for (let tx = 0; tx <= width; tx++) {
      const ch = tx < width ? row[tx] : '.';
      if (ch === '#') {
        if (runStart < 0) runStart = tx;
        continue;
      }
      if (runStart >= 0) {
        solids.push({ x: runStart * TILE, y: ty * TILE, width: (tx - runStart) * TILE, height: TILE });
        runStart = -1;
      }
      if (tx === width || ch === '.') continue;
      const center = { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
      if (ch === 'P') {
        if (player) throw new Error('Mais de um P no level');
        player = center;
      } else if (ch === 'E') {
        enemies.push(center);
      } else if (Object.hasOwn(PROP_CHARS, ch)) {
        props.push({ ...center, key: PROP_CHARS[ch] });
      } else {
        throw new Error(`Caractere desconhecido '${ch}' em (${tx}, ${ty})`);
      }
    }
  }

  if (!player) throw new Error('Level sem P (spawn do player)');
  return { widthPx: width * TILE, heightPx: rows.length * TILE, solids, player, enemies, props };
}
```

`src/data/level1.ts`:

```ts
/** Sala de teste: 40x17 tiles de 32 px. Legenda em src/core/level.ts. */
export const LEVEL_1: readonly string[] = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..............######........######....#',
  '#......................................#',
  '#......................................#',
  '#.......#####.........####.............#',
  '#......................................#',
  '#..P...c...b.......E.........b....c..E.#',
  '########################################',
  '########################################',
];
```

- [x] **Step 6: Rodar os testes**

Run: `npm test`
Expected: PASS (6 testes).

- [x] **Step 7: Texturas placeholder, cena e entrada da página**

`src/game/textures.ts`:

```ts
import type Phaser from 'phaser';

/** Chaves de textura. Trocar placeholder por arte real = carregar um PNG com a mesma chave. */
export const TEX = {
  terrain: 'terrain',
  player: 'player',
  enemy: 'enemy',
  chair: 'chair',
  bottle: 'bottle',
  smoke: 'smoke',
  ragHead: 'rag-head',
  ragTorso: 'rag-torso',
  ragLimb: 'rag-limb',
} as const;

export const SIZE = {
  player: { w: 20, h: 36 },
  enemy: { w: 22, h: 36 },
} as const;

function box(scene: Phaser.Scene, key: string, w: number, h: number, fill: number, eye = false): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  g.fillStyle(fill, 1);
  g.fillRect(0, 0, w, h);
  g.lineStyle(2, 0x000000, 1);
  g.strokeRect(1, 1, w - 2, h - 2);
  if (eye) {
    // "olho" do lado direito: mostra para onde o personagem olha
    g.fillStyle(0xffffff, 1);
    g.fillRect(w - 7, 6, 4, 4);
  }
  g.generateTexture(key, w, h);
  g.destroy();
}

export function createPlaceholderTextures(scene: Phaser.Scene): void {
  box(scene, TEX.terrain, 32, 32, 0x4a4e69);
  box(scene, TEX.player, SIZE.player.w, SIZE.player.h, 0x3a86ff, true);
  box(scene, TEX.enemy, SIZE.enemy.w, SIZE.enemy.h, 0xd62828, true);
  box(scene, TEX.chair, 26, 26, 0x8d5524);
  box(scene, TEX.bottle, 8, 20, 0x2a9d8f);
  box(scene, TEX.ragHead, 10, 10, 0xd62828);
  box(scene, TEX.ragTorso, 14, 18, 0xb71c1c);
  box(scene, TEX.ragLimb, 5, 14, 0xd62828);
  if (!scene.textures.exists(TEX.smoke)) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture(TEX.smoke, 8, 8);
    g.destroy();
  }
}
```

`src/scenes/TestScene.ts`:

```ts
import Phaser from 'phaser';
import { parseLevel, type LevelData } from '../core/level';
import { LEVEL_1 } from '../data/level1';
import { TEX, createPlaceholderTextures } from '../game/textures';

export class TestScene extends Phaser.Scene {
  private level!: LevelData;

  constructor() {
    super('TestScene');
  }

  create(): void {
    createPlaceholderTextures(this);
    this.level = parseLevel(LEVEL_1);
    this.buildTerrain();
    this.cameras.main.setBounds(0, 0, this.level.widthPx, this.level.heightPx);
  }

  private buildTerrain(): void {
    for (const r of this.level.solids) {
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      this.add.tileSprite(cx, cy, r.width, r.height, TEX.terrain);
      this.matter.add.rectangle(cx, cy, r.width, r.height, { isStatic: true, label: 'terrain' });
    }
  }
}
```

`src/main.ts`:

```ts
import Phaser from 'phaser';
import { TestScene } from './scenes/TestScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: document.body,
  width: 960,
  height: 540,
  pixelArt: true,
  backgroundColor: '#1b1b2f',
  physics: {
    default: 'matter',
    matter: { gravity: { x: 0, y: 1 }, debug: false },
  },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [TestScene],
});
```

`index.html`:

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Surgue — demo de combate</title>
    <style>
      html, body { margin: 0; height: 100%; background: #0d0d17; overflow: hidden; }
    </style>
  </head>
  <body>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [x] **Step 8: Verificar build e a sala no navegador**

Run: `npm run build`
Expected: sem erros de tipo; `dist/` gerado.

Run: `npm run dev` e abrir a URL que o Vite imprimir (normalmente `http://localhost:5173`).
Expected: fundo azul-escuro com a sala em blocos cinza: teto, paredes laterais, chão de duas camadas, duas plataformas baixas e duas altas. Nenhum erro no console do navegador.

- [x] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts index.html .gitignore src tests
git commit -m "feat: scaffold Phaser + Vite project with test room level" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Filtros de colisão, tipo de golpe e roteamento de contato

**Files:**
- Create: `src/core/collision.ts`, `src/core/hit.ts`, `src/game/bodyTags.ts`, `src/game/physics.ts`
- Modify: `src/scenes/TestScene.ts` (arquivo inteiro abaixo)
- Test: `tests/core/collision.test.ts`, `tests/core/hit.test.ts`, `tests/game/bodyTags.test.ts`

**Interfaces:**
- Consumes: `parseLevel`, `LEVEL_1`, `TEX`, `createPlaceholderTextures` (Task 1).
- Produces:
  - `Category` (`NONE, TERRAIN, PLAYER, ENEMY, PROP, HITBOX, RAGDOLL, ALL`)
  - `interface CollisionFilter { category: number; mask: number; group: number }`
  - `Filters.{terrain, player, enemy, hidden, hitbox, propRest, propHeld, propSwing, propThrown, propBreaking}: CollisionFilter`
  - `ragdollFilter(group: number): CollisionFilter` (grupo precisa ser negativo)
  - `collides(a: CollisionFilter, b: CollisionFilter): boolean` (mesma regra do Matter)
  - `type Strength = 'light' | 'heavy'`, `interface Vec2 { x; y }`, `interface Hit { ownerId: number; damage: number; strength: Strength; direction: Vec2; force: number }`
  - `normalize(v: Vec2): Vec2`, `makeHitGate(ownerId: number): (targetId: number) => boolean`
  - `interface Hittable { readonly id: number; receiveHit(hit: Hit): void }`
  - `type BodyTag = { kind: 'terrain' } | { kind: 'character'; target: Hittable } | { kind: 'active'; onTouch(other: BodyTag): void }`
  - `tagBody(body: object, tag: BodyTag)`, `tagOf(body)`, `routeContact(bodyA, bodyB)`, `newEntityId(): number`
  - `PX_PER_S_TO_STEP`, `MAX_FRAME_MS`, `bodyOf(go)`, `applyFilter(body, filter)`, `setIgnoreGravity(body, value)`

- [x] **Step 1: Escrever os testes (falhando)**

`tests/core/collision.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Filters, collides, ragdollFilter } from '../../src/core/collision';

const ALL_FILTERS = Object.entries(Filters);
const rag = ragdollFilter(-1);

describe('filtros de colisão', () => {
  it('objeto em repouso nunca bloqueia player, inimigo ou ragdoll', () => {
    expect(collides(Filters.propRest, Filters.player)).toBe(false);
    expect(collides(Filters.propRest, Filters.enemy)).toBe(false);
    expect(collides(Filters.propRest, rag)).toBe(false);
  });

  it('objeto em repouso colide com terreno e com outros objetos em repouso', () => {
    expect(collides(Filters.propRest, Filters.terrain)).toBe(true);
    expect(collides(Filters.propRest, Filters.propRest)).toBe(true);
  });

  it('objeto segurado, quebrando e corpo escondido não colidem com nada', () => {
    for (const [name, f] of ALL_FILTERS) {
      expect(collides(Filters.propHeld, f), `propHeld x ${name}`).toBe(false);
      expect(collides(Filters.propBreaking, f), `propBreaking x ${name}`).toBe(false);
      expect(collides(Filters.hidden, f), `hidden x ${name}`).toBe(false);
    }
  });

  it('objeto arremessado detecta terreno e personagens, mas não outros objetos', () => {
    expect(collides(Filters.propThrown, Filters.terrain)).toBe(true);
    expect(collides(Filters.propThrown, Filters.player)).toBe(true);
    expect(collides(Filters.propThrown, Filters.enemy)).toBe(true);
    expect(collides(Filters.propThrown, rag)).toBe(true);
    expect(collides(Filters.propThrown, Filters.propRest)).toBe(false);
  });

  it('hitbox de soco e objeto em golpe acertam personagens e ragdoll, mas ignoram terreno', () => {
    for (const f of [Filters.hitbox, Filters.propSwing]) {
      expect(collides(f, Filters.enemy)).toBe(true);
      expect(collides(f, Filters.player)).toBe(true);
      expect(collides(f, rag)).toBe(true);
      expect(collides(f, Filters.terrain)).toBe(false);
      expect(collides(f, Filters.propRest)).toBe(false);
    }
  });

  it('player e inimigo atravessam um ao outro e pisam no terreno', () => {
    expect(collides(Filters.player, Filters.enemy)).toBe(false);
    expect(collides(Filters.player, Filters.terrain)).toBe(true);
    expect(collides(Filters.enemy, Filters.terrain)).toBe(true);
  });

  it('partes do mesmo ragdoll não colidem entre si, mas colidem com o terreno', () => {
    expect(collides(rag, rag)).toBe(false);
    expect(collides(rag, Filters.terrain)).toBe(true);
    expect(() => ragdollFilter(1)).toThrow();
    expect(() => ragdollFilter(0)).toThrow();
  });
});
```

`tests/core/hit.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { makeHitGate, normalize } from '../../src/core/hit';

describe('makeHitGate', () => {
  it('nunca deixa o dono se acertar', () => {
    const gate = makeHitGate(1);
    expect(gate(1)).toBe(false);
  });

  it('deixa cada alvo ser acertado uma vez só por ataque', () => {
    const gate = makeHitGate(1);
    expect(gate(2)).toBe(true);
    expect(gate(2)).toBe(false); // outra parte do mesmo ragdoll, por exemplo
    expect(gate(3)).toBe(true);
  });

  it('um gate novo (ataque novo) volta a permitir o mesmo alvo', () => {
    makeHitGate(1)(2);
    expect(makeHitGate(1)(2)).toBe(true);
  });
});

describe('normalize', () => {
  it('devolve vetor de comprimento 1', () => {
    const v = normalize({ x: 3, y: -4 });
    expect(v.x).toBeCloseTo(0.6);
    expect(v.y).toBeCloseTo(-0.8);
  });

  it('vetor zero vira "para cima"', () => {
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: -1 });
  });
});
```

`tests/game/bodyTags.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { newEntityId, routeContact, tagBody, tagOf, type BodyTag } from '../../src/game/bodyTags';

const character = (id: number): BodyTag => ({ kind: 'character', target: { id, receiveHit: vi.fn() } });

describe('routeContact', () => {
  it('avisa o corpo ativo com a tag do outro corpo, nas duas ordens', () => {
    const onTouch = vi.fn();
    const active = {};
    const enemy = {};
    const enemyTag = character(7);
    tagBody(active, { kind: 'active', onTouch });
    tagBody(enemy, enemyTag);

    routeContact(active, enemy);
    routeContact(enemy, active);

    expect(onTouch).toHaveBeenCalledTimes(2);
    expect(onTouch).toHaveBeenCalledWith(enemyTag);
  });

  it('ignora contato com corpo sem tag', () => {
    const onTouch = vi.fn();
    const active = {};
    tagBody(active, { kind: 'active', onTouch });
    routeContact(active, {});
    expect(onTouch).not.toHaveBeenCalled();
  });

  it('acha a tag pelo corpo pai quando o contato vem de uma parte', () => {
    const parent = {};
    const part = { parent };
    const tag: BodyTag = { kind: 'terrain' };
    tagBody(parent, tag);
    expect(tagOf(part)).toBe(tag);
  });
});

describe('newEntityId', () => {
  it('gera ids únicos e maiores que zero', () => {
    const a = newEntityId();
    const b = newEntityId();
    expect(a).toBeGreaterThan(0);
    expect(b).not.toBe(a);
  });
});
```

- [x] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — módulos `collision`, `hit` e `bodyTags` não existem.

- [x] **Step 3: Implementar**

`src/core/collision.ts`:

```ts
/** Categorias de colisão do Matter (bits). */
export const Category = {
  NONE: 0,
  TERRAIN: 0x0001,
  PLAYER: 0x0002,
  ENEMY: 0x0004,
  PROP: 0x0008,
  HITBOX: 0x0010,
  RAGDOLL: 0x0020,
  ALL: 0xffff,
} as const;

export interface CollisionFilter {
  category: number;
  mask: number;
  group: number;
}

const C = Category;
const filter = (category: number, mask: number, group = 0): CollisionFilter => ({ category, mask, group });

/**
 * Um filtro por papel/estado. Objetos em repouso, segurados ou quebrando nunca
 * colidem fisicamente com player/inimigo — requisito central do spec.
 * Hitboxes e objetos em uso são sensores: "colidir" aqui só gera evento, não empurra.
 */
export const Filters = {
  terrain: filter(C.TERRAIN, C.ALL),
  player: filter(C.PLAYER, C.TERRAIN | C.HITBOX),
  enemy: filter(C.ENEMY, C.TERRAIN | C.HITBOX),
  hidden: filter(C.NONE, C.NONE),
  hitbox: filter(C.HITBOX, C.PLAYER | C.ENEMY | C.RAGDOLL),
  propRest: filter(C.PROP, C.TERRAIN | C.PROP),
  propHeld: filter(C.PROP, C.NONE),
  propSwing: filter(C.HITBOX, C.PLAYER | C.ENEMY | C.RAGDOLL),
  propThrown: filter(C.HITBOX, C.TERRAIN | C.PLAYER | C.ENEMY | C.RAGDOLL),
  propBreaking: filter(C.PROP, C.NONE),
} satisfies Record<string, CollisionFilter>;

/** Partes de um ragdoll: grupo negativo compartilhado = não colidem entre si. */
export function ragdollFilter(group: number): CollisionFilter {
  if (group >= 0) throw new Error('Ragdoll precisa de grupo negativo');
  return filter(C.RAGDOLL, C.TERRAIN | C.HITBOX, group);
}

/** Mesma regra do Matter.Detector.canCollide. */
export function collides(a: CollisionFilter, b: CollisionFilter): boolean {
  if (a.group === b.group && a.group !== 0) return a.group > 0;
  return (a.mask & b.category) !== 0 && (b.mask & a.category) !== 0;
}
```

`src/core/hit.ts`:

```ts
export type Strength = 'light' | 'heavy';

export interface Vec2 {
  x: number;
  y: number;
}

/** Um golpe, agnóstico da origem (soco, objeto, e no futuro técnica). */
export interface Hit {
  ownerId: number;
  damage: number;
  strength: Strength;
  direction: Vec2;
  /** Impulso em px por step do Matter (1/60 s). */
  force: number;
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y);
  return len === 0 ? { x: 0, y: -1 } : { x: v.x / len, y: v.y / len };
}

/**
 * Um gate por ataque: ignora o dono e deixa cada alvo ser acertado uma vez só,
 * mesmo que o sensor encoste em várias partes dele (ex.: ragdoll).
 */
export function makeHitGate(ownerId: number): (targetId: number) => boolean {
  const alreadyHit = new Set<number>();
  return (targetId) => {
    if (targetId === ownerId || alreadyHit.has(targetId)) return false;
    alreadyHit.add(targetId);
    return true;
  };
}
```

`src/game/bodyTags.ts`:

```ts
import type { Hit } from '../core/hit';

/** Qualquer coisa que pode levar um golpe (player, inimigo). */
export interface Hittable {
  readonly id: number;
  receiveHit(hit: Hit): void;
}

export type BodyTag =
  | { kind: 'terrain' }
  | { kind: 'character'; target: Hittable }
  | { kind: 'active'; onTouch(other: BodyTag): void };

interface BodyLike {
  parent?: BodyLike;
}

const tags = new WeakMap<object, BodyTag>();
let nextId = 1;

export function newEntityId(): number {
  return nextId++;
}

export function tagBody(body: object, tag: BodyTag): void {
  tags.set(body, tag);
}

export function tagOf(body: BodyLike): BodyTag | undefined {
  return tags.get(body) ?? (body.parent ? tags.get(body.parent) : undefined);
}

/** Chamado para cada par do evento collisionstart do Matter. */
export function routeContact(bodyA: BodyLike, bodyB: BodyLike): void {
  const a = tagOf(bodyA);
  const b = tagOf(bodyB);
  if (!a || !b) return;
  if (a.kind === 'active') a.onTouch(b);
  if (b.kind === 'active') b.onTouch(a);
}
```

`src/game/physics.ts`:

```ts
import type Phaser from 'phaser';
import type { CollisionFilter } from '../core/collision';

/** Matter mede velocidade em px por step de 1/60 s; a lógica pura usa px/s. */
export const PX_PER_S_TO_STEP = 1 / 60;

/** Limite de delta por frame (aba em segundo plano, GC) antes de entrar na lógica. */
export const MAX_FRAME_MS = 50;

export function bodyOf(go: Phaser.GameObjects.GameObject): MatterJS.BodyType {
  return go.body as MatterJS.BodyType;
}

export function applyFilter(body: MatterJS.BodyType, f: CollisionFilter): void {
  body.collisionFilter.category = f.category;
  body.collisionFilter.mask = f.mask;
  body.collisionFilter.group = f.group;
}

/** O fork do Matter no Phaser respeita body.ignoreGravity. */
export function setIgnoreGravity(body: MatterJS.BodyType, value: boolean): void {
  (body as MatterJS.BodyType & { ignoreGravity: boolean }).ignoreGravity = value;
}
```

- [x] **Step 4: Rodar os testes**

Run: `npm test`
Expected: PASS.

- [x] **Step 5: Ligar filtros e contato na cena**

`src/scenes/TestScene.ts` (arquivo inteiro):

```ts
import Phaser from 'phaser';
import { Filters } from '../core/collision';
import { parseLevel, type LevelData } from '../core/level';
import { LEVEL_1 } from '../data/level1';
import { routeContact, tagBody } from '../game/bodyTags';
import { TEX, createPlaceholderTextures } from '../game/textures';

type ContactEvent = { pairs: { bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType }[] };

export class TestScene extends Phaser.Scene {
  private level!: LevelData;
  private terrain: MatterJS.BodyType[] = [];

  constructor() {
    super('TestScene');
  }

  create(): void {
    createPlaceholderTextures(this);
    this.level = parseLevel(LEVEL_1);
    this.terrain = [];
    this.buildTerrain();
    this.cameras.main.setBounds(0, 0, this.level.widthPx, this.level.heightPx);
    this.listenForContacts();
  }

  private buildTerrain(): void {
    for (const r of this.level.solids) {
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      this.add.tileSprite(cx, cy, r.width, r.height, TEX.terrain);
      const body = this.matter.add.rectangle(cx, cy, r.width, r.height, {
        isStatic: true,
        label: 'terrain',
        collisionFilter: { ...Filters.terrain },
      });
      tagBody(body, { kind: 'terrain' });
      this.terrain.push(body);
    }
  }

  private listenForContacts(): void {
    const onStart = (event: ContactEvent): void => {
      for (const pair of event.pairs) routeContact(pair.bodyA, pair.bodyB);
    };
    this.matter.world.on('collisionstart', onStart);
    // Sem isso, reiniciar a cena empilha listeners e cada contato dispara duas vezes.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.matter.world?.off('collisionstart', onStart));
  }
}
```

- [x] **Step 6: Verificar**

Run: `npm run build && npm test`
Expected: sem erros; todos os testes passam. `npm run dev` ainda mostra a sala igual à Task 1, sem erros no console.

- [x] **Step 7: Commit**

```bash
git add src tests
git commit -m "feat: add collision filters, hit model and contact routing" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Lógica de movimentação (corrida, pulo variável, coyote time, buffer)

**Files:**
- Create: `src/core/movement.ts`, `src/data/tuning.ts`
- Test: `tests/core/movement.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `interface MoveTuning { runSpeed; accelGround; accelAir; gravity; maxFallSpeed; jumpSpeed; maxJumpHoldMs; jumpCutFactor; coyoteMs; jumpBufferMs }` (todos `number`, px/s, px/s², ms)
  - `interface MoveInput { left: boolean; right: boolean; jumpPressed: boolean; jumpHeld: boolean }`
  - `interface MoveSensors { grounded: boolean; ceiling: boolean }`
  - `interface MoveState { vx: number; vy: number; facing: 1 | -1; jumping: boolean; jumpHoldMs: number; coyoteMs: number; jumpBufferMs: number }`
  - `initialMoveState(): MoveState`
  - `stepMovement(prev: MoveState, input: MoveInput, sensors: MoveSensors, dtMs: number, t: MoveTuning, locked?: boolean): MoveState`
  - `PLAYER_MOVE: MoveTuning` em `src/data/tuning.ts`

- [x] **Step 1: Escrever os testes (falhando)**

`tests/core/movement.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  initialMoveState,
  stepMovement,
  type MoveInput,
  type MoveSensors,
  type MoveState,
  type MoveTuning,
} from '../../src/core/movement';

const T: MoveTuning = {
  runSpeed: 200,
  accelGround: 2000,
  accelAir: 1000,
  gravity: 1800,
  maxFallSpeed: 900,
  jumpSpeed: 400,
  maxJumpHoldMs: 150,
  jumpCutFactor: 0.5,
  coyoteMs: 100,
  jumpBufferMs: 100,
};
const DT = 1000 / 60;
const NONE: MoveInput = { left: false, right: false, jumpPressed: false, jumpHeld: false };
const JUMP: MoveInput = { ...NONE, jumpPressed: true, jumpHeld: true };
const GROUND: MoveSensors = { grounded: true, ceiling: false };
const AIR: MoveSensors = { grounded: false, ceiling: false };

function run(s: MoveState, frames: number, input: MoveInput, sensors: MoveSensors): MoveState {
  for (let i = 0; i < frames; i++) s = stepMovement(s, input, sensors, DT, T);
  return s;
}

/** Simula um pulo num chão plano em y = 0 e devolve a altura máxima atingida (px). */
function peakHeight(holdFrames: number): number {
  let s = initialMoveState();
  let y = 0;
  let peak = 0;
  for (let f = 0; f < 120; f++) {
    const input = { ...NONE, jumpPressed: f === 0, jumpHeld: f < holdFrames };
    s = stepMovement(s, input, { grounded: y >= 0, ceiling: false }, DT, T);
    y = Math.min(0, y + (s.vy * DT) / 1000);
    peak = Math.min(peak, y);
  }
  return -peak;
}

describe('stepMovement — horizontal', () => {
  it('acelera no chão até a velocidade de corrida e para nela', () => {
    const one = stepMovement(initialMoveState(), { ...NONE, right: true }, GROUND, DT, T);
    expect(one.vx).toBeCloseTo((2000 * DT) / 1000);
    const many = run(initialMoveState(), 20, { ...NONE, right: true }, GROUND);
    expect(many.vx).toBe(200);
    expect(many.facing).toBe(1);
  });

  it('vira para a esquerda e desacelera até parar sem input', () => {
    const left = run(initialMoveState(), 20, { ...NONE, left: true }, GROUND);
    expect(left.facing).toBe(-1);
    expect(left.vx).toBe(-200);
    const stopped = run(left, 20, NONE, GROUND);
    expect(stopped.vx).toBe(0);
    expect(stopped.facing).toBe(-1);
  });

  it('travado (atacando) não acelera nem pula', () => {
    const s = stepMovement(initialMoveState(), { ...JUMP, right: true }, GROUND, DT, T, true);
    expect(s.vx).toBe(0);
    expect(s.vy).toBe(0);
    expect(s.jumping).toBe(false);
  });
});

describe('stepMovement — pulo', () => {
  it('parado no chão fica com vy = 0', () => {
    expect(run(initialMoveState(), 10, NONE, GROUND).vy).toBe(0);
  });

  it('pula quando está no chão e aperta pulo', () => {
    const s = stepMovement(initialMoveState(), JUMP, GROUND, DT, T);
    expect(s.vy).toBe(-400);
    expect(s.jumping).toBe(true);
  });

  it('não pula no ar sem coyote time', () => {
    const s = stepMovement(initialMoveState(), JUMP, AIR, DT, T);
    expect(s.jumping).toBe(false);
    expect(s.vy).toBeGreaterThan(0);
  });

  it('coyote time: ainda pula logo depois de sair da plataforma', () => {
    let s = run(initialMoveState(), 1, NONE, GROUND);
    s = run(s, 3, NONE, AIR); // 50 ms no ar
    s = stepMovement(s, JUMP, AIR, DT, T);
    expect(s.jumping).toBe(true);
    expect(s.vy).toBe(-400);
  });

  it('coyote time expira', () => {
    let s = run(initialMoveState(), 1, NONE, GROUND);
    s = run(s, 7, NONE, AIR); // ~117 ms no ar
    s = stepMovement(s, JUMP, AIR, DT, T);
    expect(s.jumping).toBe(false);
  });

  it('jump buffer: apertar pulo um pouco antes de pousar ainda pula', () => {
    let s: MoveState = { ...initialMoveState(), vy: 200 };
    s = stepMovement(s, JUMP, AIR, DT, T);
    s = run(s, 3, { ...NONE, jumpHeld: true }, AIR);
    s = stepMovement(s, { ...NONE, jumpHeld: true }, GROUND, DT, T);
    expect(s.jumping).toBe(true);
    expect(s.vy).toBe(-400);
  });

  it('segurar o botão pula bem mais alto que um toque', () => {
    const tap = peakHeight(1);
    const full = peakHeight(60);
    expect(tap).toBeLessThan(30);
    expect(full).toBeGreaterThan(90);
    expect(full).toBeLessThan(130);
    expect(full).toBeGreaterThan(tap * 3);
  });

  it('bater a cabeça no teto corta a subida', () => {
    let s = stepMovement(initialMoveState(), JUMP, GROUND, DT, T);
    s = stepMovement(s, { ...NONE, jumpHeld: true }, { grounded: false, ceiling: true }, DT, T);
    expect(s.vy).toBeGreaterThanOrEqual(0);
    expect(s.jumping).toBe(false);
  });

  it('a velocidade de queda tem limite', () => {
    expect(run(initialMoveState(), 120, NONE, AIR).vy).toBe(900);
  });

  it('frames longos (dt = 50 ms) não estouram a velocidade', () => {
    let s = initialMoveState();
    for (let i = 0; i < 40; i++) s = stepMovement(s, { ...NONE, right: true }, AIR, 50, T);
    expect(s.vy).toBe(900);
    expect(s.vx).toBe(200);
    expect(stepMovement(initialMoveState(), JUMP, GROUND, 50, T).vy).toBe(-400);
  });
});
```

- [x] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/core/movement.test.ts`
Expected: FAIL — `Cannot find module '../../src/core/movement'`.

- [x] **Step 3: Implementar**

`src/core/movement.ts`:

```ts
export interface MoveTuning {
  runSpeed: number; // px/s
  accelGround: number; // px/s²
  accelAir: number; // px/s²
  gravity: number; // px/s²
  maxFallSpeed: number; // px/s
  jumpSpeed: number; // px/s
  maxJumpHoldMs: number; // quanto tempo segurar o botão ainda sustenta a subida
  jumpCutFactor: number; // multiplica vy ao soltar o botão no meio da subida
  coyoteMs: number; // tolerância para pular depois de sair do chão
  jumpBufferMs: number; // tolerância para apertar pulo antes de pousar
}

export interface MoveInput {
  left: boolean;
  right: boolean;
  jumpPressed: boolean; // borda: apertou neste frame
  jumpHeld: boolean;
}

export interface MoveSensors {
  grounded: boolean;
  ceiling: boolean;
}

export interface MoveState {
  vx: number;
  vy: number;
  facing: 1 | -1;
  jumping: boolean;
  jumpHoldMs: number;
  coyoteMs: number;
  jumpBufferMs: number;
}

export function initialMoveState(): MoveState {
  return { vx: 0, vy: 0, facing: 1, jumping: false, jumpHoldMs: 0, coyoteMs: 0, jumpBufferMs: 0 };
}

function approach(value: number, target: number, delta: number): number {
  return value < target ? Math.min(value + delta, target) : Math.max(value - delta, target);
}

/**
 * Um frame de movimentação do player. A velocidade resultante é aplicada
 * diretamente no corpo do Matter (sem física livre), para o pulo ser
 * determinístico. `locked` = atacando: sem acelerar nem iniciar pulo.
 */
export function stepMovement(
  prev: MoveState,
  input: MoveInput,
  sensors: MoveSensors,
  dtMs: number,
  t: MoveTuning,
  locked = false,
): MoveState {
  const dt = dtMs / 1000;
  const s = { ...prev };
  // Subindo não conta como chão, mesmo se o sensor ainda enxerga o piso.
  const onGround = sensors.grounded && s.vy >= 0;

  const dir = locked ? 0 : (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) s.facing = dir > 0 ? 1 : -1;
  s.vx = approach(s.vx, dir * t.runSpeed, (onGround ? t.accelGround : t.accelAir) * dt);

  s.coyoteMs = onGround ? t.coyoteMs : Math.max(0, s.coyoteMs - dtMs);
  s.jumpBufferMs = input.jumpPressed ? t.jumpBufferMs : Math.max(0, s.jumpBufferMs - dtMs);

  if (!locked && s.jumpBufferMs > 0 && s.coyoteMs > 0) {
    s.vy = -t.jumpSpeed;
    s.jumping = true;
    s.jumpHoldMs = 0;
    s.jumpBufferMs = 0;
    s.coyoteMs = 0;
  } else if (s.jumping && input.jumpHeld && s.jumpHoldMs < t.maxJumpHoldMs) {
    s.vy = -t.jumpSpeed;
    s.jumpHoldMs += dtMs;
  } else {
    if (s.jumping && !input.jumpHeld && s.vy < 0) s.vy *= t.jumpCutFactor;
    s.jumping = false;
    s.vy = Math.min(s.vy + t.gravity * dt, t.maxFallSpeed);
  }

  if (sensors.ceiling && s.vy < 0) {
    s.vy = 0;
    s.jumping = false;
  }
  if (onGround && !s.jumping && s.vy > 0) s.vy = 0;
  return s;
}
```

`src/data/tuning.ts`:

```ts
import type { MoveTuning } from '../core/movement';

/** Pulo máximo ≈ 130 px (4 tiles); toque ≈ 30 px. Ajustar jogando. */
export const PLAYER_MOVE: MoveTuning = {
  runSpeed: 220,
  accelGround: 2400,
  accelAir: 1400,
  gravity: 1800,
  maxFallSpeed: 900,
  jumpSpeed: 420,
  maxJumpHoldMs: 180,
  jumpCutFactor: 0.45,
  coyoteMs: 90,
  jumpBufferMs: 110,
};
```

- [x] **Step 4: Rodar os testes**

Run: `npm test`
Expected: PASS (todos, incluindo os 13 de movimento).

- [x] **Step 5: Commit**

```bash
git add src/core/movement.ts src/data/tuning.ts tests/core/movement.test.ts
git commit -m "feat: add deterministic platformer movement logic" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Player na cena (corpo Matter, input, sensores de chão/teto, câmera)

**Files:**
- Create: `src/game/input.ts`, `src/game/Player.ts`
- Modify: `src/scenes/TestScene.ts` (arquivo inteiro abaixo)

**Interfaces:**
- Consumes: `stepMovement`, `initialMoveState`, `MoveState` (Task 3); `PLAYER_MOVE`; `Filters` (Task 2); `tagBody`, `newEntityId`, `Hittable`; `bodyOf`, `PX_PER_S_TO_STEP`, `MAX_FRAME_MS`; `TEX`.
- Produces:
  - `interface InputSnapshot { left; right; down; jumpPressed; jumpHeld; attackPressed; interactPressed }` (todos `boolean`), compatível com `MoveInput`
  - `class PlayerInput { constructor(scene: Phaser.Scene); read(): InputSnapshot }` (ler **uma vez** por frame)
  - `class Player implements Hittable { readonly id: number; readonly sprite: Phaser.Physics.Matter.Image; get facing(): 1 | -1; constructor(scene, x, y, terrain: MatterJS.BodyType[]); update(dtMs: number, input: InputSnapshot): void }`

- [x] **Step 1: Input**

`src/game/input.ts`:

```ts
import Phaser from 'phaser';

export interface InputSnapshot {
  left: boolean;
  right: boolean;
  down: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  attackPressed: boolean;
  interactPressed: boolean;
}

type Key = Phaser.Input.Keyboard.Key;

const anyDown = (keys: Key[]): boolean => keys.some((k) => k.isDown);
// JustDown "consome" a borda: chamar em todas as teclas, não parar na primeira.
const anyJustDown = (keys: Key[]): boolean => keys.map((k) => Phaser.Input.Keyboard.JustDown(k)).some(Boolean);

export class PlayerInput {
  private readonly left: Key[];
  private readonly right: Key[];
  private readonly down: Key[];
  private readonly jump: Key[];
  private readonly attack: Key[];
  private readonly interact: Key[];

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    const keys = (...codes: number[]): Key[] => codes.map((c) => kb.addKey(c));
    this.left = keys(K.A, K.LEFT);
    this.right = keys(K.D, K.RIGHT);
    this.down = keys(K.S, K.DOWN);
    this.jump = keys(K.SPACE, K.W, K.UP);
    this.attack = keys(K.J, K.X);
    this.interact = keys(K.K, K.Z);
  }

  /** Chamar uma vez por frame. */
  read(): InputSnapshot {
    return {
      left: anyDown(this.left),
      right: anyDown(this.right),
      down: anyDown(this.down),
      jumpPressed: anyJustDown(this.jump),
      jumpHeld: anyDown(this.jump),
      attackPressed: anyJustDown(this.attack),
      interactPressed: anyJustDown(this.interact),
    };
  }
}
```

- [x] **Step 2: Player**

`src/game/Player.ts`:

```ts
import Phaser from 'phaser';
import { Filters } from '../core/collision';
import type { Hit } from '../core/hit';
import { initialMoveState, stepMovement, type MoveState } from '../core/movement';
import { PLAYER_MOVE } from '../data/tuning';
import { newEntityId, tagBody, type Hittable } from './bodyTags';
import type { InputSnapshot } from './input';
import { PX_PER_S_TO_STEP, bodyOf } from './physics';
import { TEX } from './textures';

/** Espessura das zonas de sensor de chão/teto (px). */
const SENSOR_DEPTH = 3;

export class Player implements Hittable {
  readonly id = newEntityId();
  readonly sprite: Phaser.Physics.Matter.Image;
  private move: MoveState = initialMoveState();

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly terrain: MatterJS.BodyType[],
  ) {
    this.sprite = scene.matter.add.image(x, y, TEX.player, undefined, {
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0,
      chamfer: { radius: 4 },
      collisionFilter: { ...Filters.player },
    });
    this.sprite.setFixedRotation();
    // A gravidade do player é calculada em stepMovement, não pelo Matter.
    this.sprite.setIgnoreGravity(true);
    tagBody(bodyOf(this.sprite), { kind: 'character', target: this });
  }

  get facing(): 1 | -1 {
    return this.move.facing;
  }

  receiveHit(_hit: Hit): void {
    // O player não recebe dano nesta demo (fora do escopo do sub-projeto 1).
  }

  update(dtMs: number, input: InputSnapshot): void {
    const sensors = { grounded: this.touchesTerrain('below'), ceiling: this.touchesTerrain('above') };
    this.move = stepMovement(this.move, input, sensors, dtMs, PLAYER_MOVE, false);
    this.sprite.setVelocity(this.move.vx * PX_PER_S_TO_STEP, this.move.vy * PX_PER_S_TO_STEP);
    this.sprite.setFlipX(this.move.facing < 0);
  }

  /** Sensor por região: uma faixa fina logo abaixo (ou acima) do corpo, recuada das laterais para não pegar paredes. */
  private touchesTerrain(side: 'below' | 'above'): boolean {
    const b = bodyOf(this.sprite).bounds;
    const y0 = side === 'below' ? b.max.y : b.min.y - SENSOR_DEPTH;
    const region = { min: { x: b.min.x + 3, y: y0 }, max: { x: b.max.x - 3, y: y0 + SENSOR_DEPTH } };
    return this.scene.matter.query.region(this.terrain, region).length > 0;
  }
}
```

> Nota de design: o spec pede "detecção de chão por sensores". Aqui o sensor é uma consulta de região (`Matter.Query.region`) a cada frame em vez de um corpo sensor com contagem de contatos — mesmo efeito, sem estado de contato para dessincronizar. O Matter só checa o filtro do corpo pai em corpos compostos, então um sensor preso ao player como "parte" não funcionaria com filtro próprio.

> **Correção na execução (Task 4):** o código do plano montava a região do sensor a partir de `body.bounds`. O Matter alarga esse AABB pela velocidade do frame; empurrando a parede a ~3,7 px/step o AABB invadia o terreno além da folga lateral de 3 px, então a parede aparecia como teto (cancelando o pulo) e como chão. `Player.touchesTerrain` agora usa `body.position` + `displayWidth/Height`. `SPAWN_LIFT` passou de 4 para 2 (o player nascia 2 px acima do chão, porque o sensor de 3 px já o considerava apoiado).

- [x] **Step 3: Cena com player e câmera**

`src/scenes/TestScene.ts` (arquivo inteiro):

```ts
import Phaser from 'phaser';
import { Filters } from '../core/collision';
import { parseLevel, type LevelData } from '../core/level';
import { LEVEL_1 } from '../data/level1';
import { routeContact, tagBody } from '../game/bodyTags';
import { PlayerInput } from '../game/input';
import { MAX_FRAME_MS } from '../game/physics';
import { Player } from '../game/Player';
import { TEX, createPlaceholderTextures } from '../game/textures';

type ContactEvent = { pairs: { bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType }[] };

/** Spawns ficam no centro do tile; sobe um pouco para o corpo não nascer dentro do chão. */
const SPAWN_LIFT = 4;

export class TestScene extends Phaser.Scene {
  private level!: LevelData;
  private terrain: MatterJS.BodyType[] = [];
  private controls!: PlayerInput;
  private player!: Player;

  constructor() {
    super('TestScene');
  }

  create(): void {
    createPlaceholderTextures(this);
    this.level = parseLevel(LEVEL_1);
    this.terrain = [];
    this.buildTerrain();
    this.listenForContacts();

    this.controls = new PlayerInput(this);
    const p = this.level.player;
    this.player = new Player(this, p.x, p.y - SPAWN_LIFT, this.terrain);

    this.cameras.main.setBounds(0, 0, this.level.widthPx, this.level.heightPx);
    this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, MAX_FRAME_MS);
    this.player.update(dt, this.controls.read());
  }

  private buildTerrain(): void {
    for (const r of this.level.solids) {
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      this.add.tileSprite(cx, cy, r.width, r.height, TEX.terrain);
      const body = this.matter.add.rectangle(cx, cy, r.width, r.height, {
        isStatic: true,
        label: 'terrain',
        collisionFilter: { ...Filters.terrain },
      });
      tagBody(body, { kind: 'terrain' });
      this.terrain.push(body);
    }
  }

  private listenForContacts(): void {
    const onStart = (event: ContactEvent): void => {
      for (const pair of event.pairs) routeContact(pair.bodyA, pair.bodyB);
    };
    this.matter.world.on('collisionstart', onStart);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.matter.world?.off('collisionstart', onStart));
  }
}
```

- [x] **Step 4: Verificar build e testes**

Run: `npm run build && npm test`
Expected: sem erros; testes passam.

- [x] **Step 5: Teste manual de "feel" (o spec pede validar cedo)**

Run: `npm run dev`, abrir no navegador.
Checklist — todos precisam ser verdade:
- [x] Retângulo azul nasce no chão à esquerda e não afunda nem treme parado.
- [x] A/D (ou ←/→) corre; soltar para rápido, sem escorregar. O "olho" vira para o lado do movimento.
- [x] Toque rápido em Espaço dá um pulinho (~1 tile); segurar dá um pulo alto (~4 tiles) que alcança as plataformas baixas.
- [x] Segurar direção contra a parede no meio do pulo **não** gruda o player na parede.
- [x] Pular embaixo de uma plataforma: a cabeça bate e o player cai na hora, sem "flutuar" colado no teto.
- [x] Sair andando da borda de uma plataforma e apertar pulo logo em seguida ainda pula (coyote).
- [x] Apertar pulo um instante antes de pousar pula assim que toca o chão (buffer).
- [x] Não existe pulo duplo no ar.
- [x] A câmera segue o player sem sair dos limites da sala.

Se algo do feel estiver ruim (não os bugs), ajustar só `PLAYER_MOVE` em `src/data/tuning.ts` e rodar `npm test` de novo (os testes de movimento usam tuning próprio e não quebram com isso).

- [x] **Step 6: Commit**

```bash
git add src
git commit -m "feat: add controllable player with sensor-based ground detection" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Lógica do combo corpo a corpo

**Files:**
- Create: `src/core/combo.ts`
- Modify: `src/data/tuning.ts` (acrescentar ao final)
- Test: `tests/core/combo.test.ts`

**Interfaces:**
- Consumes: `Strength` (Task 2).
- Produces:
  - `interface HitboxShape { offsetX: number; offsetY: number; width: number; height: number }` (offsetX positivo = à frente do personagem)
  - `interface AttackStep { name: string; damage: number; strength: Strength; force: number; startupMs: number; activeMs: number; recoveryMs: number; hitbox?: HitboxShape }`
  - `type ComboEvent = { type: 'stepStart'; index: number; step: AttackStep } | { type: 'hitboxOn'; index: number; step: AttackStep } | { type: 'hitboxOff'; index: number } | { type: 'comboEnd' }`
  - `class ComboTracker { constructor(steps: readonly AttackStep[], windowMs: number); get isAttacking(): boolean; get currentIndex(): number; press(): ComboEvent[]; update(dtMs: number): ComboEvent[]; cancel(): ComboEvent[] }`
  - `PLAYER_COMBO: AttackStep[]`, `COMBO_WINDOW_MS: number`, `PROP_SWING: AttackStep` em `src/data/tuning.ts`

- [x] **Step 1: Escrever os testes (falhando)**

`tests/core/combo.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ComboTracker, type AttackStep, type ComboEvent } from '../../src/core/combo';
import type { Strength } from '../../src/core/hit';
import { PLAYER_COMBO, PROP_SWING } from '../../src/data/tuning';

const step = (name: string, strength: Strength): AttackStep => ({
  name,
  damage: 5,
  strength,
  force: 1,
  startupMs: 50,
  activeMs: 50,
  recoveryMs: 100,
  hitbox: { offsetX: 10, offsetY: 0, width: 10, height: 10 },
});
const STEPS = [step('a', 'light'), step('b', 'light'), step('c', 'heavy')];
const WINDOW = 200;
const types = (evs: ComboEvent[]): string[] => evs.map((e) => e.type);
/** startup (50) → active (50) → recovery (100). */
const finishStep = (c: ComboTracker): ComboEvent[] => [...c.update(50), ...c.update(50), ...c.update(100)];

describe('ComboTracker', () => {
  it('apertar parado começa o primeiro golpe e trava o player', () => {
    const c = new ComboTracker(STEPS, WINDOW);
    const evs = c.press();
    expect(evs).toEqual([{ type: 'stepStart', index: 0, step: STEPS[0] }]);
    expect(c.isAttacking).toBe(true);
  });

  it('liga e desliga a hitbox e abre a janela de combo sem travar o player', () => {
    const c = new ComboTracker(STEPS, WINDOW);
    c.press();
    expect(types(finishStep(c))).toEqual(['hitboxOn', 'hitboxOff']);
    expect(c.isAttacking).toBe(false);
    expect(c.currentIndex).toBe(0);
  });

  it('apertar dentro da janela encadeia o próximo golpe', () => {
    const c = new ComboTracker(STEPS, WINDOW);
    c.press();
    finishStep(c);
    expect(c.press()).toEqual([{ type: 'stepStart', index: 1, step: STEPS[1] }]);
  });

  it('apertar durante o golpe fica no buffer e encadeia assim que a recuperação acaba', () => {
    const c = new ComboTracker(STEPS, WINDOW);
    c.press();
    c.update(50); // hitboxOn
    c.press(); // buffer
    const evs = [...c.update(50), ...c.update(100)];
    expect(types(evs)).toEqual(['hitboxOff', 'stepStart']);
    expect(c.currentIndex).toBe(1);
  });

  it('janela expirada encerra o combo e o próximo aperto volta ao primeiro golpe', () => {
    const c = new ComboTracker(STEPS, WINDOW);
    c.press();
    finishStep(c);
    expect(types(c.update(WINDOW))).toEqual(['comboEnd']);
    expect(c.press()[0]).toMatchObject({ type: 'stepStart', index: 0 });
  });

  it('combo completo é leve, leve, forte e termina sozinho', () => {
    const c = new ComboTracker(STEPS, WINDOW);
    const starts: ComboEvent[] = [];
    let last: ComboEvent[] = [];
    for (let i = 0; i < 3; i++) {
      starts.push(...c.press());
      last = finishStep(c);
    }
    expect(starts.map((e) => (e.type === 'stepStart' ? e.step.strength : null))).toEqual(['light', 'light', 'heavy']);
    expect(types(last)).toEqual(['hitboxOn', 'hitboxOff', 'comboEnd']);
    expect(c.isAttacking).toBe(false);
  });

  it('aperto sobrando no último golpe não inicia combo fantasma', () => {
    const c = new ComboTracker(STEPS, WINDOW);
    c.press();
    finishStep(c);
    c.press();
    finishStep(c);
    c.press();
    c.update(50);
    c.press(); // buffer no último golpe
    const evs = [...c.update(50), ...c.update(100)];
    expect(types(evs)).toEqual(['hitboxOff', 'comboEnd']);
    expect(c.isAttacking).toBe(false);
    expect(c.press()[0]).toMatchObject({ type: 'stepStart', index: 0 });
  });

  it('spam de ataque guarda só um aperto no buffer', () => {
    const c = new ComboTracker(STEPS, WINDOW);
    c.press();
    for (let i = 0; i < 10; i++) c.press();
    const evs = finishStep(c);
    expect(evs.filter((e) => e.type === 'stepStart')).toHaveLength(1);
    expect(c.currentIndex).toBe(1);
  });

  it('cancelar durante a hitbox ativa desliga a hitbox e encerra', () => {
    const c = new ComboTracker(STEPS, WINDOW);
    c.press();
    c.update(50);
    expect(types(c.cancel())).toEqual(['hitboxOff', 'comboEnd']);
    expect(c.isAttacking).toBe(false);
    expect(c.cancel()).toEqual([]);
  });

  it('golpe único sem janela (golpe com objeto) termina direto', () => {
    const c = new ComboTracker([step('swing', 'heavy')], 0);
    c.press();
    expect(types(finishStep(c))).toEqual(['hitboxOn', 'hitboxOff', 'comboEnd']);
  });

  it('não aceita combo vazio', () => {
    expect(() => new ComboTracker([], WINDOW)).toThrow();
  });
});

describe('dados de combo', () => {
  it('o último golpe do combo do player é forte e os anteriores são leves', () => {
    expect(PLAYER_COMBO.length).toBeGreaterThanOrEqual(2);
    expect(PLAYER_COMBO.length).toBeLessThanOrEqual(3);
    expect(PLAYER_COMBO[PLAYER_COMBO.length - 1].strength).toBe('heavy');
    for (const s of PLAYER_COMBO.slice(0, -1)) expect(s.strength).toBe('light');
    for (const s of PLAYER_COMBO) expect(s.hitbox).toBeDefined();
  });

  it('golpe com objeto é sempre forte', () => {
    expect(PROP_SWING.strength).toBe('heavy');
  });
});
```

- [x] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/core/combo.test.ts`
Expected: FAIL — módulo `combo` não existe.

- [x] **Step 3: Implementar**

`src/core/combo.ts`:

```ts
import type { Strength } from './hit';

export interface HitboxShape {
  offsetX: number; // positivo = à frente de quem ataca
  offsetY: number;
  width: number;
  height: number;
}

export interface AttackStep {
  name: string;
  damage: number;
  strength: Strength;
  force: number;
  startupMs: number;
  activeMs: number;
  recoveryMs: number;
  /** Ausente quando a hitbox é o próprio objeto na mão. */
  hitbox?: HitboxShape;
}

export type ComboEvent =
  | { type: 'stepStart'; index: number; step: AttackStep }
  | { type: 'hitboxOn'; index: number; step: AttackStep }
  | { type: 'hitboxOff'; index: number }
  | { type: 'comboEnd' };

type Phase = 'idle' | 'startup' | 'active' | 'recovery' | 'window';

/**
 * Sequência de golpes: cada golpe tem startup → active (hitbox ligada) → recovery.
 * Apertar durante um golpe guarda UM aperto no buffer; apertar na janela após a
 * recuperação encadeia o próximo. Depois do último golpe o combo sempre termina.
 */
export class ComboTracker {
  private phase: Phase = 'idle';
  private index = -1;
  private timer = 0;
  private buffered = false;

  constructor(
    private readonly steps: readonly AttackStep[],
    private readonly windowMs: number,
  ) {
    if (steps.length === 0) throw new Error('Combo precisa de pelo menos um golpe');
  }

  /** Durante startup/active/recovery o personagem fica travado; na janela ele já pode se mexer. */
  get isAttacking(): boolean {
    return this.phase === 'startup' || this.phase === 'active' || this.phase === 'recovery';
  }

  get currentIndex(): number {
    return this.index;
  }

  press(): ComboEvent[] {
    const events: ComboEvent[] = [];
    if (this.phase === 'idle') this.startStep(0, events);
    else if (this.phase === 'window') this.startStep(this.index + 1, events);
    else this.buffered = true;
    return events;
  }

  update(dtMs: number): ComboEvent[] {
    const events: ComboEvent[] = [];
    if (this.phase === 'idle') return events;
    this.timer -= dtMs;
    if (this.timer > 0) return events;

    const step = this.steps[this.index];
    switch (this.phase) {
      case 'startup':
        this.phase = 'active';
        this.timer = step.activeMs;
        events.push({ type: 'hitboxOn', index: this.index, step });
        break;
      case 'active':
        this.phase = 'recovery';
        this.timer = step.recoveryMs;
        events.push({ type: 'hitboxOff', index: this.index });
        break;
      case 'recovery': {
        const hasNext = this.index + 1 < this.steps.length;
        if (hasNext && this.buffered) this.startStep(this.index + 1, events);
        else if (hasNext && this.windowMs > 0) {
          this.phase = 'window';
          this.timer = this.windowMs;
        } else this.end(events);
        break;
      }
      case 'window':
        this.end(events);
        break;
    }
    return events;
  }

  cancel(): ComboEvent[] {
    const events: ComboEvent[] = [];
    if (this.phase === 'idle') return events;
    if (this.phase === 'active') events.push({ type: 'hitboxOff', index: this.index });
    this.end(events);
    return events;
  }

  private startStep(index: number, events: ComboEvent[]): void {
    this.index = index;
    this.phase = 'startup';
    this.timer = this.steps[index].startupMs;
    this.buffered = false;
    events.push({ type: 'stepStart', index, step: this.steps[index] });
  }

  private end(events: ComboEvent[]): void {
    this.phase = 'idle';
    this.index = -1;
    this.timer = 0;
    this.buffered = false;
    events.push({ type: 'comboEnd' });
  }
}
```

Acrescentar ao final de `src/data/tuning.ts` (e juntar o import no topo):

```ts
import type { AttackStep } from '../core/combo';

/** Soco, soco, chute. force = impulso em px por step do Matter. */
export const PLAYER_COMBO: AttackStep[] = [
  {
    name: 'jab',
    damage: 8,
    strength: 'light',
    force: 3,
    startupMs: 60,
    activeMs: 80,
    recoveryMs: 120,
    hitbox: { offsetX: 22, offsetY: -4, width: 26, height: 18 },
  },
  {
    name: 'direto',
    damage: 8,
    strength: 'light',
    force: 3,
    startupMs: 60,
    activeMs: 80,
    recoveryMs: 140,
    hitbox: { offsetX: 22, offsetY: -4, width: 26, height: 18 },
  },
  {
    name: 'chute',
    damage: 18,
    strength: 'heavy',
    force: 9,
    startupMs: 110,
    activeMs: 100,
    recoveryMs: 260,
    hitbox: { offsetX: 26, offsetY: 6, width: 32, height: 20 },
  },
];

export const COMBO_WINDOW_MS = 260;

/** Golpe com objeto na mão: sempre forte; dano e força vêm do PropDef. */
export const PROP_SWING: AttackStep = {
  name: 'golpe-com-objeto',
  damage: 0,
  strength: 'heavy',
  force: 0,
  startupMs: 120,
  activeMs: 140,
  recoveryMs: 220,
};
```

- [x] **Step 4: Rodar os testes**

Run: `npm test`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/core/combo.ts src/data/tuning.ts tests/core/combo.test.ts
git commit -m "feat: add melee combo tracker with input buffer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Cérebro do inimigo (reação leve/forte, ragdoll, morte, dissolução)

**Files:**
- Create: `src/core/enemyBrain.ts`
- Modify: `src/data/tuning.ts` (acrescentar ao final)
- Test: `tests/core/enemyBrain.test.ts`

**Interfaces:**
- Consumes: `Hit` (Task 2).
- Produces:
  - `type EnemyState = 'idle' | 'hitstun' | 'ragdollStun' | 'gettingUp' | 'deadRagdoll' | 'dissolving' | 'gone'`
  - `interface EnemyTuning { maxHp; hitstunMs; ragdollStunMs; getUpMs; deathRagdollMs; dissolveMs }` (todos `number`)
  - `type EnemyEvent = { type: 'hitReaction'; hit: Hit } | { type: 'ragdoll'; hit: Hit } | { type: 'hurtWhileDown'; hit: Hit } | { type: 'died'; hit: Hit } | { type: 'getUp' } | { type: 'recovered' } | { type: 'dissolve' } | { type: 'removed' }`
  - `class EnemyBrain { constructor(t: EnemyTuning); get state(): EnemyState; get hp(): number; get isDead(): boolean; receiveHit(hit: Hit): EnemyEvent[]; update(dtMs: number): EnemyEvent[] }`
  - `ENEMY: EnemyTuning`, `ENEMY_RESPAWN_MS: number` em `src/data/tuning.ts`

- [x] **Step 1: Escrever os testes (falhando)**

`tests/core/enemyBrain.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { EnemyBrain, type EnemyEvent, type EnemyTuning } from '../../src/core/enemyBrain';
import type { Hit } from '../../src/core/hit';

const T: EnemyTuning = { maxHp: 30, hitstunMs: 100, ragdollStunMs: 500, getUpMs: 200, deathRagdollMs: 1000, dissolveMs: 300 };
const light = (damage = 5): Hit => ({ ownerId: 1, damage, strength: 'light', direction: { x: 1, y: 0 }, force: 3 });
const heavy = (damage = 10): Hit => ({ ownerId: 1, damage, strength: 'heavy', direction: { x: 1, y: -0.5 }, force: 9 });
const types = (evs: EnemyEvent[]): string[] => evs.map((e) => e.type);

describe('EnemyBrain', () => {
  it('golpe leve: reação por animação, depois volta ao normal', () => {
    const b = new EnemyBrain(T);
    expect(types(b.receiveHit(light()))).toEqual(['hitReaction']);
    expect(b.state).toBe('hitstun');
    expect(b.hp).toBe(25);
    b.update(100);
    expect(b.state).toBe('idle');
  });

  it('golpe forte: ragdoll, atordoado, levanta e volta ao normal', () => {
    const b = new EnemyBrain(T);
    expect(types(b.receiveHit(heavy()))).toEqual(['ragdoll']);
    expect(b.state).toBe('ragdollStun');
    expect(types(b.update(500))).toEqual(['getUp']);
    expect(b.state).toBe('gettingUp');
    expect(types(b.update(200))).toEqual(['recovered']);
    expect(b.state).toBe('idle');
  });

  it('caído leva dano de golpe leve sem reiniciar o tempo no chão', () => {
    const b = new EnemyBrain(T);
    b.receiveHit(heavy());
    b.update(300);
    expect(types(b.receiveHit(light()))).toEqual(['hurtWhileDown']);
    expect(b.hp).toBe(15);
    expect(types(b.update(200))).toEqual(['getUp']);
  });

  it('golpe forte em quem já está caído dá novo impulso e reinicia o tempo no chão', () => {
    const b = new EnemyBrain(T);
    b.receiveHit(heavy(1));
    b.update(300);
    expect(types(b.receiveHit(heavy(1)))).toEqual(['ragdoll']);
    expect(b.update(300)).toEqual([]);
    expect(types(b.update(200))).toEqual(['getUp']);
  });

  it('golpe leve enquanto levanta interrompe e vira reação leve', () => {
    const b = new EnemyBrain(T);
    b.receiveHit(heavy(1));
    b.update(500);
    expect(types(b.receiveHit(light(1)))).toEqual(['hitReaction']);
    expect(b.state).toBe('hitstun');
  });

  it('golpe fatal: ragdoll permanente, dissolve e some', () => {
    const b = new EnemyBrain(T);
    expect(types(b.receiveHit(heavy(30)))).toEqual(['died', 'ragdoll']);
    expect(b.state).toBe('deadRagdoll');
    expect(b.isDead).toBe(true);
    expect(types(b.update(1000))).toEqual(['dissolve']);
    expect(b.state).toBe('dissolving');
    expect(types(b.update(300))).toEqual(['removed']);
    expect(b.state).toBe('gone');
    expect(b.update(1000)).toEqual([]);
  });

  it('golpe fatal leve também termina em ragdoll', () => {
    const b = new EnemyBrain(T);
    expect(types(b.receiveHit(light(30)))).toEqual(['died', 'ragdoll']);
  });

  it('dano excedente não deixa hp negativo', () => {
    const b = new EnemyBrain(T);
    b.receiveHit(heavy(999));
    expect(b.hp).toBe(0);
  });

  it('golpes depois de morto são ignorados (sem morte dupla)', () => {
    const b = new EnemyBrain(T);
    b.receiveHit(heavy(30));
    expect(b.receiveHit(heavy())).toEqual([]);
    expect(b.receiveHit(light())).toEqual([]);
    b.update(1000);
    expect(b.receiveHit(heavy())).toEqual([]);
    expect(b.state).toBe('dissolving');
  });
});
```

- [x] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/core/enemyBrain.test.ts`
Expected: FAIL — módulo `enemyBrain` não existe.

- [x] **Step 3: Implementar**

`src/core/enemyBrain.ts`:

```ts
import type { Hit } from './hit';

export type EnemyState = 'idle' | 'hitstun' | 'ragdollStun' | 'gettingUp' | 'deadRagdoll' | 'dissolving' | 'gone';

export interface EnemyTuning {
  maxHp: number;
  hitstunMs: number;
  ragdollStunMs: number;
  getUpMs: number;
  deathRagdollMs: number;
  dissolveMs: number;
}

export type EnemyEvent =
  | { type: 'hitReaction'; hit: Hit }
  | { type: 'ragdoll'; hit: Hit } // entra em ragdoll, ou novo impulso se já estiver
  | { type: 'hurtWhileDown'; hit: Hit }
  | { type: 'died'; hit: Hit }
  | { type: 'getUp' }
  | { type: 'recovered' }
  | { type: 'dissolve' }
  | { type: 'removed' };

/**
 * Reação a dano agnóstica da origem do golpe: leve = animação, forte = ragdoll
 * temporário, fatal = ragdoll permanente seguido de dissolução.
 */
export class EnemyBrain {
  private _state: EnemyState = 'idle';
  private _hp: number;
  private timer = 0;

  constructor(private readonly t: EnemyTuning) {
    this._hp = t.maxHp;
  }

  get state(): EnemyState {
    return this._state;
  }

  get hp(): number {
    return this._hp;
  }

  get isDead(): boolean {
    return this._state === 'deadRagdoll' || this._state === 'dissolving' || this._state === 'gone';
  }

  receiveHit(hit: Hit): EnemyEvent[] {
    if (this.isDead) return [];
    this._hp = Math.max(0, this._hp - hit.damage);
    if (this._hp === 0) {
      this.enter('deadRagdoll', this.t.deathRagdollMs);
      return [{ type: 'died', hit }, { type: 'ragdoll', hit }];
    }
    if (hit.strength === 'heavy') {
      this.enter('ragdollStun', this.t.ragdollStunMs);
      return [{ type: 'ragdoll', hit }];
    }
    if (this._state === 'ragdollStun') return [{ type: 'hurtWhileDown', hit }];
    this.enter('hitstun', this.t.hitstunMs);
    return [{ type: 'hitReaction', hit }];
  }

  update(dtMs: number): EnemyEvent[] {
    if (this._state === 'idle' || this._state === 'gone') return [];
    this.timer -= dtMs;
    if (this.timer > 0) return [];
    switch (this._state) {
      case 'hitstun':
        this.enter('idle', 0);
        return [];
      case 'ragdollStun':
        this.enter('gettingUp', this.t.getUpMs);
        return [{ type: 'getUp' }];
      case 'gettingUp':
        this.enter('idle', 0);
        return [{ type: 'recovered' }];
      case 'deadRagdoll':
        this.enter('dissolving', this.t.dissolveMs);
        return [{ type: 'dissolve' }];
      case 'dissolving':
        this.enter('gone', 0);
        return [{ type: 'removed' }];
      default:
        return [];
    }
  }

  private enter(state: EnemyState, ms: number): void {
    this._state = state;
    this.timer = ms;
  }
}
```

Acrescentar ao final de `src/data/tuning.ts` (e juntar o import no topo):

```ts
import type { EnemyTuning } from '../core/enemyBrain';

/** 60 de hp = ~2 combos completos, ou 3 cadeiradas. */
export const ENEMY: EnemyTuning = {
  maxHp: 60,
  hitstunMs: 220,
  ragdollStunMs: 1100,
  getUpMs: 350,
  deathRagdollMs: 2200,
  dissolveMs: 700,
};

export const ENEMY_RESPAWN_MS = 1500;
```

- [x] **Step 4: Rodar os testes**

Run: `npm test && npm run typecheck`
Expected: PASS; sem erros de tipo.

- [x] **Step 5: Commit**

```bash
git add src/core/enemyBrain.ts src/data/tuning.ts tests/core/enemyBrain.test.ts
git commit -m "feat: add enemy hit-reaction state machine" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Ragdoll, inimigo na cena, golpes de teste e respawn

**Files:**
- Create: `src/game/Ragdoll.ts`, `src/game/Enemy.ts`
- Modify: `src/scenes/TestScene.ts` (arquivo inteiro abaixo)

**Interfaces:**
- Consumes: `EnemyBrain`, `EnemyEvent`, `EnemyState` (Task 6); `ENEMY`, `ENEMY_RESPAWN_MS`, `PLAYER_COMBO`; `ragdollFilter`, `Filters`; `normalize`, `Hit`, `Vec2`, `Strength`; `tagBody`, `newEntityId`, `Hittable`; `applyFilter`, `setIgnoreGravity`, `bodyOf`; `TEX`, `SIZE`.
- Produces:
  - `class Ragdoll { constructor(scene, x, y); readonly parts: Phaser.Physics.Matter.Image[]; get bodies(): MatterJS.BodyType[]; get center(): Vec2; impulse(direction: Vec2, force: number): void; flash(): void; dissolve(durationMs: number): void; destroy(): void }`
  - `class Enemy implements Hittable { readonly id: number; readonly spawn: Vec2; constructor(scene, spawn: Vec2, onRemoved: (e: Enemy) => void); get x(): number; get state(): EnemyState; get removed(): boolean; receiveHit(hit: Hit): void; update(dtMs: number, playerX: number): void }`

- [ ] **Step 1: Ragdoll**

`src/game/Ragdoll.ts`:

```ts
import Phaser from 'phaser';
import { ragdollFilter } from '../core/collision';
import { normalize, type Vec2 } from '../core/hit';
import { bodyOf } from './physics';
import { TEX } from './textures';

interface PartSpec {
  key: string;
  dx: number;
  dy: number;
}

/** Posições relativas ao centro do inimigo. Índice 0 = tronco. Poucos segmentos grandes de propósito. */
const PARTS: readonly PartSpec[] = [
  { key: TEX.ragTorso, dx: 0, dy: -1 },
  { key: TEX.ragHead, dx: 0, dy: -15 },
  { key: TEX.ragLimb, dx: -9, dy: -2 },
  { key: TEX.ragLimb, dx: 9, dy: -2 },
  { key: TEX.ragLimb, dx: -4, dy: 13 },
  { key: TEX.ragLimb, dx: 4, dy: 13 },
];

/** [parte A, parte B, x da junta, y da junta] relativos ao centro do inimigo: pescoço, ombros, quadris. */
const JOINTS: readonly (readonly [number, number, number, number])[] = [
  [0, 1, 0, -10],
  [0, 2, -7, -8],
  [0, 3, 7, -8],
  [0, 4, -4, 7],
  [0, 5, 4, 7],
];

/** Teto do impulso: acima disso as juntas esticam e o corpo "explode". */
const MAX_FORCE = 14;

export class Ragdoll {
  readonly parts: Phaser.Physics.Matter.Image[];
  private readonly joints: MatterJS.ConstraintType[];

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
  ) {
    const filter = ragdollFilter(scene.matter.world.nextGroup(true));
    this.parts = PARTS.map((p) =>
      scene.matter.add.image(x + p.dx, y + p.dy, p.key, undefined, {
        collisionFilter: { ...filter },
        friction: 0.6,
        frictionAir: 0.03,
        restitution: 0.1,
        density: 0.002,
        chamfer: { radius: 2 },
      }),
    );
    this.joints = JOINTS.map(([a, b, jx, jy]) => {
      const pa = this.parts[a];
      const pb = this.parts[b];
      return scene.matter.add.constraint(bodyOf(pa), bodyOf(pb), 0, 0.7, {
        pointA: { x: x + jx - pa.x, y: y + jy - pa.y },
        pointB: { x: x + jx - pb.x, y: y + jy - pb.y },
        damping: 0.1,
      });
    });
  }

  get bodies(): MatterJS.BodyType[] {
    return this.parts.map(bodyOf);
  }

  get center(): Vec2 {
    const torso = this.parts[0];
    return { x: torso.x, y: torso.y };
  }

  impulse(direction: Vec2, force: number): void {
    const d = normalize(direction);
    const f = Math.min(force, MAX_FORCE);
    for (const p of this.parts) {
      p.setVelocity(d.x * f + Phaser.Math.FloatBetween(-0.6, 0.6), d.y * f + Phaser.Math.FloatBetween(-0.6, 0.6));
    }
    this.parts[0].setAngularVelocity(0.12 * Math.sign(d.x || 1));
  }

  flash(): void {
    for (const p of this.parts) p.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      for (const p of this.parts) if (p.active) p.clearTint();
    });
  }

  /** Fumaça/energia amaldiçoada + fade. */
  dissolve(durationMs: number): void {
    for (const p of this.parts) p.setTint(0x7b2cbf);
    this.scene.tweens.add({ targets: this.parts, alpha: 0, duration: durationMs });
    const c = this.center;
    const smoke = this.scene.add.particles(c.x, c.y, TEX.smoke, {
      speed: { min: 15, max: 60 },
      angle: { min: 200, max: 340 },
      lifespan: 800,
      scale: { start: 1.4, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: [0x7b2cbf, 0x3c096c, 0xc77dff],
      emitting: false,
    });
    smoke.explode(30);
    this.scene.time.delayedCall(1000, () => smoke.destroy());
  }

  destroy(): void {
    for (const j of this.joints) this.scene.matter.world.removeConstraint(j);
    for (const p of this.parts) p.destroy();
  }
}
```

- [ ] **Step 2: Inimigo**

`src/game/Enemy.ts`:

```ts
import Phaser from 'phaser';
import { Filters } from '../core/collision';
import { EnemyBrain, type EnemyEvent, type EnemyState } from '../core/enemyBrain';
import { normalize, type Hit, type Vec2 } from '../core/hit';
import { ENEMY } from '../data/tuning';
import { newEntityId, tagBody, type Hittable } from './bodyTags';
import { applyFilter, setIgnoreGravity } from './physics';
import { Ragdoll } from './Ragdoll';
import { SIZE, TEX } from './textures';

/**
 * Corpo físico (retângulo Matter) separado do visual (imagem comum), para
 * poder esticar/achatar o visual em tweens sem mexer na física.
 */
export class Enemy implements Hittable {
  readonly id = newEntityId();
  private readonly brain = new EnemyBrain(ENEMY);
  private readonly body: MatterJS.BodyType;
  private readonly view: Phaser.GameObjects.Image;
  private ragdoll: Ragdoll | null = null;
  private _removed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly spawn: Vec2,
    private readonly onRemoved: (enemy: Enemy) => void,
  ) {
    const { w, h } = SIZE.enemy;
    this.body = scene.matter.add.rectangle(spawn.x, spawn.y, w, h, {
      friction: 0.8,
      frictionAir: 0.02,
      chamfer: { radius: 4 },
      collisionFilter: { ...Filters.enemy },
    });
    scene.matter.body.setInertia(this.body, Infinity); // não tomba
    tagBody(this.body, { kind: 'character', target: this });
    this.view = scene.add.image(spawn.x, spawn.y + h / 2, TEX.enemy).setOrigin(0.5, 1);
  }

  get x(): number {
    return this.body.position.x;
  }

  get state(): EnemyState {
    return this.brain.state;
  }

  get removed(): boolean {
    return this._removed;
  }

  receiveHit(hit: Hit): void {
    this.handle(this.brain.receiveHit(hit));
  }

  update(dtMs: number, playerX: number): void {
    if (this._removed) return;
    this.handle(this.brain.update(dtMs));
    if (this._removed) return;
    if (this.ragdoll) {
      // Corpo escondido acompanha o tronco para o "levantar" nascer no lugar certo.
      this.scene.matter.body.setPosition(this.body, this.ragdoll.center);
      this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
      return;
    }
    if (this.brain.state === 'idle') this.view.setFlipX(playerX < this.body.position.x);
    this.view.setPosition(this.body.position.x, this.body.position.y + SIZE.enemy.h / 2);
  }

  private handle(events: EnemyEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'hitReaction') this.playHitReaction(ev.hit);
      else if (ev.type === 'hurtWhileDown') this.ragdoll?.flash();
      else if (ev.type === 'ragdoll') this.enterRagdoll(ev.hit);
      else if (ev.type === 'getUp') this.getUp();
      else if (ev.type === 'dissolve') this.ragdoll?.dissolve(ENEMY.dissolveMs);
      else if (ev.type === 'removed') this.remove();
    }
  }

  private resetView(): void {
    this.scene.tweens.killTweensOf(this.view);
    this.view.setScale(1).clearTint();
  }

  /** Golpe leve: só "animação" (flash + achatar), sem ragdoll. */
  private playHitReaction(hit: Hit): void {
    this.resetView();
    const d = normalize(hit.direction);
    this.scene.matter.body.setVelocity(this.body, { x: d.x * hit.force, y: -1 });
    this.view.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => {
      if (this.view.active) this.view.clearTint();
    });
    this.scene.tweens.add({ targets: this.view, scaleX: 0.75, duration: 60, yoyo: true });
  }

  private enterRagdoll(hit: Hit): void {
    this.resetView();
    if (!this.ragdoll) {
      this.ragdoll = new Ragdoll(this.scene, this.body.position.x, this.body.position.y - 3);
      for (const b of this.ragdoll.bodies) tagBody(b, { kind: 'character', target: this });
      this.view.setVisible(false);
      applyFilter(this.body, Filters.hidden);
      setIgnoreGravity(this.body, true);
    }
    this.ragdoll.impulse(hit.direction, hit.force);
    this.scene.cameras.main.shake(90, 0.004);
  }

  /** "Levantar" simples: sem blend físico, só um tween de esticar. */
  private getUp(): void {
    if (!this.ragdoll) return;
    const c = this.ragdoll.center;
    this.ragdoll.destroy();
    this.ragdoll = null;
    const y = c.y - 12;
    this.scene.matter.body.setPosition(this.body, { x: c.x, y });
    this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
    applyFilter(this.body, Filters.enemy);
    setIgnoreGravity(this.body, false);
    this.view.setPosition(c.x, y + SIZE.enemy.h / 2).setVisible(true).setScale(1, 0.35);
    this.scene.tweens.add({ targets: this.view, scaleY: 1, duration: ENEMY.getUpMs, ease: 'Back.Out' });
  }

  private remove(): void {
    this.ragdoll?.destroy();
    this.ragdoll = null;
    this.scene.matter.world.remove(this.body);
    this.view.destroy();
    this._removed = true;
    this.onRemoved(this);
  }
}
```

- [ ] **Step 3: Cena com inimigos, respawn e teclas de teste**

`src/scenes/TestScene.ts` (arquivo inteiro):

```ts
import Phaser from 'phaser';
import { Filters } from '../core/collision';
import type { Strength, Vec2 } from '../core/hit';
import { parseLevel, type LevelData } from '../core/level';
import { LEVEL_1 } from '../data/level1';
import { ENEMY_RESPAWN_MS, PLAYER_COMBO } from '../data/tuning';
import { routeContact, tagBody } from '../game/bodyTags';
import { Enemy } from '../game/Enemy';
import { PlayerInput } from '../game/input';
import { MAX_FRAME_MS } from '../game/physics';
import { Player } from '../game/Player';
import { TEX, createPlaceholderTextures } from '../game/textures';

type ContactEvent = { pairs: { bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType }[] };

const SPAWN_LIFT = 4;

export class TestScene extends Phaser.Scene {
  private level!: LevelData;
  private terrain: MatterJS.BodyType[] = [];
  private controls!: PlayerInput;
  private player!: Player;
  private enemies: Enemy[] = [];

  constructor() {
    super('TestScene');
  }

  create(): void {
    createPlaceholderTextures(this);
    this.level = parseLevel(LEVEL_1);
    this.terrain = [];
    this.enemies = [];
    this.buildTerrain();
    this.listenForContacts();

    this.controls = new PlayerInput(this);
    const p = this.level.player;
    this.player = new Player(this, p.x, p.y - SPAWN_LIFT, this.terrain);
    for (const e of this.level.enemies) this.spawnEnemy({ x: e.x, y: e.y - SPAWN_LIFT });

    this.cameras.main.setBounds(0, 0, this.level.widthPx, this.level.heightPx);
    this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);

    // Ferramentas de ajuste: golpes de teste e debug do Matter.
    this.onKey('ONE', () => this.debugHit('light'));
    this.onKey('TWO', () => this.debugHit('heavy'));
    this.onKey('H', () => this.toggleDebugDraw());
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, MAX_FRAME_MS);
    this.player.update(dt, this.controls.read());
    for (const e of [...this.enemies]) e.update(dt, this.player.sprite.x);
  }

  private spawnEnemy(at: Vec2): void {
    this.enemies.push(
      new Enemy(this, at, (dead) => {
        this.enemies = this.enemies.filter((e) => e !== dead);
        this.time.delayedCall(ENEMY_RESPAWN_MS, () => this.spawnEnemy(dead.spawn));
      }),
    );
  }

  /** Aplica em todos os inimigos o mesmo golpe que o combo do player daria. */
  private debugHit(strength: Strength): void {
    const step = PLAYER_COMBO.find((s) => s.strength === strength)!;
    for (const e of this.enemies) {
      e.receiveHit({
        ownerId: 0,
        damage: step.damage,
        strength,
        force: step.force,
        direction: { x: e.x >= this.player.sprite.x ? 1 : -1, y: -0.6 },
      });
    }
  }

  private toggleDebugDraw(): void {
    const world = this.matter.world;
    if (!world.debugGraphic) world.createDebugGraphic();
    world.drawDebug = !world.drawDebug;
    world.debugGraphic.clear();
  }

  private onKey(key: string, fn: () => void): void {
    const kb = this.input.keyboard!;
    const event = `keydown-${key}`;
    kb.on(event, fn);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.off(event, fn));
  }

  private buildTerrain(): void {
    for (const r of this.level.solids) {
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      this.add.tileSprite(cx, cy, r.width, r.height, TEX.terrain);
      const body = this.matter.add.rectangle(cx, cy, r.width, r.height, {
        isStatic: true,
        label: 'terrain',
        collisionFilter: { ...Filters.terrain },
      });
      tagBody(body, { kind: 'terrain' });
      this.terrain.push(body);
    }
  }

  private listenForContacts(): void {
    const onStart = (event: ContactEvent): void => {
      for (const pair of event.pairs) routeContact(pair.bodyA, pair.bodyB);
    };
    this.matter.world.on('collisionstart', onStart);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.matter.world?.off('collisionstart', onStart));
  }
}
```

- [ ] **Step 4: Verificar build e testes**

Run: `npm run build && npm test`
Expected: sem erros; testes passam.

- [ ] **Step 5: Teste manual de reação e ragdoll**

Run: `npm run dev`.
Checklist:
- [ ] Dois retângulos vermelhos em pé no chão, olhando para o lado do player; o player atravessa eles sem ser bloqueado.
- [ ] Tecla `1`: cada inimigo pisca branco, achata rápido e é empurrado um pouco; volta ao normal.
- [ ] Tecla `2`: inimigo vira ragdoll de 6 peças, é arremessado para longe do player com leve tremida de câmera, cai e fica no chão ~1 s; depois reaparece em pé "esticando" no lugar do tronco.
- [ ] Ragdoll parado no chão não treme, não afunda no chão e não "explode" (peças voando sozinhas).
- [ ] `2` várias vezes com o inimigo caído: ele leva novo impulso a cada vez; `1` com ele caído só pisca as peças.
- [ ] Apertar `2` até morrer (4 vezes seguidas): ragdoll fica ~2 s, fica roxo, some com fumaça roxa subindo; ~1,5 s depois reaparece em pé no spawn original.
- [ ] `H` mostra/esconde o debug do Matter (contornos dos corpos e juntas).

Ajuste fino (sem mudar lógica): rigidez/damping das juntas e `MAX_FORCE` em `Ragdoll.ts`; tempos em `ENEMY` (`src/data/tuning.ts`).

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: add test enemy with ragdoll hit reactions, death and respawn" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Combo do player acertando o inimigo

**Files:**
- Modify: `src/game/Player.ts` (arquivo inteiro abaixo)

**Interfaces:**
- Consumes: `ComboTracker`, `ComboEvent`, `AttackStep`, `HitboxShape` (Task 5); `PLAYER_COMBO`, `COMBO_WINDOW_MS`; `makeHitGate`; `Filters.hitbox`; tudo o que a Task 4 já usava.
- Produces: `Player` com a mesma API pública da Task 4 (`id`, `sprite`, `facing`, `update(dtMs, input)`, `receiveHit`). `TestScene` não muda.

- [ ] **Step 1: Player com combo e hitbox sensor**

`src/game/Player.ts` (arquivo inteiro):

```ts
import Phaser from 'phaser';
import { Filters } from '../core/collision';
import { ComboTracker, type AttackStep, type ComboEvent, type HitboxShape } from '../core/combo';
import { makeHitGate, type Hit } from '../core/hit';
import { initialMoveState, stepMovement, type MoveState } from '../core/movement';
import { COMBO_WINDOW_MS, PLAYER_COMBO, PLAYER_MOVE } from '../data/tuning';
import { newEntityId, tagBody, type Hittable } from './bodyTags';
import type { InputSnapshot } from './input';
import { PX_PER_S_TO_STEP, bodyOf } from './physics';
import { TEX } from './textures';

const SENSOR_DEPTH = 3;

interface ActiveHitbox {
  body: MatterJS.BodyType;
  view: Phaser.GameObjects.Rectangle;
  shape: HitboxShape;
}

export class Player implements Hittable {
  readonly id = newEntityId();
  readonly sprite: Phaser.Physics.Matter.Image;
  private move: MoveState = initialMoveState();
  private readonly fists = new ComboTracker(PLAYER_COMBO, COMBO_WINDOW_MS);
  private hitbox: ActiveHitbox | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly terrain: MatterJS.BodyType[],
  ) {
    this.sprite = scene.matter.add.image(x, y, TEX.player, undefined, {
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0,
      chamfer: { radius: 4 },
      collisionFilter: { ...Filters.player },
    });
    this.sprite.setFixedRotation();
    this.sprite.setIgnoreGravity(true);
    tagBody(bodyOf(this.sprite), { kind: 'character', target: this });
  }

  get facing(): 1 | -1 {
    return this.move.facing;
  }

  receiveHit(_hit: Hit): void {
    // O player não recebe dano nesta demo (fora do escopo do sub-projeto 1).
  }

  update(dtMs: number, input: InputSnapshot): void {
    if (input.attackPressed) this.onCombo(this.fists.press());
    this.onCombo(this.fists.update(dtMs));
    const locked = this.fists.isAttacking;

    const sensors = { grounded: this.touchesTerrain('below'), ceiling: this.touchesTerrain('above') };
    this.move = stepMovement(this.move, input, sensors, dtMs, PLAYER_MOVE, locked);
    this.sprite.setVelocity(this.move.vx * PX_PER_S_TO_STEP, this.move.vy * PX_PER_S_TO_STEP);
    this.sprite.setFlipX(this.move.facing < 0);
    this.placeHitbox();
  }

  private onCombo(events: ComboEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'hitboxOn') this.openHitbox(ev.step);
      else if (ev.type === 'hitboxOff' || ev.type === 'comboEnd') this.closeHitbox();
    }
  }

  /** Sensor estático reposicionado a cada frame; o gate garante 1 acerto por alvo por golpe. */
  private openHitbox(step: AttackStep): void {
    const shape = step.hitbox;
    if (!shape) return;
    this.closeHitbox();
    const gate = makeHitGate(this.id);
    const facing = this.facing; // travado durante o golpe, não muda
    const body = this.scene.matter.add.rectangle(0, 0, shape.width, shape.height, {
      isSensor: true,
      isStatic: true,
      collisionFilter: { ...Filters.hitbox },
    });
    tagBody(body, {
      kind: 'active',
      onTouch: (other) => {
        if (other.kind !== 'character' || !gate(other.target.id)) return;
        other.target.receiveHit({
          ownerId: this.id,
          damage: step.damage,
          strength: step.strength,
          force: step.force,
          direction: { x: facing, y: step.strength === 'heavy' ? -0.6 : -0.15 },
        });
      },
    });
    const color = step.strength === 'heavy' ? 0xffd166 : 0xffffff;
    const view = this.scene.add.rectangle(0, 0, shape.width, shape.height, color, 0.35);
    this.hitbox = { body, view, shape };
    this.placeHitbox();
  }

  private placeHitbox(): void {
    if (!this.hitbox) return;
    const { body, view, shape } = this.hitbox;
    const x = this.sprite.x + shape.offsetX * this.facing;
    const y = this.sprite.y + shape.offsetY;
    this.scene.matter.body.setPosition(body, { x, y });
    view.setPosition(x, y);
  }

  private closeHitbox(): void {
    if (!this.hitbox) return;
    this.scene.matter.world.remove(this.hitbox.body);
    this.hitbox.view.destroy();
    this.hitbox = null;
  }

  private touchesTerrain(side: 'below' | 'above'): boolean {
    const b = bodyOf(this.sprite).bounds;
    const y0 = side === 'below' ? b.max.y : b.min.y - SENSOR_DEPTH;
    const region = { min: { x: b.min.x + 3, y: y0 }, max: { x: b.max.x - 3, y: y0 + SENSOR_DEPTH } };
    return this.scene.matter.query.region(this.terrain, region).length > 0;
  }
}
```

- [ ] **Step 2: Verificar build e testes**

Run: `npm run build && npm test`
Expected: sem erros; testes passam.

- [ ] **Step 3: Teste manual do combo**

Run: `npm run dev`.
Checklist:
- [ ] `J` três vezes no ritmo: aparecem dois retângulos brancos (socos) e um amarelo maior (chute) à frente do player, do lado para onde ele olha.
- [ ] Encostado num inimigo: os socos fazem ele piscar/achatar; o chute joga ele em ragdoll.
- [ ] Durante o golpe o player não anda nem pula; entre golpes (janela) ele já consegue andar.
- [ ] Esperar mais de ~0,3 s entre apertos recomeça no primeiro soco.
- [ ] Martelar `J` o mais rápido possível: os golpes saem um de cada vez, o combo termina no chute e o player não fica travado.
- [ ] Chutar o inimigo caído com o combo: cada soco acerta uma vez só (pisca uma vez por soco, mesmo encostando em várias peças).
- [ ] Dois combos completos matam o inimigo (ragdoll → fumaça → respawn).
- [ ] Atacar no ar funciona e o player continua caindo normalmente.

- [ ] **Step 4: Commit**

```bash
git add src/game/Player.ts
git commit -m "feat: wire player melee combo with sensor hitboxes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Definições de objeto e máquina de estados do objeto

**Files:**
- Create: `src/core/props.ts`, `src/data/props.ts`
- Test: `tests/core/props.test.ts`, `tests/data/props.test.ts`

**Interfaces:**
- Consumes: `Filters`, `collides`, `CollisionFilter` (Task 2); `makeHitGate`, `Hit`, `Vec2`.
- Produces:
  - `interface PropDef { key: string; texture: string; mass: number; damage: number; durability: number; throwSpeed: number; knockback: number; socket: 'front' | 'back'; debrisColor: number; tags: readonly string[] }`
  - `type PropState = 'rest' | 'held' | 'swing' | 'thrown' | 'breaking' | 'gone'`
  - `type PropImpact = 'ignored' | 'continue' | 'toRest' | 'broke'`
  - `PROP_BREAK_MS = 400`
  - `validatePropDef(def: PropDef): void`, `propHit(def: PropDef, ownerId: number, direction: Vec2): Hit`
  - `class PropMachine { constructor(def: PropDef); readonly def; get state(); get impacts(); get holderId(): number | null; get ownerId(): number | null; get filter(): CollisionFilter; pickUp(holderId): boolean; drop(): boolean; startSwing(): boolean; endSwing(): boolean; throw(): boolean; holderGone(): boolean; tryHit(targetId): boolean; registerImpact(): PropImpact; update(dtMs): boolean }` (`update` devolve `true` no frame em que vira `gone`)
  - `PROP_DEFS: Record<string, PropDef>` com `chair` e `bottle`

- [ ] **Step 1: Escrever os testes (falhando)**

`tests/core/props.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Filters, collides } from '../../src/core/collision';
import { PROP_BREAK_MS, PropMachine, propHit, validatePropDef, type PropDef } from '../../src/core/props';

const PLAYER = 1;
const ENEMY = 2;
const ENEMY_2 = 3;

const def = (durability: number): PropDef => ({
  key: 'test',
  texture: 'chair',
  mass: 5,
  damage: 10,
  durability,
  throwSpeed: 500,
  knockback: 8,
  socket: 'front',
  debrisColor: 0xffffff,
  tags: [],
});

const held = (durability = 3): PropMachine => {
  const m = new PropMachine(def(durability));
  m.pickUp(PLAYER);
  return m;
};

describe('PropMachine — estados sem hit', () => {
  it('começa em repouso', () => {
    const m = new PropMachine(def(3));
    expect(m.state).toBe('rest');
    expect(m.filter).toEqual(Filters.propRest);
  });

  it('em repouso, segurado ou quebrando nunca bloqueia player nem inimigo', () => {
    const m = new PropMachine(def(1));
    const check = (): void => {
      expect(collides(m.filter, Filters.player)).toBe(false);
      expect(collides(m.filter, Filters.enemy)).toBe(false);
    };
    check(); // rest
    m.pickUp(PLAYER);
    check(); // held
    m.startSwing();
    m.tryHit(ENEMY);
    m.registerImpact(); // durabilidade 1 → quebra
    expect(m.state).toBe('breaking');
    check();
  });

  it('só pega do repouso e guarda quem segura', () => {
    const m = new PropMachine(def(3));
    expect(m.pickUp(PLAYER)).toBe(true);
    expect(m.state).toBe('held');
    expect(m.holderId).toBe(PLAYER);
    expect(m.pickUp(ENEMY)).toBe(false);
    expect(m.holderId).toBe(PLAYER);
  });

  it('largar (inclusive no ar) volta ao repouso sem dono', () => {
    const m = held();
    expect(m.drop()).toBe(true);
    expect(m.state).toBe('rest');
    expect(m.holderId).toBeNull();
    expect(m.drop()).toBe(false);
  });

  it('ações fora de hora são recusadas', () => {
    const m = new PropMachine(def(3));
    expect(m.throw()).toBe(false);
    expect(m.startSwing()).toBe(false);
    expect(m.endSwing()).toBe(false);
    expect(m.registerImpact()).toBe('ignored');
    expect(m.tryHit(ENEMY)).toBe(false);
  });

  it('quem segura sumiu (morreu): objeto cai em repouso', () => {
    const a = held();
    expect(a.holderGone()).toBe(true);
    expect(a.state).toBe('rest');
    const b = held();
    b.startSwing();
    expect(b.holderGone()).toBe(true);
    expect(b.state).toBe('rest');
    expect(b.tryHit(ENEMY)).toBe(false);
  });
});

describe('PropMachine — golpe com objeto na mão', () => {
  it('o dono nunca se acerta e cada alvo toma um acerto por golpe', () => {
    const m = held();
    expect(m.startSwing()).toBe(true);
    expect(m.state).toBe('swing');
    expect(m.ownerId).toBe(PLAYER);
    expect(m.tryHit(PLAYER)).toBe(false);
    expect(m.tryHit(ENEMY)).toBe(true);
    expect(m.tryHit(ENEMY)).toBe(false);
    expect(m.tryHit(ENEMY_2)).toBe(true);
  });

  it('terminar o golpe volta a segurar, e o próximo golpe pode acertar o mesmo alvo', () => {
    const m = held();
    m.startSwing();
    m.tryHit(ENEMY);
    expect(m.endSwing()).toBe(true);
    expect(m.state).toBe('held');
    expect(m.tryHit(ENEMY)).toBe(false);
    m.startSwing();
    expect(m.tryHit(ENEMY)).toBe(true);
  });

  it('impacto abaixo da durabilidade continua na mão', () => {
    const m = held(3);
    m.startSwing();
    expect(m.registerImpact()).toBe('continue');
    expect(m.state).toBe('swing');
    expect(m.impacts).toBe(1);
  });

  it('quebrar durante o golpe solta o holder', () => {
    const m = held(1);
    m.startSwing();
    expect(m.registerImpact()).toBe('broke');
    expect(m.state).toBe('breaking');
    expect(m.holderId).toBeNull();
    expect(m.ownerId).toBeNull();
    expect(m.endSwing()).toBe(false);
  });
});

describe('PropMachine — arremesso', () => {
  it('arremessar solta da mão e mantém o dono para não se acertar', () => {
    const m = held();
    expect(m.throw()).toBe(true);
    expect(m.state).toBe('thrown');
    expect(m.holderId).toBeNull();
    expect(m.ownerId).toBe(PLAYER);
    expect(m.filter).toEqual(Filters.propThrown);
    expect(m.tryHit(PLAYER)).toBe(false);
  });

  it('objeto resistente que bate e não quebra volta ao repouso', () => {
    const m = held(3);
    m.throw();
    expect(m.registerImpact()).toBe('toRest');
    expect(m.state).toBe('rest');
    expect(m.ownerId).toBeNull();
    expect(m.tryHit(ENEMY)).toBe(false);
    expect(m.pickUp(PLAYER)).toBe(true);
  });

  it('todo objeto quebra quando os impactos chegam na durabilidade, e some depois', () => {
    const m = new PropMachine(def(2));
    m.pickUp(PLAYER);
    m.throw();
    expect(m.registerImpact()).toBe('toRest');
    m.pickUp(PLAYER);
    m.throw();
    expect(m.registerImpact()).toBe('broke');
    expect(m.state).toBe('breaking');
    expect(m.filter).toEqual(Filters.propBreaking);
    expect(m.update(PROP_BREAK_MS - 1)).toBe(false);
    expect(m.update(1)).toBe(true);
    expect(m.state).toBe('gone');
    expect(m.update(100)).toBe(false);
  });
});

describe('propHit e validação', () => {
  it('golpe com objeto é sempre forte e usa dano/força do objeto', () => {
    const hit = propHit(def(3), PLAYER, { x: 1, y: 0 });
    expect(hit).toEqual({ ownerId: PLAYER, damage: 10, strength: 'heavy', direction: { x: 1, y: 0 }, force: 8 });
  });

  it('recusa definições inválidas', () => {
    expect(() => validatePropDef(def(0))).toThrow(/durability/);
    expect(() => validatePropDef(def(1.5))).toThrow(/durability/);
    expect(() => validatePropDef({ ...def(1), mass: 0 })).toThrow(/mass/);
    expect(() => validatePropDef({ ...def(1), throwSpeed: 0 })).toThrow(/throwSpeed/);
    expect(() => validatePropDef({ ...def(1), damage: -1 })).toThrow(/damage/);
  });
});
```

`tests/data/props.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { validatePropDef } from '../../src/core/props';
import { PROP_DEFS } from '../../src/data/props';
import { TEX } from '../../src/game/textures';

describe('PROP_DEFS', () => {
  it('todas as definições são válidas e apontam para texturas existentes', () => {
    const textures: string[] = Object.values(TEX);
    for (const d of Object.values(PROP_DEFS)) {
      expect(() => validatePropDef(d)).not.toThrow();
      expect(textures).toContain(d.texture);
    }
  });

  it('cadeira é pesada e resistente, garrafa é leve e frágil', () => {
    const { chair, bottle } = PROP_DEFS;
    expect(chair.mass).toBeGreaterThan(bottle.mass);
    expect(chair.durability).toBeGreaterThan(bottle.durability);
    expect(bottle.durability).toBe(1);
  });

  it('o level usa só chaves que existem aqui', () => {
    expect(Object.keys(PROP_DEFS).sort()).toEqual(['bottle', 'chair']);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/core/props.test.ts tests/data/props.test.ts`
Expected: FAIL — módulos `props` não existem.

- [ ] **Step 3: Implementar**

`src/core/props.ts`:

```ts
import { Filters, type CollisionFilter } from './collision';
import { makeHitGate, type Hit, type Vec2 } from './hit';

/** Criar um objeto novo = preencher um PropDef, sem código novo. */
export interface PropDef {
  key: string;
  texture: string; // chave em TEX
  mass: number; // peso
  damage: number;
  durability: number; // nº de impactos até quebrar (inteiro ≥ 1)
  throwSpeed: number; // px/s
  knockback: number; // impulso em px por step do Matter
  socket: 'front' | 'back'; // onde fica na mão: à frente ou nas costas/ombro
  debrisColor: number;
  tags: readonly string[]; // reservado para técnicas futuras ("cortante", "inflamável")
}

export type PropState = 'rest' | 'held' | 'swing' | 'thrown' | 'breaking' | 'gone';
export type PropImpact = 'ignored' | 'continue' | 'toRest' | 'broke';

export const PROP_BREAK_MS = 400;

const FILTER_BY_STATE: Record<PropState, CollisionFilter> = {
  rest: Filters.propRest,
  held: Filters.propHeld,
  swing: Filters.propSwing,
  thrown: Filters.propThrown,
  breaking: Filters.propBreaking,
  gone: Filters.propBreaking,
};

export function validatePropDef(def: PropDef): void {
  if (!Number.isInteger(def.durability) || def.durability < 1) {
    throw new Error(`${def.key}: durability precisa ser inteiro >= 1`);
  }
  if (def.mass <= 0) throw new Error(`${def.key}: mass precisa ser > 0`);
  if (def.throwSpeed <= 0) throw new Error(`${def.key}: throwSpeed precisa ser > 0`);
  if (def.damage < 0) throw new Error(`${def.key}: damage não pode ser negativo`);
}

/** Bater ou arremessar objeto é sempre golpe forte. */
export function propHit(def: PropDef, ownerId: number, direction: Vec2): Hit {
  return { ownerId, damage: def.damage, strength: 'heavy', direction, force: def.knockback };
}

/**
 * Repouso → Segurando → (Golpe | Arremessado) → Repouso ou Quebrando → Sumiu.
 * O filtro de colisão de cada estado garante que o objeto nunca trava
 * fisicamente um personagem.
 */
export class PropMachine {
  private _state: PropState = 'rest';
  private _impacts = 0;
  private _holderId: number | null = null;
  private _ownerId: number | null = null;
  private gate: ((targetId: number) => boolean) | null = null;
  private breakTimer = 0;

  constructor(readonly def: PropDef) {
    validatePropDef(def);
  }

  get state(): PropState {
    return this._state;
  }

  get impacts(): number {
    return this._impacts;
  }

  get holderId(): number | null {
    return this._holderId;
  }

  get ownerId(): number | null {
    return this._ownerId;
  }

  get filter(): CollisionFilter {
    return FILTER_BY_STATE[this._state];
  }

  pickUp(holderId: number): boolean {
    if (this._state !== 'rest') return false;
    this._state = 'held';
    this._holderId = holderId;
    return true;
  }

  drop(): boolean {
    if (this._state !== 'held') return false;
    this.toRest();
    return true;
  }

  startSwing(): boolean {
    if (this._state !== 'held' || this._holderId === null) return false;
    this._state = 'swing';
    this.arm(this._holderId);
    return true;
  }

  endSwing(): boolean {
    if (this._state !== 'swing') return false;
    this._state = 'held';
    this.disarm();
    return true;
  }

  throw(): boolean {
    if (this._state !== 'held' || this._holderId === null) return false;
    const owner = this._holderId;
    this._state = 'thrown';
    this._holderId = null;
    this.arm(owner);
    return true;
  }

  /** Quem segurava morreu ou sumiu. */
  holderGone(): boolean {
    if (this._state !== 'held' && this._state !== 'swing') return false;
    this.toRest();
    return true;
  }

  /** Consome o gate: true só na primeira vez para cada alvo neste golpe/arremesso, nunca para o dono. */
  tryHit(targetId: number): boolean {
    return this.gate !== null && this.gate(targetId);
  }

  /** Um impacto (em personagem, parede, chão) durante golpe ou voo. */
  registerImpact(): PropImpact {
    if (this._state !== 'swing' && this._state !== 'thrown') return 'ignored';
    this._impacts += 1;
    if (this._impacts >= this.def.durability) {
      this._state = 'breaking';
      this._holderId = null;
      this.disarm();
      this.breakTimer = PROP_BREAK_MS;
      return 'broke';
    }
    if (this._state === 'thrown') {
      this.toRest();
      return 'toRest';
    }
    return 'continue';
  }

  /** true no frame em que o objeto termina de quebrar e deve ser removido. */
  update(dtMs: number): boolean {
    if (this._state !== 'breaking') return false;
    this.breakTimer -= dtMs;
    if (this.breakTimer > 0) return false;
    this._state = 'gone';
    return true;
  }

  private arm(ownerId: number): void {
    this._ownerId = ownerId;
    this.gate = makeHitGate(ownerId);
  }

  private disarm(): void {
    this._ownerId = null;
    this.gate = null;
  }

  private toRest(): void {
    this._state = 'rest';
    this._holderId = null;
    this.disarm();
  }
}
```

`src/data/props.ts`:

```ts
import type { PropDef } from '../core/props';

export const PROP_DEFS: Record<string, PropDef> = {
  chair: {
    key: 'chair',
    texture: 'chair',
    mass: 8,
    damage: 20,
    durability: 4,
    throwSpeed: 520,
    knockback: 10,
    socket: 'back',
    debrisColor: 0x8d5524,
    tags: ['inflamável'],
  },
  bottle: {
    key: 'bottle',
    texture: 'bottle',
    mass: 1,
    damage: 12,
    durability: 1,
    throwSpeed: 760,
    knockback: 6,
    socket: 'front',
    debrisColor: 0x2a9d8f,
    tags: ['cortante'],
  },
};
```

- [ ] **Step 4: Rodar os testes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/props.ts src/data/props.ts tests/core/props.test.ts tests/data/props.test.ts
git commit -m "feat: add data-driven prop definitions and prop state machine" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Objetos na cena e interação do player (pegar, bater, arremessar, largar)

**Files:**
- Create: `src/game/Prop.ts`
- Modify: `src/game/Player.ts` (arquivo inteiro abaixo), `src/scenes/TestScene.ts` (trechos abaixo)

**Interfaces:**
- Consumes: `PropMachine`, `PropDef`, `PropImpact`, `PropState`, `propHit`, `PROP_BREAK_MS` (Task 9); `PROP_DEFS`; `PROP_SWING` (Task 5); `ComboTracker`; `BodyTag`, `tagBody`; `normalize`; `applyFilter`, `bodyOf`, `PX_PER_S_TO_STEP`; `TEX`.
- Produces:
  - `class Prop { constructor(scene, x, y, def: PropDef); readonly machine: PropMachine; readonly sprite: Phaser.Physics.Matter.Image; readonly def: PropDef; get body(): MatterJS.BodyType; get isGone(): boolean; pickUp(holderId: number): boolean; startSwing(): void; endSwing(): void; follow(holderX: number, holderY: number, facing: 1 | -1): void; release(holderX: number, holderY: number, mode: 'drop' | 'throw', facing: 1 | -1): void; update(dtMs: number): void }`
  - `Player` passa a receber `props: () => readonly Prop[]` como 5º argumento do construtor.

- [ ] **Step 1: Prop**

`src/game/Prop.ts`:

```ts
import Phaser from 'phaser';
import { normalize, type Vec2 } from '../core/hit';
import { PROP_BREAK_MS, PropMachine, propHit, type PropDef, type PropImpact, type PropState } from '../core/props';
import { tagBody, type BodyTag } from './bodyTags';
import { PX_PER_S_TO_STEP, applyFilter, bodyOf } from './physics';
import { TEX } from './textures';

/** Posição do objeto relativa ao centro de quem segura (x espelhado pelo facing). */
const SOCKET: Record<'front' | 'back' | 'swing', Vec2> = {
  front: { x: 14, y: 2 },
  back: { x: -8, y: -16 },
  swing: { x: 22, y: -2 },
};
/** Fração da velocidade de arremesso usada para cima. */
const THROW_LIFT = 0.22;

export class Prop {
  readonly machine: PropMachine;
  readonly sprite: Phaser.Physics.Matter.Image;
  private applied: PropState = 'rest';
  private facing: 1 | -1 = 1;
  /** Última posição em voo fora do terreno; é para onde o objeto volta ao bater. */
  private lastSafe: Vec2;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    readonly def: PropDef,
  ) {
    this.machine = new PropMachine(def);
    this.sprite = scene.matter.add.image(x, y, def.texture, undefined, {
      friction: 0.6,
      frictionAir: 0.01,
      restitution: 0.15,
      collisionFilter: { ...this.machine.filter },
    });
    this.sprite.setMass(def.mass);
    this.lastSafe = { x, y };
    tagBody(this.body, { kind: 'active', onTouch: (other) => this.onTouch(other) });
  }

  get body(): MatterJS.BodyType {
    return bodyOf(this.sprite);
  }

  get isGone(): boolean {
    return this.machine.state === 'gone';
  }

  pickUp(holderId: number): boolean {
    if (!this.machine.pickUp(holderId)) return false;
    this.sync();
    return true;
  }

  startSwing(): void {
    if (this.machine.startSwing()) this.sync();
  }

  endSwing(): void {
    if (this.machine.endSwing()) this.sync();
  }

  /** Chamado todo frame por quem segura. Sem colisão, só posição visual no socket. */
  follow(holderX: number, holderY: number, facing: 1 | -1): void {
    const st = this.machine.state;
    if (st !== 'held' && st !== 'swing') return;
    this.facing = facing;
    const socket = st === 'swing' ? SOCKET.swing : SOCKET[this.def.socket];
    this.sprite.setPosition(holderX + socket.x * facing, holderY + socket.y);
    this.sprite.setAngle(st === 'swing' ? 90 * facing : 0);
    this.sprite.setFlipX(facing < 0);
  }

  /**
   * Larga ou arremessa. O ponto seguro vira o centro de quem segurava — que
   * nunca está dentro do terreno — para o caso de arremessar encostado na parede.
   */
  release(holderX: number, holderY: number, mode: 'drop' | 'throw', facing: 1 | -1): void {
    this.facing = facing;
    const ok = mode === 'throw' ? this.machine.throw() : this.machine.drop();
    if (!ok) return;
    this.lastSafe = { x: holderX, y: holderY };
    if (mode === 'drop') this.sprite.setPosition(holderX, holderY);
    this.sync();
    if (mode === 'throw') {
      const v = this.def.throwSpeed * PX_PER_S_TO_STEP;
      this.sprite.setVelocity(v * facing, -v * THROW_LIFT);
      this.sprite.setAngularVelocity(0.25 * facing);
    }
  }

  update(dtMs: number): void {
    if (this.isGone) return;
    if (this.machine.update(dtMs)) {
      this.sprite.destroy();
      return;
    }
    // Os eventos de colisão rodam no step do Matter, antes deste update:
    // se estamos em voo aqui, a posição atual está fora do terreno.
    if (this.machine.state === 'thrown') this.lastSafe = { x: this.sprite.x, y: this.sprite.y };
  }

  private onTouch(other: BodyTag): void {
    const st = this.machine.state;
    if (st !== 'swing' && st !== 'thrown') return;
    if (other.kind === 'terrain') {
      if (st === 'thrown') this.afterImpact(this.machine.registerImpact());
      return;
    }
    if (other.kind !== 'character') return;
    const ownerId = this.machine.ownerId;
    if (ownerId === null || !this.machine.tryHit(other.target.id)) return;
    other.target.receiveHit(propHit(this.def, ownerId, this.hitDirection(st)));
    this.afterImpact(this.machine.registerImpact());
  }

  private hitDirection(st: PropState): Vec2 {
    if (st === 'thrown') {
      const v = this.body.velocity;
      return normalize({ x: v.x, y: v.y - 2 });
    }
    return { x: this.facing, y: -0.6 };
  }

  private afterImpact(result: PropImpact): void {
    if (result === 'toRest') {
      const v = this.body.velocity;
      this.sprite.setPosition(this.lastSafe.x, this.lastSafe.y);
      this.sync();
      this.sprite.setVelocity(-v.x * 0.25, -1.5); // quica de volta
    } else if (result === 'broke') {
      this.sync();
    }
  }

  /** Aplica no corpo Matter o filtro/sensor/gravidade do estado atual. */
  private sync(): void {
    const st = this.machine.state;
    if (st === this.applied) return;
    this.applied = st;
    applyFilter(this.body, this.machine.filter);
    this.sprite.setSensor(st !== 'rest');
    const floating = st === 'held' || st === 'swing' || st === 'breaking';
    this.sprite.setIgnoreGravity(floating);
    if (floating) {
      this.sprite.setVelocity(0, 0);
      this.sprite.setAngularVelocity(0);
    }
    if (st === 'breaking') this.shatter();
  }

  private shatter(): void {
    const debris = this.scene.add.particles(this.sprite.x, this.sprite.y, TEX.smoke, {
      speed: { min: 40, max: 140 },
      lifespan: 450,
      scale: { start: 0.8, end: 0 },
      tint: this.def.debrisColor,
      gravityY: 400,
      emitting: false,
    });
    debris.explode(14);
    this.scene.time.delayedCall(600, () => debris.destroy());
    this.scene.tweens.add({ targets: this.sprite, alpha: 0, duration: PROP_BREAK_MS });
  }
}
```

- [ ] **Step 2: Player com objetos**

`src/game/Player.ts` (arquivo inteiro):

```ts
import Phaser from 'phaser';
import { Filters } from '../core/collision';
import { ComboTracker, type AttackStep, type ComboEvent, type HitboxShape } from '../core/combo';
import { makeHitGate, type Hit } from '../core/hit';
import { initialMoveState, stepMovement, type MoveState } from '../core/movement';
import { COMBO_WINDOW_MS, PLAYER_COMBO, PLAYER_MOVE, PROP_SWING } from '../data/tuning';
import { newEntityId, tagBody, type Hittable } from './bodyTags';
import type { InputSnapshot } from './input';
import { PX_PER_S_TO_STEP, bodyOf } from './physics';
import type { Prop } from './Prop';
import { TEX } from './textures';

const SENSOR_DEPTH = 3;
/** Alcance da zona de coleta à frente do player (px); atrás vale metade. */
const PICKUP_REACH = 24;

interface ActiveHitbox {
  body: MatterJS.BodyType;
  view: Phaser.GameObjects.Rectangle;
  shape: HitboxShape;
}

export class Player implements Hittable {
  readonly id = newEntityId();
  readonly sprite: Phaser.Physics.Matter.Image;
  private move: MoveState = initialMoveState();
  private readonly fists = new ComboTracker(PLAYER_COMBO, COMBO_WINDOW_MS);
  private readonly propSwing = new ComboTracker([PROP_SWING], 0);
  private hitbox: ActiveHitbox | null = null;
  private held: Prop | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly terrain: MatterJS.BodyType[],
    private readonly props: () => readonly Prop[],
  ) {
    this.sprite = scene.matter.add.image(x, y, TEX.player, undefined, {
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0,
      chamfer: { radius: 4 },
      collisionFilter: { ...Filters.player },
    });
    this.sprite.setFixedRotation();
    this.sprite.setIgnoreGravity(true);
    tagBody(bodyOf(this.sprite), { kind: 'character', target: this });
  }

  get facing(): 1 | -1 {
    return this.move.facing;
  }

  receiveHit(_hit: Hit): void {
    // O player não recebe dano nesta demo (fora do escopo do sub-projeto 1).
  }

  update(dtMs: number, input: InputSnapshot): void {
    // O objeto pode ter quebrado na mão durante o step de física.
    if (this.held && this.held.machine.holderId !== this.id) this.held = null;

    if (input.attackPressed) {
      if (this.held) this.onPropSwing(this.propSwing.press());
      else this.onCombo(this.fists.press());
    }
    this.onCombo(this.fists.update(dtMs));
    this.onPropSwing(this.propSwing.update(dtMs));

    const attacking = this.fists.isAttacking || this.propSwing.isAttacking;
    if (input.interactPressed && !attacking) this.interact(input.down);

    const sensors = { grounded: this.touchesTerrain('below'), ceiling: this.touchesTerrain('above') };
    this.move = stepMovement(this.move, input, sensors, dtMs, PLAYER_MOVE, attacking);
    this.sprite.setVelocity(this.move.vx * PX_PER_S_TO_STEP, this.move.vy * PX_PER_S_TO_STEP);
    this.sprite.setFlipX(this.move.facing < 0);
    this.placeHitbox();
    this.held?.follow(this.sprite.x, this.sprite.y, this.facing);
  }

  private interact(dropInstead: boolean): void {
    if (this.held) {
      const prop = this.held;
      this.held = null;
      prop.release(this.sprite.x, this.sprite.y, dropInstead ? 'drop' : 'throw', this.facing);
      return;
    }
    const target = this.findPickup();
    if (target && target.pickUp(this.id)) {
      this.held = target;
      this.onCombo(this.fists.cancel());
    }
  }

  /** Zona de coleta (consulta de região) em volta do player, maior para a frente. */
  private findPickup(): Prop | null {
    const candidates = this.props().filter((p) => p.machine.state === 'rest');
    if (candidates.length === 0) return null;
    const b = bodyOf(this.sprite).bounds;
    const front = PICKUP_REACH;
    const back = PICKUP_REACH / 2;
    const zone = {
      min: { x: b.min.x - (this.facing < 0 ? front : back), y: b.min.y - 4 },
      max: { x: b.max.x + (this.facing > 0 ? front : back), y: b.max.y + 4 },
    };
    const inZone = new Set(
      this.scene.matter.query.region(
        candidates.map((p) => p.body),
        zone,
      ),
    );
    let best: Prop | null = null;
    let bestDist = Infinity;
    for (const p of candidates) {
      if (!inZone.has(p.body)) continue;
      const d = Math.abs(p.sprite.x - this.sprite.x) + Math.abs(p.sprite.y - this.sprite.y);
      if (d < bestDist) {
        best = p;
        bestDist = d;
      }
    }
    return best;
  }

  private onPropSwing(events: ComboEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'hitboxOn') this.held?.startSwing();
      else if (ev.type === 'hitboxOff' || ev.type === 'comboEnd') this.held?.endSwing();
    }
  }

  private onCombo(events: ComboEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'hitboxOn') this.openHitbox(ev.step);
      else if (ev.type === 'hitboxOff' || ev.type === 'comboEnd') this.closeHitbox();
    }
  }

  private openHitbox(step: AttackStep): void {
    const shape = step.hitbox;
    if (!shape) return;
    this.closeHitbox();
    const gate = makeHitGate(this.id);
    const facing = this.facing;
    const body = this.scene.matter.add.rectangle(0, 0, shape.width, shape.height, {
      isSensor: true,
      isStatic: true,
      collisionFilter: { ...Filters.hitbox },
    });
    tagBody(body, {
      kind: 'active',
      onTouch: (other) => {
        if (other.kind !== 'character' || !gate(other.target.id)) return;
        other.target.receiveHit({
          ownerId: this.id,
          damage: step.damage,
          strength: step.strength,
          force: step.force,
          direction: { x: facing, y: step.strength === 'heavy' ? -0.6 : -0.15 },
        });
      },
    });
    const color = step.strength === 'heavy' ? 0xffd166 : 0xffffff;
    const view = this.scene.add.rectangle(0, 0, shape.width, shape.height, color, 0.35);
    this.hitbox = { body, view, shape };
    this.placeHitbox();
  }

  private placeHitbox(): void {
    if (!this.hitbox) return;
    const { body, view, shape } = this.hitbox;
    const x = this.sprite.x + shape.offsetX * this.facing;
    const y = this.sprite.y + shape.offsetY;
    this.scene.matter.body.setPosition(body, { x, y });
    view.setPosition(x, y);
  }

  private closeHitbox(): void {
    if (!this.hitbox) return;
    this.scene.matter.world.remove(this.hitbox.body);
    this.hitbox.view.destroy();
    this.hitbox = null;
  }

  private touchesTerrain(side: 'below' | 'above'): boolean {
    const b = bodyOf(this.sprite).bounds;
    const y0 = side === 'below' ? b.max.y : b.min.y - SENSOR_DEPTH;
    const region = { min: { x: b.min.x + 3, y: y0 }, max: { x: b.max.x - 3, y: y0 + SENSOR_DEPTH } };
    return this.scene.matter.query.region(this.terrain, region).length > 0;
  }
}
```

- [ ] **Step 3: Objetos na cena**

Em `src/scenes/TestScene.ts`:

1. Acrescentar aos imports:

```ts
import { PROP_DEFS } from '../data/props';
import { Prop } from '../game/Prop';
```

2. Acrescentar o campo, logo abaixo de `private enemies: Enemy[] = [];`:

```ts
  private props: Prop[] = [];
```

3. Em `create()`, trocar a criação do player por (reset + objetos antes do player):

```ts
    this.props = [];
    for (const s of this.level.props) {
      const def = PROP_DEFS[s.key];
      if (!def) throw new Error(`Objeto sem definição: ${s.key}`);
      this.props.push(new Prop(this, s.x, s.y, def));
    }

    this.controls = new PlayerInput(this);
    const p = this.level.player;
    this.player = new Player(this, p.x, p.y - SPAWN_LIFT, this.terrain, () => this.props);
```

(remover as linhas antigas `this.controls = ...`, `const p = ...` e `this.player = new Player(...)` que existiam antes).

4. Em `update()`, depois do loop dos inimigos:

```ts
    for (const prop of this.props) prop.update(dt);
    this.props = this.props.filter((prop) => !prop.isGone);
```

- [ ] **Step 4: Verificar build e testes**

Run: `npm run build && npm test`
Expected: sem erros; testes passam.

- [ ] **Step 5: Teste manual de objetos**

Run: `npm run dev`.
Checklist:
- [ ] Cadeiras (marrom) e garrafas (verde) caem no chão e ficam paradas, sem tremer. O player e os inimigos **atravessam** elas andando, sem tropeçar nem ser bloqueados.
- [ ] Encostado numa garrafa, `K` pega: ela fica na frente do player e vira junto com ele. A cadeira fica nas costas/ombro.
- [ ] Segurando, andar e pular contra paredes e embaixo de plataformas: o objeto nunca prende o player nem fica agarrado no cenário.
- [ ] Segurando, `J` dá um golpe (objeto gira para a frente); acertar um inimigo sempre joga ele em ragdoll (golpe forte).
- [ ] Garrafa quebra no primeiro golpe (estilhaços verdes + fade) e o player fica de mãos vazias, podendo socar com `J` e pegar outra coisa com `K` na hora.
- [ ] Cadeira aguenta 3 golpes e quebra no 4º.
- [ ] Segurando, `K` arremessa: o objeto voa para a frente com um leve arco, atravessa o player sem acertá-lo e derruba o inimigo em ragdoll.
- [ ] Cadeira arremessada contra a parede ou o chão quica, fica em repouso e pode ser pega de novo; a garrafa se estilhaça no primeiro impacto.
- [ ] **Arremessar encostado numa parede** (virado para ela): o objeto cai perto do player, em espaço livre; não fica preso dentro da parede nem sai voando.
- [ ] `S`+`K` (ou `↓`+`K`) larga o objeto; largar no meio do pulo faz ele cair normalmente até o chão.
- [ ] Arremessar objetos até quebrar todos não gera erro no console.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: add interactive props with pickup, swing, throw and break" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: HUD de controles, reinício da cena, README e validação final

**Files:**
- Modify: `src/scenes/TestScene.ts` (trechos abaixo)
- Create: `README.md`

**Interfaces:**
- Consumes: `TestScene.onKey` (Task 7).
- Produces: nada consumido por outras tasks.

- [ ] **Step 1: HUD e tecla R**

Em `src/scenes/TestScene.ts`, no fim de `create()`:

```ts
    this.onKey('R', () => this.scene.restart());
    this.addHud();
```

E o método novo na classe:

```ts
  private addHud(): void {
    const lines = [
      'A/D ou ←/→: mover   Espaço/W: pular (segure = mais alto)',
      'J/X: golpe (combo de 3)   com objeto na mão: golpe forte',
      'K/Z: pegar / arremessar   S+K: largar',
      'R: reiniciar   H: debug da física   1/2: golpe leve/forte de teste',
    ];
    this.add
      .text(12, 10, lines.join('\n'), {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#e0e0e0',
        backgroundColor: '#00000088',
        padding: { x: 6, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(100);
  }
```

- [ ] **Step 2: README**

`README.md`:

````markdown
# Surgue — demo de combate e movimentação

Protótipo web (Phaser 3 + Matter.js) para avaliar, jogando, se mover, bater e
usar objetos do cenário como arma é divertido. Spec:
`docs/superpowers/specs/2026-09-23-nucleo-combate-movimentacao-design.md`.

## Rodar

```bash
npm install
npm run dev     # abre o dev server (normalmente http://localhost:5173)
npm test        # testes da lógica pura (Vitest)
npm run build   # typecheck + build estático em dist/
```

## Controles

| Tecla | Ação |
| --- | --- |
| A/D ou ←/→ | mover |
| Espaço / W / ↑ | pular (segurar = pulo mais alto) |
| J / X | golpe (combo soco, soco, chute); com objeto: golpe forte |
| K / Z | pegar objeto / arremessar |
| S + K | largar objeto |
| R | reiniciar a sala |
| H | mostrar/esconder o debug da física |
| 1 / 2 | golpe leve / forte de teste em todos os inimigos |

## Onde ajustar o "feel"

- Movimento, combo e inimigo: `src/data/tuning.ts`
- Objetos (peso, dano, durabilidade, arremesso): `src/data/props.ts`
- Sala: `src/data/level1.ts` (legenda em `src/core/level.ts`)
- Ragdoll (juntas, impulso máximo): `src/game/Ragdoll.ts`

## Arte

Tudo é placeholder gerado em código (`src/game/textures.ts`). Para usar pixel
art, carregue PNGs num `preload()` com as mesmas chaves de `TEX` e remova a
chamada correspondente em `createPlaceholderTextures`.

## Critério de sucesso da demo

- [ ] O personagem corre e pula com altura variável.
- [ ] Combo corpo a corpo de 3 golpes; o último é forte.
- [ ] Pegar, bater e arremessar cadeira (pesada, resistente) e garrafa (leve, frágil).
- [ ] Inimigo reage a golpe leve com animação e a golpe forte com ragdoll.
- [ ] Inimigo morre em ragdoll e se dissolve.
````

- [ ] **Step 3: Validação final**

Run: `npm test && npm run build`
Expected: todos os testes passam; build sem erros.

Run: `npm run dev`.
Checklist:
- [ ] O HUD aparece no canto superior esquerdo e não rola com a câmera.
- [ ] `R` reinicia a sala: objetos e inimigos voltam; bater num inimigo depois de reiniciar dá **um** acerto por golpe (sem listeners duplicados — o golpe não tira o dobro de vida: 2 combos ainda são necessários para matar).
- [ ] Reiniciar 5 vezes seguidas não gera erro no console.
- [ ] Todos os itens de "Critério de sucesso da demo" do README podem ser marcados jogando.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/TestScene.ts README.md
git commit -m "feat: add controls HUD, scene restart and README" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
