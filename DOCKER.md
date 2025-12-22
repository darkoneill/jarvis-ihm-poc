# Jarvis IHM - Déploiement Docker

Guide complet pour déployer l'IHM Jarvis avec Docker.

## Prérequis

| Composant | Version minimale |
|-----------|------------------|
| Docker | 20.10+ |
| Docker Compose | 2.0+ |
| RAM disponible | 2 Go |
| Espace disque | 5 Go |

## Démarrage Rapide

```bash
# 1. Cloner le repository
git clone https://github.com/darkoneill/HugiMunr-test.git
cd HugiMunr-test/ihm

# 2. Générer les certificats SSL (première fois uniquement)
./docker/nginx/generate-ssl.sh

# 3. Copier et configurer l'environnement
cp docker/docker.env.example docker.env
# Éditer docker.env selon vos besoins

# 4. Lancer les services
docker-compose up -d

# 5. Vérifier le statut
docker-compose ps

# 6. Attendre le téléchargement du modèle Ollama (première fois)
docker-compose logs -f ollama-pull
```

L'IHM sera accessible sur :
- **HTTP** : `http://localhost` (redirige vers HTTPS)
- **HTTPS** : `https://localhost` ou `https://jarvis.local`

> **Note** : Le certificat est auto-signé, votre navigateur affichera un avertissement de sécurité.

## Services Inclus

| Service | Port | Description |
|---------|------|-------------|
| nginx | 80, 443 | Reverse proxy HTTPS |
| jarvis-ihm | 3000 (interne) | Application IHM |
| ollama | 11434 | LLM local (llama3.2:3b) |
| mysql | 3306 | Base de données MySQL 8.0 |
| redis | 6379 | Cache et Pub/Sub pour logs |

## Configuration

### Variables d'Environnement

Créer un fichier `docker.env` à partir de `docker/docker.env.example` :

```bash
cp docker/docker.env.example docker.env
```

Puis modifier les valeurs selon vos besoins.

### Authentification Locale

Par défaut, l'authentification locale est activée. Les identifiants par défaut sont :

| Champ | Valeur |
|-------|--------|
| Username | admin |
| Password | jarvis2024 |

Pour changer le mot de passe, connectez-vous et allez dans Paramètres.

### Configuration LLM

Pour utiliser un LLM local (Ollama) :

```env
OLLAMA_URL=http://host.docker.internal:11434
```

Pour utiliser le N2 Supervisor (DGX Spark) :

```env
N2_ENABLED=true
N2_API_URL=http://host.docker.internal:8000
```

## Commandes Utiles

```bash
# Démarrer les services
docker-compose up -d

# Voir les logs
docker-compose logs -f jarvis-ihm

# Arrêter les services
docker-compose down

# Reconstruire l'image
docker-compose build --no-cache

# Réinitialiser la base de données
docker-compose down -v
docker-compose up -d
```

## Mise à Jour

```bash
# Récupérer les dernières modifications
git pull origin main

# Reconstruire et redémarrer
docker-compose build
docker-compose up -d
```

## Sauvegarde

### Base de données

```bash
# Export
docker exec jarvis-mysql mysqldump -u jarvis -pjarvis2024 jarvis_ihm > backup.sql

# Import
docker exec -i jarvis-mysql mysql -u jarvis -pjarvis2024 jarvis_ihm < backup.sql
```

### Volumes

```bash
# Sauvegarder les volumes
docker run --rm -v jarvis-ihm_mysql-data:/data -v $(pwd):/backup alpine tar czf /backup/mysql-backup.tar.gz /data
```

## Dépannage

### L'application ne démarre pas

Vérifier les logs :
```bash
docker-compose logs jarvis-ihm
```

Vérifier que MySQL est prêt :
```bash
docker-compose logs mysql
```

### Erreur de connexion à la base de données

Vérifier que le service MySQL est healthy :
```bash
docker-compose ps
```

Tester la connexion :
```bash
docker exec -it jarvis-mysql mysql -u jarvis -pjarvis2024 jarvis_ihm
```

### Port déjà utilisé

Modifier le port dans `docker-compose.yml` :
```yaml
ports:
  - "8080:3000"  # Utiliser le port 8080 au lieu de 3000
```

## Production

Pour un déploiement en production, modifier les valeurs suivantes :

1. **JWT_SECRET** : Générer une clé sécurisée
   ```bash
   openssl rand -base64 32
   ```

2. **MYSQL_ROOT_PASSWORD** : Utiliser un mot de passe fort

3. **Activer HTTPS** : Utiliser un reverse proxy (nginx, traefik) avec certificat SSL

4. **Sauvegardes automatiques** : Configurer un cron job pour les backups


## Configuration Ollama

### Modèle par défaut

Le modèle `llama3.2:3b` est téléchargé automatiquement au premier démarrage. Pour utiliser un autre modèle :

```bash
# Télécharger un modèle
docker exec -it jarvis-ollama ollama pull mistral:7b

# Lister les modèles disponibles
docker exec -it jarvis-ollama ollama list
```

### Modèles recommandés

| Modèle | Taille | RAM requise | Description |
|--------|--------|-------------|-------------|
| llama3.2:3b | 2 Go | 4 Go | Rapide, bon pour les tâches simples |
| llama3.2:8b | 4.7 Go | 8 Go | Équilibré, recommandé |
| mistral:7b | 4 Go | 8 Go | Excellent pour le français |
| codellama:7b | 4 Go | 8 Go | Spécialisé code |

### Support GPU (NVIDIA)

Pour activer le GPU, décommenter la section `deploy` dans `docker-compose.yml` :

```yaml
ollama:
  # ...
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: all
            capabilities: [gpu]
```

Prérequis : NVIDIA Container Toolkit installé.

## Accès via jarvis.local

Pour accéder à l'IHM via `https://jarvis.local` :

### Linux/macOS

Ajouter dans `/etc/hosts` :
```
127.0.0.1 jarvis.local
```

### Windows

Ajouter dans `C:\Windows\System32\drivers\etc\hosts` :
```
127.0.0.1 jarvis.local
```
