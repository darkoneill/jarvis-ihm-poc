-- Jarvis IHM - Script d'initialisation MySQL
-- Ce script est exécuté automatiquement au premier démarrage du conteneur

-- Configuration du charset
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Création de l'utilisateur admin par défaut pour l'authentification locale
-- Mot de passe: jarvis2024 (hash bcrypt)
INSERT INTO users (openId, username, passwordHash, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn)
VALUES (
    'local-admin-default',
    'admin',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'Administrateur',
    'admin@jarvis.local',
    'local',
    'admin',
    NOW(),
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE updatedAt = NOW();

-- Message de confirmation
SELECT 'Jarvis IHM database initialized successfully!' AS status;
