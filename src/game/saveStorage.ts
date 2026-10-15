/**
 * Porta do save para o armazenamento do navegador: o único arquivo de `src/` que diz `localStorage` (SAVE-01). Só lê
 * e escreve a string da chave `SAVE_KEY`; o formato mora em `core/save`. Qualquer exceção (bloqueado, cheio, modo
 * privado, ou o próprio acesso a `window.localStorage` lançando) põe a porta em `'memory'` para sempre: o jogo segue
 * com o recorde só em memória e não tenta de novo (SAVE-07).
 */
import { SAVE_KEY } from '../core/save';

/** O pedaço do `Storage` que a porta usa (um falso nos testes). */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** `'local'`: grava entre sessões; `'memory'`: o armazenamento falhou e a porta não toca mais nele. */
export type SaveStorageKind = 'local' | 'memory';

export class SaveStorage {
  kind: SaveStorageKind = 'local';

  constructor(private readonly getStorage: () => StorageLike = () => window.localStorage) {}

  /** A string gravada, ou `null` se não há nada ou se a porta caiu para `'memory'`. */
  read(): string | null {
    if (this.kind === 'memory') return null;
    try {
      return this.getStorage().getItem(SAVE_KEY);
    } catch {
      this.kind = 'memory';
      return null;
    }
  }

  /** Grava a string; `false` se a porta já estava ou acabou de cair em `'memory'`. */
  write(text: string): boolean {
    if (this.kind === 'memory') return false;
    try {
      this.getStorage().setItem(SAVE_KEY, text);
      return true;
    } catch {
      this.kind = 'memory';
      return false;
    }
  }
}
