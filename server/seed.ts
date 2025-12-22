import { getDb } from "./db";
import { tasks, scheduledJobs, knowledgeDocuments, workflows } from "../drizzle/schema";

async function seed() {
  console.log("🌱 Starting database seed...");
  
  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    process.exit(1);
  }

  try {
    // Seed Tasks
    console.log("📋 Seeding tasks...");
    await db.insert(tasks).values([
      {
        title: "Configurer le pipeline RAG",
        description: "Mettre en place le pipeline d'indexation des documents pour la base de connaissances vectorielle",
        status: "done",
        priority: "high",
        dueDate: new Date("2024-12-20"),
      },
      {
        title: "Optimiser la latence N0",
        description: "Réduire le temps de réponse de la boucle réflexe sous 50ms pour les actions critiques",
        status: "in_progress",
        priority: "high",
        dueDate: new Date("2024-12-25"),
      },
      {
        title: "Intégrer les capteurs IoT",
        description: "Connecter les capteurs de température et d'humidité au système de monitoring",
        status: "todo",
        priority: "medium",
        dueDate: new Date("2024-12-30"),
      },
      {
        title: "Backup automatique NAS",
        description: "Configurer les sauvegardes automatiques quotidiennes vers le NAS Synology",
        status: "done",
        priority: "medium",
        dueDate: new Date("2024-12-15"),
      },
      {
        title: "Tests de charge GPU",
        description: "Exécuter des benchmarks sur les 8 A100 pour valider les performances sous charge",
        status: "todo",
        priority: "low",
        dueDate: new Date("2025-01-05"),
      },
      {
        title: "Documentation API",
        description: "Rédiger la documentation complète des endpoints tRPC pour les développeurs",
        status: "in_progress",
        priority: "medium",
        dueDate: new Date("2024-12-28"),
      },
    ]);

    // Seed Scheduled Jobs
    console.log("⏰ Seeding scheduled jobs...");
    await db.insert(scheduledJobs).values([
      {
        name: "Backup RAG Database",
        description: "Sauvegarde quotidienne de la base de données vectorielle",
        cronExpression: "0 3 * * *",
        enabled: true,
        lastRun: new Date("2024-12-21T03:00:00"),
        nextRun: new Date("2024-12-22T03:00:00"),
      },
      {
        name: "Health Check Nodes",
        description: "Vérification de l'état de santé des nœuds N2 et N0",
        cronExpression: "*/5 * * * *",
        enabled: true,
        lastRun: new Date(),
        nextRun: new Date(Date.now() + 5 * 60 * 1000),
      },
      {
        name: "Clean Old Logs",
        description: "Nettoyage des logs de plus de 30 jours",
        cronExpression: "0 4 * * 0",
        enabled: true,
        lastRun: new Date("2024-12-15T04:00:00"),
        nextRun: new Date("2024-12-22T04:00:00"),
      },
      {
        name: "GPU Temperature Monitor",
        description: "Surveillance des températures GPU avec alertes",
        cronExpression: "*/1 * * * *",
        enabled: true,
        lastRun: new Date(),
        nextRun: new Date(Date.now() + 60 * 1000),
      },
      {
        name: "Weekly Report",
        description: "Génération du rapport hebdomadaire de performance",
        cronExpression: "0 8 * * 1",
        enabled: false,
        lastRun: new Date("2024-12-16T08:00:00"),
        nextRun: new Date("2024-12-23T08:00:00"),
      },
    ]);

    // Seed Knowledge Documents
    console.log("📚 Seeding knowledge documents...");
    await db.insert(knowledgeDocuments).values([
      {
        title: "Architecture Jarvis v5.9",
        content: `# Architecture Jarvis v5.9

## Vue d'ensemble
Jarvis v5.9 est un système d'IA distribué composé de trois niveaux de traitement :

### N2 - Orchestrator (DGX Spark)
- **Rôle** : Planification long terme, raisonnement complexe
- **Hardware** : 8x NVIDIA A100 80GB, 1TB RAM, 128 cores AMD EPYC
- **Latence** : 500ms - 5s pour les tâches de raisonnement

### N1 - Investigator
- **Rôle** : Recherche, audit, analyse approfondie
- **Capacités** : Web scraping, analyse de documents, vérification des faits

### N0 - Reflex (Jetson Thor)
- **Rôle** : Boucle rapide, vision, action temps réel
- **Hardware** : Thor SoC avec GPU Blackwell intégré, 128GB unified memory
- **Latence** : < 60ms pour les actions réflexes`,
        source: "internal",
        fileType: "markdown",
      },
      {
        title: "Guide de Configuration RAG",
        content: `# Configuration du Pipeline RAG

## Prérequis
- PostgreSQL avec extension pgvector
- Modèle d'embedding : text-embedding-3-large
- Chunk size recommandé : 512 tokens

## Étapes de configuration
1. Créer la table vectorielle
2. Configurer l'indexation HNSW
3. Définir les métadonnées de recherche
4. Tester avec des requêtes de validation

## Paramètres optimaux
- ef_construction: 200
- m: 16
- ef_search: 100`,
        source: "internal",
        fileType: "markdown",
      },
      {
        title: "Procédures d'urgence",
        content: `# Procédures d'urgence Jarvis

## Surchauffe GPU
1. Réduire immédiatement la charge de travail
2. Vérifier la ventilation du rack
3. Si T > 85°C, arrêt d'urgence automatique

## Perte de connexion N0
1. Basculer en mode dégradé (N2 seul)
2. Alerter l'équipe de maintenance
3. Vérifier le câblage réseau

## Batterie UPS critique
1. Sauvegarder les états en cours
2. Arrêt gracieux des services non essentiels
3. Maintenir uniquement le monitoring`,
        source: "internal",
        fileType: "markdown",
      },
      {
        title: "API Reference - tRPC Endpoints",
        content: `# API Reference Jarvis v5.9

## Tasks API
- \`tasks.list\` - Liste toutes les tâches
- \`tasks.create\` - Crée une nouvelle tâche
- \`tasks.update\` - Met à jour une tâche
- \`tasks.delete\` - Supprime une tâche
- \`tasks.updateStatus\` - Change le statut d'une tâche

## Hardware API
- \`hardware.getMetrics\` - Métriques système
- \`hardware.getDgxSparkMetrics\` - Métriques DGX Spark
- \`hardware.getJetsonThorMetrics\` - Métriques Jetson Thor
- \`hardware.getInfrastructureMetrics\` - Métriques infrastructure

## Chat API
- \`chat.sendMessage\` - Envoie un message au LLM
- \`chat.clearHistory\` - Efface l'historique
- \`chat.getHistory\` - Récupère l'historique`,
        source: "internal",
        fileType: "markdown",
      },
    ]);

    // Seed Workflows
    console.log("🔄 Seeding workflows...");
    await db.insert(workflows).values([
      {
        name: "Daily Health Report",
        description: "Génère un rapport de santé quotidien du système",
        nodes: [
          { id: '1', type: 'input', data: { label: 'Cron Trigger (08:00)' }, position: { x: 250, y: 50 } },
          { id: '2', data: { label: 'Fetch Hardware Metrics' }, position: { x: 100, y: 200 } },
          { id: '3', data: { label: 'Generate Report (LLM)' }, position: { x: 400, y: 200 } },
          { id: '4', type: 'output', data: { label: 'Send Email' }, position: { x: 250, y: 350 } },
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e1-3', source: '1', target: '3' },
          { id: 'e2-4', source: '2', target: '4' },
          { id: 'e3-4', source: '3', target: '4' },
        ],
        enabled: true,
      },
      {
        name: "Alert Pipeline",
        description: "Pipeline d'alertes pour les événements critiques",
        nodes: [
          { id: '1', type: 'input', data: { label: 'Event Trigger' }, position: { x: 250, y: 50 } },
          { id: '2', data: { label: 'Analyze Severity' }, position: { x: 250, y: 150 } },
          { id: '3', data: { label: 'Send Notification' }, position: { x: 100, y: 300 } },
          { id: '4', type: 'output', data: { label: 'Log Event' }, position: { x: 400, y: 300 } },
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' },
          { id: 'e2-4', source: '2', target: '4' },
        ],
        enabled: true,
      },
      {
        name: "Document Indexer",
        description: "Indexe automatiquement les nouveaux documents dans le RAG",
        nodes: [
          { id: '1', type: 'input', data: { label: 'File Upload Trigger' }, position: { x: 250, y: 50 } },
          { id: '2', data: { label: 'Extract Text' }, position: { x: 250, y: 150 } },
          { id: '3', data: { label: 'Generate Embeddings' }, position: { x: 250, y: 250 } },
          { id: '4', type: 'output', data: { label: 'Store in Vector DB' }, position: { x: 250, y: 350 } },
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' },
          { id: 'e3-4', source: '3', target: '4' },
        ],
        enabled: false,
      },
    ]);

    console.log("✅ Database seeded successfully!");
    
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

// Run seed
seed().then(() => process.exit(0));
