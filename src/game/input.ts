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
