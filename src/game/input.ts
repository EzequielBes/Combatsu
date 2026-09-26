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

/** Teclas da loja (SHOP-45, SHOP-28..30, SHOP-16, SHOP-03), só consultadas com `run.state === 'shop'`. */
export interface ShopInputSnapshot {
  /** Slot 0/1/2 pela tecla 1/2/3 (SHOP-45); `null` sem tecla nova neste frame. */
  buySlot: 0 | 1 | 2 | null;
  /** `J`: compra o slot selecionado (SHOP-30). */
  buySelected: boolean;
  /** `→`/`D` (SHOP-28). */
  moveRight: boolean;
  /** `←`/`A` (SHOP-29). */
  moveLeft: boolean;
  /** `R`: reroll (SHOP-16). */
  reroll: boolean;
  /** `Enter`: continua para a próxima rodada (SHOP-03). */
  confirm: boolean;
}

export class ShopInput {
  private readonly one: Key;
  private readonly two: Key;
  private readonly three: Key;
  private readonly j: Key;
  private readonly left: Key[];
  private readonly right: Key[];
  private readonly r: Key;
  private readonly enter: Key;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    const keys = (...codes: number[]): Key[] => codes.map((c) => kb.addKey(c));
    this.one = kb.addKey(K.ONE);
    this.two = kb.addKey(K.TWO);
    this.three = kb.addKey(K.THREE);
    this.j = kb.addKey(K.J);
    this.left = keys(K.A, K.LEFT);
    this.right = keys(K.D, K.RIGHT);
    this.r = kb.addKey(K.R);
    this.enter = kb.addKey(K.ENTER);
  }

  /** Chamar uma vez por frame, só com `run.state === 'shop'` (SHOP-20). */
  read(): ShopInputSnapshot {
    let buySlot: 0 | 1 | 2 | null = null;
    if (Phaser.Input.Keyboard.JustDown(this.one)) buySlot = 0;
    if (Phaser.Input.Keyboard.JustDown(this.two)) buySlot = 1;
    if (Phaser.Input.Keyboard.JustDown(this.three)) buySlot = 2;
    return {
      buySlot,
      buySelected: Phaser.Input.Keyboard.JustDown(this.j),
      moveRight: anyJustDown(this.right),
      moveLeft: anyJustDown(this.left),
      reroll: Phaser.Input.Keyboard.JustDown(this.r),
      confirm: Phaser.Input.Keyboard.JustDown(this.enter),
    };
  }
}
