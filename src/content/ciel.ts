import type { Module, Parcours } from '../types';
import { V0, bddAuth, ibdAuth, multi, netSite, quiz, reqAuth, seqAuth, tg, N, Y, type Vars, permutation, hashString } from './common';
import { bddFill, bddQuiz, bddRead, ibdFill, ibdIdentify, ibdTrace, netVsIbd, reqCoverage, reqFill, reqIdentify, seqFill, seqIdentify, seqOrder } from './lib';

export function ciel(v: Vars = V0, seed = 0): Parcours {
  const s = seed || 0;
  const modules: Module[] = [
    {
      id: 'ciel-c0', n: 'C0', title: 'Lire un dossier technique', level: 1,
      objectives: ["Repérer à quoi sert un modèle SysML dans un dossier technique", "Distinguer un schéma réseau d'un diagramme SysML"],
      prereq: ["Aucun : ce module part d'un cas concret NovaTech"],
      success: 'Les deux activités réussies.',
      pourquoi: "Un système est décrit par plusieurs documents. SysML ajoute ce que le schéma réseau ne dit pas : à quoi sert chaque élément et comment ils coopèrent.",
      cours: [
        "<b>NovaTech</b> est une entreprise fictive de quatre sites. Le dossier technique contient un schéma réseau (où sont les machines) et des diagrammes SysML (ce que chacune fait).",
        "Tu n'auras pas à tout écrire en SysML : tu dois savoir <b>lire</b> un diagramme, expliquer ce qu'il dit et le <b>compléter</b> dans des cas simples.",
        "Le diagramme dépend de la question : <b>exigences</b> (que doit faire le système ?), <b>blocs</b> (de quoi est-il fait ?), <b>blocs internes</b> (comment sont-ils reliés ?), <b>séquence</b> (dans quel ordre échangent-ils ?).",
      ],
      exemple: { diagram: netSite(v), notes: ["Le schéma réseau situe le poste, le commutateur et les deux serveurs.", "Il ne dit pas lequel vérifie les mots de passe : c'est le rôle du modèle."] },
      activities: [
        netVsIbd('ciel-c0-a1', {}, v),
        quiz('ciel-c0-a2', 'Quelle question te pose-t-on pour choisir le diagramme de séquence ?', [
          Y("Dans quel ordre les éléments échangent-ils ?", "La séquence se lit de haut en bas : elle montre l'ordre des messages."),
          N('De quoi le système est-il composé ?', "C'est la question du diagramme de blocs (BDD)."),
          N('Quelle durée maximale accepter ?', "C'est une exigence, lue dans le diagramme d'exigences."),
        ], { why: "Choisir le bon diagramme évite de chercher une information là où elle n'est pas." }),
      ],
    },
    {
      id: 'ciel-c1', n: 'C1', title: 'Les exigences : que doit faire le système ?', level: 2,
      objectives: ['Lire une exigence et ses liens (satisfy, verify, contient)', 'Compléter les liens manquants dans un diagramme simple'],
      prereq: ['C0'],
      success: 'Identifier les trois éléments demandés et compléter les deux liens.',
      pourquoi: "Une exigence est une promesse faite au client. Les liens montrent qui la tient (satisfy) et comment on le contrôle (verify).",
      cours: [
        "Une <b>exigence</b> est une phrase courte et vérifiable, avec un identifiant (EX-02). Elle peut contenir des sous-exigences (signe ⊕).",
        "Un <b>bloc</b> la <b>satisfait</b> (flèche en pointillés du bloc vers l'exigence). Un <b>test</b> la <b>vérifie</b> (du test vers l'exigence).",
        "Une exigence sans test n'est pas contrôlée : on ne sait pas si elle est respectée.",
      ],
      exemple: { diagram: reqAuth(), notes: ["EX-00 contient trois sous-exigences (⊕).", "Le serveur satisfait EX-01 et EX-02 ; l'annuaire satisfait EX-03.", "Chaque exigence a son test : T-01, T-02, T-03."] },
      activities: [
        reqIdentify('ciel-c1-a1', { tag: tg('req', 1), hints: ["Lis le texte de chaque exigence.", "Cherche le mot chiffré : une durée.", "C'est la deuxième exigence."] }),
        reqCoverage('ciel-c1-a2', { tag: tg('req', 1), hints: ["Compte les flèches verify.", "Une exigence a perdu sa flèche verify."] }, 't2'),
        reqFill('ciel-c1-a3', { tag: tg('req', 2), hints: ["Qui contrôle ? Un test.", "Qui répond à l'exigence ? Un bloc."], why: "Savoir nommer le lien, c'est savoir ce que l'on affirme dans le dossier." }),
      ],
    },
    {
      id: 'ciel-c2', n: 'C2', title: 'Les blocs : de quoi est-il fait ?', level: 2,
      objectives: ['Distinguer un bloc (un type) et un exemplaire', 'Lire une composition', 'Compléter un BDD simple'],
      prereq: ['C1'],
      success: 'Lecture exacte de la composition et BDD complété.',
      pourquoi: "Avant de dépanner ou d'installer, il faut connaître les constituants du système et ce qui fait partie de quoi.",
      cours: [
        "Un <b>bloc</b> décrit un type d'élément (ServeurAuthentification). Ses valeurs sont écrites dessous (adresseIP : String).",
        "La <b>composition</b> (losange plein côté du tout) dit « est composé de » : le système contient ses parties.",
        "Une <b>association</b> (trait simple) relie deux blocs sans dire que l'un fait partie de l'autre.",
      ],
      exemple: { diagram: bddAuth(), notes: ["Le losange est du côté de OuvertureDeSession : il est composé du serveur et de l'annuaire.", "PosteDeTravail est seulement associé : il utilise le système."] },
      activities: [
        bddQuiz('ciel-c2-a1', { tag: tg('bdd', 1) }),
        bddRead('ciel-c2-a2', { tag: tg('bdd', 1), hints: ['Où est le losange ?', 'Le losange est côté du tout.'], why: "Lire le sens d'une composition évite de confondre le tout et la partie." }),
        bddFill('ciel-c2-a3', { tag: tg('bdd', 2), hints: ['Quel bloc conserve des comptes ?', 'Le serveur et l\'annuaire font partie du système.'] }),
      ],
    },
    {
      id: 'ciel-c3', n: 'C3', title: 'Les blocs internes : comment sont-ils reliés ?', level: 2,
      objectives: ['Lire les parties et les connecteurs', 'Suivre un flux dans un IBD', 'Compléter un IBD simple'],
      prereq: ['C2'],
      success: 'Trois repérages, le chemin du flux et le complément d\'IBD réussis.',
      pourquoi: "Dans une panne ou une installation, on doit savoir qui parle à qui : l'IBD montre les liens réels entre les parties.",
      cours: [
        "Une <b>partie</b> est un exemplaire d'un bloc : « serveurAuth : ServeurAuthentification ». Le nom est à gauche, le type à droite.",
        "Un <b>connecteur</b> relie deux parties : il montre qu'elles échangent. Son nom dit ce qui circule.",
        "Si deux parties n'ont pas de connecteur direct, elles ne se parlent pas directement.",
      ],
      exemple: { diagram: ibdAuth(v), notes: ["Le poste parle au serveur ; le serveur parle à l'annuaire.", "Aucun lien direct poste - annuaire."] },
      activities: [
        ibdIdentify('ciel-c3-a1', { tag: tg('ibd', 1), hints: ['Les parties sont les rectangles, les connecteurs les traits.'] }, v),
        ibdTrace('ciel-c3-a2', { tag: tg('ibd', 1), hints: ['Par où part la demande ?', 'Suis les connecteurs un par un.'] }, v),
        ibdFill('ciel-c3-a3', { tag: tg('ibd', 2), hints: ['Quel type est écrit sous la partie ?'] }),
      ],
    },
    {
      id: 'ciel-c4', n: 'C4', title: 'La séquence : dans quel ordre ?', level: 2,
      objectives: ['Lire une séquence de haut en bas', 'Remettre des messages dans l\'ordre et expliquer pourquoi', 'Compléter un message manquant'],
      prereq: ['C3'],
      success: 'Repérages exacts, ordre correct et message manquant retrouvé.',
      pourquoi: "Un échange mal ordonné ne fonctionne pas : la séquence explique pourquoi l'accès n'est accordé qu'après vérification.",
      cours: [
        "Chaque <b>ligne de vie</b> (trait vertical) est un participant. Le temps passe de haut en bas.",
        "Une <b>flèche pleine</b> est un appel ; une <b>flèche en pointillés</b> est un retour. Une flèche qui boucle est un traitement interne.",
        "On ne peut pas répondre avant d'avoir reçu une demande : l'ordre est contraint par la logique du système.",
      ],
      exemple: { diagram: seqAuth(), notes: ["Cinq messages : demande, recherche, compte, vérification, accès accordé.", "La vérification est un traitement interne du serveur."] },
      activities: [
        seqIdentify('ciel-c4-a1', { tag: tg('seq', 1), hints: ['Le premier message est tout en haut.'] }),
        seqOrder('ciel-c4-a2', { tag: tg('seq', 2), hints: ['Qui déclenche l\'échange ?', 'Une réponse suit sa demande.'], why: "Expliquer l'ordre, c'est montrer qu'on comprend le fonctionnement et pas seulement le dessin." }, s),
        seqFill('ciel-c4-a3', { tag: tg('seq', 2), hints: ['Que renvoie l\'annuaire ?'] }),
      ],
    },
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
    statut: 'Niveaux visés : choix pédagogique proposé (à valider avec le référentiel).',
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
