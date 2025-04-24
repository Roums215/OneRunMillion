-- OneRun Premium Database Schema
-- Migration vers Railway

-- Création des tables avec le même schéma que la base de données IONOS

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  displayName VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(255),
  totalSpent DECIMAL(10, 2) DEFAULT 0.00,
  currentRank INT DEFAULT 0,
  isAdmin BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des badges
CREATE TABLE IF NOT EXISTS badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255) NOT NULL,
  threshold DECIMAL(10, 2) NOT NULL,
  color VARCHAR(20) DEFAULT 'gold'
);

-- Table des relations utilisateur/badge
CREATE TABLE IF NOT EXISTS user_badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  badgeId INT NOT NULL,
  earnedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (badgeId) REFERENCES badges(id) ON DELETE CASCADE
);

-- Table des paiements
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  paymentMethod VARCHAR(50) NOT NULL,
  paymentId VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Table du classement hebdomadaire
CREATE TABLE IF NOT EXISTS weekly_leaderboard (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  rank INT NOT NULL,
  weekStartDate DATE NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Table du classement mensuel
CREATE TABLE IF NOT EXISTS monthly_leaderboard (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  rank INT NOT NULL,
  monthStartDate DATE NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Insertion des badges par défaut
INSERT INTO badges (name, description, threshold, color) VALUES
('Bronze', 'Premier palier de contribution', 100.00, 'bronze'),
('Silver', 'Contributeur régulier', 500.00, 'silver'),
('Gold', 'Contributeur important', 1000.00, 'gold'),
('Platinum', 'Contributeur majeur', 5000.00, 'platinum'),
('Diamond', 'Élite des contributeurs', 10000.00, 'diamond');

-- Procédure pour mettre à jour les classements hebdomadaires
DELIMITER //
CREATE PROCEDURE updateWeeklyLeaderboard()
BEGIN
  DECLARE currentWeekStart DATE;
  SET currentWeekStart = DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY);
  
  -- Suppression des anciennes entrées pour la semaine en cours
  DELETE FROM weekly_leaderboard WHERE weekStartDate = currentWeekStart;
  
  -- Insertion des nouveaux classements
  INSERT INTO weekly_leaderboard (userId, amount, rank, weekStartDate)
  SELECT 
    u.id, 
    SUM(p.amount) as totalAmount,
    RANK() OVER (ORDER BY SUM(p.amount) DESC) as userRank,
    currentWeekStart
  FROM users u
  JOIN payments p ON u.id = p.userId
  WHERE p.createdAt >= currentWeekStart AND p.status = 'succeeded'
  GROUP BY u.id
  HAVING totalAmount > 0
  ORDER BY totalAmount DESC;
END;

-- Procédure pour mettre à jour les classements mensuels
CREATE PROCEDURE updateMonthlyLeaderboard()
BEGIN
  DECLARE currentMonthStart DATE;
  SET currentMonthStart = DATE_FORMAT(CURDATE(), '%Y-%m-01');
  
  -- Suppression des anciennes entrées pour le mois en cours
  DELETE FROM monthly_leaderboard WHERE monthStartDate = currentMonthStart;
  
  -- Insertion des nouveaux classements
  INSERT INTO monthly_leaderboard (userId, amount, rank, monthStartDate)
  SELECT 
    u.id, 
    SUM(p.amount) as totalAmount,
    RANK() OVER (ORDER BY SUM(p.amount) DESC) as userRank,
    currentMonthStart
  FROM users u
  JOIN payments p ON u.id = p.userId
  WHERE p.createdAt >= currentMonthStart AND p.status = 'succeeded'
  GROUP BY u.id
  HAVING totalAmount > 0
  ORDER BY totalAmount DESC;
END;

-- Procédure stockée pour mettre à jour le total dépensé et les badges
CREATE PROCEDURE update_user_after_payment(
  IN p_user_id INT,
  IN p_amount DECIMAL(10, 2)
)
BEGIN
  DECLARE current_total DECIMAL(10, 2);
  
  -- Mettre à jour le total dépensé
  UPDATE users 
  SET totalSpent = totalSpent + p_amount
  WHERE id = p_user_id;
  
  -- Récupérer le nouveau total
  SELECT totalSpent INTO current_total 
  FROM users 
  WHERE id = p_user_id;
  
  -- Ajouter les badges en fonction du montant total
  IF current_total >= 1000000 THEN
    INSERT IGNORE INTO user_badges (userId, badgeId) 
    VALUES (p_user_id, (SELECT id FROM badges WHERE name = 'Millionaire'));
  ELSEIF current_total >= 100000 THEN
    INSERT IGNORE INTO user_badges (userId, badgeId) 
    VALUES (p_user_id, (SELECT id FROM badges WHERE name = 'Top Spender'));
  ELSEIF current_total >= 10000 THEN
    INSERT IGNORE INTO user_badges (userId, badgeId) 
    VALUES (p_user_id, (SELECT id FROM badges WHERE name = 'Whale'));
  ELSEIF current_total >= 5000 THEN
    INSERT IGNORE INTO user_badges (userId, badgeId) 
    VALUES (p_user_id, (SELECT id FROM badges WHERE name = 'Dedicated'));
  ELSEIF current_total >= 1000 THEN
    INSERT IGNORE INTO user_badges (userId, badgeId) 
    VALUES (p_user_id, (SELECT id FROM badges WHERE name = 'Enthusiast'));
  ELSEIF current_total >= 500 THEN
    INSERT IGNORE INTO user_badges (userId, badgeId) 
    VALUES (p_user_id, (SELECT id FROM badges WHERE name = 'Rookie'));
  ELSEIF current_total > 0 THEN
    INSERT IGNORE INTO user_badges (userId, badgeId) 
    VALUES (p_user_id, (SELECT id FROM badges WHERE name = 'Newcomer'));
  END IF;
END;

-- Événements pour mettre à jour automatiquement les classements
CREATE EVENT IF NOT EXISTS weekly_leaderboard_update
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO CALL updateWeeklyLeaderboard();

CREATE EVENT IF NOT EXISTS monthly_leaderboard_update
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO CALL updateMonthlyLeaderboard();
