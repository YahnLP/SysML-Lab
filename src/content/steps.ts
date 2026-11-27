import type { Activity, ExploreAct, IdentifyAct, Module, QuizAct, Step, Tag } from '../types';
import { V0, actDiag, bddAuth, ibdAuth, netSite, quiz, reqAuth, seqAuth, N, Y, type Vars } from './common';

type Meta = { tag?: Tag; hints?: string[]; why?: string };
type Base = Omit<Module, 'activities' | 'steps' | 'cours'> & { cours?: string[] };

export const st = (say: string, act: Activity, name?: { w: string; def: string }, debrief?: string): Step => ({ say, act, ...(name ? { name } : {}), ...(debrief ? { debrief } : {}) });
export const guided = (b: Base, steps: Step[]): Module => ({ ...b, cours: b.cours ?? [], steps, activities: steps.map((s) => s.act) });

/** Une seule consigne de repérage : une action, un geste. */
export function one(id: string, diagram: IdentifyAct['diagram'], ask: string, ids: string[], why: string, wrong: Record<string, string> = {}, m: Meta = {}): IdentifyAct {
  return { id, type: 'identify', prompt: 'Clique directement sur le dessin.', diagram, tasks: [{ ask, ids, why, wrong }], ...m };
}
export const netOne = (id: string, v: Vars = V0, m: Meta = {}): IdentifyAct => one(id, netSite(v), `Le poste de Lina, ${v.pc}`, ['pc'], `${v.pc} est le poste : il est relié au commutateur ${v.sw}.`, { sw: 'Le commutateur relie les machines, mais ce n\'est pas le poste de Lina.' }, m);

export function exploreIbd(id: string, v: Vars = V0, m: Meta = {}): ExploreAct {
  return {
    id, type: 'explore', prompt: "Joue la scène : essaie les trois situations l'une après l'autre et lis ce qui se passe.", diagram: ibdAuth(v), required: ['ok', 'dir', 'auth'], ...m,
    actions: [
      { id: 'ok', label: 'Tout fonctionne : Lina ouvre sa session', hl: ['poste', 'poste>auth', 'auth', 'auth>dir', 'dir'], result: "La demande part du poste, passe par le serveur d'authentification, qui interroge l'annuaire. Chaque maillon est utilisé." },
      { id: 'dir', label: "L'annuaire est arrêté", mark: { dir: 'bad' }, hl: ['auth>dir'], result: "Le serveur d'authentification ne trouve plus le compte de Lina : <b>elle est bloquée</b>, alors que son poste et le serveur fonctionnent." },
      { id: 'auth', label: "Le serveur d'authentification est arrêté", mark: { auth: 'bad' }, result: "Le poste n'a plus personne à qui adresser sa demande, et l'annuaire ne reçoit rien : <b>tous les postes sont bloqués</b>." },
    ],
  };
}
export function exploreBdd(id: string, m: Meta = {}): ExploreAct {
  return {
    id, type: 'explore', prompt: 'Teste deux idées : retire un composant du service et regarde ce que devient le service.', diagram: bddAuth(), required: ['srv', 'poste'], ...m,
    actions: [
      { id: 'srv', label: 'Retirer ServeurAuthentification', mark: { srv: 'bad' }, hl: ['sys>srv'], result: "Sans serveur d'authentification, <b>le service d'ouverture de session n'existe plus</b> : personne ne vérifie les mots de passe. Le serveur fait partie du service." },
      { id: 'poste', label: 'Retirer PosteDeTravail', mark: { poste: 'bad' }, hl: ['sys>poste'], result: "Le service existe toujours : un poste de moins n'enlève rien au service. <b>Le poste utilise le service, il n'en fait pas partie.</b>" },
    ],
  };
}
export function exploreReq(id: string, m: Meta = {}): ExploreAct {
  return {
    id, type: 'explore', prompt: "Que se passe-t-il si on supprime un test ? Essaie les deux cas.", diagram: reqAuth(), required: ['t2', 't3'], ...m,
    actions: [
      { id: 't2', label: 'Supprimer le test T-02', mark: { t2: 'bad', ex2: 'bad' }, hl: ['ver2'], result: "Personne ne mesure plus la durée d'ouverture : on ne saura <b>jamais</b> si EX-02 (moins de 3 secondes) est respectée." },
      { id: 't3', label: 'Supprimer le test T-03', mark: { t3: 'bad', ex3: 'bad' }, hl: ['ver3'], result: "Plus rien ne contrôle que les comptes sont dans un annuaire unique : EX-03 n'est <b>plus vérifiée</b>." },
    ],
  };
}
export function exploreSeq(id: string, m: Meta = {}): ExploreAct {
  const says = [
    "Le poste demande à ouvrir une session. C'est lui qui commence : rien ne peut se passer avant.",
    "Le serveur d'authentification ne conserve pas les comptes : il demande à l'annuaire de chercher celui de Lina.",
    "L'annuaire répond en renvoyant le compte et ses droits. Sans cette réponse, le serveur est bloqué.",
    "Le serveur compare le mot de passe saisi avec le compte reçu. Il n'a besoin de personne d'autre pour ça : la flèche revient sur lui-même.",
    "Seulement maintenant, le serveur peut répondre au poste : l'accès est accordé.",
  ];
  return {
    id, type: 'explore', prompt: 'Lis la scène message par message, de haut en bas, en cliquant les boutons dans l\'ordre.', diagram: seqAuth(), required: says.map((_, i) => `m${i}`), ...m,
    actions: says.map((r, i) => ({ id: `m${i}`, label: `Message ${i + 1}`, hl: [`m${i}`], result: r })),
  };
}
export function exploreAct(id: string, m: Meta = {}): ExploreAct {
  return {
    id, type: 'explore', prompt: 'Suis la procédure : essaie les deux réponses possibles au losange.', diagram: actDiag(), required: ['oui', 'non'], ...m,
    actions: [
      { id: 'oui', label: "L'annuaire ne répond pas", hl: ['i', 'a1', 'd1', 'oui', 'a2', 'a3', 'f1'], result: "On teste la liaison vers l'annuaire, puis on contrôle le service annuaire." },
      { id: 'non', label: "L'annuaire répond", hl: ['i', 'a1', 'd1', 'non', 'a4', 'f2'], result: "Le problème n'est pas l'annuaire : on cherche la cause côté poste, puis c'est terminé." },
    ],
  };
}

/** Prédire avant d'observer : la réponse doit être justifiée, ce qui empêche de deviner. */
export function predict(id: string, v: Vars = V0, m: Meta = {}): QuizAct {
  return {
    ...quiz(id, `Avant d'essayer, <b>prédis</b> : l'annuaire est arrêté. ${v.pc} fonctionne et ${v.auth} aussi. Lina peut-elle ouvrir sa session ?`, [
      N('Oui, tout ce qui la concerne fonctionne', "Son poste et le serveur fonctionnent, mais le serveur a besoin de l'annuaire pour trouver le compte."),
      Y('Non, elle est bloquée', "Le serveur d'authentification doit interroger l'annuaire : sans lui, il ne peut pas vérifier le compte."),
    ], { diagrams: [ibdAuth(v)], ...m }),
    because: { prompt: 'Pourquoi ?', options: [
      Y("Le serveur d'authentification dépend de l'annuaire pour trouver le compte", 'Les connecteurs montrent la chaîne : poste, serveur, annuaire. Un maillon manquant bloque la suite.'),
      N('Parce que le poste est relié à l\'annuaire', "Le poste n'a aucun lien direct avec l'annuaire."),
      N("Parce qu'un annuaire arrêté éteint le poste", "Un annuaire arrêté n'éteint pas les autres machines."),
    ] },
  };
}
export function justifyOrder(id: string, m: Meta = {}): QuizAct {
  return {
    ...quiz(id, "Le serveur peut-il répondre « accès accordé » <b>avant</b> d'avoir vérifié le mot de passe ?", [
      N('Oui, ça va plus vite', "Ce serait une faille : n'importe qui pourrait entrer."),
      Y('Non, la vérification vient avant', "On ne peut accorder l'accès qu'après avoir comparé le mot de passe."),
    ], { diagrams: [seqAuth()], ...m }),
    because: { prompt: 'Comment le diagramme le montre-t-il ?', options: [
      Y("Le message « accès accordé » est plus bas que la vérification : on lit de haut en bas, dans l'ordre du temps", 'Le temps passe de haut en bas : ce qui est plus bas arrive après.'),
      N('Il est écrit en gras', 'La mise en forme ne change rien au sens.'),
      N('Il est plus à droite', "La position horizontale indique qui parle, pas quand."),
    ] },
  };
}
export const pairDoc = (id: string, v: Vars = V0): Activity => ({
  id, type: 'match', prompt: 'Pour chaque question, quel document ouvre-t-on ?', choices: ['schéma réseau', 'diagramme SysML'],
  pairs: [
    { l: `Sur quel commutateur est branché ${v.pc} ?`, a: 'schéma réseau', why: 'Le câblage et les adresses sont dans le schéma réseau.' },
    { l: 'Quelle machine vérifie le mot de passe ?', a: 'diagramme SysML', why: 'Le rôle de chaque élément est décrit par le modèle SysML.' },
    { l: `Quelle est l'adresse IP de ${v.auth} ?`, a: 'schéma réseau', why: 'Les adresses restent dans le schéma réseau : SysML ne le remplace pas.' },
  ],
});
export const whyQuiz = (id: string, v: Vars = V0): QuizAct => quiz(id, `Le technicien a vérifié que ${v.pc} joint bien ${v.auth}. Pourtant Lina est bloquée. Que lui manque-t-il pour comprendre ?`, [
  Y('Savoir qui fait quoi pendant une ouverture de session', "Le schéma réseau montre les machines, pas leur rôle dans l'échange."),
  N("Les adresses IP", "Elles figurent déjà dans le schéma réseau."),
  N('La couleur des câbles', "Elle ne dit rien sur le fonctionnement du service."),
], { diagrams: [netSite(v)] });
