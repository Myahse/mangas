# Téléchargements et partage sans internet (app lecteur)

## Ce qui existe

- **Télécharger** : dans le lecteur, l'icône de téléchargement (barre du haut) enregistre le chapitre
  sur le téléphone, en « économie de données » (`?lite=1`, ~70 % plus léger) ou en qualité originale.
  Fichiers : `<documents de l'app>/offline/<slug>__<n>/manifest.json` + `pages/001.jpg…` + `cover.*`.
- **Téléchargements** (`/telechargements`, icône dans la barre de l'app et bouton sur l'écran
  « pas de connexion ») : liste, lecture hors ligne, envoi, suppression.
- **Lecture hors ligne** (`/telechargements/:id`) : pages lues depuis le disque, marque « MangAfric »
  sur chaque page, et en fin de chapitre une invitation à créer un compte (ou à voir la série si connecté).
- **Envoyer / Recevoir** : `lib/src/offline/nearby_share.dart`.

## Choix technique : `nearby_connections`

Plugin Flutter pour Google Nearby Connections (Play Services). Il trouve l'autre téléphone en
Bluetooth puis bascule seul sur Wi-Fi Direct / point d'accès pour le transfert (stratégie
`P2P_POINT_TO_POINT`, le plus haut débit), sans internet, et sait envoyer un fichier en natif avec
progression. Un plugin Wi-Fi Direct brut demanderait de gérer soi-même groupes, sockets et reprise.
Limite : Android seulement (le plugin n'a pas de partie iOS) ; sur iOS les écrans affichent
« Le partage sans internet est disponible sur Android pour le moment. » Le téléchargement et la
lecture hors ligne marchent sur les deux plateformes.

## Protocole

1. Le receveur ouvre « Recevoir un chapitre » : il se rend visible (advertising).
2. L'envoyeur ouvre « Envoyer à un ami » sur un chapitre : il cherche (discovery), touche un téléphone.
3. Le receveur voit « X veut vous envoyer un chapitre » + code de vérification, et accepte.
4. L'envoyeur envoie un en-tête BYTES (`{"format":"mangafric-chapter","version":1,…}`), puis un seul
   fichier zip (non compressé) : `manifest.json` + `pages/*` + `cover.*`.
5. Le receveur vérifie le zip (format/version, noms de fichiers sûrs, extensions image, max 400 pages,
   max 300 Mo) puis l'importe comme chapitre « Reçu de … ».

## Règles d'accès

- On ne peut télécharger que ce que `GET /manga/{slug}/chapters/{n}/pages` renvoie à ce compte
  (le backend répond 401/403 pour un chapitre verrouillé), donc seul un chapitre gratuit ou débloqué
  arrive sur le téléphone et peut être envoyé.
- Un chapitre **reçu** ne peut pas être renvoyé (pas de bouton, et l'écran d'envoi le refuse), pour
  que la diffusion d'un chapitre payant reste limitée à un saut.
- Aucun endpoint backend ajouté.

## Tester sur deux téléphones Android

Prérequis : deux Android 8+ avec Google Play Services, Bluetooth + Wi-Fi activés (pas besoin d'être
connecté à un réseau), localisation activée sur Android 12 et moins.

1. Installer l'APK sur les deux : `flutter build apk --debug` puis `adb install build/app/outputs/flutter-apk/app-debug.apk`
   (ou `flutter run -d <id>` sur chacun). Le téléphone A doit joindre l'API (`--dart-define=MANGAFRIC_LAN_HOST=<ip du PC>`).
2. Téléphone A (connecté à un compte) : ouvrir un chapitre gratuit (ch. 1) → icône téléchargement →
   « Économie de données ». Vérifier dans Téléchargements qu'il apparaît.
3. Couper le Wi-Fi/données de A (mode avion puis réactiver seulement Bluetooth et Wi-Fi) → ouvrir le
   chapitre depuis Téléchargements : il doit s'afficher en entier.
4. Téléphone B (sans compte, sans internet) : Téléchargements → « Recevoir un chapitre », accepter les autorisations.
5. Téléphone A : sur le chapitre → icône partager → choisir « Lecteur MangAfric » → B accepte (codes identiques).
6. B : progression puis « Lire … » → le chapitre s'ouvre hors ligne avec la marque MangAfric et, en fin
   de chapitre, « Créer mon compte gratuit ».
7. Cas à vérifier : refuser sur B (A affiche « L'autre téléphone a refusé. ») ; éloigner les téléphones
   pendant l'envoi (« Connexion perdue ») ; sur B, le chapitre reçu n'a pas de bouton d'envoi.

## Non vérifié

Rien n'a été lancé sur un vrai téléphone dans cette session : `flutter analyze` et la compilation de
l'APK debug seulement. Le transfert Nearby (permissions selon la version d'Android, URI `content://`
du fichier reçu sur Android 11+) reste à confirmer sur appareils.
