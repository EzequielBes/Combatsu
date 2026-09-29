import { describe, expect, it } from 'vitest';
import { CastMachine, type CastContext } from '../../src/core/cast';
import { CursedEnergy } from '../../src/core/energy';
import { Loadout } from '../../src/core/loadout';

const FREE: CastContext = { meleePhase: 'none', busy: false };

function setup(techLevel: 1 | 2 | 3 = 1) {
  const energy = new CursedEnergy();
  const loadout = new Loadout();
  loadout.equip(0, 'divergente', techLevel);
  const machine = new CastMachine(energy, loadout);
  return { energy, loadout, machine };
}

describe('CAST-01: tecla do slot com técnica, energia e sem recarga inicia em `sign`', () => {
  it('request devolve enter:sign e o cast fica em sign', () => {
    const { machine } = setup();
    const events = machine.request(0, FREE);
    expect(events).toEqual([{ type: 'enter', state: 'sign' }]);
    expect(machine.cast).toMatchObject({ slot: 0, id: 'divergente', state: 'sign' });
  });
});

describe('CAST-02: sign → charge → release → recover → fim, com o corte exato de cada estado (L-010)', () => {
  it('sign do Divergente (60 ms): 59 ms ainda em sign, +1 ms (60 total) já em charge', () => {
    const { machine } = setup();
    machine.request(0, FREE);
    machine.update(59);
    expect(machine.cast?.state).toBe('sign');
    machine.update(1);
    expect(machine.cast?.state).toBe('charge');
  });

  it('percorre charge(60)/release(80)/recover(200) do Divergente e termina', () => {
    const { machine } = setup();
    machine.request(0, FREE);
    machine.update(60); // -> charge
    expect(machine.cast?.state).toBe('charge');
    machine.update(60); // -> release
    expect(machine.cast?.state).toBe('release');
    machine.update(80); // -> recover
    expect(machine.cast?.state).toBe('recover');
    const events = machine.update(200); // -> fim
    expect(events).toContainEqual({ type: 'end' });
    expect(machine.cast).toBe(null);
  });

  it('Desmantelar (charge 0 ms) pula charge: sign termina já entrando em release na mesma chamada', () => {
    const energy = new CursedEnergy();
    const loadout = new Loadout();
    loadout.equip(0, 'corte', 1);
    const machine = new CastMachine(energy, loadout);
    machine.request(0, FREE);
    const events = machine.update(150); // sign do corte = 150 ms
    expect(events).toEqual([
      { type: 'enter', state: 'charge' },
      { type: 'enter', state: 'release' },
    ]);
    expect(machine.cast?.state).toBe('release');
  });
});

describe('CAST-03: o custo é cobrado exatamente uma vez, na entrada de `release`', () => {
  it('energia não muda em sign/charge; cai pelo custo (20) só ao entrar em release, e não de novo depois', () => {
    const { machine, energy } = setup();
    machine.request(0, FREE);
    expect(energy.cur).toBe(100);
    machine.update(59);
    expect(energy.cur).toBe(100); // ainda em sign
    machine.update(1 + 60); // completa sign, atravessa charge inteiro -> entra em release
    expect(machine.cast?.state).toBe('release');
    expect(energy.cur).toBe(80); // 100 - 20 (custo do Divergente nível 1)
    machine.update(40); // ainda em release
    expect(energy.cur).toBe(80); // não cobra de novo
  });
});

describe('CAST-04: a recarga do slot é armada com o cooldown completo na entrada de `release`', () => {
  it('cooldownOf(0) vira 1200 (cooldown do Divergente) ao entrar em release', () => {
    const { machine, loadout } = setup();
    machine.request(0, FREE);
    expect(loadout.cooldownOf(0)).toBe(0);
    machine.update(60 + 60); // sign + charge -> entra em release
    expect(loadout.cooldownOf(0)).toBe(1200);
  });
});

describe('CAST-05: energia abaixo do custo recusa com techDenied:energy, sem iniciar cast', () => {
  it('energia 19 (custo 20): denied:energy, cast continua null', () => {
    const { machine, energy } = setup();
    energy.trySpend(81); // deixa 19
    expect(energy.cur).toBe(19);
    const events = machine.request(0, FREE);
    expect(events).toEqual([{ type: 'denied', reason: 'energy' }]);
    expect(machine.cast).toBe(null);
  });

  it('energia exatamente no custo (20) inicia normalmente', () => {
    const { machine, energy } = setup();
    energy.trySpend(80); // deixa 20
    const events = machine.request(0, FREE);
    expect(events).toEqual([{ type: 'enter', state: 'sign' }]);
  });
});

describe('CAST-06: recarga acima de 0 recusa com techDenied:cooldown, sem iniciar cast', () => {
  it('cooldown do slot em 1: denied:cooldown, cast continua null', () => {
    const { machine, loadout } = setup();
    loadout.startCooldown(0);
    expect(loadout.cooldownOf(0)).toBe(1200);
    const events = machine.request(0, FREE);
    expect(events).toEqual([{ type: 'denied', reason: 'cooldown' }]);
    expect(machine.cast).toBe(null);
  });
});

describe('CAST-07, CAST-20, CAST-21: dano em sign/charge cancela sem cobrar nem iniciar recarga', () => {
  it('dano em sign: cast termina, energia mantém o valor de antes do dano, events tem cancel, cooldown fica 0', () => {
    const { machine, energy, loadout } = setup();
    machine.request(0, FREE);
    const before = energy.cur;
    machine.update(10);
    const events = machine.damageTaken();
    expect(events).toEqual([{ type: 'cancel' }]);
    expect(machine.cast).toBe(null);
    expect(energy.cur).toBe(before); // CAST-07
    expect(loadout.cooldownOf(0)).toBe(0); // CAST-21
  });

  it('dano em charge também cancela (mesmas garantias)', () => {
    const { machine, energy, loadout } = setup();
    machine.request(0, FREE);
    machine.update(60); // entra em charge
    expect(machine.cast?.state).toBe('charge');
    const before = energy.cur;
    const events = machine.damageTaken();
    expect(events).toEqual([{ type: 'cancel' }]);
    expect(energy.cur).toBe(before);
    expect(loadout.cooldownOf(0)).toBe(0);
  });

  it('dano em release NÃO cancela (CAST-07 só se aplica a sign/charge)', () => {
    const { machine } = setup();
    machine.request(0, FREE);
    machine.update(60 + 60); // entra em release
    const events = machine.damageTaken();
    expect(events).toEqual([]);
    expect(machine.cast?.state).toBe('release');
  });
});

describe('CAST-08: uma conjuração em andamento ignora nova tecla de slot', () => {
  it('2º request enquanto o 1º está em sign não gera evento nem troca o cast ativo', () => {
    const { machine } = setup();
    machine.request(0, FREE);
    const events = machine.request(0, FREE);
    expect(events).toEqual([]);
    expect(machine.cast?.state).toBe('sign');
  });
});

describe('CAST-09: segurando objeto, hitstun ou golpe em startup/active recusa com techDenied:busy', () => {
  it('busy = true: denied:busy, cast continua null', () => {
    const { machine } = setup();
    const events = machine.request(0, { meleePhase: 'none', busy: true });
    expect(events).toEqual([{ type: 'denied', reason: 'busy' }]);
    expect(machine.cast).toBe(null);
  });

  it('meleePhase = startup: denied:busy', () => {
    const { machine } = setup();
    const events = machine.request(0, { meleePhase: 'startup', busy: false });
    expect(events).toEqual([{ type: 'denied', reason: 'busy' }]);
  });

  it('meleePhase = active: denied:busy', () => {
    const { machine } = setup();
    const events = machine.request(0, { meleePhase: 'active', busy: false });
    expect(events).toEqual([{ type: 'denied', reason: 'busy' }]);
  });
});

describe('CAST-10: tecla do slot na fase `recover` do golpe, com energia e sem recarga, inicia a conjuração', () => {
  it('meleePhase = recover: cast inicia normalmente (o cancelamento do golpe é responsabilidade do chamador)', () => {
    const { machine } = setup();
    const events = machine.request(0, { meleePhase: 'recover', busy: false });
    expect(events).toEqual([{ type: 'enter', state: 'sign' }]);
    expect(machine.cast?.state).toBe('sign');
  });
});
