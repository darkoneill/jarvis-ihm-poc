# Spécification Monitoring Hardware Jarvis v5.9

Basé sur la BOM fournie, voici les composants et métriques à intégrer dans le Dashboard Hardware.

## 1. Nœuds de Calcul (Compute Nodes)

### Nœud Orchestrateur (DGX Spark / ASUS Ascent GX10)
*   **Rôle** : Planification, LLM, RAG, IHM
*   **Métriques Critiques** :
    *   **CPU** : Charge globale, Température
    *   **RAM** : Utilisation (Total 128 Go), Swap
    *   **GPU (NVIDIA)** : Utilisation Compute, Utilisation Mémoire, Température, Puissance (W)
    *   **Stockage NVMe (RAG)** : Espace libre, IOPS, Santé SMART (Usure %)
    *   **Stockage Secondaire (Logs)** : Espace libre, IOPS

### Nœud Réflexe (Jetson Thor Dev Kit)
*   **Rôle** : Vision, Audio, Action Temps Réel (< 60ms)
*   **Métriques Critiques** :
    *   **SoC (CPU/GPU/NPU)** : Charge globale, Température Tegra
    *   **RAM** : Utilisation (Total 128 Go)
    *   **Latence** : Temps de boucle réflexe (ms)
    *   **Périphériques** : État Caméra (FPS), État Teensy (Connecté/Déconnecté)

## 2. Infrastructure Réseau (Network)

### Switch & Pare-feu (Netgate 6100 / Switch L2)
*   **Métriques** :
    *   **Bande Passante** : Débit Entrant/Sortant (Gbps) sur lien 10/25 GbE
    *   **Latence** : Ping entre Nœud Orchestrateur et Nœud Réflexe
    *   **Ports** : État des ports (UP/DOWN), Erreurs CRC

## 3. Alimentation & Résilience (Power)

### UPS (APC Smart-UPS 1500 VA)
*   **Métriques** :
    *   **État** : En ligne / Sur batterie
    *   **Charge** : % de charge supportée
    *   **Batterie** : % de charge restante, Temps estimé (Runtime)
    *   **Tension** : Entrée (V), Sortie (V)

## 4. Structure du Dashboard

Le dashboard sera divisé en 3 zones principales :

1.  **Vue Synthétique (Top Bar)** :
    *   État Global (OK/WARN/CRIT)
    *   Charge Système Moyenne
    *   État UPS (Batterie %)

2.  **Détail Nœuds (Cartes)** :
    *   Carte "Orchestrateur" (CPU/RAM/GPU/Disk)
    *   Carte "Réflexe" (SoC/RAM/Latence/Caméra)

3.  **Infrastructure (Bas de page)** :
    *   Réseau (Graphique débit temps réel)
    *   Stockage (Jauges remplissage)
    *   Alimentation (État UPS)

## 5. API Endpoints Nécessaires

*   `GET /api/hardware/status` : État complet de tous les composants
*   `WS /ws/hardware` : Streaming temps réel des métriques (1Hz)
