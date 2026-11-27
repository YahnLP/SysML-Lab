import { describe, expect, it } from 'vitest';
import { blunder, check, solve } from '../src/activities/checks';
import type { Activity, BuildAct } from '../src/types';

const tag = { d: 'ibd' as const, level: 2 as const };
const acts: Activity[] = [
  { id: 'q1', type: 'quiz', prompt: '?', tag, options: [{ t: 'a', ok: true, why: 'x' }, { t: 'b', ok: false, why: 'y' }] },
  { id: 'q2', type: 'quiz', multi: true, prompt: '?', options: [{ t: 'a', ok: true, why: 'x' }, { t: 'b', ok: true, why: 'y' }, { t: 'c', ok: false, why: 'z' }] },
  { id: 'o1', type: 'order', prompt: '?', items: ['un', 'deux', 'trois'], reasons: ['r1', 'r2'], start: [2, 0, 1] },
  { id: 'f1', type: 'fill', prompt: '?', diagram: { kind: 'bdd', name: 'n', nodes: [], edges: [] }, slots: [{ id: 's', label: 'L', answer: 'a', options: [{ v: 'a', t: 'A', why: 'ok' }, { v: 'b', t: 'B', why: 'non' }] }] },
  { id: 'm1', type: 'match', prompt: '?', choices: ['x', 'y'], pairs: [{ l: 'p', a: 'x', why: 'w' }, { l: 'q', a: 'y', why: 'w' }] },
  { id: 'i1', type: 'identify', prompt: '?', diagram: { kind: 'bdd', name: 'n', nodes: [], edges: [] }, tasks: [{ ask: 'où', ids: ['n1'], why: 'w' }] },
  { id: 't1', type: 'trace', prompt: '?', diagram: { kind: 'ibd', name: 'n', nodes: [], edges: [] }, path: ['a', 'b', 'c'] },
  {
    id: 'b1', type: 'build', prompt: '?', kind: 'bdd', name: 'n',
    palette: [{ id: 'S', k: 'block', label: 'S', c: 0, r: 0 }, { id: 'P', k: 'block', label: 'P', c: 1, r: 0 }, { id: 'Z', k: 'block', label: 'Z', c: 2, r: 0, distractor: 'intrus' }],
    kinds: [{ v: 'comp', t: 'composition' }, { v: 'assoc', t: 'association' }],
    target: { nodes: ['S', 'P'], edges: [{ from: 'S', to: 'P', k: 'comp' }] },
  },
  { id: 'bs', type: 'buildseq', prompt: '?', name: 'n', lines: [{ id: 'x', n: 'x' }, { id: 'y', n: 'y' }], labels: ['a', 'b'], expected: [{ from: 'x', to: 'y', label: 'a' }, { from: 'y', to: 'x', label: 'b', ret: true }], reasons: ['r1', 'r2'] },
];

describe('vérificateurs', () => {
  for (const a of acts) {
    it(`${a.type} ${a.id} : accepte la solution`, () => {
      const v = check(a, solve(a));
      expect(v.ok).toBe(true);
      expect(v.score).toBe(1);
    });
    it(`${a.type} ${a.id} : refuse une erreur et explique`, () => {
      const v = check(a, blunder(a));
      expect(v.ok).toBe(false);
      expect(v.score).toBeLessThan(1);
      expect(v.fb.length).toBeGreaterThan(0);
    });
  }
  it('quiz multiple : une réponse partielle est refusée sans révéler laquelle manque', () => {
    const v = check(acts[1] as Activity, { type: 'quiz', sel: [0] });
    expect(v.ok).toBe(false);
    expect(v.fb[0]?.h).toContain('Il manque');
    expect(v.fb[0]?.h).not.toContain('<b>b</b>');
  });
  it("ordre : cite la raison de l'ordre violé", () => {
    const v = check(acts[2] as Activity, { type: 'order', order: [1, 0, 2] });
    expect(v.fb[0]?.h).toContain('r1');
  });
  it('construction : signale une flèche dans le mauvais sens avec la règle', () => {
    const v = check(acts[7] as BuildAct, { type: 'build', nodes: ['S', 'P'], edges: [{ from: 'P', to: 'S', k: 'comp' }] });
    expect(v.ok).toBe(false);
    expect(v.fb[0]?.h).toContain('mauvais sens');
  });
  it('construction : signale un intrus avec son explication', () => {
    const v = check(acts[7] as BuildAct, { type: 'build', nodes: ['S', 'P', 'Z'], edges: [{ from: 'S', to: 'P', k: 'comp' }] });
    expect(v.ok).toBe(false);
    expect(v.fb[0]?.h).toContain('intrus');
  });
  it('construction : association non orientée acceptée dans les deux sens', () => {
    const a: BuildAct = { ...(acts[7] as BuildAct), target: { nodes: ['S', 'P'], edges: [{ from: 'S', to: 'P', k: 'assoc' }] } };
    expect(check(a, { type: 'build', nodes: ['S', 'P'], edges: [{ from: 'P', to: 'S', k: 'assoc' }] }).ok).toBe(true);
  });
});
