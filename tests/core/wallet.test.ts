import { describe, expect, it } from 'vitest';
import { Wallet } from '../../src/core/wallet';

describe('Wallet (ECO-12..14, ECO-20, ECO-26)', () => {
  it('começa com 0 fragmentos (ECO-14)', () => {
    expect(new Wallet().fragments).toBe(0);
  });

  it('add soma um inteiro positivo ao saldo', () => {
    const w = new Wallet();
    w.add(3);
    expect(w.fragments).toBe(3);
  });

  it('add ignora n <= 0', () => {
    const w = new Wallet();
    w.add(5);
    w.add(0);
    w.add(-1);
    expect(w.fragments).toBe(5);
  });

  it('add ignora n não inteiro', () => {
    const w = new Wallet();
    w.add(2.5);
    expect(w.fragments).toBe(0);
  });

  it('spend com n igual ao saldo: desconta tudo e devolve true (ECO-20)', () => {
    const w = new Wallet();
    w.add(4);
    expect(w.spend(4)).toBe(true);
    expect(w.fragments).toBe(0);
  });

  it('spend com n = saldo + 1: devolve false e não muda o saldo (ECO-13, ECO-26)', () => {
    const w = new Wallet();
    w.add(4);
    expect(w.spend(5)).toBe(false);
    expect(w.fragments).toBe(4);
  });

  it('spend com 0 < n < saldo: desconta só n e devolve true (ECO-20)', () => {
    const w = new Wallet();
    w.add(10);
    expect(w.spend(3)).toBe(true);
    expect(w.fragments).toBe(7);
  });

  it('reset volta o saldo a 0', () => {
    const w = new Wallet();
    w.add(10);
    w.reset();
    expect(w.fragments).toBe(0);
  });

  it('o saldo nunca fica negativo: spend sem saldo devolve false e mantém 0 (ECO-12)', () => {
    const w = new Wallet();
    expect(w.spend(1)).toBe(false);
    expect(w.fragments).toBe(0);
  });
});
