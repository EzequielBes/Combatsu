import Phaser from 'phaser';

/** Modo debug: liga com `?debug` na URL; F1 alterna durante o jogo. Vale para o jogo todo, não por cena. */
let debug = new URLSearchParams(window.location.search).has('debug');
const listeners = new Set<(on: boolean) => void>();

export function isDebug(): boolean {
  return debug;
}

/** Registra quem quer saber da troca; devolve a função que cancela o registro. */
export function onDebugChange(cb: (on: boolean) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function toggleDebug(): void {
  debug = !debug;
  for (const cb of [...listeners]) cb(debug);
}

/** Liga a tecla F1 na cena (com captura, para o navegador não abrir a ajuda) e desliga no SHUTDOWN. */
export function bindDebugToggle(scene: Phaser.Scene): void {
  const kb = scene.input.keyboard!;
  const f1 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F1, true);
  f1.on('down', toggleDebug);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    f1.off('down', toggleDebug);
    kb.removeKey(f1, true, true);
  });
}
