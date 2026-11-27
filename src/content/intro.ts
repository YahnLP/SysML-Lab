import type { BuildAct, ExploreAct, GraphDiagram, Module } from '../types';
import { actDiag, bddAuth, ibdAuth, multi, netSite, pkgNova, quiz, reqAuth, seqAuthAlt, stmService, ucAuth, N, Y } from './common';
import { guided, one, st } from './steps';

const anatomy = (): ExploreAct => ({
  id: 'intro-a3', type: 'explore', prompt: 'Explore le dessin : clique chaque bouton pour voir de quoi est fait un diagramme SysML.', diagram: bddAuth(), required: ['cadre', 'rect', 'trait', 'losange'],
  actions: [
    { id: 'cadre', label: "L'étiquette en haut à gauche", result: "Elle dit <b>quel type de diagramme</b> on regarde (ici « bdd », le diagramme des composants) et son nom. C'est toujours par là qu'on commence à lire." },
    { id: 'rect', label: 'Un rectangle', hl: ['srv'], result: "Un rectangle représente <b>un élément du système</b>. Son nom est en gras ; ce qui est écrit dessous le décrit (ici une valeur : « nom : String »)." },
    { id: 'trait', label: 'Un trait simple', hl: ['sys>poste'], result: "Un trait est une <b>relation</b> entre deux éléments : ils sont liés. Sa forme (trait plein, pointillés) et son extrémité disent de quelle nature est le lien." },
    { id: 'losange', label: 'Un losange au bout du trait', hl: ['sys>srv', 'sys>dir'], result: "L'extrémité précise le lien. Un <b>losange plein</b> signifie « fait partie de » : il est collé du côté du tout. Chaque extrémité a son sens : c'est ce qui fait de SysML un vrai langage." },
  ],
});


/** Bestiaire : une forme par famille d'élément, pour apprendre à quoi sert chacune avant de dessiner. */
export const catalogue = (): GraphDiagram => ({
  kind: 'pkg', name: 'Les formes de SysML', pkg: 'Model',
  nodes: [
    { id: 'block', k: 'block', label: 'ServeurAuthentification', c: 0, r: 0 },
    { id: 'part', k: 'part', label: 'serveurAuth', sub: 'ServeurAuthentification', c: 1.5, r: 0 },
    { id: 'req', k: 'req', label: 'EX-02', sub: 'Ouverture en moins de 3 secondes.', c: 3, r: 0 },
    { id: 'test', k: 'test', label: 'T-02', sub: '10 ouvertures chronométrées', c: 0, r: 1.2 },
    { id: 'actor', k: 'actor', label: 'Utilisateur', c: 1.5, r: 1.2 },
    { id: 'usecase', k: 'usecase', label: 'Ouvrir une session', c: 3, r: 1.2 },
    { id: 'action', k: 'action', label: 'Lire le journal', c: 0, r: 2.4 },
    { id: 'state', k: 'state', label: 'En service', c: 1.5, r: 2.4 },
    { id: 'package', k: 'package', label: 'Authentification', c: 3, r: 2.4 },
    { id: 'device', k: 'device', label: 'SRV-AUTH01', sub: '192.168.10.10', c: 1.5, r: 3.6 },
  ],
  edges: [],
});
const FORMS: { id: string; label: string; fn: string }[] = [
  { id: 'block', label: 'Un bloc', fn: "La <b>fiche d'un type</b> de composant (« tous les serveurs d'authentification sont faits ainsi »). Sert à décrire de quoi le système est fait. On le trouve dans les diagrammes de blocs." },
  { id: 'part', label: 'Une partie', fn: "Un <b>exemplaire réel</b> d'un bloc, placé dans le système (nom : Type). Sert à montrer qui est relié à qui. On la trouve dans les diagrammes de blocs internes." },
  { id: 'req', label: 'Une exigence', fn: "Une <b>promesse</b> faite au client, courte et vérifiable. Sert à dire ce que le système doit tenir. On la trouve dans les diagrammes d'exigences." },
  { id: 'test', label: 'Un test', fn: "Un <b>contrôle</b> qui prouve qu'une exigence est tenue. Sert à vérifier. On le trouve dans les diagrammes d'exigences." },
  { id: 'actor', label: 'Un acteur', fn: "Une <b>personne ou un système extérieur</b> qui utilise le système. Sert à dire qui est concerné. Il se dessine hors du cadre du système." },
  { id: 'usecase', label: 'Un cas d\'utilisation', fn: "Un <b>usage</b> du système, du point de vue de l'acteur (« ouvrir une session »). Sert à lister ce que le système rend comme service." },
  { id: 'action', label: 'Une action', fn: "Une <b>étape</b> d'une procédure. Sert à décrire un enchaînement, par exemple un diagnostic. On la trouve dans les diagrammes d'activité." },
  { id: 'state', label: 'Un état', fn: "Une <b>situation durable</b> d'un élément (arrêté, en service, dégradé). Sert à décrire sa vie. On le trouve dans les diagrammes d'états." },
  { id: 'package', label: 'Un paquetage', fn: "Un <b>dossier</b> qui regroupe des éléments du modèle. Sert à organiser un gros modèle." },
  { id: 'device', label: 'Un équipement réseau', fn: "Une <b>machine réelle</b> avec son nom et son adresse. Il appartient au schéma réseau, pas à SysML : on ne le mélange pas." },
];
const formsExplore = (): ExploreAct => ({
  id: 'intro-a3b', type: 'explore', prompt: 'Chaque forme a une fonction. Clique chaque bouton : la forme correspondante s\'allume et on t\'explique à quoi elle sert.', diagram: catalogue(),
  required: ['block', 'part', 'req', 'test', 'actor', 'usecase', 'action'],
  actions: FORMS.map((f) => ({ id: f.id, label: f.label, hl: [f.id], result: f.fn })),
});
const formsMatch = () => ({
  id: 'intro-a3c', type: 'match' as const, prompt: 'Associe chaque besoin à la forme qu\'on dessinerait.', diagram: undefined,
  choices: ['un bloc', 'une partie', 'une exigence', 'un test', 'un acteur', 'une action'],
  pairs: [
    { l: 'Décrire le type « serveur d\'authentification »', a: 'un bloc', why: 'Le type se décrit par un bloc (la fiche).' },
    { l: "Montrer le serveur réel branché au poste de Lina", a: 'une partie', why: "Un exemplaire réel, placé dans le système, est une partie." },
    { l: 'Écrire que l\'ouverture doit durer moins de 3 secondes', a: 'une exigence', why: 'Une promesse mesurable est une exigence.' },
    { l: 'Prouver par 10 mesures que cette durée est tenue', a: 'un test', why: 'Un contrôle qui prouve est un test.' },
    { l: "Représenter l'administrateur qui gère les comptes", a: 'un acteur', why: 'Une personne extérieure au système est un acteur.' },
    { l: 'Décrire « lire le journal » dans une procédure de diagnostic', a: 'une action', why: 'Une étape de procédure est une action.' },
  ],
});
const linksMatch = () => ({
  id: 'intro-a3d', type: 'match' as const, prompt: 'Les formes sont reliées par des traits dont l\'extrémité a un sens. Associe chaque trait à sa signification.', diagram: undefined,
  choices: ['fait partie de', 'est une sorte de', 'tient la promesse (exigence)', 'contrôle la promesse (exigence)', 'est relié à'],
  pairs: [
    { l: 'Losange plein du côté du tout', a: 'fait partie de', why: 'La composition : le tout porte le losange.' },
    { l: 'Triangle vide vers le bloc général', a: 'est une sorte de', why: 'La généralisation : un cas particulier pointe vers le général.' },
    { l: 'Flèche pointillée « satisfy » du composant vers l\'exigence', a: 'tient la promesse (exigence)', why: 'satisfy relie un composant à l\'exigence qu\'il tient.' },
    { l: 'Flèche pointillée « verify » du test vers l\'exigence', a: 'contrôle la promesse (exigence)', why: 'verify relie un test à l\'exigence qu\'il contrôle.' },
    { l: 'Simple trait entre deux blocs', a: 'est relié à', why: "L'association dit seulement que deux blocs sont liés." },
  ],
});

const firstDrawing = (): BuildAct => ({
  id: 'intro-a4', type: 'build', kind: 'bdd', name: 'Premier dessin', pkg: 'Package',
  prompt: "Dessine ce qui est décrit : le service OuvertureDeSession est composé d'un serveur d'authentification ; un poste de travail utilise le service (sans en faire partie).",
  palette: [
    { id: 'sys', k: 'block', label: 'OuvertureDeSession', c: 1, r: 0 },
    { id: 'srv', k: 'block', label: 'ServeurAuthentification', c: 0, r: 1 },
    { id: 'poste', k: 'block', label: 'PosteDeTravail', c: 2, r: 1 },
    { id: 'imp', k: 'block', label: 'Imprimante', c: 3, r: 0, distractor: "L'imprimante n'est pas citée dans la description : on ne dessine que ce qui est décrit." },
  ],
  kinds: [{ v: 'comp', t: 'losange plein (fait partie de)' }, { v: 'assoc', t: 'trait simple (utilise)' }, { v: 'gen', t: 'triangle vide (est une sorte de)' }],
  target: { nodes: ['sys', 'srv', 'poste'], edges: [{ from: 'sys', to: 'srv', k: 'comp' }, { from: 'sys', to: 'poste', k: 'assoc' }] },
  kindWhy: {
    'sys>srv:assoc': "Le serveur fait partie du service : il faut le losange plein, pas un trait simple.",
    'sys>srv:gen': "Le serveur n'est pas « une sorte de » service : il en fait partie.",
    'sys>poste:comp': "Le poste utilise le service sans en faire partie : trait simple.",
    'sys>poste:gen': "Le poste n'est pas « une sorte de » service.",
  },
  hints: ['Le serveur fait-il partie du service ? Et le poste ?', 'Le losange se place du côté du tout.'],
});

export function intro(): Module {
  return guided({
    id: 'intro', n: 'A', title: 'À quoi sert SysML, et comment on dessine', level: 1,
    objectives: ["Comprendre à quoi sert SysML dans un métier de l'informatique", 'Connaître les formes de base de SysML et leur fonction : bloc, partie, exigence, test, acteur…', 'Savoir lire et tracer un lien avec la bonne extrémité', 'Savoir quel diagramme répond à quelle question'],
    prereq: ['Aucun : commence ici'],
    success: 'Les neuf étapes réussies. Ensuite, choisis ton parcours.',
    pourquoi: "Avant de manipuler des diagrammes, il faut savoir pourquoi les professionnels s'en servent et comment ils se lisent. Dix minutes pour tout comprendre.",
    situation: "Tu rejoins l'équipe informatique de NovaTech, une entreprise de quatre sites. On te laisse un dossier technique en te disant : « tout est dans les diagrammes ».",
  }, [
    st("Voici comment un collègue t'explique l'ouverture de session : « Le poste envoie les identifiants au serveur d'authentification, qui interroge l'annuaire, lequel renvoie le compte ; le serveur compare alors le mot de passe puis répond au poste. » <b>Défi : sur le dessin ci-dessous, clique l'élément qui parle à l'annuaire.</b> Combien de temps as-tu mis, comparé à la lecture du texte ?", one('intro-a1', ibdAuth(), "L'élément qui parle à l'annuaire", ['auth'], "Le connecteur relie l'annuaire au serveur d'authentification, et à lui seul. Sur le dessin, on le voit en un coup d'œil.", { poste: "Le poste est relié au serveur, pas à l'annuaire.", dir: "C'est l'annuaire lui-même : cherche celui qui lui parle." }),
      { w: 'SysML', def: "un langage de <b>dessin</b> normalisé pour décrire un système (ce qu'il contient, comment c'est relié, ce qu'il doit faire, ce qui se passe dans le temps). Comme une notation en musique, il se lit pareil pour tout le monde." }),
    st("Un dessin se lit plus vite qu'un texte, et surtout <b>il est compris de la même façon par tous</b> : le technicien, le client, le collègue qui reprend le dossier. Réfléchis à ton futur métier.", multi('intro-a2', 'À quoi te servira de savoir lire un diagramme SysML ? (plusieurs réponses)', [
      Y("Comprendre un dossier laissé par quelqu'un d'autre", "Le dossier technique contient des diagrammes : les lire évite de tout redécouvrir."),
      Y("Trouver d'où vient une panne : qui dépend de qui", "Les liens montrent comment une panne se propage."),
      Y("Expliquer une installation à un collègue ou au client", "Un dessin commun évite les malentendus."),
      N('Remplacer le schéma réseau', "SysML ne remplace pas le schéma réseau : il le complète en disant ce que fait chaque élément."),
      N("Configurer les machines automatiquement", "Un diagramme décrit et explique ; il ne configure rien tout seul."),
    ]), undefined, "SysML ne remplace pas tes autres documents (schéma réseau, plan d'adressage) : il apporte ce qu'ils ne disent pas, le <b>rôle</b> de chaque élément."),
    st("Comment se dessine un diagramme ? Quelques règles seulement, toujours les mêmes. <b>Clique chaque bouton</b> pour découvrir les quatre éléments de base.", anatomy(), { w: 'notation', def: "l'ensemble des règles de dessin : chaque forme et chaque extrémité de trait a un sens précis. Apprendre la notation, c'est apprendre à lire et à écrire." }),
    st("Il existe plusieurs sortes de formes, chacune avec sa fonction : en connaître la liste, c'est savoir ce qu'on peut dire avec SysML. <b>Clique chaque bouton</b> : la forme s'allume et tu découvres à quoi elle sert.", formsExplore(), { w: 'famille d\'éléments', def: "chaque forme (bloc, partie, exigence, test, acteur, action, état…) a un rôle précis. Choisir la bonne forme, c'est dire la bonne chose." }),
    st("Vérifie que tu relies bien chaque besoin à la bonne forme.", formsMatch()),
    st("Les traits aussi ont des sortes : l'extrémité change le sens. Associe chaque trait à sa signification.", linksMatch(), undefined, "Forme et trait : tu as maintenant tout le vocabulaire de base. Le reste du parcours consiste à le lire dans de vrais diagrammes."),
    st("À ton tour de dessiner. Lis la description, place les éléments, puis choisis la nature de chaque lien : <b>un lien mal choisi change le sens du dessin</b>.", firstDrawing(), undefined, "Tu viens de faire ce que fait un technicien qui documente un système : traduire une description en dessin, avec les bons symboles."),
    st("Un système se décrit sous plusieurs angles, donc avec plusieurs diagrammes. Chacun répond à une question. Associe-les pour savoir lequel ouvrir.", { id: 'intro-a5', type: 'match', prompt: 'Quel diagramme répond à chaque question ?', choices: ['exigences', 'blocs', 'blocs internes', 'séquence'], pairs: [
      { l: 'Que doit garantir le service ?', a: 'exigences', why: 'Le diagramme des exigences liste les promesses faites au client.' },
      { l: 'De quoi le service est-il fait ?', a: 'blocs', why: 'Le diagramme de blocs décrit les types de composants et ce qui fait partie de quoi.' },
      { l: 'Qui est relié à qui ?', a: 'blocs internes', why: 'Le diagramme de blocs internes montre les éléments réels et leurs liens.' },
      { l: 'Dans quel ordre échangent-ils ?', a: 'séquence', why: 'Le diagramme de séquence se lit de haut en bas, dans l\'ordre du temps.' },
    ] }, { w: 'diagramme', def: "une vue du système répondant à une question précise. Tous les diagrammes du même système doivent rester cohérents entre eux." }),
    st("Dernier réflexe : par où commence-t-on la lecture d'un diagramme ?", quiz('intro-a6', "Tu ouvres un diagramme que tu ne connais pas. Par quoi commences-tu ?", [
      Y("Par l'étiquette en haut à gauche : le type et le nom du diagramme", "Elle dit quelle question le diagramme traite : on sait alors comment lire le reste."),
      N("Par la flèche la plus longue", "La longueur d'un trait ne veut rien dire."),
      N("Par le rectangle le plus gros", "La taille d'un rectangle n'a pas de sens particulier."),
    ]), undefined, "Tu sais maintenant à quoi sert SysML et comment il se lit. Choisis ton parcours : chaque mission te fera manipuler un diagramme avant de le nommer."),
  ]);
}

/* ---------------- aide-mémoire de notation ---------------- */
export interface LegendItem { title: string; diagram: GraphDiagram | import('../types').SeqDiagram; points: string[] }
const gen = (): GraphDiagram => ({ kind: 'bdd', name: 'Equipements', pkg: 'Package', nodes: [
  { id: 'srv', k: 'block', label: 'Serveur', c: 1, r: 0 }, { id: 'a', k: 'block', label: 'ServeurAuthentification', c: 0, r: 1 }, { id: 'd', k: 'block', label: 'ServeurAnnuaire', c: 2, r: 1 },
], edges: [{ from: 'a', to: 'srv', k: 'gen' }, { from: 'd', to: 'srv', k: 'gen' }] });
export const LEGEND: LegendItem[] = [
  { title: 'Les formes et leur fonction', diagram: catalogue(), points: FORMS.map((f) => `<b>${f.label}</b> : ${f.fn}`) },
  { title: 'Blocs (BDD)', diagram: bddAuth(), points: ["Rectangle : un <b>type</b> de composant", "Losange plein du côté du tout : « fait partie de » (composition)", "Trait simple : « est relié à » (association)"] },
  { title: 'Généralisation', diagram: gen(), points: ["Triangle vide pointant vers le bloc général : « est une sorte de »"] },
  { title: 'Blocs internes (IBD)', diagram: ibdAuth(), points: ["Rectangle « nom : Type » : une <b>partie</b>, exemplaire d'un bloc", "Trait entre deux parties : connecteur, son nom dit ce qui circule", "Pas de trait direct : pas d'échange direct"] },
  { title: 'Exigences (REQ)', diagram: reqAuth(), points: ["⊕ côté de l'exigence qui en contient d'autres", "<b>satisfy</b> : du composant vers l'exigence qu'il tient", "<b>verify</b> : du test vers l'exigence qu'il contrôle", "<b>deriveReqt</b> : de l'exigence dérivée vers sa source"] },
  { title: 'Séquence (SEQ)', diagram: seqAuthAlt(), points: ["Trait vertical : ligne de vie d'un participant", "Flèche pleine : appel ; flèche en pointillés : retour", "Flèche qui boucle : traitement interne", "Cadre « alt » : branches exclusives, chacune avec sa condition"] },
  { title: "Cas d'utilisation (UC)", diagram: ucAuth(), points: ["Personnage : acteur, hors du cadre", "Ovale : cas d'utilisation, dans le cadre", "<b>include</b> : toujours exécuté ; <b>extend</b> : facultatif (flèche du cas qui étend vers le cas de base)"] },
  { title: 'Activité (ACT)', diagram: actDiag(), points: ["Disque plein : début ; disque cerclé : fin", "Rectangle arrondi : action ; losange : choix avec conditions entre crochets"] },
  { title: 'États (STM)', diagram: stmService(), points: ["Rectangle arrondi : état ; flèche : transition déclenchée par un événement"] },
  { title: 'Paquetages (PKG)', diagram: pkgNova(), points: ["Dossier : regroupe des éléments ; flèche en pointillés : dépendance (qui s'appuie sur qui)"] },
  { title: 'Rappel : le schéma réseau', diagram: netSite(), points: ["Le schéma réseau reste le document des adresses et du câblage : SysML ne le remplace pas."] },
];
