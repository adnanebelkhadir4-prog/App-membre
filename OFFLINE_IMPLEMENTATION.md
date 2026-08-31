# Portail Membre — Mode hors-ligne, Adhésion, APK Android

Ce document résume ce qui a été ajouté/modifié dans ce zip, comment le déployer,
et comment tester chacun des 13 scénarios demandés.

## 1. Ce qui a changé

### Session persistante 20 jours
- `client/lib/offline/sessionStore.ts` : session locale (localStorage) avec
  `loginAt`/`expiresAt` = `loginAt + 20 jours`. Restaurée au démarrage **sans
  jamais toucher au réseau**.
- `client/context/AuthContext.tsx` : réécrit pour ne dépendre que de cette
  session locale. `sessionValidity` expose `valid` (+ jours restants),
  `expired`, ou `none`.
- Un vrai échec serveur (401 confirmé, JWT réellement expiré) est distingué
  d'une simple coupure réseau via `client/lib/offline/authEvents.ts` :
  seul un 401 **reçu du serveur** déclenche la déconnexion. Une erreur réseau
  (`TypeError` de `fetch`) ne déconnecte jamais.
- Le JWT serveur (`server/routes/auth.ts`) passe de 12h à **20 jours** pour
  rester valide aussi longtemps que la session locale quand il y a du réseau.
  ⚠️ Compromis sécurité à connaître : un token volé reste valable plus
  longtemps qu'avant. Si tu veux durcir ça plus tard, la prochaine étape
  logique est un système de refresh token — non implémenté ici pour rester
  focalisé sur la demande initiale.

### Mode offline (infos perso, adhésion, QR/carte)
- `client/lib/offline/idb.ts` : petit wrapper IndexedDB natif (pas de
  dépendance `idb` ajoutée, pour limiter les risques au premier build CI).
- `client/lib/offline/network.ts` : détection de connectivité réelle
  (`navigator.onLine` + ping actif sur `/api/ping`, + plugin Capacitor
  Network sur Android) — distingue "WiFi sans internet" d'un vrai accès.
- `client/pages/MyProfile.tsx` : met en cache le profil après chaque
  chargement en ligne réussi, et retombe sur le cache (avec badge "hors
  connexion" + horodatage) si hors-ligne ou si le réseau répond mais
  échoue.
- `client/components/OfflineStatusBar.tsx` : bandeau global (connexion,
  session, sync en attente) affiché sur toutes les pages protégées.

### Adhésion annuelle
- `database/migration-membership-2026.sql` : nouvelles tables
  `membership_periods` (une ligne par membre par année, historique jamais
  supprimé) et `membership_documents` (les 4 pièces requises). Vue
  `membership_status_view` calcule `is_active_member` **exactement** selon
  la formule demandée (`payment_completed AND documents_completed AND
  membership_year = année courante`) — jamais un simple `is_member`.
  RLS activé, tables verrouillées comme `attendance_challenges` (aucun accès
  direct anon/authenticated, tout passe par le serveur).
- `server/routes/membership.ts` + routes `/api/membership` (GET) et
  `/api/membership/documents` (POST) enregistrées dans `server/index.ts`.
- `client/pages/Membership.tsx` : nouvelle page "Adhésion" avec statut,
  4 documents (dépôt/remplacement), et un résumé (documents validés,
  paiement, membre actif). Accessible via `/membership` et le menu latéral.
- Le **1er janvier**, il suffit qu'une nouvelle année arrive : la fonction
  `get_or_create_membership_period` crée une ligne vierge pour la nouvelle
  année au premier chargement, sans jamais toucher aux années précédentes.

### QR / PIN hors-ligne
- `client/lib/offline/qrOfflineStore.ts` (`offline_qr_records`) +
  `client/lib/offline/syncQueue.ts` (file d'attente générique) +
  `client/lib/offline/syncEngine.ts` (rejoue les opérations en attente dès
  que la connexion est confirmée, idempotent).
- Le PIN n'est jamais stocké en clair : chiffré au repos avec AES-GCM
  (`client/lib/offline/pinProtection.ts`), effacé du stockage dès la
  synchronisation.
- **Important à comprendre** : la validation du QR/PIN reste
  fondamentalement côté serveur (comparaison bcrypt contre un challenge à
  usage unique). Hors-ligne, `client/pages/AttendanceConfirmation.tsx`
  enregistre la tentative localement ("file d'attente"), affiche
  clairement que ce n'est **pas encore confirmé**, et la vraie validation
  se fait à la synchronisation. C'est la seule approche possible sans
  affaiblir la sécurité du système existant.
- `client/pages/Attendance.tsx` affiche les tentatives hors-ligne en
  attente / synchronisées / rejetées.

### APK Android (Capacitor + GitHub Actions)
- `client/lib/api-config.ts` : préfixe toutes les URLs `/api/*` avec
  `VITE_API_BASE_URL` uniquement dans l'app native (le web continue
  d'utiliser des chemins relatifs).
- `capacitor.config.ts`, `vite.config.apk.ts` (build séparé, `base: "./"`,
  sortie dans `dist/apk`).
- `.github/workflows/build-android.yml` : `pnpm install` → build web →
  `npx cap add android` → `npx cap sync` → `gradlew assembleDebug` → upload
  de l'APK en artifact téléchargeable. Un second job optionnel construit un
  APK signé si tu ajoutes les secrets `ANDROID_KEYSTORE_BASE64` etc.

## 2. Déploiement

1. **Appliquer la migration SQL** : exécuter
   `database/migration-membership-2026.sql` dans l'éditeur SQL Supabase (ou
   `psql`). Idempotent, sûr à ré-exécuter.
2. **Variables d'environnement Netlify** (Site settings → Environment) :
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (le blocage que tu avais
     déjà identifié — toujours nécessaire, rien de nouveau ici)
   - `JWT_SECRET` (déjà utilisé par le login existant — vérifie qu'il est
     bien défini, sinon `/api/auth/login` renverra une 500)
3. **Variables GitHub Actions** (Settings → Secrets and variables →
   Actions → Variables) :
   - `VITE_API_BASE_URL` = `https://<ton-site>.netlify.app`
4. **Pousser sur `main`** (ou lancer manuellement le workflow "Build Android
   APK") → récupérer l'APK dans l'onglet Actions → Artifacts.

## 3. Tests à effectuer

| # | Scénario | Comment tester |
|---|----------|----------------|
| 1 | Première connexion | Se connecter normalement ; vérifier que la bannière affiche "connecté" et que `localStorage['shm_member_session_v1']` contient `expiresAt` ≈ +20 jours. |
| 2 | Fermeture/réouverture | Fermer complètement l'app/onglet, rouvrir : pas de redemande de mot de passe, on arrive directement sur le dashboard. |
| 3 | Absence totale d'Internet | Couper le WiFi/données, ouvrir "Mes infos" et "Adhésion" : les données déjà consultées une fois en ligne s'affichent avec le badge "hors connexion" + date de mise à jour, jamais de page blanche. |
| 4 | Expiration de session | Modifier manuellement `expiresAt` dans `localStorage` à une date passée, recharger : redirection vers login. |
| 5 | Passage au 1er janvier | Modifier `membership_year` attendu (ou tester avec une année future dans l'appel `/api/membership?year=2027`) : une nouvelle ligne est créée, vide, sans toucher à l'ancienne. |
| 6 | Adhésion incomplète | Aller sur `/membership` sans avoir rien déposé : statut "لم يبدأ الانخراط" / "وثائق ناقصة" selon l'avancement, jamais "validée". |
| 7 | Adhésion complète | En base : mettre `payment_completed = true` et les 4 documents à `validated` pour l'année courante → `is_active_member` doit passer à `true` et le statut à "بانتظار المصادقة"/"مصادق عليه" selon `admin_validated`. |
| 8 | Dépôt de documents | Déposer un fichier sur chaque carte de `/membership` en ligne : statut passe à "قيد المراجعة", visible dans `membership_documents`. |
| 9 | QR déjà scanné | Scanner un QR déjà utilisé : message serveur "تم استخدام رمز QR هذا مسبقًا" affiché normalement (comportement inchangé en ligne). |
| 10 | QR nouveau (hors-ligne) | Couper le réseau, scanner un QR valide, entrer un PIN : écran "تم حفظ محاولتك محليًا" (file d'attente), rien envoyé au serveur pour l'instant. |
| 11 | PIN | Vérifier qu'aucun PIN n'apparaît jamais en clair dans la console ; inspecter IndexedDB (`shm_member_offline_db` → `qr_records`) : `pin_reference` doit être une chaîne `gcm:...`, pas le PIN brut. |
| 12 | Synchronisation après retour d'Internet | Reconnecter le réseau après le test #10 : dans les ~30s (ou en rouvrant l'app), la tentative passe de "بانتظار المزامنة" à "تمت المزامنة بنجاح" (ou "رُفضت" si le PIN était faux), et disparaît de `sync_queue`. |
| 13 | Doublon de synchronisation | Forcer un second appel de `runSync()` (ou rejouer manuellement l'item) après une sync réussie : la contrainte unique côté serveur renvoie "تم تسجيل حضورك لهذه الحصة مسبقًا", traité comme un succès idempotent, pas de doublon en base ni de deuxième alerte à l'utilisateur. |

## 4. Ce qui n'a volontairement pas été touché

- Le portail des chefs ("Qada") n'a reçu aucune modification.
- Aucune donnée existante n'a été supprimée ou migrée destructivement.
- `Account.tsx` (page `/account`) semble être du code hérité déconnecté du
  flux d'authentification réel actuel (il utilise `supabase.auth.getUser()`
  qui ne sera jamais rempli puisque le login passe par un JWT maison) — je
  ne l'ai pas touché, hors du périmètre de la mission, mais tu voudras
  peut-être le nettoyer ou le rediriger vers `/my-profile` à l'occasion.
