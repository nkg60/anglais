#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Reformule les recto/verso d'une sauvegarde Perrio pour qu'ils soient
lisibles dans l'app.

Contexte : dans l'écran de révision, le recto et le verso sont affichés en
texte brut (interpolation Angular {{ card.front }} / {{ card.back }} avec
CSS white-space: pre-wrap). Le markdown n'est donc PAS interprété : les
**astérisques** apparaissaient littéralement à l'écran et rendaient les
cartes difficiles à lire. Les sauts de ligne, eux, sont bien rendus.

Ce script, à partir d'une sauvegarde exportée (format "perrio-backup") :
  - supprime le markdown ** et * (gras / italique) affiché littéralement ;
  - donne aux rectos de vocabulaire une consigne explicite (« Que signifie … ? ») ;
  - transforme les consignes de grammaire télégraphiques en vraies questions ;
  - place chaque phrase d'exemple sur sa propre ligne, préfixée « Ex. : » ;
  - réécrit les réponses d'homophones denses en une puce par mot.

Seuls les champs front/back des flashcards sont modifiés. Tous les
identifiants et toutes les métadonnées de révision (dates, ease, interval,
repetitions, scores…) sont préservés à l'identique, donc la sauvegarde
reste réimportable sans perdre l'historique.

Usage :
    python3 tools/reformulate-flashcards.py <entree.json> <sortie.json>
"""
import json
import re
import sys

SIGHT = "21e5b29c-4e67-44f6-b4b0-fff7e39c7390"  # Sight Words
VOCAB = "33babb8a-5c28-4374-a936-784fef61157e"  # Vocabulaire de cours
VOCAB_SUBJECTS = {SIGHT, VOCAB}


def strip_md(s):
    s = s.replace("**", "")
    s = re.sub(r"\*([^*]+)\*", r"« \1 »", s)  # italique markdown restant -> guillemets
    s = re.sub(r"[ \t]{2,}", " ", s)
    return s.strip()


def split_example(back):
    """Coupe 'sens — exemple' -> (sens, exemple|None) sur le premier ' — '."""
    parts = back.split(" — ", 1)
    if len(parts) == 2:
        return parts[0].strip(), parts[1].strip()
    return back.strip(), None


# Réécritures complètes du VERSO (index dans le tableau flashcards -> back).
# Utilisées quand le côté droit du tiret est une explication (pas un exemple),
# ou pour aérer des réponses denses.
BACK_FULL = {
    29: "period\n(le point : fin d'une phrase déclarative)",
    30: "question mark\n(le point d'interrogation : fin d'une question)",
    31: "exclamation mark\n(le point d'exclamation : émotion, surprise, ordre)",
    32: "comma\n(la virgule : liste ou pause)",
    153: "Non.\nOn ne donne pas d'adjectif de personnalité à un objet.\nExemple : a rude man ✅  /  a « rude » table ❌",
    114: "genouillères\n(knee = genou  +  pads = protections)",
    379: ("to / two / too — ne pas confondre :\n"
          "• to = à, vers  →  I go to work.\n"
          "• two = 2 (le nombre)  →  I have two cars.\n"
          "• too = aussi / trop  →  Me too!  /  too hot."),
    384: ("their / there / they're :\n"
          "• their = leur, leurs (possessif)  →  their house\n"
          "• there = là-bas / il y a  →  There is a cat.\n"
          "• they're = they are (contraction)  →  They're happy."),
    388: ("its / it's :\n"
          "• its = son, sa, ses (possessif)  →  its food = sa nourriture\n"
          "• it's = it is ou it has (contraction avec apostrophe)  →  It's cold."),
    389: ("your / you're :\n"
          "• your = ton, ta, tes, votre (possessif)  →  your book\n"
          "• you're = you are (contraction)  →  You're right.\n"
          "Astuce : si tu peux dire « you are », écris « you're »."),
    390: ("read (présent) et read (passé) : même orthographe, prononciation différente.\n"
          "• présent : /riːd/ (comme « reed »)  →  I will read the notes.\n"
          "• passé : /red/ (comme la couleur « red »)  →  I read the book last night."),
    393: ("see / saw (verbe irrégulier : see → saw → seen) :\n"
          "• see = voir (présent)  →  I see you.\n"
          "• saw = a vu (passé)  →  I saw them yesterday."),
    394: ("hear / here (même prononciation) :\n"
          "• hear = entendre  →  I hear music.\n"
          "• here = ici  →  Come here!"),
    395: ("know / no (le K de know est muet) :\n"
          "• know = savoir, connaître  →  I know the answer.\n"
          "• no = non  →  No, thank you."),
    396: ("buy / by / bye :\n"
          "• buy = acheter  →  I buy milk.\n"
          "• by = par, à côté de  →  a book by X  /  by the door\n"
          "• bye = au revoir  →  Bye!"),
    397: ("one / won :\n"
          "• one = 1 (le nombre)  →  one apple\n"
          "• won = a gagné (passé de win)  →  She won the race."),
}

# Réécritures du RECTO (index -> front) pour les consignes peu claires.
FRONT = {
    28: "Après le verbe « be », que devient l'adjectif ?",
    35: "Comment ponctue-t-on une liste (règle de la virgule) ?",
    36: "Met-on un espace avant « ? » et « ! » en anglais ?",
    152: "Quelles sont les 7 catégories d'adjectifs vues en cours ?",
    154: "Classe ces adjectifs par catégorie : big, new, hot.",
    155: "Dans quelle catégorie ranger : quiet, angry, pretty ?",
    0: "Traduis en français le pronom complément « me ».",
    1: "Traduis en français le pronom complément « him ».",
    2: "Traduis en français le pronom complément « her ».",
    3: "Traduis en français le pronom complément « us ».",
    4: "Traduis en français le pronom complément « them ».",
    5: "Pour quoi utilise-t-on le pronom complément « it » ?",
    7: "Remplace « Marc » par un pronom : I see Marc.",
    8: "Remplace « my sister and me » par un pronom : She calls my sister and me.",
    9: "Remplace « our grandmother » par un pronom : We visit our grandmother.",
    10: "Remplace « the computers » par un pronom : He repairs the computers.",
    149: "Quel est le 2ᵉ cas où l'on emploie un pronom complément ?",
    14: "Traduis en français l'adjectif possessif « my ».",
    15: "Traduis en français l'adjectif possessif « your ».",
    16: "« his » : quand l'emploie-t-on (quel possesseur) ?",
    17: "« her » (possessif) : quand l'emploie-t-on (quel possesseur) ?",
    18: "Traduis en français l'adjectif possessif « its ».",
    19: "Traduis en français l'adjectif possessif « our ».",
    20: "Traduis en français l'adjectif possessif « their ».",
    21: "Piège : de quoi dépend le choix entre « his » et « her » ?",
    23: "Quelle différence entre « its » et « it's » ?",
    24: "Traduis en anglais : « Marie visite sa grand-mère. »",
    25: "Traduis en anglais : « Tom lave sa voiture. »",
    64: "Conjugue « go » à la 3ᵉ personne du singulier (he/she/it).",
    65: "Conjugue « watch » à la 3ᵉ personne du singulier (he/she/it).",
    66: "Conjugue « study » à la 3ᵉ personne du singulier (he/she/it).",
    67: "Conjugue « have » à la 3ᵉ personne du singulier (he/she/it).",
    80: "Mets à la forme interrogative : « She speaks Spanish. »",
    81: "Mets à la forme négative : « This bus stops here. »",
    156: "« That day » sert aussi à parler de quoi ?",
    133: "Quel est le passé de « go » ?",
    134: "Quel est le passé de « see » ?",
    135: "Quel est le passé de « eat » ?",
    136: "Quel est le passé de « run » ?",
    137: "Quel est le passé de « find » ?",
    138: "Quel est le passé de « give » ?",
    139: "Quel est le passé de « say » ?",
    140: "Quel est le passé de « buy » ?",
    141: "« done » : c'est quelle forme, et de quel verbe ?",
    143: "Qu'exprime le modal « will » ?",
    144: "Qu'exprime le modal « could » ?",
    145: "Qu'exprime le modal « may » ?",
    146: "Qu'exprime le modal « shall » ?",
    147: "Qu'exprime le modal « must » ?",
    148: "Après un modal, à quelle forme se met le verbe ?",
    55: "Remets les mots dans l'ordre : bike / rides / she / her / new",
    56: "Remets les mots dans l'ordre : coffee / we / hot / drink",
    57: "Remets les mots dans l'ordre : like / do / pizza / you / ?",
    58: "Remets les mots dans l'ordre : them / help / at work / I",
    59: "Dans « My old computer works well », quelle est la nature de « My » ?",
    60: "Dans « My old computer works well », quel mot est le verbe ?",
    62: "Quelle est la phrase la plus courte possible (2 mots minimum) ?",
    51: "Complète : It ___ cold today.",
    52: "Complète : My sister ___ a red car.",
    97: "Quelle différence entre « to » et « too » ?",
}


def reformulate(data):
    for i, c in enumerate(data["flashcards"]):
        sub = c["subjectId"]

        # ---- RECTO ----
        if i in FRONT:
            c["front"] = FRONT[i]
        elif sub in VOCAB_SUBJECTS:
            c["front"] = f"Que signifie « {strip_md(c['front'])} » ?"
        else:
            c["front"] = strip_md(c["front"])

        # ---- VERSO ----
        if i in BACK_FULL:
            c["back"] = BACK_FULL[i]
        else:
            sens, ex = split_example(strip_md(c["back"]))
            c["back"] = f"{sens}\nEx. : {ex}" if ex is not None else sens

    return data


def main(argv):
    if len(argv) != 3:
        print(__doc__)
        return 1
    with open(argv[1], encoding="utf-8") as f:
        data = json.load(f)
    reformulate(data)
    with open(argv[2], "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"{len(data['flashcards'])} cartes traitées → {argv[2]}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
