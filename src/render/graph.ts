import type { EdgeKind, FillValue, GEdge, GNode, GraphDiagram } from '../types';

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Coupe un texte en lignes d'au plus `max` caractères, sans couper les mots. */
export function wrap(text: string, max: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of text.split(/\s+/)) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= max) cur += ' ' + w;
    else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  return out;
}

export const DEFS =
  '<defs>' +
  '<marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="fillline"/></marker>' +
  '<marker id="ao" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" class="openhead"/></marker>' +
  '</defs>';

const CELL_W = 170;
const CELL_H = 124;
const TOP = 52;
const PAD = 20;

interface Geo { cx: number; cy: number; hw: number; hh: number; shape: 'rect' | 'ellipse' | 'diamond' | 'circle' }

function lines(n: GNode, max: number): string[] { return wrap(n.label, max); }

function size(n: GNode): { w: number; h: number } {
  switch (n.k) {
    case 'block': case 'test': return { w: 150, h: 40 + (n.sub ? 16 : 0) };
    case 'part': return { w: 150, h: 54 };
    case 'req': return { w: 164, h: 38 + 14 * wrap(n.sub ?? '', 27).length };
    case 'actor': return { w: 64, h: 78 };
    case 'usecase': return { w: 146, h: 56 };
    case 'action': return { w: 150, h: 46 };
    case 'decision': return { w: 40, h: 40 };
    case 'initial': return { w: 16, h: 16 };
    case 'final': return { w: 22, h: 22 };
    case 'state': return { w: 132, h: 42 };
    case 'package': return { w: 140, h: 50 };
    case 'device': return { w: 140, h: 46 };
  }
}

function geo(n: GNode): Geo {
  const { w, h } = size(n);
  const cx = PAD + n.c * CELL_W + CELL_W / 2;
  const cy = TOP + n.r * CELL_H + CELL_H / 2;
  const shape: Geo['shape'] = n.k === 'usecase' ? 'ellipse' : n.k === 'decision' ? 'diamond' : n.k === 'initial' || n.k === 'final' ? 'circle' : 'rect';
  return { cx, cy, hw: w / 2, hh: h / 2, shape };
}

function boundaryPoint(g: Geo, tx: number, ty: number): [number, number] {
  const dx = tx - g.cx, dy = ty - g.cy;
  if (dx === 0 && dy === 0) return [g.cx, g.cy];
  let t: number;
  if (g.shape === 'ellipse') t = 1 / Math.sqrt((dx / g.hw) ** 2 + (dy / g.hh) ** 2);
  else if (g.shape === 'diamond') t = 1 / (Math.abs(dx) / g.hw + Math.abs(dy) / g.hh);
  else if (g.shape === 'circle') t = g.hw / Math.hypot(dx, dy);
  else t = Math.min(dx === 0 ? Infinity : g.hw / Math.abs(dx), dy === 0 ? Infinity : g.hh / Math.abs(dy));
  return [g.cx + dx * t, g.cy + dy * t];
}

const DASHED: EdgeKind[] = ['satisfy', 'verify', 'refine', 'derive', 'include', 'extend', 'dep'];
const STEREO: Partial<Record<EdgeKind, string>> = {
  satisfy: '«satisfy»', verify: '«verify»', refine: '«refine»', derive: '«deriveReqt»', include: '«include»', extend: '«extend»', dep: '',
};

export interface GraphOpts {
  /** Les éléments deviennent cliquables (nœuds et relations, par identifiant). */
  sel?: boolean;
  hl?: string[];
  mark?: Record<string, 'bad' | 'ok'>;
  fill?: Record<string, FillValue | undefined>;
  label?: string;
}

export function edgeId(e: GEdge): string { return e.id ?? `${e.from}>${e.to}`; }

function nodeSVG(n: GNode, o: GraphOpts): string {
  const g = geo(n);
  const { w, h } = size(n);
  const x = g.cx - w / 2, y = g.cy - h / 2;
  let label = n.label, sub = n.sub;
  let pending = false;
  if (n.slot) {
    const f = o.fill?.[n.slot];
    if (f) { label = f.set?.label ?? f.t; sub = f.set?.sub ?? sub; } else { label = '?'; pending = true; }
  }
  const T = (txt: string, yy: number, cls = '', xx = g.cx) => `<text class="${cls}" x="${xx}" y="${yy}" text-anchor="middle">${esc(txt)}</text>`;
  let body = '';
  switch (n.k) {
    case 'block': case 'test':
      body = `<rect class="box" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>` + T(n.k === 'test' ? '«testCase»' : '«block»', y + 14, 'small') + T(label, y + 31, 'b') + (sub ? T(sub, y + 47, 'small') : '');
      break;
    case 'part':
      body = `<rect class="box" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>` + T(label, y + 23, 'b') + T(': ' + (sub ?? ''), y + 41, 'small');
      break;
    case 'req': {
      const tl = wrap(sub ?? '', 27);
      body = `<rect class="box" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>` + T('«requirement»', y + 14, 'small') + T(label, y + 29, 'b') + tl.map((l, i) => T(l, y + 44 + i * 14, 'tiny')).join('');
      break;
    }
    case 'actor': {
      const cx = g.cx, top = y;
      body = `<circle class="line" cx="${cx}" cy="${top + 9}" r="8"/><path class="line" d="M${cx} ${top + 17}V${top + 42}M${cx - 14} ${top + 26}H${cx + 14}M${cx} ${top + 42}L${cx - 12} ${top + 60}M${cx} ${top + 42}L${cx + 12} ${top + 60}"/>` + wrap(label, 14).map((l, i) => T(l, top + 72 + i * 13, 'small')).join('');
      break;
    }
    case 'usecase': {
      const ls = lines(n, 20);
      body = `<ellipse class="box" cx="${g.cx}" cy="${g.cy}" rx="${g.hw}" ry="${g.hh}"/>` + ls.map((l, i) => T(l, g.cy + 4 - (ls.length - 1) * 7 + i * 14)).join('');
      break;
    }
    case 'action': {
      const ls = lines(n, 24);
      body = `<rect class="box" x="${x}" y="${y}" width="${w}" height="${h}" rx="14"/>` + ls.map((l, i) => T(l, g.cy + 4 - (ls.length - 1) * 7 + i * 14)).join('');
      break;
    }
    case 'decision':
      body = `<polygon class="box" points="${g.cx},${y} ${x + w},${g.cy} ${g.cx},${y + h} ${x},${g.cy}"/>` + wrap(label, 20).map((l, i) => T(l, y + h + 14 + i * 13, 'small')).join('');
      break;
    case 'initial': body = `<circle class="fillshape" cx="${g.cx}" cy="${g.cy}" r="8"/>`; break;
    case 'final': body = `<circle class="box" cx="${g.cx}" cy="${g.cy}" r="11"/><circle class="fillshape" cx="${g.cx}" cy="${g.cy}" r="6"/>`; break;
    case 'state': {
      const ls = lines(n, 18);
      body = `<rect class="box" x="${x}" y="${y}" width="${w}" height="${h}" rx="14"/>` + ls.map((l, i) => T(l, g.cy + 4 - (ls.length - 1) * 7 + i * 14)).join('');
      break;
    }
    case 'package':
      body = `<rect class="box" x="${x}" y="${y}" width="46" height="12"/><rect class="box" x="${x}" y="${y + 12}" width="${w}" height="${h - 12}"/>` + T(label, y + 34, 'b');
      break;
    case 'device':
      body = `<rect class="box" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/>` + T(label, y + 20, 'b') + (sub ? T(sub, y + 36, 'small') : '');
      break;
  }
  const cls = 'el' + (o.hl?.includes(n.id) ? ' hl' : '') + (pending ? ' pending' : '') + (o.mark?.[n.id] ? ' ' + o.mark[n.id] : '');
  const aria = esc(`${label}${sub ? ' : ' + sub : ''}`);
  return o.sel ? `<g class="${cls}" data-id="${esc(n.id)}" tabindex="0" role="button" aria-label="${aria}">${body}</g>` : `<g class="${cls}">${body}</g>`;
}

function edgeSVG(e: GEdge, nodes: Map<string, GNode>, o: GraphOpts): string {
  const a = nodes.get(e.from), b = nodes.get(e.to);
  if (!a || !b) return '';
  const ga = geo(a), gb = geo(b);
  let k = e.k, label = e.label;
  let pending = false;
  if (e.slot) {
    const f = o.fill?.[e.slot];
    if (f) { k = f.set?.k ?? k; label = f.set?.label ?? f.t; } else { label = '?'; pending = true; }
  }
  const [x1, y1] = boundaryPoint(ga, gb.cx, gb.cy);
  const [x2, y2] = boundaryPoint(gb, ga.cx, ga.cy);
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len, nx = -uy, ny = ux;
  const id = edgeId(e);
  const dashed = DASHED.includes(k) || pending;
  let deco = '';
  let sx = x1, sy = y1, ex = x2, ey = y2;
  let markerEnd = '';
  if (k === 'comp') {
    const p = (d: number, s: number) => `${(x1 + ux * d + nx * s).toFixed(1)},${(y1 + uy * d + ny * s).toFixed(1)}`;
    deco = `<polygon class="diamond" points="${p(0, 0)} ${p(10, 6)} ${p(20, 0)} ${p(10, -6)}"/>`;
    sx = x1 + ux * 20; sy = y1 + uy * 20;
  } else if (k === 'gen') {
    const p = (d: number, s: number) => `${(x2 - ux * d + nx * s).toFixed(1)},${(y2 - uy * d + ny * s).toFixed(1)}`;
    deco = `<polygon class="hollow" points="${p(0, 0)} ${p(14, 7)} ${p(14, -7)}"/>`;
    ex = x2 - ux * 14; ey = y2 - uy * 14;
  } else if (k === 'contain') {
    const cx0 = x1 + ux * 9, cy0 = y1 + uy * 9;
    deco = `<circle class="box" cx="${cx0.toFixed(1)}" cy="${cy0.toFixed(1)}" r="9"/><path class="line" d="M${(cx0 - 5).toFixed(1)} ${cy0.toFixed(1)}H${(cx0 + 5).toFixed(1)}M${cx0.toFixed(1)} ${(cy0 - 5).toFixed(1)}V${(cy0 + 5).toFixed(1)}"/>`;
    sx = x1 + ux * 18; sy = y1 + uy * 18;
  } else if (k === 'flow' || k === 'trans') markerEnd = ' marker-end="url(#ah)"';
  else if (DASHED.includes(k)) markerEnd = ' marker-end="url(#ao)"';
  else if (k === 'conn') {
    const port = (px: number, py: number) => `<rect class="port" x="${(px - 5).toFixed(1)}" y="${(py - 5).toFixed(1)}" width="10" height="10"/>`;
    deco = port(x1, y1) + port(x2, y2);
  }
  const stereo = STEREO[k] ?? '';
  const text = [stereo, label ?? ''].filter(Boolean).join(' ');
  const mx = (x1 + x2) / 2 + nx * 12, my = (y1 + y2) / 2 + ny * 12 + 4;
  const line = `<line class="line${dashed ? ' dash' : ''}" x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}"${markerEnd}/>`;
  const lab = text ? `<text class="elabel" x="${mx.toFixed(1)}" y="${my.toFixed(1)}" text-anchor="middle">${esc(text)}</text>` : '';
  const hit = o.sel ? `<line class="hit" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>` : '';
  const cls = 'el edge' + (o.hl?.includes(id) ? ' hl' : '') + (pending ? ' pending' : '') + (o.mark?.[id] ? ' ' + o.mark[id] : '');
  const aria = esc(`relation de ${a.label} vers ${b.label}`);
  return o.sel ? `<g class="${cls}" data-id="${esc(id)}" tabindex="0" role="button" aria-label="${aria}">${hit}${line}${deco}${lab}</g>` : `<g class="${cls}">${line}${deco}${lab}</g>`;
}

export function graphSVG(d: GraphDiagram, o: GraphOpts = {}): string {
  const nodes = new Map(d.nodes.map((n) => [n.id, n]));
  const maxC = Math.max(...d.nodes.map((n) => n.c), d.boundary?.c2 ?? 0);
  const maxR = Math.max(...d.nodes.map((n) => n.r), d.boundary?.r2 ?? 0);
  const W = PAD * 2 + (maxC + 1) * CELL_W;
  const H = TOP + (maxR + 1) * CELL_H + 12;
  const header = d.kind === 'net' ? `Schéma réseau : ${d.name}` : `${d.kind} ${d.pkg ? `[${d.pkg}] ` : ''}${d.name}`;
  const aria = esc(o.label ?? (d.kind === 'net' ? `Schéma réseau ${d.name}` : `Diagramme ${d.kind.toUpperCase()} : ${d.name}`));
  let s = `<svg class="dgm" viewBox="0 0 ${W} ${H}" role="img" aria-label="${aria}">${DEFS}`;
  s += `<rect class="frame" x="3" y="3" width="${W - 6}" height="${H - 6}"/><rect class="tagbox" x="3" y="3" width="${Math.min(W - 6, 14 + header.length * 7)}" height="24"/><text x="11" y="20">${esc(header)}</text>`;
  if (d.boundary) {
    const b = d.boundary;
    const bx = PAD + b.c * CELL_W + 4, by = TOP + b.r * CELL_H + 4;
    const bw = (b.c2 - b.c + 1) * CELL_W - 8, bh = (b.r2 - b.r + 1) * CELL_H - 8;
    s += `<rect class="boundary" x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="6"/><text class="b" x="${bx + 10}" y="${by + 18}">${esc(b.label)}</text>`;
  }
  for (const e of d.edges) s += edgeSVG(e, nodes, o);
  for (const n of d.nodes) s += nodeSVG(n, o);
  return s + '</svg>';
}
