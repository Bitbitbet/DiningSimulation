CREATE DATABASE IF NOT EXISTS canteen_simulation DEFAULT CHARACTER SET utf8mb4;

USE canteen_simulation;

CREATE TABLE IF NOT EXISTS window_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    chef_id INT,
    dish_type VARCHAR(50),
    status VARCHAR(30),
    serve_rate DOUBLE,
    queue_length INT DEFAULT 0,
    estimated_wait_minutes INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chef_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    skill VARCHAR(50),
    current_order INT NULL,
    status VARCHAR(30),
    utilization DOUBLE DEFAULT 0
);

CREATE TABLE IF NOT EXISTS seat_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    occupied_by INT NULL,
    zone VARCHAR(30)
);

CREATE TABLE IF NOT EXISTS simulation_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    simulation_duration_minutes INT,
    arrival_rate DOUBLE,
    dish_ratio VARCHAR(100),
    average_prep_minutes DOUBLE,
    average_eat_minutes DOUBLE,
    window_count INT,
    chef_count INT,
    seat_count INT,
    auto_leave_when_full BOOLEAN
);

CREATE TABLE IF NOT EXISTS simulation_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    current_time_minute INT,
    average_queue_length DOUBLE,
    average_wait_minutes DOUBLE,
    chef_utilization DOUBLE,
    seat_turnover_rate DOUBLE,
    seat_idle_rate DOUBLE,
    congestion_rate DOUBLE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_event (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT,
    arrive_time DOUBLE,
    order_type VARCHAR(50),
    prep_time DOUBLE,
    eat_time DOUBLE,
    window_id INT,
    queue_start DOUBLE,
    queue_end DOUBLE,
    eat_start DOUBLE,
    leave_time DOUBLE,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO window_info
(id, chef_id, dish_type, status, serve_rate, queue_length, estimated_wait_minutes)
VALUES
(1, 1, 'A套餐', '忙碌', 1.2, 4, 12),
(2, 2, 'B套餐', '忙碌', 1.5, 2, 8),
(3, 3, 'C套餐', '忙碌', 1.1, 3, 10),
(4, 4, 'A套餐', '忙碌', 1.4, 2, 7);

INSERT IGNORE INTO chef_info
(id, skill, current_order, status, utilization)
VALUES
(1, 'A套餐偏快', 1001, '忙碌', 0.72),
(2, 'B套餐偏快', 1002, '忙碌', 0.68),
(3, 'C套餐偏快', NULL, '空闲', 0.35),
(4, '综合', 1004, '忙碌', 0.81);

INSERT IGNORE INTO seat_info
(id, occupied_by, zone)
VALUES
(1, 1012, '东区'),
(2, 1013, '东区'),
(3, NULL, '中区'),
(4, NULL, '中区'),
(5, 1021, '西区'),
(6, NULL, '西区');

INSERT IGNORE INTO simulation_config
(id, simulation_duration_minutes, arrival_rate, dish_ratio, average_prep_minutes, average_eat_minutes, window_count, chef_count, seat_count, auto_leave_when_full)
VALUES
(1, 180, 0.6, 'A:40%, B:35%, C:25%', 3.5, 24.0, 4, 4, 24, false);

-- simulation_history 不再插入占位数据。
-- 只有点击“开始仿真”并产生真实运行指标后，后端才会写入该表。
