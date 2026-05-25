CREATE USER 'canteen_sim'@'localhost' IDENTIFIED BY 'canteen_simulation';

CREATE DATABASE canteen_simulation_db;

GRANT SELECT, UPDATE, INSERT, DELETE on canteen_simulation_db.* TO 'canteen_sim'@'localhost';

USE canteen_simulation_db;

create table sim_window
(
    id                        int auto_increment
        primary key,
    simulation_id             int         null,
    dish_type                 varchar(50) null,
    window_prep_time_modifier double      null,
    free_since                double      null
);

create index idx_simulation_id
    on sim_window (simulation_id);

-- auto-generated definition
create table sim_seat
(
    id               int    not null,
    simulation_id    int    not null,
    four_free_since  double null,
    three_free_since double null,
    two_free_since   double null,
    one_free_since   double null,
    primary key (simulation_id, id)
);

create index idx_simulation_id
    on sim_seat (simulation_id);

-- auto-generated definition
create table sim_history
(
    id                                 bigint auto_increment
        primary key,
    simulation_id                      int    null,
    time                               double null,
    average_queue_length               double null,
    average_customer_wait_seat_seconds double null,
    chef_utilization                   double null,
    seat_turnover                      double null,
    seat_idle_rate                     double null,
    congestion_rate                    double null
);

create index idx_simulation_id
    on sim_history (simulation_id);

-- auto-generated definition
create table sim_customer
(
    id                          int         not null,
    simulation_id               int         not null,
    group_id                    int         null,
    group_size                  int         null,
    simulated_dish_prep_seconds double      null,
    simulated_eat_time_seconds  double      null,
    arrive_time                 double      null,
    order_type                  varchar(50) null,
    state                       varchar(50) null,
    dish_prep_end_time          double      null,
    start_waiting_for_seat_time double      null,
    eat_end_time                double      null,
    seat_id                     int         null,
    primary key (simulation_id, id)
);

create index idx_simulation_id
    on sim_customer (simulation_id);

-- auto-generated definition
create table simulation_data
(
    id                                 int          null,
    name                               varchar(255) null,
    finished                           tinyint(1)   null,
    time                               double       null,
    left_customer_wait_seat_sec_avg    double       null,
    left_customer_wait_seat_sample_cnt int          null,
    left_customers                     int          null,
    customer_group_arrive_rate         double       null,
    customer_id_generator              int          null,
    customer_group_id_generator        int          null,
    next_customer_grp_time             double       null,
    parameters_json                    text         null
);


