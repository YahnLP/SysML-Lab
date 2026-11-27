import type { FillValue, SeqDiagram } from '../types';
import { DEFS, esc } from './graph';

export interface SeqOpts {
  numbered?: boolean;
  mark?: Record<number, 'bad' | 'ok'>;
  fill?: Record<string, FillValue | undefined>;
  /** Éléments cliquables : lignes de vie (id de la ligne) et messages (« m0 », « m1 »...). */
  sel?: boolean;
  hl?: string[];
  label?: string;
}

const W = 690;
const Y0 = 110;
const STEP = 46;

export function seqSVG(d: SeqDiagram, o: SeqOpts = {}): string {
  const n = d.msgs.length;
  const H = Y0 + n * STEP + 24;
  const xs: Record<string, number> = {};
  const m = d.lines.length;
  d.lines.forEach((l, i) => { xs[l.id] = m === 1 ? W / 2 : 80 + (i * (W - 160)) / (m - 1); });
  const aria = esc(o.label ?? `Diagramme de séquence : ${d.name}`);
  let s = `<svg class="dgm" viewBox="0 0 ${W} ${H}" role="img" aria-label="${aria}">${DEFS}`;
  const header = `sd ${d.name}`;
  s += `<rect class="frame" x="3" y="3" width="${W - 6}" height="${H - 6}"/><rect class="tagbox" x="3" y="3" width="${14 + header.length * 7}" height="24"/><text x="11" y="20">${esc(header)}</text>`;
  for (const l of d.lines) {
    const x = xs[l.id] ?? 0;
    const head = `<rect class="box" x="${x - 62}" y="40" width="124" height="30" rx="3"/><text class="b" x="${x}" y="60" text-anchor="middle">${esc(l.n)}</text>`;
    s += `<line class="lf" x1="${x}" y1="70" x2="${x}" y2="${H - 12}"/>`;
    s += o.sel ? `<g class="el${o.hl?.includes(l.id) ? ' hl' : ''}" data-id="${esc(l.id)}" tabindex="0" role="button" aria-label="ligne de vie ${esc(l.n)}">${head}</g>` : head;
  }
  for (const f of d.frags ?? []) {
    const ya = Y0 + f.from * STEP - 26, yb = Y0 + f.to * STEP + 22;
    s += `<rect class="frag" x="24" y="${ya}" width="${W - 48}" height="${yb - ya}"/><path class="fragtag" d="M24 ${ya}h54v14l-8 8h-46z"/><text class="small b" x="30" y="${ya + 14}">${f.k}</text><text class="small" x="86" y="${ya + 14}">[${esc(f.guard)}]</text>`;
    if (f.k === 'alt' && f.split !== undefined) {
      const ys = Y0 + f.split * STEP - 26;
      s += `<line class="fragline" x1="24" y1="${ys}" x2="${W - 24}" y2="${ys}"/><text class="small" x="30" y="${ys + 14}">[${esc(f.guard2 ?? 'sinon')}]</text>`;
    }
  }
  d.msgs.forEach((msg, i) => {
    const y = Y0 + i * STEP;
    let from = msg.from, to = msg.to, ret = msg.ret, label = msg.label, self = msg.self;
    let pending = false;
    if (msg.slot) {
      const f = o.fill?.[msg.slot];
      if (f) { label = f.set?.label ?? f.t; from = f.set?.from ?? from; to = f.set?.to ?? to; ret = f.set?.ret ?? ret; self = from === to; } else { label = '?'; pending = true; }
    }
    const x1 = xs[from] ?? 0, x2 = xs[to] ?? 0;
    const txt = (o.numbered ? `${i + 1}. ` : '') + label;
    const cls = 'el msg' + (o.mark?.[i] ? ' ' + o.mark[i] : '') + (o.hl?.includes('m' + i) ? ' hl' : '') + (pending ? ' pending' : '');
    let body: string;
    if (self) {
      body = `<path class="line" d="M${x1} ${y - 8}H${x1 + 46}V${y + 14}H${x1 + 4}" marker-end="url(#ah)"/><text x="${x1 + 54}" y="${y + 4}">${esc(txt)}</text>`;
    } else {
      body = `<line class="line${ret || pending ? ' dash' : ''}" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" marker-end="url(#${ret ? 'ao' : 'ah'})"/><text x="${(x1 + x2) / 2}" y="${y - 6}" text-anchor="middle">${esc(txt)}</text>`;
    }
    const hit = o.sel ? `<rect class="hit" x="${Math.min(x1, x2) - 4}" y="${y - 22}" width="${Math.abs(x2 - x1) + (self ? 150 : 8)}" height="36"/>` : '';
    s += o.sel ? `<g class="${cls}" data-id="m${i}" tabindex="0" role="button" aria-label="message ${i + 1} : ${esc(label)}">${hit}${body}</g>` : `<g class="${cls}">${body}</g>`;
  });
  return s + '</svg>';
}
