/** Qualquer objeto de efeito de técnica que precise ser destruído sozinho (design "Error Handling Strategy"). */
export interface Destroyable {
  destroy(): void;
}

/**
 * Registro central dos objetos de efeito de técnica vivos: `size` é o `fx.live` do snapshot (TFX-09). Um objeto
 * fica registrado enquanto seu efeito está ativo; quando o efeito termina, `scheduleDestroy` arma o prazo (TFX-03:
 * "destruído dentro de 300 ms") e o registro some sozinho quando esse prazo esgota. Sem `phaser` aqui: o objeto só
 * precisa de um método `destroy()`.
 */
export class FxRegistry {
  private items: { obj: Destroyable; destroyAt: number | null }[] = [];

  /** Registra `obj`, vivo até `scheduleDestroy` armar um prazo (efeito ainda em andamento). */
  add(obj: Destroyable): void {
    this.items.push({ obj, destroyAt: null });
  }

  /** Arma (ou rearma) o prazo de destruição de `obj`, em ms a partir de agora (TFX-03). Sem efeito se `obj` não
   * estiver registrado. */
  scheduleDestroy(obj: Destroyable, ms: number): void {
    const it = this.items.find((i) => i.obj === obj);
    if (it) it.destroyAt = ms;
  }

  /** Quantidade de objetos ainda registrados (`fx.live`, TFX-09). */
  get size(): number {
    return this.items.length;
  }

  /** Avança pelo tempo real (TFX-03/09 não dependem do hitstop): destrói e remove quem chegou a 0. */
  update(realDtMs: number): void {
    const remaining: typeof this.items = [];
    for (const it of this.items) {
      if (it.destroyAt !== null) {
        it.destroyAt -= realDtMs;
        if (it.destroyAt <= 0) {
          it.obj.destroy();
          continue;
        }
      }
      remaining.push(it);
    }
    this.items = remaining;
  }
}
