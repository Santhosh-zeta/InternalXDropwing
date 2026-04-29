-- =============================================
-- RUN THIS ENTIRE FILE IN MYSQL WORKBENCH FIRST
-- Then run: npm run seed  (in the backend folder)
-- =============================================

-- 1. Create the database
CREATE DATABASE IF NOT EXISTS u247884947_InternalDG
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 2. Use it
USE u247884947_InternalDG;

-- 3. (Optional) Create a dedicated app user
--    Skip this block if you're just using root locally
-- CREATE USER IF NOT EXISTS 'internalx_app'@'localhost' IDENTIFIED BY 'InternalX@Local26';
-- GRANT ALL PRIVILEGES ON u247884947_InternalDG.* TO 'internalx_app'@'localhost';
-- FLUSH PRIVILEGES;

SELECT 'Database created successfully!' AS Status;
