import { describe, expect, it } from 'vitest';
import { diagramSVG } from '../src/render';
import type { GraphDiagram, SeqDiagram } from '../src/types';

const g: GraphDiagram = {
  kind: 'bdd', name: 'Essai', pkg: 'Package',
  nodes: [
    { id: 'a', k: 'block', label: 'A', c: 0, r: 0 },
    { id: 'b', k: 'block', label: 'B', sub: 'x : Integer', c: 1, r: 1, slot: 's1' },
  ],
  edges: [{ from: 'a', to: 'b', k: 'comp', slot: 's2' }],
};
const s: SeqDiagram = {
  kind: 'seq', name: 'Essai', lines: [{ id: 'x', n: 'x' }, { id: 'y', n: 'y' }],
  msgs: [{ from: 'x', to: 'y', label: 'appel' }, { from: 'y', to: 'y', label: 'calcul', self: true }, { from: 'y', to: 'x', label: 'réponse', ret: true }],
  frags: [{ k: 'alt', from: 1, to: 2, guard: 'ok', split: 2, guard2: 'ko' }],
};

describe('rendu', () => {
  it('dessine un graphe avec des trous non remplis', () => {
    const svg = diagramSVG(g);
    expect(svg).toContain('<svg');
    expect(svg).toContain('>?<');
  });
  it('applique les valeurs des trous', () => {
    const svg = diagramSVG(g, { fill: { s1: { t: 'Serveur' }, s2: { t: '', set: { k: 'gen' } } } });
    expect(svg).toContain('Serveur');
    expect(svg).toContain('class="hollow"');
  });
  it('rend les éléments cliquables par identifiant', () => {
    expect(diagramSVG(g, { sel: true })).toContain('data-id="a"');
    expect(diagramSVG(s, { sel: true })).toContain('data-id="m0"');
  });
  it('dessine une séquence avec fragment, message sur soi et retour', () => {
    const svg = diagramSVG(s, { numbered: true });
    expect(svg).toContain('class="frag"');
    expect(svg).toContain('2. calcul');
    expect(svg).toContain('url(#ao)');
  });
});
