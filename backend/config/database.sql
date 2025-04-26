-- Script de création de la base de données OneRun pour MySQL
-- À exécuter dans phpMyAdmin ou via la ligne de commande MySQL

-- Création de la base de données
CREATE DATABASE IF NOT EXISTS onerun CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE onerun;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  display_name VARCHAR(50),
  avatar VARCHAR(255) DEFAULT 'default-avatar.png',
  total_spent DECIMAL(10, 2) DEFAULT 0.00,
  current_rank INT DEFAULT 0,
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  profile_theme ENUM('default', 'gold', 'platinum', 'diamond', 'obsidian') DEFAULT 'default'
) ENGINE=InnoDB;

-- Table des badges utilisateurs
CREATE TABLE IF NOT EXISTS user_badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  badge_name ENUM('Newcomer', 'Rookie', 'Enthusiast', 'Dedicated', 'Whale', 'Top Spender', 'Millionaire') NOT NULL,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_badge (user_id, badge_name)
) ENGINE=InnoDB;

-- Table des effets de profil
CREATE TABLE IF NOT EXISTS profile_effects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  effect_name VARCHAR(100) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_effect (user_id, effect_name)
) ENGINE=InnoDB;

-- Table des paiements
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency ENUM('USD', 'EUR', 'GBP', 'JPY', 'CHF') DEFAULT 'USD',
  payment_method ENUM('credit_card', 'debit_card', 'crypto', 'bank_transfer') NOT NULL,
  stripe_payment_id VARCHAR(255),
  crypto_transaction_id VARCHAR(255),
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  rank_before INT,
  rank_after INT,
  description VARCHAR(255) DEFAULT 'OneRun rank payment',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Index pour accélérer les requêtes
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_status ON payments(status);

-- Procédure stockée pour mettre à jour le total dépensé et les badges
DELIMITER //
CREATE PROCEDURE update_user_after_payment(
  IN p_user_id INT,
  IN p_amount DECIMAL(10, 2)
)
BEGIN
  DECLARE current_total DECIMAL(10, 2);
  
  -- Mettre à jour le total dépensé
  UPDATE users 
  SET total_spent = total_spent + p_amount
  WHERE id = p_user_id;
  
  -- Récupérer le nouveau total
  SELECT total_spent INTO current_total 
  FROM users 
  WHERE id = p_user_id;
  
  -- Ajouter les badges en fonction du montant total
  IF current_total >= 1000000 THEN
    INSERT IGNORE INTO user_badges (user_id, badge_name) 
    VALUES (p_user_id, 'Millionaire');
  ELSEIF current_total >= 100000 THEN
    INSERT IGNORE INTO user_badges (user_id, badge_name) 
    VALUES (p_user_id, 'Top Spender');
  ELSEIF current_total >= 10000 THEN
    INSERT IGNORE INTO user_badges (user_id, badge_name) 
    VALUES (p_user_id, 'Whale');
  ELSEIF current_total >= 5000 THEN
    INSERT IGNORE INTO user_badges (user_id, badge_name) 
    VALUES (p_user_id, 'Dedicated');
  ELSEIF current_total >= 1000 THEN
    INSERT IGNORE INTO user_badges (user_id, badge_name) 
    VALUES (p_user_id, 'Enthusiast');
  ELSEIF current_total >= 500 THEN
    INSERT IGNORE INTO user_badges (user_id, badge_name) 
    VALUES (p_user_id, 'Rookie');
  ELSEIF current_total > 0 THEN
    INSERT IGNORE INTO user_badges (user_id, badge_name) 
    VALUES (p_user_id, 'Newcomer');
  END IF;
END //
DELIMITER ;

-- Créer un utilisateur administrateur pour les tests (mot de passe: Admin123!)
-- Le mot de passe est déjà haché - en production, vous utiliseriez bcrypt côté application
INSERT INTO users (username, email, password, display_name, current_rank, profile_theme) 
VALUES ('admin', 'admin@onerun.com', '$2a$10$wPZCM7EGAh8mZ3sEKvUVs.Jv8J7HTK9D3OGxyfL.VXEwl0vSBJXae', 'Admin', 1, 'gold')
ON DUPLICATE KEY UPDATE id = id;
