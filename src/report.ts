import { check, solve } from './activities/checks';
import { esc } from './render';
import { caseState, summary, type ExamRec, type Store } from './state';
import { DIAG_NAME, type Parcours } from './types';

export interface ExamScore { total: number; crit: { id: string; label: string; pts: number; got: number }[] }
const r1 = (x: number): number => Math.round(x * 10) / 10;

export function examScore(p: Parcours, ex: ExamRec | undefined): ExamScore {
  const m = p.modules.find((x) => x.exam);
  const crit = p.grille.map((c) => {
    const items = (m?.activities ?? []).filter((a) => a.crit === c.id && (a.weight ?? 0) > 0);
    const w = items.reduce((s, a) => s + (a.weight ?? 0), 0);
    const got = w ? items.reduce((s, a) => s + (a.weight ?? 0) * (ex?.items[a.id]?.score ?? 0), 0) / w : 0;
    return { id: c.id, label: c.label, pts: c.pts, got: r1(got * c.pts) };
  });
  return { total: r1(crit.reduce((s, c) => s + c.got, 0)), crit };
}

export async function fingerprint(text: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return 'sha256:' + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return 'fnv:' + (h >>> 0).toString(16);
  }
}

export interface ReportData { v: 1; app: 'sysml-lab'; parcours: string; name: string; date: string; acts: Store['acts'][string]; exam?: ExamRec; score?: ExamScore }
export interface ReportFile { data: ReportData; fingerprint: string }

export async function buildReport(s: Store, p: Parcours): Promise<ReportFile> {
  const ex = s.exam[p.id];
  const data: ReportData = { v: 1, app: 'sysml-lab', parcours: p.id, name: ex?.name || s.name || 'Anonyme', date: new Date().toISOString().slice(0, 10), acts: s.acts[p.id] ?? {}, ...(ex?.finished ? { exam: ex, score: examScore(p, ex) } : {}) };
  return { data, fingerprint: await fingerprint(JSON.stringify(data)) };
}
export async function verifyReport(f: ReportFile): Promise<boolean> { return (await fingerprint(JSON.stringify(f.data))) === f.fingerprint; }

const LABEL = { todo: 'À faire', acquise: 'Acquise', maitrisee: 'Maîtrisée', consolider: 'À consolider' } as const;

export function reportHTML(f: ReportFile, p: Parcours): string {
  const d = f.data;
  const sm = summary(p, d.acts);
  const cases = p.cases.map((c) => `<tr><td>${esc(DIAG_NAME[c.d])}</td><td>Niveau ${c.level}${c.optional ? ' (facultatif)' : ''}</td><td>${LABEL[caseState(p, d.acts, c)]}</td></tr>`).join('');
  const sc = d.score ? `<h2>Évaluation finale : ${d.score.total} / 20</h2><table>${d.score.crit.map((c) => `<tr><td>${esc(c.label)}</td><td>${c.got} / ${c.pts}</td></tr>`).join('')}</table>` : '<p>Évaluation finale non passée.</p>';
  return `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Rapport SysML-Lab</title><style>body{font:15px/1.5 system-ui;max-width:760px;margin:2rem auto;padding:0 1rem}table{border-collapse:collapse;width:100%;margin:.5rem 0}td,th{border:1px solid #bbb;padding:.3rem .5rem;text-align:left}code{font-size:.8rem;word-break:break-all}</style>
<h1>Rapport SysML-Lab</h1><p><b>${esc(d.name)}</b> — ${esc(p.name)} — ${esc(d.date)}</p>${sc}
<h2>Carnet</h2><table><tr><th>Diagramme</th><th>Niveau</th><th>Situation</th></tr>${cases}</table>
<p>${sm.connaissances.length} connaissance(s) acquise(s), ${sm.competences.length} compétence(s) travaillée(s), ${sm.consolider.length} notion(s) à consolider.</p>
<p>Ce rapport décrit un travail réalisé en autonomie ; il peut constituer un élément de preuve parmi d'autres et ne vaut pas validation de compétence.</p>
<p>Empreinte : <code>${esc(f.fingerprint)}</code></p></html>`;
}

export function correction(p: Parcours, ex: ExamRec | undefined): { id: string; prompt: string; score: number; html: string }[] {
  const m = p.modules.find((x) => x.exam);
  return (m?.activities ?? []).map((a) => ({ id: a.id, prompt: a.prompt, score: ex?.items[a.id]?.score ?? 0, html: check(a, solve(a)).fb.map((x) => x.h).join('') }));
}
