import { describe, expect, it } from 'vitest';
import { blunder, check, solve } from '../src/activities/checks';
import { IDS, getParcours } from '../src/content';
import { edgeId } from '../src/render';
import type { Activity, Diagram, Parcours } from '../src/types';

const idsOf = (d: Diagram): Set<string> => {
  const s = new Set<string>();
  if (d.kind === 'seq') { d.lines.forEach((l) => s.add(l.id)); d.msgs.forEach((_, i) => s.add(`m${i}`)); } else { d.nodes.forEach((n) => s.add(n.id)); d.edges.forEach((e) => s.add(edgeId(e))); }
  return s;
};
const variants: [string, Parcours][] = [];
for (const id of IDS) { variants.push([`${id} apprentissage`, getParcours(id)]); variants.push([`${id} évaluation`, getParcours(id, 'Dupont Marie')]); }

describe.each(variants)('%s', (_n, p) => {
  const acts: Activity[] = p.modules.flatMap((m) => m.activities);
  it('identifiants d\'activités uniques', () => { expect(new Set(acts.map((a) => a.id)).size).toBe(acts.length); });
  it('chaque activité : solution acceptée, erreur refusée', () => {
    for (const a of acts) {
      expect(check(a, solve(a)).ok, a.id).toBe(true);
      expect(check(a, blunder(a)).ok, `${a.id} blunder`).toBe(false);
    }
  });
  it('les repérages et tracés visent des éléments existants', () => {
    for (const a of acts) {
      if (a.type === 'identify') for (const t of a.tasks) for (const i of t.ids) expect(idsOf(a.diagram).has(i), `${a.id}:${i}`).toBe(true);
      if (a.type === 'trace') { const s = idsOf(a.diagram); for (const i of a.path) expect(s.has(i), `${a.id}:${i}`).toBe(true); }
    }
  });
  it('les constructions : cible dans la palette, solution unique cohérente', () => {
    for (const a of acts) if (a.type === 'build') {
      const ids = new Set(a.palette.map((x) => x.id));
      for (const n of a.target.nodes) expect(ids.has(n), `${a.id}:${n}`).toBe(true);
      for (const e of a.target.edges) { expect(ids.has(e.from) && ids.has(e.to), a.id).toBe(true); expect(a.kinds.some((k) => k.v === e.k), `${a.id}:${e.k}`).toBe(true); }
    }
  });
  it('les trous : la bonne réponse est parmi les options', () => {
    for (const a of acts) if (a.type === 'fill') for (const s of a.slots) expect(s.options.some((o) => o.v === s.answer), `${a.id}:${s.id}`).toBe(true);
  });
  it('chaque case non facultative du carnet est alimentée', () => {
    for (const c of p.cases.filter((x) => !x.optional)) expect(acts.some((a) => a.tag?.d === c.d && a.tag.level === c.level), `${c.d}${c.level}`).toBe(true);
  });
  it('toute étiquette de carnet correspond à une case ou au niveau 4', () => {
    for (const a of acts) if (a.tag && a.tag.level !== 4) expect(p.cases.some((c) => c.d === a.tag?.d && c.level === a.tag.level), `${a.id}`).toBe(true);
  });
  it("l'évaluation finale : critères connus, pas d'indice, points = 20", () => {
    const ex = p.modules.filter((m) => m.exam);
    expect(ex.length).toBe(1);
    const ids = new Set(p.grille.map((c) => c.id));
    for (const a of ex[0]!.activities) { expect(a.crit && ids.has(a.crit), a.id).toBe(true); expect(a.hints, a.id).toBeUndefined(); }
    expect(p.grille.reduce((s, c) => s + c.pts, 0)).toBe(20);
    for (const c of p.grille) expect(ex[0]!.activities.some((a) => a.crit === c.id && (a.weight ?? 0) > 0), c.id).toBe(true);
  });
});

describe('variantes d\'évaluation', () => {
  it('sont déterministes selon le nom', () => {
    expect(JSON.stringify(getParcours('bts', 'Dupont Marie'))).toBe(JSON.stringify(getParcours('bts', 'dupont marie ')));
  });
  it('diffèrent selon le nom', () => {
    const a = JSON.stringify(getParcours('ciel', 'Dupont Marie')), b = JSON.stringify(getParcours('ciel', 'Martin Paul'));
    expect(a).not.toBe(b);
  });
});
