/** Types du modèle pédagogique : diagrammes, activités, modules, parcours. */

export type DiagKind = 'req' | 'bdd' | 'ibd' | 'uc' | 'act' | 'stm' | 'pkg' | 'seq' | 'net';
/** Niveaux taxonomiques : 1 Information, 2 Expression, 3 Maîtrise d'outils, 4 Maîtrise méthodologique. */
export type Level = 1 | 2 | 3 | 4;
export interface Tag { d: DiagKind; level: Level }

export type NodeKind = 'block' | 'part' | 'req' | 'test' | 'actor' | 'usecase' | 'action' | 'decision' | 'initial' | 'final' | 'state' | 'package' | 'device';
export type EdgeKind = 'assoc' | 'comp' | 'gen' | 'conn' | 'contain' | 'satisfy' | 'verify' | 'refine' | 'derive' | 'include' | 'extend' | 'flow' | 'trans' | 'dep' | 'link';

/** Ce qu'une option de « trou » change sur l'élément qu'elle complète. */
export interface Setter { label?: string; sub?: string; k?: EdgeKind; from?: string; to?: string; ret?: boolean }
export interface FillValue { t: string; set?: Setter }

export interface GNode { id: string; k: NodeKind; label: string; sub?: string; c: number; r: number; slot?: string }
export interface GEdge { id?: string; from: string; to: string; k: EdgeKind; label?: string; slot?: string }
export interface GraphDiagram {
  kind: Exclude<DiagKind, 'seq'>;
  name: string;
  pkg?: string;
  nodes: GNode[];
  edges: GEdge[];
  boundary?: { label: string; c: number; r: number; c2: number; r2: number };
}

export interface SeqLine { id: string; n: string }
export interface SeqMsg { from: string; to: string; label: string; ret?: boolean; self?: boolean; slot?: string }
/** Fragment combiné : encadre les messages d'indices `from` à `to` (inclus) ; pour `alt`, `split` est l'indice du premier message de la seconde branche. */
export interface SeqFrag { k: 'alt' | 'opt' | 'loop'; from: number; to: number; guard: string; split?: number; guard2?: string }
export interface SeqDiagram { kind: 'seq'; name: string; lines: SeqLine[]; msgs: SeqMsg[]; frags?: SeqFrag[] }
export type Diagram = GraphDiagram | SeqDiagram;

/* ---------- activités ---------- */
export interface Common {
  id: string;
  prompt: string;
  /** Case du carnet (diagramme, niveau) alimentée par cette activité. */
  tag?: Tag;
  /** Pourquoi ce geste, à quoi il sert dans le métier. */
  why?: string;
  /** Indices gradués, du plus léger au plus appuyé. */
  hints?: string[];
  /** Critère de la grille d'évaluation finale (modules d'évaluation seulement). */
  crit?: string;
  weight?: number;
}
export interface QuizOpt { t: string; ok: boolean; why: string }
/** `because` : seconde question « pourquoi ? » ; la réponse ne compte que si les deux sont justes (empêche de deviner). */
export interface QuizAct extends Common { type: 'quiz'; multi?: boolean; options: QuizOpt[]; diagrams?: Diagram[]; note?: string; explain?: string; because?: { prompt: string; options: QuizOpt[] } }
/** Observer en manipulant : chaque action surligne ou met en panne des éléments et explique la conséquence. */
export interface ExploreAct extends Common {
  type: 'explore';
  diagram: Diagram;
  actions: { id: string; label: string; hl?: string[]; mark?: Record<string, 'bad' | 'ok'>; result: string }[];
  /** Actions à essayer pour terminer l'observation. */
  required: string[];
}
export interface OrderAct extends Common {
  type: 'order';
  /** Éléments dans le bon ordre. */
  items: string[];
  /** reasons[i] : pourquoi items[i] précède items[i+1]. */
  reasons: string[];
  /** Ordre de départ (indices dans items). */
  start: number[];
  /** Si présent, aperçu en séquence : msgs[i] correspond à items[i]. */
  seq?: { name: string; lines: SeqLine[]; msgs: SeqMsg[] };
}
export interface SlotOpt { v: string; t: string; set?: Setter; why?: string }
export interface Slot { id: string; label: string; options: SlotOpt[]; answer: string }
export interface FillAct extends Common { type: 'fill'; diagram: Diagram; slots: Slot[] }
export interface MatchAct extends Common { type: 'match'; diagram?: Diagram; pairs: { l: string; a: string; why: string }[]; choices: string[] }
export interface IdentifyAct extends Common {
  type: 'identify';
  diagram: Diagram;
  tasks: { ask: string; ids: string[]; why: string; wrong?: Record<string, string> }[];
}
export interface TraceAct extends Common { type: 'trace'; diagram: GraphDiagram; path: string[]; wrong?: Record<string, string>; why2?: string }
export interface BEdge { from: string; to: string; k: EdgeKind }
export interface PaletteNode { id: string; k: NodeKind; label: string; sub?: string; c: number; r: number; distractor?: string }
export interface BuildAct extends Common {
  type: 'build';
  kind: GraphDiagram['kind'];
  name: string;
  pkg?: string;
  palette: PaletteNode[];
  kinds: { v: EdgeKind; t: string }[];
  boundary?: GraphDiagram['boundary'];
  /** Point de départ (mise à jour d'un diagramme existant). */
  initial?: { nodes: string[]; edges: BEdge[] };
  target: { nodes: string[]; edges: BEdge[]; forbid?: { from: string; to: string; k?: EdgeKind; why: string }[] };
  /** Pourquoi telle relation est celle-là : affiché si l'élève choisit la mauvaise nature de relation entre deux éléments. */
  kindWhy?: Record<string, string>;
}
export interface BuildSeqAct extends Common {
  type: 'buildseq';
  name: string;
  lines: SeqLine[];
  labels: string[];
  expected: { from: string; to: string; label: string; ret?: boolean }[];
  /** Explication par message attendu (pourquoi à cette place). */
  reasons: string[];
}
export type Activity = QuizAct | OrderAct | FillAct | MatchAct | IdentifyAct | TraceAct | BuildAct | BuildSeqAct | ExploreAct;

/* ---------- réponses ---------- */
export type Resp =
  | { type: 'quiz'; sel: number[]; because?: number }
  | { type: 'explore'; tried: string[] }
  | { type: 'order'; order: number[] }
  | { type: 'fill'; values: Record<string, string> }
  | { type: 'match'; answers: string[] }
  | { type: 'identify'; picks: string[] }
  | { type: 'trace'; path: string[] }
  | { type: 'build'; nodes: string[]; edges: BEdge[] }
  | { type: 'buildseq'; msgs: { from: string; to: string; label: string; ret?: boolean }[] };

export interface Fb { k: 'ok' | 'bad' | 'warn'; h: string }
export interface Verdict { ok: boolean; score: number; fb: Fb[] }

/* ---------- modules et parcours ---------- */
/** Étape d'un TP guidé : une consigne en mots simples, une action, puis le mot technique donné après coup. */
export interface Step {
  say: string;
  act: Activity;
  /** Mot nouveau, donné après que l'élève a observé ou réussi. */
  name?: { w: string; def: string };
  debrief?: string;
}
export interface Module {
  /** TP guidé : les étapes se débloquent une à une ; `activities` en est la liste à plat. */
  steps?: Step[];
  id: string;
  n: string;
  title: string;
  /** Niveau taxonomique visé par le module. */
  level: Level;
  optional?: boolean;
  /** Module d'évaluation finale : une seule tentative par activité, pas d'indice. */
  exam?: boolean;
  objectives: string[];
  prereq: string[];
  success: string;
  /** Pourquoi ce diagramme existe, en une ou deux phrases. */
  pourquoi: string;
  cours: string[];
  exemple?: { diagram: Diagram; notes: string[] };
  situation?: string;
  activities: Activity[];
}
export interface CaseDef { d: DiagKind; level: Level; optional?: boolean }
export interface Criterion { id: string; label: string; pts: number }
export interface Parcours {
  id: 'ciel' | 'tssr' | 'bts';
  name: string;
  levelLabel: string;
  target: Level;
  orient: string;
  situation: string;
  /** Mention affichée sur les niveaux qui sont des choix pédagogiques et non des prescriptions. */
  statut: string;
  cases: CaseDef[];
  grille: Criterion[];
  modules: Module[];
}

export const DIAG_NAME: Record<DiagKind, string> = {
  req: 'Exigences (REQ)', bdd: 'Définition de blocs (BDD)', ibd: 'Blocs internes (IBD)', uc: "Cas d'utilisation (UC)",
  act: 'Activité (ACT)', stm: 'États-transitions (STM)', pkg: 'Paquetages (PKG)', seq: 'Séquence (SEQ)', net: 'Schéma réseau',
};
export const LEVEL_NAME: Record<Level, string> = { 1: 'Information', 2: 'Expression', 3: "Maîtrise d'outils", 4: 'Maîtrise méthodologique' };
