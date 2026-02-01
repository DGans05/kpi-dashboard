-- Seed data for KPI Dashboard

-- Restaurants
INSERT INTO restaurants (name, city)
VALUES
  ('Downtown Delivery Hub', 'New York'),
  ('Westside Kitchen', 'Los Angeles')
ON CONFLICT (name) DO NOTHING;

-- Users with bcrypt hash of 'password123'
-- Hash generated with 10 rounds using bcrypt
WITH r AS (
  SELECT id, name FROM restaurants WHERE name IN ('Downtown Delivery Hub', 'Westside Kitchen')
)
INSERT INTO users (email, password_hash, role, restaurant_id)
VALUES
  ('admin@kpi.com', '$2b$10$iscuDH2Q5X6CDUfWaAtuo.KUbJMLtWiMxV8Hp5eKE6mxQsEUWCU8y', 'admin', NULL),
  (
    'manager1@kpi.com',
    '$2b$10$iscuDH2Q5X6CDUfWaAtuo.KUbJMLtWiMxV8Hp5eKE6mxQsEUWCU8y',
    'manager',
    (SELECT id FROM r WHERE name = 'Downtown Delivery Hub')
  ),
  (
    'manager2@kpi.com',
    '$2b$10$iscuDH2Q5X6CDUfWaAtuo.KUbJMLtWiMxV8Hp5eKE6mxQsEUWCU8y',
    'manager',
    (SELECT id FROM r WHERE name = 'Westside Kitchen')
  )
ON CONFLICT (email) DO NOTHING;

-- KPI targets
INSERT INTO kpi_targets (restaurant_id, metric, target, warning, critical)
SELECT r.id, 'labour_cost_percent', 23, 25, 28
FROM restaurants r
WHERE r.name IN ('Downtown Delivery Hub', 'Westside Kitchen')
ON CONFLICT (restaurant_id, metric) DO NOTHING;

INSERT INTO kpi_targets (restaurant_id, metric, target, warning, critical)
SELECT r.id, 'food_cost_percent', 32, 35, 38
FROM restaurants r
WHERE r.name IN ('Downtown Delivery Hub', 'Westside Kitchen')
ON CONFLICT (restaurant_id, metric) DO NOTHING;

-- KPI entries for the last 7 days (per restaurant)
WITH r AS (
  SELECT id, name FROM restaurants WHERE name IN ('Downtown Delivery Hub', 'Westside Kitchen')
),
days AS (
  SELECT generate_series(0, 6) AS day_offset
),
base AS (
  SELECT
    r.id AS restaurant_id,
    CURRENT_DATE - day_offset AS entry_date,
    65 + FLOOR(random() * 36)::INT AS orders_count,
    random() AS rand_ticket,
    random() AS rand_labour,
    random() AS rand_food
  FROM r
  CROSS JOIN days
),
calc AS (
  SELECT
    restaurant_id,
    entry_date,
    orders_count,
    ROUND((32 + (rand_ticket * 16))::NUMERIC, 2) AS avg_ticket,
    ROUND((orders_count * (32 + (rand_ticket * 16)))::NUMERIC, 2) AS revenue,
    ROUND((20 + (rand_labour * 5))::NUMERIC, 2) AS labour_pct,
    ROUND((30 + (rand_food * 5))::NUMERIC, 2) AS food_pct
  FROM base
)
INSERT INTO kpi_entries (
  restaurant_id,
  entry_date,
  revenue,
  labour_cost,
  labour_cost_percent,
  food_cost,
  food_cost_percent,
  orders,
  avg_ticket
)
SELECT
  restaurant_id,
  entry_date,
  revenue,
  ROUND((revenue * (labour_pct / 100))::NUMERIC, 2) AS labour_cost,
  labour_pct AS labour_cost_percent,
  ROUND((revenue * (food_pct / 100))::NUMERIC, 2) AS food_cost,
  food_pct AS food_cost_percent,
  orders_count AS orders,
  avg_ticket
FROM calc
ON CONFLICT (restaurant_id, entry_date) DO NOTHING;

