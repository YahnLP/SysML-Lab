import type { Module, Parcours } from '../types';
import { V0, bddAuth, ibdAuth, multi, quiz, reqAuth, tg, N, Y, type Vars, permutation, hashString } from './common';
import { exploreBdd, exploreIbd, exploreReq, exploreSeq, guided, justifyOrder, netOne, one, pairDoc, predict, st, whyQuiz } from './steps';
import { bddFill, bddQuiz, bddRead, ibdFill, ibdIdentify, ibdTrace, reqCoverage, reqFill, seqFill, seqIdentify, seqOrder } from './lib';

export function ciel(v: Vars = V0, seed = 0): Parcours {
  const s = seed || 0;
  const modules: Module[] = [
    guided({
      id: 'ciel-c0', n: 'C0', title: 'Mission : le poste qui ne se connecte plus', level: 1,
      objectives: ["Comprendre à quoi sert un diagramme SysML dans un dossier technique", "Savoir quel document ouvrir pour quelle question"],
      prereq: ['Aucun : tout est expliqué en route'],
      success: 'Les trois étapes réussies.',
      pourquoi: "Un technicien ne devine pas : il ouvre le dossier technique. Ici, tu vas voir pourquoi un seul dessin ne suffit pas.",
      situation: `Lundi matin, Lina travaille au site ${v.site}. Elle n'arrive plus à ouvrir sa session sur ${v.pc}.`,
    }, [
      st(`Le technicien ouvre le dossier technique. Première page : un dessin des machines du site. <b>Clique le poste de Lina, ${v.pc}.</b>`, netOne('ciel-c0-a1', v), { w: 'schéma réseau', def: 'le dessin qui montre où sont les machines et comment elles sont branchées.' }),
      st("Le technicien teste : le poste joint bien le serveur. Pourtant Lina reste bloquée. Réfléchis à ce que le dessin précédent <b>ne te dit pas</b>.", whyQuiz('ciel-c0-a2', v), { w: 'diagramme SysML', def: "un dessin qui décrit <b>ce que fait chaque élément</b> et comment les éléments travaillent ensemble. SysML est le nom de ce langage de dessin." }),
      st("Dernier réflexe de technicien : savoir quel document ouvrir selon la question posée.", pairDoc('ciel-c0-a3', v)),
    ]),
    guided({
      id: 'ciel-c1', n: 'C1', title: 'Mission : ce que le client attend', level: 2,
      objectives: ['Lire une promesse faite au client et son numéro', 'Savoir qui la tient et qui la contrôle', 'Compléter les liens manquants'],
      prereq: ['C0'],
      success: 'Les sept étapes réussies.',
      pourquoi: "Avant de construire quoi que ce soit, NovaTech a écrit ce qu'elle attend. Si personne ne contrôle une attente, on ne sait pas si elle est tenue.",
      situation: "NovaTech a rédigé ses attentes pour l'ouverture de session. Tu les lis comme le ferait un technicien avant d'intervenir.",
    }, [
      st("Voici les phrases écrites par NovaTech. <b>Clique celle qui impose une durée maximale.</b>", one('ciel-c1-a1', reqAuth(), 'La phrase qui impose une durée maximale', ['ex2'], 'EX-02 fixe une limite chiffrée : moins de 3 secondes.', { ex1: 'EX-01 parle de qui authentifie les postes, pas d\'une durée.', ex3: 'EX-03 parle de la conservation des comptes.' }, { tag: tg('req', 1), hints: ['Cherche un chiffre.', 'Pense à « secondes ».'] }), { w: 'exigence', def: "une promesse que le système doit tenir. Elle porte un numéro (EX-02) pour qu'on puisse la citer sans la recopier." }),
      st("Une bonne promesse doit pouvoir être vérifiée par un « oui » ou un « non ». Compare deux façons d'écrire la même attente.", quiz('ciel-c1-a2', 'Laquelle de ces deux exigences peut-on vérifier ?', [
        N("« L'ouverture de session doit être rapide »", "« Rapide » n'est pas mesurable : chacun a sa propre idée."),
        Y("« L'ouverture de session aboutit en moins de 3 secondes »", 'On peut chronométrer et répondre oui ou non.'),
      ], { why: "C'est pour cela que les exigences contiennent des chiffres ou des règles précises." })),
      st("Une promesse a besoin d'un responsable. Dans le dessin, une flèche en pointillés relie un composant à la promesse qu'il tient. <b>Qui tient EX-03</b> (les comptes sont conservés dans un annuaire unique) ?", one('ciel-c1-a3', reqAuth(), 'Le composant qui tient EX-03', ['dir'], "La flèche part du composant Annuaire vers EX-03 : c'est lui qui conserve les comptes.", { srv: "Le serveur vérifie les mots de passe mais ne conserve pas les comptes." }, { tag: tg('req', 1), hints: ["Qui conserve les comptes ?"] }), { w: 'satisfy', def: "la flèche du composant vers l'exigence : « ce composant répond à cette exigence »." }),
      st("Comment sait-on qu'une promesse est tenue ? On la teste. <b>Clique le test qui contrôle EX-02</b> (la durée).", one('ciel-c1-a4', reqAuth(), 'Le test qui contrôle EX-02', ['t2'], 'T-02 fait 10 ouvertures chronométrées : il mesure la durée.', { t1: 'T-01 contrôle EX-01.', t3: 'T-03 contrôle EX-03.' }, { tag: tg('req', 1) }), { w: 'verify', def: "la flèche du test vers l'exigence : « ce test contrôle cette exigence »." }),
      st("Teste une idée : que se passe-t-il quand on supprime un test ? Fais les deux essais.", exploreReq('ciel-c1-a5'), undefined, "Une exigence sans test n'est plus contrôlée : c'est exactement ce que cherche un technicien qui relit le dossier."),
      st("Un test a été effacé du dessin par erreur. Retrouve quelle exigence n'est plus contrôlée.", reqCoverage('ciel-c1-a6', { tag: tg('req', 1), hints: ['Compte les flèches qui arrivent sur chaque exigence.', 'Une exigence a perdu sa flèche « verify ».'] }, 't2')),
      st("À toi de compléter : quelle flèche pour relier un composant, quelle flèche pour relier un test ?", reqFill('ciel-c1-a7', { tag: tg('req', 2), hints: ['Qui contrôle ? Un test.', 'Qui répond à la promesse ? Un composant.'], why: "Savoir nommer la flèche, c'est savoir ce qu'on affirme dans le dossier." })),
    ]),
    guided({
      id: 'ciel-c2', n: 'C2', title: "Mission : l'inventaire du service", level: 2,
      objectives: ['Distinguer un type de composant et un exemplaire', 'Reconnaître ce qui fait partie du service', 'Compléter un schéma de composants'],
      prereq: ['C1'],
      success: 'Les cinq étapes réussies.',
      pourquoi: "Avant de réparer ou d'installer, on dresse l'inventaire : de quoi est fait le service, et qui en fait vraiment partie.",
      situation: "Le technicien veut savoir de quoi est fait le service d'ouverture de session.",
    }, [
      st("Voici l'inventaire du service. <b>Clique le rectangle qui décrit un serveur d'authentification.</b>", one('ciel-c2-a1', bddAuth(), "Le rectangle du serveur d'authentification", ['srv'], 'ServeurAuthentification décrit ce type de composant.', { dir: "L'annuaire conserve les comptes : ce n'est pas le serveur d'authentification." }, { tag: tg('bdd', 1) }), { w: 'bloc', def: "un rectangle = la fiche d'identité d'un <b>type</b> de composant (ses caractéristiques sont écrites dessous)." }),
      st("Tu viens de voir qu'un rectangle est une <b>fiche</b>. Un piège classique : la confondre avec la machine réelle. Lis bien la question avant de répondre.", bddQuiz('ciel-c2-a2', { tag: tg('bdd', 1) })),
      st("Joue avec le service : retire un composant et regarde ce qu'il devient. Fais les deux essais.", exploreBdd('ciel-c2-a3'), { w: 'composition', def: "le trait terminé par un <b>losange plein</b> : « fait partie de ». Le losange se place du côté du tout." }, "Le serveur fait partie du service (losange). Le poste, lui, est seulement relié par un trait simple : il l'utilise."),
      st("Tu sais maintenant lire un losange. Mets-le en pratique sur le schéma : coche <b>toutes</b> les phrases qui sont vraies, pas seulement la première qui te semble juste.", bddRead('ciel-c2-a4', { tag: tg('bdd', 1), hints: ['Où est le losange ?', 'Le losange est du côté du tout.'], why: "Lire le sens d'une composition évite de confondre le tout et la partie." })),
      st("À toi de compléter l'inventaire : le nom manquant et la nature du lien.", bddFill('ciel-c2-a5', { tag: tg('bdd', 2), hints: ['Quel composant conserve des comptes ?', 'Est-ce une partie du service ?'] })),
    ]),
    guided({
      id: 'ciel-c3', n: 'C3', title: "Mission : suivre le chemin d'une connexion", level: 2,
      objectives: ['Repérer les exemplaires et leurs liens', 'Prévoir ce qui est bloqué quand un maillon tombe', 'Compléter un schéma de liaisons'],
      prereq: ['C2'],
      success: 'Les cinq étapes réussies.',
      pourquoi: "Quand quelque chose tombe, il faut savoir qui parle à qui pour trouver ce qui est touché.",
      situation: `Tu suis la connexion de Lina depuis ${v.inst} jusqu'à l'annuaire.`,
    }, [
      st(`Ici, on ne décrit plus des fiches mais les <b>vrais</b> éléments du site. <b>Clique le poste de Lina.</b>`, one('ciel-c3-a1', ibdAuth(v), 'Le poste de Lina', ['poste'], `« ${v.inst} : PosteDeTravail » est le poste réel, fabriqué d'après la fiche PosteDeTravail.`, { auth: "C'est le serveur d'authentification." }, { tag: tg('ibd', 1) }), { w: 'partie', def: "un exemplaire concret d'un bloc : le poste de Lina est <b>une partie</b> construite d'après la fiche PosteDeTravail." }),
      st("Lina ouvre sa session. <b>Clique, dans l'ordre, les éléments que sa demande traverse</b> jusqu'à l'annuaire.", ibdTrace('ciel-c3-a2', { tag: tg('ibd', 1), hints: ['Par où part la demande ?', 'Suis les traits un par un.'] }, v), { w: 'connecteur', def: "le trait entre deux parties : il montre qu'elles échangent. Son nom dit ce qui circule." }),
      st("Avant d'essayer, tu vas <b>prédire</b>. Réfléchis, puis justifie.", predict('ciel-c3-a3', v, { tag: tg('ibd', 1) })),
      st("Tu as fait ta prédiction : place à l'expérience. Essaie les trois situations l'une après l'autre et compare avec ce que tu avais prévu.", exploreIbd('ciel-c3-a4', v), { w: 'dépendance', def: "quand un élément ne peut pas fonctionner sans un autre. Si le maillon du bout tombe, tout ce qui est avant est touché." }),
      st("Tu sais maintenant lire ce schéma. Complète-le : deux informations manquent. Pour chacune, demande-toi ce que le schéma de l'étape précédente t'a appris.", ibdFill('ciel-c3-a5', { tag: tg('ibd', 2), hints: ['Le type est écrit sous la partie.', 'Que demande le serveur à l\'annuaire ?'] })),
    ]),
    guided({
      id: 'ciel-c4', n: 'C4', title: "Mission : reconstituer ce qui s'est passé", level: 2,
      objectives: ["Lire un échange de haut en bas", "Expliquer pourquoi l'ordre est imposé", "Retrouver un message manquant"],
      prereq: ['C3'],
      success: 'Les cinq étapes réussies.',
      pourquoi: "Savoir dans quel ordre les choses se passent permet de dire où l'échange s'est arrêté.",
      situation: "Tu reconstitues, message après message, ce qui se passe quand Lina ouvre sa session.",
    }, [
      st("Voici le déroulé d'une ouverture de session réussie. <b>Lis-le message par message</b> en cliquant les boutons dans l'ordre.", exploreSeq('ciel-c4-a1'), { w: 'séquence', def: "le dessin d'un échange dans le temps : on le lit de haut en bas. Chaque trait vertical est un participant (<b>ligne de vie</b>), chaque flèche un <b>message</b>." }),
      st("Tu sais lire le déroulé. Entraîne ton œil : sélectionne une consigne, puis clique l'élément correspondant dans le dessin.", seqIdentify('ciel-c4-a2', { tag: tg('seq', 1), hints: ['Le premier message est tout en haut.'] })),
      st("Avant de remettre les messages dans l'ordre, une question de bon sens.", justifyOrder('ciel-c4-a3')),
      st("À toi : remets les messages dans l'ordre et lis les explications.", seqOrder('ciel-c4-a4', { tag: tg('seq', 2), hints: ["Qui déclenche l'échange ?", 'Une réponse suit sa demande.'], why: "Expliquer l'ordre, c'est montrer qu'on comprend le fonctionnement et pas seulement le dessin." }, s)),
      st("Dernière étape : un message a disparu du dessin. Retrouve-le.", seqFill('ciel-c4-a5', { tag: tg('seq', 2), hints: ["Que renvoie l'annuaire ?"] })),
    ]),
    {
      id: 'ciel-c5', n: 'C5', title: 'Évaluation finale', level: 2, exam: true,
      objectives: ["Mobiliser l'ensemble du parcours sur un cas nouveau"],
      prereq: ['C1 à C4 travaillés'],
      success: 'Score global sur 20 ; la correction détaillée est donnée à la fin.',
      pourquoi: "Vérifier que tu sais lire, expliquer et compléter seul, sans aide, sur le cas de ton site.",
      cours: ['Une seule tentative par question, sans indice. La correction apparaît à la fin.'],
      situation: `Tu interviens sur le site ${v.site} de NovaTech. Poste : ${v.pc} (${v.ipPc}). Serveur d'authentification : ${v.auth} (${v.ipAuth}). Annuaire : ${v.dir} (${v.ipDir}).`,
      activities: [
        ibdIdentify('ciel-c5-a1', { tag: tg('ibd', 1), crit: 'c1', weight: 5 }, v),
        bddRead('ciel-c5-a2', { tag: tg('bdd', 1), crit: 'c2', weight: 5 }),
        reqCoverage('ciel-c5-a3', { tag: tg('req', 1), crit: 'c3', weight: 4 }, (['t1', 't2', 't3'] as const)[hashString(`${v.pc}`) % 3] as 't1' | 't2' | 't3'),
        seqOrder('ciel-c5-a4', { tag: tg('seq', 2), crit: 'c4', weight: 3 }, s ? s + 1 : 0),
        ibdTrace('ciel-c5-a5', { tag: tg('ibd', 1), crit: 'c4', weight: 3 }, v),
      ],
    },
  ];
  void multi; void permutation;
  return {
    id: 'ciel', name: 'Bac pro CIEL', levelLabel: 'Niveaux 1 et 2', target: 2,
    orient: 'Lire un dossier technique et en expliquer les informations.',
    situation: "Tu es technicien à NovaTech : tu lis les diagrammes du dossier pour comprendre une installation.",
    statut: 'Niveaux visés : choix pédagogique.',
    cases: [
      { d: 'req', level: 1 }, { d: 'req', level: 2 }, { d: 'bdd', level: 1 }, { d: 'bdd', level: 2 },
      { d: 'ibd', level: 1 }, { d: 'ibd', level: 2 }, { d: 'seq', level: 1 }, { d: 'seq', level: 2 },
    ],
    grille: [
      { id: 'c1', label: 'Identifier les constituants', pts: 5 }, { id: 'c2', label: 'Comprendre les relations', pts: 5 },
      { id: 'c3', label: 'Vérifier que les exigences sont satisfaites', pts: 4 }, { id: 'c4', label: 'Expliquer les interactions', pts: 6 },
    ],
    modules,
  };
}
