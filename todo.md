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
