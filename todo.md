# Jarvis IHM v5.9 - TODO

## Phase 1 - Frontend PoC (COMPLETED)
- [x] Wireframes et design system (Cyber-Minimalism)
- [x] Shell Application avec sidebar navigation
- [x] Module Dialogue (ChatInterface) avec simulation streaming
- [x] Module Logs (LogViewer) avec filtres temps réel
- [x] Module Tâches (TaskBoard) Kanban drag-and-drop
- [x] Dashboard Hardware (DGX Spark + Jetson Thor + Infrastructure)
- [x] Module Calendrier (CalendarView) avec support cron
- [x] Module Connaissances (KnowledgeBase) RAG
- [x] Module Workflows (WorkflowEditor) avec React Flow

## Phase 2 - Full Stack Migration (COMPLETED)
- [x] Upgrade vers template Manus full-stack (tRPC + React Query + PostgreSQL)
- [x] Correction du problème "écran noir" (conflit AuthProvider)
- [x] Schéma de base de données créé (5 tables: users, tasks, scheduled_jobs, knowledge_documents, workflows)
- [x] Routes frontend fonctionnelles

## Phase 3 - Backend Implementation (COMPLETED)
- [x] Push du schéma DB vers PostgreSQL (pnpm db:push)
- [x] Routes tRPC tasks (list/create/update/delete/updateStatus)
- [x] Routes tRPC scheduledJobs (list/create/update/delete/toggleEnabled)
- [x] Routes tRPC knowledge (list/search/getById/create/update/delete)
- [x] Routes tRPC workflows (list/getById/create/update/delete/toggleEnabled/execute)
- [x] Connexion TaskBoard au backend tRPC
- [x] Connexion CalendarView au backend tRPC
- [x] Connexion KnowledgeBase au backend tRPC
- [x] Connexion WorkflowEditor au backend tRPC
- [x] Tests unitaires pour toutes les routes tRPC (20 tests passés)

## Phase 4 - Améliorations (TODO)
- [ ] WebSocket streaming pour Chat (LLM responses)
- [ ] WebSocket streaming pour Logs (real-time)
- [ ] Hardware monitoring backend (psutil, nvidia-smi, SMART)
- [ ] Intégration LLM réel pour le chat
- [ ] Workflow execution engine
- [ ] Authentification protégée pour les routes sensibles

## Notes
- Mode Simulation: Les composants affichent des données de fallback quand la DB est vide
- Badge "Mode Simulation" visible sur chaque module quand pas de données réelles

## Phase 5 - Nouvelles Fonctionnalités (COMPLETED)
- [x] Intégration LLM Manus pour le chat (réponses réelles)
- [x] Endpoint /api/hardware/metrics (CPU, GPU, RAM, etc.)
- [x] Seed de données de test (tâches, jobs, documents)
- [x] Tests unitaires pour chat et hardware routers (28 tests passés)

## Phase 6 - Fonctionnalités Avancées (COMPLETED)
- [x] Recherche RAG avec embeddings vectoriels
- [x] Endpoint de génération d'embeddings via LLM Forge API
- [x] Recherche sémantique dans la base de connaissances (cosine similarity)
- [x] Notifications WebSocket temps réel (/ws endpoint)
- [x] Alertes hardware (surchauffe GPU, UPS critique) avec seuils configurables
- [x] Export PDF/HTML des rapports de performance
- [x] Export PDF/HTML de l'historique des conversations
- [x] Tests unitaires (63 tests passés)

## Phase 7 - Authentification et UX Avancée (COMPLETED)
- [x] Authentification OAuth Manus (intégrée avec tRPC)
- [x] Page de login avec redirection OAuth
- [x] Protection des routes authentifiées (ProtectedRoute component)
- [x] Préférences utilisateur (thème, notifications, langue)
- [x] Graphiques Chart.js temps réel (CPU, GPU, RAM, Température)
- [x] Historique des métriques avec rafraîchissement automatique
- [x] Commandes vocales Web Speech API (français)
- [x] Transcription et envoi automatique au chat
- [x] Menu utilisateur avec profil et déconnexion
- [x] Tests unitaires (71 tests passés)

## Phase 8 - Paramètres, Mode Hors-ligne et Raccourcis (COMPLETED)
- [x] Page de paramètres utilisateur complète (/settings)
- [x] Persistance des préférences en base de données (userPreferences table)
- [x] Service Worker pour le mode hors-ligne (sw.js)
- [x] Page hors-ligne avec détection automatique (offline.html)
- [x] Raccourcis clavier globaux (Ctrl+K, Ctrl+1-6, Ctrl+Enter, Shift+?)
- [x] Command Palette pour navigation rapide
- [x] Indicateur de statut de connexion (ConnectionStatus)
- [x] Dialogue d'aide pour les raccourcis clavier
- [x] Tests unitaires (81 tests passés)

## Phase 9 - Dashboard Personnalisable, Historique et Plugins (COMPLETED)
- [x] Tableau de bord personnalisable avec 10 types de widgets
- [x] Drag & drop pour réorganiser les widgets (@dnd-kit)
- [x] Sauvegarde de la configuration du dashboard en DB
- [x] Historique des conversations en base de données
- [x] Interface de recherche dans l'historique
- [x] Reprise des conversations précédentes
- [x] Architecture de système de plugins modulaire
- [x] 8 plugins disponibles (MQTT, Zigbee, Home Assistant, Telegram, etc.)
- [x] Interface de gestion des plugins avec marketplace
- [x] Tests unitaires (108 tests passés)

## Phase 10 - Widgets Personnalisés, Plugins Actifs et Thèmes (COMPLETED)
- [x] Widgets personnalisés avec requêtes API (5 types: api, chart, text, iframe, countdown)
- [x] Éditeur de widget avec preview en temps réel
- [x] Support des requêtes GET/POST avec headers et body
- [x] Exécution des plugins MQTT (connexion broker)
- [x] Exécution des plugins Home Assistant (API REST)
- [x] Console d'exécution des plugins avec logs
- [x] Système de thèmes visuels (6 thèmes: Jarvis, Iron Man, Matrix, Cyberpunk, Tron, Blade Runner)
- [x] Sélecteur de thème dans les paramètres avec prévisualisation
- [x] Effets visuels (glow, scanlines, particles)
- [x] Tests unitaires (122 tests passés)

## Phase 11 - Alertes Sonores, Mode Présentation et Assistant (COMPLETED)
- [x] Alertes sonores pour notifications critiques (8 types d'alertes)
- [x] Sons personnalisables (GPU, UPS, réseau, tâches, messages, erreurs)
- [x] Contrôle du volume des alertes (0-100%)
- [x] Configuration individuelle par type d'alerte
- [x] Mode présentation plein écran (F pour fullscreen)
- [x] Rotation automatique des widgets (5-60s configurable)
- [x] Contrôles de présentation (pause, suivant, précédent, clavier)
- [x] Assistant contextuel intelligent (suggestions en bas à droite)
- [x] Suggestions basées sur le contexte (page, message, heure)
- [x] Actions rapides depuis les suggestions
- [x] Tests unitaires (146 tests passés)

## Phase 12 - Animations et Mode Multi-écran (COMPLETED)
- [x] Animations de transition entre les pages (framer-motion)
- [x] Animations d'entrée/sortie des widgets
- [x] Transitions fluides pour les modales et popovers
- [x] Composants animés (AnimatedWidget, AnimatedList, AnimatedProgress, etc.)
- [x] Mode multi-écran avec fenêtres détachables (9 modules)
- [x] Synchronisation entre les fenêtres (BroadcastChannel API)
- [x] Persistance de la configuration multi-écran
- [x] Tests unitaires (177 tests passés)

## Phase 13 - Restructuration IHM v5.9.6 (COMPLETED)
- [x] Suppression module Workflow (hors scope ISO 42001)
- [x] Suppression module Plugins (risque sécurité)
- [x] Nettoyage navigation sidebar (7 modules conservés)
- [x] Mise à jour App.tsx routes
- [x] Mise à jour routers.ts backend
- [x] Mise à jour CHANGELOG.md GitHub
- [x] Mise à jour README.md GitHub
- [x] Création docs/IHM_STATUS.md GitHub (Source of Truth)
- [x] Mise à jour docs/README.md GitHub

## Vision Jarvis IHM

**Jarvis n'est PAS un chatbot.** C'est un assistant IA qui pilote un PC physique via :
- Acquisition HDMI (il "voit" l'écran)
- Caméra C2I (vision physique)
- Teensy (contrôle clavier/souris)

L'IHM est une interface de supervision, pas l'outil principal.

## Modules Conservés

| Module | Description |
|--------|-------------|
| Dialogue | Chat avec Jarvis (LLM Forge API) |
| Dashboard | Widgets personnalisables |
| Logs | Visualisation des logs |
| Tâches | Kanban avec workflow |
| Hardware | Métriques temps réel (intégrées, pas de Grafana) |
| Calendrier | Jobs planifiés |
| Connaissances | Documents + RAG |

## Architecture d'Accès

| Phase | Méthode |
|-------|---------|
| Phase 1 | Local uniquement (http://jarvis.local:3000) |
| Phase 2 | Réseau local + authentification |
| Phase 3 | VPN WireGuard pour accès distant |

## Prochaines Étapes

- [x] IHM-010 : Création tâche depuis Dialogue
- [x] IHM-011 : Ajout job au calendrier depuis Dialogue
- [x] IHM-012 : Documentation accès local-first
- [x] IHM-013 : Documentation intégration Jarvis Core
- [x] IHM-020 : Tests E2E Browser (Playwright)
- [x] IHM-030 : PrometheusClient helper créé
- [x] IHM-031 : HardwareDashboard connecté à Prometheus
- [x] IHM-040 : Redis Pub/Sub subscriber créé
- [x] IHM-050 : Synchroniser tâches avec Redis Core
- [x] IHM-060 : Remplacer LLM Forge par API N2 (avec fallback)

## Phase 14 - Intégration et Documentation (COMPLETED)
- [x] Fusionner IHM_STATUS.md dans docs/STATUS.md (section IHM)
- [x] Supprimer docs/IHM_STATUS.md (fichier séparé)
- [x] Implémenter création de tâche depuis le Dialogue ("rappelle-moi de...", "ajoute une tâche...")
- [x] Implémenter ajout job au calendrier depuis le Dialogue ("planifie", "programme")
- [x] Documenter configuration accès local-first (docs/IHM_LOCAL_ACCESS.md)
- [x] Préparer intégration Jarvis Core (docs/IHM_JARVIS_CORE_INTEGRATION.md)
- [x] Mise à jour GitHub (CHANGELOG, README, STATUS, docs/README)

## Phase 15 - Intégration Prometheus et Redis (COMPLETED)
- [x] IHM-030 : PrometheusClient helper créé (server/_core/prometheus.ts)
- [x] IHM-031 : HardwareDashboard connecté à Prometheus (avec fallback local)
- [x] IHM-040 : Redis Pub/Sub subscriber créé (server/_core/redis.ts)
- [x] IHM-041 : Logs N0/N1/N2 affichés en temps réel (LogViewer connecté tRPC)
- [x] Test création de tâche depuis le Dialogue : SUCCÈS
- [x] Mise à jour docs/STATUS.md sur GitHub

## Phase 16 - Synchronisation Redis, API N2 et Tests E2E (COMPLETED)
- [x] IHM-050 : Subscriber Redis pour tâches créées par N2/N1 (server/_core/taskSync.ts)
- [x] IHM-050 : Synchronisation bidirectionnelle tâches IHM ↔ Redis Core
- [x] IHM-060 : Client API N2 pour le chat (server/_core/n2Client.ts)
- [x] IHM-060 : Fallback automatique vers Forge si N2 non disponible
- [x] IHM-020 : Setup Playwright pour tests E2E (playwright.config.ts)
- [x] IHM-020 : Tests navigation entre modules (e2e/navigation.spec.ts)
- [x] IHM-020 : Tests chat et création de tâche (e2e/chat.spec.ts)
- [x] IHM-020 : Tests TaskBoard Kanban (e2e/tasks.spec.ts)
- [x] IHM-020 : Tests Hardware Dashboard (e2e/hardware.spec.ts)
- [x] Mise à jour GitHub (CHANGELOG v5.9.9, STATUS.md)

## Phase 17 - Configuration N2, Alertes Redis et Tests E2E (COMPLETED)
- [x] Configuration variables d'environnement N2 (N2_ENABLED, N2_API_URL)
- [x] Valeurs par défaut dans le code (N2_ENABLED=false, N2_API_URL=http://localhost:8000)
- [x] Documentation configuration N2 pour production
- [x] Alertes Redis pour tâches critiques créées par N2/N1
- [x] Notifications push via WebSocket pour tâches HIGH/CRITICAL
- [x] Exécution tests Vitest (158 tests passent, 100%)
- [x] Tests E2E Playwright créés (4 fichiers)
- [x] Mise à jour GitHub (CHANGELOG v5.9.10, STATUS.md)

## Phase 18 - Déploiement Local-First (TODO)
- [ ] IHM-090 : Configuration mDNS/Avahi (jarvis.local)
- [ ] IHM-091 : Certificats HTTPS auto-signés
- [ ] IHM-092 : Guide VPN WireGuard
- [ ] IHM-093 : Script de déploiement local
- [ ] Validation sur DGX Spark avec N2 Supervisor actif

## Phase 18 - Déploiement Local-First (COMPLETED)
- [x] IHM-090 : Documentation mDNS/Avahi (jarvis.local)
- [x] IHM-091 : Script de déploiement local avec systemd
- [x] IHM-092 : Certificats HTTPS auto-signés (mkcert/OpenSSL)
- [x] IHM-093 : Documentation activation N2 en production
- [x] IHM-094 : Guide VPN WireGuard pour accès distant
- [x] Mise à jour GitHub (CHANGELOG v5.9.11, STATUS.md, README.md)

## Documents Créés

| Document | Description |
|----------|-------------|
| `docs/IHM_DEPLOYMENT_LOCAL.md` | Guide complet de déploiement local |
| `docs/IHM_N2_PRODUCTION.md` | Activation N2 Supervisor en production |
| `docs/IHM_VPN_WIREGUARD.md` | Guide VPN WireGuard pour accès distant |
