import type { Activity, BuildAct, FillAct, GraphDiagram, Module, Parcours } from '../types';
import { V0, actDiag, bddAuth, ibdAuth, multi, pkgNova, quiz, reqAuth, stmService, tg, ucAuth, N, Y, hashString, type Vars } from './common';
import { actRead, bddBuild, bddGen, bddRead, ibdBuild, ibdForbid, ibdTrace, reqBuild, reqCoverage, reqFill, seqAlt, seqBuild, seqFill, seqIdentify, seqOrder } from './lib';
import { exploreAct, exploreBdd, exploreIbd, exploreReq, exploreSeq, guided, one, predict, st, whyQuiz } from './steps';

type M = { tag?: ReturnType<typeof tg>; crit?: string; weight?: number; hints?: string[]; why?: string };

const ucFill = (id: string, m: M): FillAct => ({
  id, type: 'fill', prompt: "Complète la nature des deux liens entre cas d'utilisation.", ...m,
  diagram: { ...ucAuth(), edges: ucAuth().edges.map((e) => (e.id === 'inc' ? { ...e, slot: 's1' } : e.id === 'ext' ? { ...e, slot: 's2' } : e)) },
  slots: [
    { id: 's1', label: "« Vérifier le mot de passe » a lieu à chaque ouverture", answer: 'include', options: [
      { v: 'include', t: 'include', set: { k: 'include' }, why: 'Un cas toujours exécuté est inclus : include, flèche du cas de base vers le cas inclus.' },
      { v: 'extend', t: 'extend', set: { k: 'extend' }, why: "extend sert à un comportement optionnel, pas systématique." },
    ] },
    { id: 's2', label: '« Demander un code de secours » n\'a lieu que parfois', answer: 'extend', options: [
      { v: 'include', t: 'include', set: { k: 'include' }, why: "Un cas facultatif n'est pas toujours exécuté : ce n'est pas un include." },
      { v: 'extend', t: 'extend', set: { k: 'extend' }, why: "Cas facultatif : extend, flèche du cas qui étend vers le cas de base." },
    ] },
  ],
});
const ucBuild = (id: string, m: M): BuildAct => ({
  id, type: 'build', kind: 'uc', name: 'Authentification', pkg: 'Package', ...m,
  prompt: "Construis le diagramme : l'utilisateur ouvre une session ; l'ouverture inclut la vérification du mot de passe ; le code de secours est une extension facultative.",
  boundary: ucAuth().boundary,
  palette: [
    { id: 'user', k: 'actor', label: 'Utilisateur', c: 0, r: 0 },
    { id: 'open', k: 'usecase', label: 'Ouvrir une session', c: 1.5, r: 0 },
    { id: 'check', k: 'usecase', label: 'Vérifier le mot de passe', c: 3, r: 0 },
    { id: 'code', k: 'usecase', label: 'Demander un code de secours', c: 1.5, r: 1 },
    { id: 'gest', k: 'usecase', label: 'Sauvegarder le serveur', c: 3, r: 1, distractor: "Ce cas n'appartient pas à l'authentification de la consigne." },
  ],
  kinds: [{ v: 'assoc', t: 'association' }, { v: 'include', t: 'include' }, { v: 'extend', t: 'extend' }],
  target: { nodes: ['user', 'open', 'check', 'code'], edges: [{ from: 'user', to: 'open', k: 'assoc' }, { from: 'open', to: 'check', k: 'include' }, { from: 'code', to: 'open', k: 'extend' }] },
  kindWhy: { 'open>check:extend': "Cette vérification est systématique : c'est un include.", 'code>open:include': "Le code de secours est facultatif : c'est un extend." },
});
const actFill = (id: string, m: M): FillAct => ({
  id, type: 'fill', prompt: "Complète le diagramme d'activité : les conditions des deux branches.", ...m,
  diagram: { ...actDiag(), edges: actDiag().edges.map((e) => (e.id === 'oui' ? { ...e, label: '?', slot: 's1' } : e.id === 'non' ? { ...e, label: '?', slot: 's2' } : e)) },
  slots: [
    { id: 's1', label: "Branche vers « Tester la liaison vers l'annuaire »", answer: 'oui', options: [
      { v: 'oui', t: '[oui]', set: { label: '[oui]' }, why: "Si l'annuaire ne répond pas, on teste la liaison : [oui]." },
      { v: 'non', t: '[non]', set: { label: '[non]' }, why: "Si l'annuaire répond, le problème est ailleurs : ce n'est pas la branche qui teste la liaison." },
    ] },
    { id: 's2', label: "Branche vers « Chercher la cause côté poste »", answer: 'non', options: [
      { v: 'oui', t: '[oui]', set: { label: '[oui]' }, why: "Cette branche s'exécute quand l'annuaire répond." },
      { v: 'non', t: '[non]', set: { label: '[non]' }, why: "L'annuaire répond : on cherche côté poste. Condition [non]." },
    ] },
  ],
});
const actBuild = (id: string, m: M): BuildAct => ({
  id, type: 'build', kind: 'act', name: 'Diagnostic', pkg: 'Activity', ...m,
  prompt: "Construis la séquence d'actions : début, lire le journal, tester la liaison, contrôler le service, fin.",
  palette: [
    { id: 'i', k: 'initial', label: 'début', c: 0, r: 0 },
    { id: 'a1', k: 'action', label: 'Lire le journal', c: 1, r: 0 },
    { id: 'a2', k: 'action', label: 'Tester la liaison', c: 2, r: 0 },
    { id: 'a3', k: 'action', label: 'Contrôler le service', c: 3, r: 0 },
    { id: 'f', k: 'final', label: 'fin', c: 4, r: 0 },
  ],
  kinds: [{ v: 'flow', t: 'flux de contrôle' }, { v: 'trans', t: 'transition' }, { v: 'dep', t: 'dépendance' }],
  target: { nodes: ['i', 'a1', 'a2', 'a3', 'f'], edges: [{ from: 'i', to: 'a1', k: 'flow' }, { from: 'a1', to: 'a2', k: 'flow' }, { from: 'a2', to: 'a3', k: 'flow' }, { from: 'a3', to: 'f', k: 'flow' }] },
  kindWhy: { 'i>a1:trans': "Une transition appartient au diagramme d'états ; ici ce sont des flux de contrôle.", 'a1>a2:trans': "Une transition appartient au diagramme d'états.", 'a2>a3:trans': "Une transition appartient au diagramme d'états.", 'a3>f:trans': "Une transition appartient au diagramme d'états." },
});
const reqDerive = (id: string, m: M): BuildAct => ({
  id, type: 'build', kind: 'req', name: 'Disponibilité', pkg: 'Package', ...m,
  prompt: "EX-04 (annuaire répliqué) est dérivée de EX-02 (disponibilité). Le bloc AnnuaireReplique la satisfait ; le test T-04 la vérifie.",
  palette: [
    { id: 'ex2', k: 'req', label: 'EX-02', sub: "Le service reste disponible si un annuaire tombe.", c: 1, r: 0 },
    { id: 'ex4', k: 'req', label: 'EX-04', sub: "L'annuaire est répliqué sur deux serveurs.", c: 1, r: 1 },
    { id: 'rep', k: 'block', label: 'AnnuaireReplique', c: 0, r: 2 },
    { id: 't4', k: 'test', label: 'T-04', sub: "Arrêt d'un annuaire", c: 2, r: 2 },
  ],
  kinds: [{ v: 'derive', t: 'deriveReqt' }, { v: 'satisfy', t: 'satisfy' }, { v: 'verify', t: 'verify' }, { v: 'contain', t: 'contient (⊕)' }],
  target: { nodes: ['ex2', 'ex4', 'rep', 't4'], edges: [{ from: 'ex4', to: 'ex2', k: 'derive' }, { from: 'rep', to: 'ex4', k: 'satisfy' }, { from: 't4', to: 'ex4', k: 'verify' }] },
  kindWhy: { 'ex4>ex2:contain': "EX-04 découle de EX-02 mais n'en est pas une partie : on utilise deriveReqt.", 'ex2>ex4:derive': 'deriveReqt part de l\'exigence dérivée (EX-04) vers l\'exigence source (EX-02).' },
});
const coherence = (id: string, m: M): Activity => {
  const ibdSans: GraphDiagram = { ...ibdAuth(), nodes: ibdAuth().nodes.filter((n) => n.id !== 'dir'), edges: ibdAuth().edges.filter((e) => e.to !== 'dir') };
  return quiz(id, "Le BDD compose le système d'un annuaire, mais l'IBD n'en montre aucun. Que fais-tu ?", [
    Y("Je corrige l'IBD : ajouter la partie annuaire et son connecteur", "Les diagrammes décrivent le même système : ce qui figure dans la composition doit apparaître dans l'IBD."),
    N("Je retire l'annuaire du BDD", "Le BDD est correct : EX-03 exige un annuaire unique."),
    N('Je laisse tel quel', "Deux diagrammes qui se contredisent trompent le lecteur."),
  ], { diagrams: [bddAuth(), ibdSans], ...m });
};
const notation = (id: string, m: M): Activity => multi(id, "Repère les erreurs de notation (plusieurs réponses).", [
  Y("Un losange plein placé du côté de la partie", "Le losange se place du côté du tout."),
  Y("Une flèche verify qui part d'un bloc", "verify part d'un test."),
  N("Une flèche en pointillés pour un retour de séquence", "C'est la notation correcte."),
  N("Un connecteur entre deux parties d'un IBD", "C'est la notation correcte."),
], m);

const exploreUc = (id: string): Activity => ({
  id, type: 'explore', prompt: 'Teste deux situations et lis ce que le diagramme enchaîne.', diagram: ucAuth(), required: ['inc', 'ext'],
  actions: [
    { id: 'inc', label: "L'utilisateur ouvre sa session", hl: ['user', 'open', 'inc', 'check'], result: "À <b>chaque</b> ouverture, la vérification du mot de passe est faite : elle est incluse." },
    { id: 'ext', label: "L'utilisateur a oublié son mot de passe", hl: ['code', 'ext', 'open'], result: "Un code de secours peut être demandé, mais <b>seulement dans ce cas</b> : c'est une extension facultative." },
  ],
});
const exploreStm = (id: string): Activity => ({
  id, type: 'explore', prompt: 'Fais vivre le service : essaie les deux événements.', diagram: stmService(), required: ['start', 'ko'],
  actions: [
    { id: 'start', label: 'Démarrer le service', hl: ['arret', 'tdem', 'demarre', 'tok', 'service'], result: "Le service passe de Arrêté à Démarrage, puis En service quand l'annuaire est joignable." },
    { id: 'ko', label: "L'annuaire devient injoignable", hl: ['service', 'tko', 'degrade'], result: "Le service passe de En service à Dégradé : il fonctionne mal, mais n'est pas arrêté." },
  ],
});

export function bts(v: Vars = V0, seed = 0): Parcours {
  const s = seed || 0;
  const missing = (['t1', 't2', 't3'] as const)[hashString(v.pc) % 3] as 't1' | 't2' | 't3';
  const modules: Module[] = [
    guided({
      id: 'bts-b0', n: 'B0', title: 'Mission : documenter un système avec SysML', level: 1,
      objectives: ["Situer SysML dans la démarche d'ingénierie", 'Savoir quel diagramme répond à quelle question'],
      prereq: ['Aucun'], success: 'Les trois étapes réussies.',
      pourquoi: "Un système se décrit sous plusieurs angles. Chaque diagramme répond à une question précise sur le même système.",
      situation: "NovaTech te demande de documenter son service d'ouverture de session pour toute l'équipe.",
    }, [
      st("Tu ouvres le dossier existant : seulement un schéma réseau. Pour documenter le service, il te manque de quoi répondre à des questions comme « qui vérifie le mot de passe ? ». <b>Quel type de document manque ?</b>", whyQuiz('bts-b0-a1', v), { w: 'SysML', def: "un langage de dessin pour décrire un système. Chaque diagramme répond à une question : exigences, composants, liaisons, échanges dans le temps." }),
      st("Chaque diagramme répond à une question précise. Associe chaque question au diagramme qui la traite, en te demandant ce que le diagramme montre.", { id: 'bts-b0-a2', type: 'match', prompt: 'Quel diagramme répond à chaque question ?', choices: ['exigences (REQ)', 'blocs (BDD)', 'blocs internes (IBD)', 'séquence (SEQ)'], pairs: [
        { l: 'Que doit garantir le service ?', a: 'exigences (REQ)', why: 'Les exigences listent ce que le système doit tenir.' },
        { l: 'De quoi le service est-il fait ?', a: 'blocs (BDD)', why: 'Le BDD décrit les types de composants et leurs compositions.' },
        { l: 'Qui est relié à qui ?', a: 'blocs internes (IBD)', why: "L'IBD montre les parties et leurs connecteurs." },
        { l: 'Dans quel ordre échangent-ils ?', a: 'séquence (SEQ)', why: 'La séquence montre les messages dans le temps.' },
      ] }),
      st("Dernière idée à comprendre : les diagrammes ne sont pas des dessins indépendants. Réfléchis à ce que signifie une contradiction entre deux d'entre eux.", quiz('bts-b0-a3', 'Pourquoi les diagrammes doivent-ils rester cohérents ?', [Y('Ils décrivent le même système vu sous plusieurs angles', "Une contradiction entre deux diagrammes signale une erreur."), N('Pour en réduire le nombre', "Ce n'est pas l'objectif.")]), { w: 'modèle', def: "l'ensemble des diagrammes d'un système : la source unique dont chaque diagramme est une vue." }),
    ]),
    guided({
      id: 'bts-b1', n: 'B1', title: 'Mission : qui fait quoi, dans quel enchaînement', level: 2,
      objectives: ["Lire et compléter un diagramme de cas d'utilisation", "Lire et compléter un diagramme d'activité"],
      prereq: ['B0'], success: 'Les neuf étapes réussies.',
      pourquoi: "Avant de concevoir, on dit qui fait quoi avec le système, puis dans quel enchaînement.",
      situation: "Tu recueilles les usages de l'ouverture de session auprès des utilisateurs et des administrateurs.",
    }, [
      st("Voici les usages recueillis. <b>Clique la personne qui ouvre une session.</b>", one('bts-b1-a1', ucAuth(), 'La personne qui ouvre une session', ['user'], "L'utilisateur est relié au cas « Ouvrir une session ».", { admin: "L'administrateur est relié à « Gérer les comptes »." }, { tag: tg('uc', 1) }), { w: 'acteur', def: "une personne ou un système <b>extérieur</b> qui utilise le système. Il est dessiné hors du cadre." }),
      st("Teste deux situations et regarde ce que le diagramme enchaîne.", exploreUc('bts-b1-a2'), undefined, "Une vérification systématique et un secours facultatif ne s'écrivent pas de la même façon."),
      st("Applique : <b>quel lien pour la vérification qui a lieu à chaque ouverture</b>, quel lien pour le secours facultatif ?", ucFill('bts-b1-a3', { tag: tg('uc', 2), hints: ['« Toujours » ou « parfois » ?'] }), { w: 'include / extend', def: "<b>include</b> : le cas inclus a lieu à chaque fois. <b>extend</b> : le cas d'extension n'a lieu que parfois ; la flèche va du cas qui étend vers le cas de base." }),
      st("Tu sais lire ces liens. À toi de construire : place les éléments, puis relie-les avec la bonne nature de lien, en pensant « toujours » ou « parfois ».", ucBuild('bts-b1-a4', { tag: tg('uc', 2), hints: ['Quel cas a lieu à chaque fois ? Lequel est facultatif ?'] })),
      st("Passons à l'enchaînement des actions : suis la procédure de diagnostic.", exploreAct('bts-b1-a5'), { w: "diagramme d'activité", def: "un rectangle arrondi est une <b>action</b>, le losange un <b>choix</b> (chaque flèche qui en sort porte une condition entre crochets), le disque plein le début, le disque cerclé la fin." }),
      st("Tu as parcouru la procédure : lis-la maintenant sans aide et réponds à la question.", actRead('bts-b1-a6', { tag: tg('act', 1) })),
      st("Complète les conditions des deux branches en te rappelant ce que tu viens de parcourir : qu'est-ce qui déclenche chaque branche ?", actFill('bts-b1-a7', { tag: tg('act', 2), hints: ["Que se passe-t-il si l'annuaire répond ?"] })),
      st("À toi de construire : place les éléments dans l'ordre et relie-les par des flux de contrôle (début, actions, fin).", actBuild('bts-b1-a8', { tag: tg('act', 2) })),
    ]),
    guided({
      id: 'bts-b2', n: 'B2', title: 'Mission : relier le besoin aux composants et aux tests', level: 3,
      objectives: ["Construire un diagramme d'exigences", 'Dériver une exigence', 'Repérer une exigence non vérifiée'],
      prereq: ['B1'], success: 'Les sept étapes réussies.',
      pourquoi: "Les exigences relient le besoin du client à l'architecture et aux tests : la traçabilité est la raison d'être du diagramme.",
      situation: "Tu vérifies que chaque attente de NovaTech est tenue par un composant et contrôlée par un test.",
    }, [
      st("Voici les exigences. <b>Clique celle qui impose une durée.</b>", one('bts-b2-a1', reqAuth(), 'Exigence qui impose une durée', ['ex2'], 'EX-02 : moins de 3 secondes.', { ex1: "EX-01 est une règle d'architecture.", ex3: 'EX-03 concerne les comptes.' }, { tag: tg('req', 1) }), { w: 'exigence', def: "une promesse mesurable que le système doit tenir ; elle se cite par son identifiant." }),
      st("Observe le rôle des tests : supprime-en deux à tour de rôle et lis ce qui arrive à l'exigence correspondante.", exploreReq('bts-b2-a2')),
      st("Tu sais maintenant qui tient une exigence et qui la contrôle. Complète les deux liens manquants en choisissant le bon nom de flèche.", reqFill('bts-b2-a3', { tag: tg('req', 2), hints: ['satisfy : composant vers exigence. verify : test vers exigence.'] }), { w: 'satisfy / verify', def: "<b>satisfy</b> : du composant vers l'exigence qu'il tient. <b>verify</b> : du test vers l'exigence qu'il contrôle." }),
      st("À toi de construire : place les éléments puis relie-les avec la bonne nature de lien. Chaque flèche a un sens précis.", reqBuild('bts-b2-a4', { tag: tg('req', 3), hints: ['Relie chaque élément à EX-02.'] })),
      st("Une nouvelle exigence découle d'une autre : le service doit rester disponible, donc l'annuaire doit être répliqué.", reqDerive('bts-b2-a5', { tag: tg('req', 3), hints: ['La flèche part de l\'exigence qui découle.'] }), { w: 'deriveReqt', def: "la flèche de l'exigence <b>dérivée</b> vers l'exigence dont elle découle." }),
      st("Contrôle de traçabilité : quelle exigence n'a plus de test ?", reqCoverage('bts-b2-a6', { tag: tg('req', 3) }, 't1')),
    ]),
    guided({
      id: 'bts-b3', n: 'B3', title: 'Mission : le vocabulaire du service', level: 3,
      objectives: ['Construire un BDD avec composition et généralisation'],
      prereq: ['B2'], success: 'Les cinq étapes réussies.',
      pourquoi: "Le BDD fixe le vocabulaire de l'architecture : de quoi est fait le système et quelles familles de composants existent.",
      situation: "Tu fixes le vocabulaire commun : les types de composants et leurs relations.",
    }, [
      st("Teste deux idées pour comprendre ce qui fait partie du service.", exploreBdd('bts-b3-a1'), { w: 'composition', def: "« fait partie de » : losange plein du côté du tout." }),
      st("Tu viens de voir ce qui fait partie du service. Mets-le en pratique : coche toutes les phrases vraies sur ce schéma.", bddRead('bts-b3-a2', { tag: tg('bdd', 1) })),
      st("À toi de construire : place les blocs, puis relie-les avec la bonne relation. Pense au sens du losange.", bddBuild('bts-b3-a3', { tag: tg('bdd', 2), hints: ['Le losange est du côté du tout.'] })),
      st("Un serveur d'authentification <b>est une sorte de</b> serveur : relation différente de « fait partie de ». Construis-la.", bddGen('bts-b3-a4', { tag: tg('bdd', 3), hints: ['Le triangle pointe vers le général.'] }), { w: 'généralisation', def: "« est une sorte de » : triangle vide pointant vers le bloc le plus général." }),
    ]),
    guided({
      id: 'bts-b4', n: 'B4', title: 'Mission : câbler le modèle', level: 3,
      objectives: ['Lire et construire un IBD', 'Identifier ce qui ne doit pas être relié'],
      prereq: ['B3'], success: 'Les cinq étapes réussies.',
      pourquoi: "L'IBD dit comment l'architecture est réellement reliée : c'est la vue qui sert à installer et à dépanner.",
      situation: `Tu décris les liaisons réelles du site ${v.site}.`,
    }, [
      st("Voici le schéma des liaisons du site. Repère d'abord les éléments : <b>clique le poste de travail</b>.", one('bts-b4-a1', ibdAuth(v), 'Le poste de travail', ['poste'], 'Le poste est une partie du système.', {}, { tag: tg('ibd', 1) }), { w: 'partie / connecteur', def: "une <b>partie</b> est un exemplaire d'un bloc ; un <b>connecteur</b> relie deux parties qui échangent, son nom dit ce qui circule. Un <b>port SysML</b> est un point d'interaction : à ne pas confondre avec un port TCP." }),
      st("Avant de jouer la scène, <b>prédis</b> ce qui va se passer, puis justifie. Une bonne réponse sans la bonne raison ne compte pas.", predict('bts-b4-a2', v)),
      st("Vérifie ta prédiction : joue les trois situations et compare avec ce que tu avais prévu.", exploreIbd('bts-b4-a3', v)),
      st("Suis maintenant le chemin d'une demande, élément par élément, en cliquant dans l'ordre. Appuie-toi sur les connecteurs.", ibdTrace('bts-b4-a4', { tag: tg('ibd', 2), hints: ['Suis les connecteurs.'] }, v)),
      st("À toi de construire : place les parties et relie-les par des connecteurs. Attention : ajouter un lien qui n'existe pas fausse le modèle.", ibdForbid(ibdBuild('bts-b4-a5', { tag: tg('ibd', 3), hints: ['Aucun lien direct poste - annuaire.'] }))),
    ]),
    guided({
      id: 'bts-b5', n: 'B5', title: 'Mission : prouver que l\'échange est possible', level: 3,
      objectives: ['Construire une séquence', 'Lire un choix (alt)'],
      prereq: ['B4'], success: 'Les cinq étapes réussies.',
      pourquoi: "La séquence prouve que l'architecture permet réellement l'échange attendu, y compris dans les cas d'échec.",
      situation: "Tu vérifies que le modèle permet bien une ouverture de session, réussie ou refusée.",
    }, [
      st("Commence par lire l'échange normal : clique les messages dans l'ordre, de haut en bas, et lis ce que chacun fait.", exploreSeq('bts-b5-a1'), { w: 'séquence', def: "échange dans le temps, de haut en bas ; une flèche pleine est un appel, une flèche en pointillés un retour, une flèche qui boucle un traitement interne." }),
      st("Tu sais lire le déroulé. Sélectionne une consigne, puis clique l'élément correspondant dans le dessin.", seqIdentify('bts-b5-a2', { tag: tg('seq', 1) })),
      st("Un message a disparu du dessin. Raisonne sur ce que doit renvoyer l'annuaire pour retrouver ce message.", seqFill('bts-b5-a3', { tag: tg('seq', 2) })),
      st("À toi de construire : ajoute les messages un par un, dans l'ordre, en choisissant qui envoie, qui reçoit et le nom du message.", seqBuild('bts-b5-a4', { tag: tg('seq', 3), hints: ['Qui déclenche ?', 'Une réponse suit sa demande.'] })),
      st("Et quand le mot de passe est faux ? Un cadre « alt » encadre des branches exclusives.", seqAlt('bts-b5-a5', { tag: tg('seq', 3) }), { w: 'alt', def: "un fragment qui encadre des branches exclusives, chacune avec sa condition de garde." }),
    ]),
    guided({
      id: 'bts-b6', n: 'B6', title: 'Mission : relire et corriger le modèle', level: 3,
      objectives: ['Vérifier la cohérence entre diagrammes', "Mettre à jour le modèle après une évolution"],
      prereq: ['B5'], success: 'Les trois étapes réussies.',
      pourquoi: "Un modèle utile reste cohérent et à jour : c'est la compétence qui fait la différence en entreprise.",
      situation: "Un collègue te transmet son modèle pour relecture.",
    }, [
      st("Relis le modèle d'un collègue : compare ces deux diagrammes qui décrivent le même système. <b>Que fais-tu</b> quand ils se contredisent ?", coherence('bts-b6-a1', { tag: tg('ibd', 3) })),
      st("Contrôle croisé : un message doit passer par un lien qui existe.", quiz('bts-b6-a2', "Un message « recherche du compte » part du poste vers l'annuaire. Que contrôles-tu ?", [Y("L'IBD : il n'existe pas de connecteur poste - annuaire", "Un message suppose un connecteur entre les deux parties."), N("Rien : la séquence fait foi", "La séquence doit rester compatible avec l'IBD.")], { diagrams: [ibdAuth(v)], tag: tg('seq', 3) })),
      st("Dernier contrôle de relecture : une exigence n'a plus de test. Raisonne sur les flèches « verify » pour la retrouver.", reqCoverage('bts-b6-a3', { tag: tg('req', 3) }, 't3')),
    ]),
    guided({
      id: 'bts-b7', n: 'B7', title: 'Ouverture : états et paquetages', level: 1, optional: true,
      objectives: ["Lire un diagramme d'états et un diagramme de paquetages"],
      prereq: ['B0'], success: 'Les trois étapes réussies.',
      pourquoi: "Ces diagrammes complètent la vue : le cycle de vie d'un service et l'organisation du modèle.",
      situation: "Tu découvres deux diagrammes complémentaires.",
    }, [
      st("Un diagramme d'états décrit la vie d'un service. Fais-le vivre : déclenche les deux événements et lis ce qui change.", exploreStm('bts-b7-a1'), { w: 'état / transition', def: "un <b>état</b> est une situation durable ; une <b>transition</b> la fait changer, déclenchée par un événement." }),
      st("À toi de lire sans aide : regarde les événements écrits sur les flèches et réponds.", quiz('bts-b7-a2', "Quel événement fait passer le service de « En service » à « Dégradé » ?", [Y("annuaire injoignable", 'La transition porte cet événement.'), N("démarrer", "démarrer fait passer de Arrêté à Démarrage.")], { diagrams: [stmService()], tag: tg('stm', 1) })),
      st("Deuxième diagramme de l'ouverture : le diagramme de paquetages. Lis les flèches pour savoir qui s'appuie sur qui.", quiz('bts-b7-a3', "De quoi dépend Authentification ?", [Y("Annuaire et Réseau", 'Deux flèches de dépendance partent de Authentification.'), N("Supervision", "C'est Supervision qui dépend d'Authentification.")], { diagrams: [pkgNova()], tag: tg('pkg', 1) }), { w: 'paquetage', def: "un dossier qui regroupe des éléments du modèle ; une flèche en pointillés dit qui s'appuie sur qui." }),
    ]),
    guided({
      id: 'bts-b8', n: 'B8', title: 'Étude de cas : démarche complète', level: 4, optional: true,
      objectives: ['Conduire une démarche de modélisation du besoin à la vérification'],
      prereq: ['B6'], success: 'Démarche ordonnée et justifiée.',
      pourquoi: "Savoir pourquoi on modélise dans cet ordre est la maîtrise méthodologique.",
      situation: "NovaTech veut ajouter un second annuaire pour tenir la disponibilité.",
    }, [
      st("Avant de dessiner quoi que ce soit : <b>par quoi commence-t-on</b> ?", quiz('bts-b8-a1', 'Par quoi commence la démarche ?', [Y("Par l'attente à tenir (la disponibilité)", "Sans exigence, on ne sait pas ce que l'architecture doit garantir."), N("Par le dessin des liaisons", "On ne relie rien tant qu'on ne sait pas ce qu'il faut garantir.")], { tag: tg('req', 4) })),
      st("Tu as compris le point de départ. Remets maintenant toutes les étapes de la démarche dans l'ordre, en justifiant chaque passage.", {
        id: 'bts-b8-a2', type: 'order', prompt: "Ordonne la démarche de modélisation.", tag: tg('req', 4),
        items: ["Formuler l'exigence de disponibilité", "Décrire les blocs du service", "Relier les parties dans l'IBD", "Décrire l'échange en cas de panne", "Contrôler la cohérence et la couverture par des tests"],
        reasons: ["Sans exigence, on ne sait pas ce que l'architecture doit garantir.", "Il faut connaître les blocs avant de les relier.", "Les liens doivent exister avant de décrire les échanges.", "La cohérence se contrôle une fois tous les diagrammes écrits."],
        start: [3, 0, 4, 2, 1],
      }),
    ]),
    {
      id: 'bts-b9', n: 'B9', title: 'Évaluation finale', level: 3, exam: true,
      objectives: ['Mobiliser le parcours sur un cas nouveau'],
      prereq: ['B1 à B6 travaillés'], success: 'Score sur 20 ; correction détaillée à la fin.',
      pourquoi: "Vérifier que tu sais lire, construire et contrôler un modèle cohérent, seul.",
      cours: ['Une seule tentative par question, sans indice.'],
      situation: `Site ${v.site} : ${v.pc} (${v.ipPc}), ${v.auth} (${v.ipAuth}), ${v.dir} (${v.ipDir}).`,
      activities: [
        reqCoverage('bts-b9-a1', { tag: tg('req', 3), crit: 'b1', weight: 2 }, missing),
        reqBuild('bts-b9-a2', { tag: tg('req', 3), crit: 'b1', weight: 2 }),
        ibdForbid(ibdBuild('bts-b9-a3', { tag: tg('ibd', 3), crit: 'b2', weight: 5 })),
        seqBuild('bts-b9-a4', { tag: tg('seq', 3), crit: 'b3', weight: 4 }),
        coherence('bts-b9-a5', { tag: tg('ibd', 3), crit: 'b4', weight: 4 }),
        notation('bts-b9-a6', { crit: 'b5', weight: 3 }),
      ],
    },
  ];
  void s; void seqOrder;
  return {
    id: 'bts', name: 'BTS SIO SISR', levelLabel: 'Niveaux 1 à 3 (4 optionnel)', target: 3,
    orient: 'Lire, produire et vérifier la cohérence des diagrammes d\'une infrastructure.',
    situation: "Tu es technicien supérieur chez NovaTech : tu documentes et fais évoluer le modèle de l'infrastructure.",
    statut: 'Niveaux visés : choix pédagogique.',
    cases: [
      { d: 'uc', level: 1 }, { d: 'uc', level: 2 }, { d: 'act', level: 1 }, { d: 'act', level: 2 },
      { d: 'req', level: 1 }, { d: 'req', level: 2 }, { d: 'req', level: 3 },
      { d: 'bdd', level: 1 }, { d: 'bdd', level: 2 }, { d: 'bdd', level: 3 },
      { d: 'ibd', level: 1 }, { d: 'ibd', level: 2 }, { d: 'ibd', level: 3 },
      { d: 'seq', level: 1 }, { d: 'seq', level: 2 }, { d: 'seq', level: 3 },
      { d: 'stm', level: 1, optional: true }, { d: 'pkg', level: 1, optional: true },
    ],
    grille: [
      { id: 'b1', label: 'Exigences', pts: 4 }, { id: 'b2', label: 'Architecture et interfaces', pts: 5 },
      { id: 'b3', label: 'Échanges', pts: 4 }, { id: 'b4', label: 'Cohérence entre diagrammes', pts: 4 }, { id: 'b5', label: 'Notation', pts: 3 },
    ],
    modules,
  };
}
