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

# 2. Copier et configurer l'environnement
cp docker/docker.env.example docker.env
# Éditer docker.env selon vos besoins

# 3. Lancer les services
docker-compose up -d

# 4. Vérifier le statut
docker-compose ps
```

L'IHM sera accessible sur `http://localhost:3000`.

## Services Inclus

| Service | Port | Description |
|---------|------|-------------|
| jarvis-ihm | 3000 | Application IHM |
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
