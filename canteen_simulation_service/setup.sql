CREATE USER 'canteen_simulation'@'localhost' IDENTIFIED BY 'canteen_simulation';

CREATE DATABASE canteen_simulation_db;

GRANT SELECT, UPDATE, INSERT, DELETE on canteen_simulation_db.* TO 'canteen_simulation'@'localhost';

USE canteen_simulation_db;

CREATE TABLE sim_customer
(
    id INT PRIMARY KEY
);

CREATE TABLE sim_history
(
    id INT PRIMARY KEY
);

CREATE TABLE sim_window
(
    id INT PRIMARY KEY
);

CREATE TABLE simulation_data
(
    id INT PRIMARY KEY
);

CREATE TABLE sim_seat
(
    id INT PRIMARY KEY
);