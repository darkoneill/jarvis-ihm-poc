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

- [ ] IHM-010 : Création tâche depuis Dialogue
- [ ] IHM-011 : Ajout tâche au calendrier depuis Dialogue
- [ ] IHM-012 : Configuration accès local-first
- [ ] IHM-020 : Tests E2E Browser (Playwright)
