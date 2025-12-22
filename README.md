# Jarvis IHM PoC v5.9.0-alpha

Interface Homme-Machine (IHM) nouvelle génération pour le système Jarvis, basée sur une architecture modulaire et réactive.

## 🚀 Fonctionnalités Implémentées

### 1. Module Dialogue (Chat)
*   Interface de chat temps réel avec support Markdown.
*   Streaming de réponse via WebSocket.
*   Indicateur de statut de connexion (N2 Orchestrator).

### 2. Module Observabilité (Logs)
*   Visualisation des logs système en temps réel.
*   Filtrage par niveau (INFO, WARN, ERROR) et recherche textuelle.
*   Coloration syntaxique et auto-scroll.

### 3. Module Tâches (Kanban)
*   Gestion des tâches par glisser-déposer (Drag & Drop).
*   Colonnes : À faire, En cours, Terminé.
*   Gestion des priorités (Basse, Moyenne, Haute, Critique).

### 4. Dashboard Hardware (Monitoring)
*   **Nœud Orchestrateur (DGX Spark)** : CPU, RAM, GPU, Température, Puissance.
*   **Nœud Réflexe (Jetson Thor)** : SoC, RAM, NPU, Latence, Caméra.
*   **Infrastructure** :
    *   Réseau : Débit temps réel (Switch 25GbE).
    *   Stockage : État NVMe RAG et Logs.
    *   Alimentation : État batterie UPS (APC 1500VA).

## 🛠️ Stack Technique

*   **Frontend** : React 19, Vite, Tailwind CSS 4.
*   **UI Kit** : shadcn/ui, Lucide Icons.
*   **Communication** : WebSockets (FastAPI backend compatible).
*   **Charts** : Recharts.

## 🖥️ Hardware Supporté (BOM v5.9)

Ce dashboard est conçu pour monitorer l'architecture matérielle suivante :

| Composant | Modèle | Rôle |
|-----------|--------|------|
| **Nœud IA Principal** | DGX Spark / ASUS Ascent GX10 | Orchestration, LLM, RAG |
| **Nœud Réflexe** | NVIDIA Jetson Thor Dev Kit | Vision, Audio, Action (<60ms) |
| **Réseau** | Netgate 6100 + Switch 25GbE | Sécurité, Interconnexion haute vitesse |
| **Stockage** | NVMe 2-4To (RAG) + 1-2To (Logs) | Base de connaissances, Audit |
| **Alimentation** | APC Smart-UPS 1500 VA | Continuité de service |
| **Périphériques** | Teensy 4.1, Carte Capture A/V | Entrées/Sorties temps réel |

## 📦 Installation & Démarrage

```bash
# Installer les dépendances
pnpm install

# Lancer le serveur de développement
pnpm dev
```

L'application sera accessible sur `http://localhost:3000`.
