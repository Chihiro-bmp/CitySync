-- ─────────────────────────────────────────────────────────────────────────────
-- CitySync · Dummy Seed Data
-- Consumer person_id = 7  (change this if your ID is different)
-- Covers: utilities, tariffs, connections, meters, 12 months of readings + bills
-- Run in order — each block depends on the previous one.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. UTILITIES ─────────────────────────────────────────────────────────────
INSERT INTO utility (utility_id, utility_name, billing_cycle, unit_of_measurement, status)
VALUES
  (1, 'Electricity', 'Monthly', 'kWh',    'Active'),
  (2, 'Water',       'Monthly', 'Litre',  'Active'),
  (3, 'Gas',         'Monthly', 'Cubic M','Active')
ON CONFLICT (utility_id) DO NOTHING;

INSERT INTO electricity_utility (utility_id, voltage_level, phase_type)
VALUES (1, '220V', 'Single Phase')
ON CONFLICT (utility_id) DO NOTHING;

INSERT INTO water_utility (utility_id, pressure_level, quality_grade)
VALUES (2, 'Medium', 'Grade A')
ON CONFLICT (utility_id) DO NOTHING;

INSERT INTO gas_utility (utility_id, gas_type, pressure_category)
VALUES (3, 'Natural Gas', 'Low Pressure')
ON CONFLICT (utility_id) DO NOTHING;


-- ── 2. TARIFFS ────────────────────────────────────────────────────────────────
INSERT INTO tariff (tariff_id, utility_id, tariff_name, consumer_category, billing_method, effective_from, effective_to, is_active)
VALUES
  (1, 1, 'Residential Electricity', 'Residential', 'Postpaid', '2024-01-01', NULL, '1'),
  (2, 2, 'Residential Water',       'Residential', 'Postpaid', '2024-01-01', NULL, '1'),
  (3, 3, 'Residential Gas',         'Residential', 'Postpaid', '2024-01-01', NULL, '1')
ON CONFLICT (tariff_id) DO NOTHING;

INSERT INTO tariff_slab (tariff_id, slab_num, unit_from, unit_to, rate_per_unit)
VALUES
  -- Electricity slabs
  (1, 1,   0,  100,  5.00),
  (1, 2, 100,  300,  6.50),
  (1, 3, 300, 9999,  8.00),
  -- Water slabs
  (2, 1,    0, 5000,  0.05),
  (2, 2, 5000, 9999,  0.08),
  -- Gas slabs
  (3, 1,   0,  50,  12.00),
  (3, 2,  50, 999,  16.00)
ON CONFLICT (tariff_id, slab_num) DO NOTHING;


-- ── 3. CONNECTIONS (for consumer 7, address 1 — adjust address_id if needed) ─
-- First make sure address 1 exists (from your registration flow it should)
INSERT INTO connection (connection_id, address_id, tariff_id, consumer_id, utility_id, connection_status, connection_date)
VALUES
  (101, 1, 1, 7, 1, 'Connected', '2024-01-15'),
  (102, 1, 2, 7, 2, 'Connected', '2024-01-15'),
  (103, 1, 3, 7, 3, 'Connected', '2024-02-01')
ON CONFLICT (connection_id) DO NOTHING;

INSERT INTO residential_connection (connection_id, property_type, subsidy_flag)
VALUES
  (101, 'Apartment', '0'),
  (102, 'Apartment', '0'),
  (103, 'Apartment', '0')
ON CONFLICT (connection_id) DO NOTHING;


-- ── 4. METERS ────────────────────────────────────────────────────────────────
INSERT INTO meter (meter_id, connection_id, meter_type)
VALUES
  (201, 101, 'Smart'),
  (202, 102, 'Smart'),
  (203, 103, 'Analog')
ON CONFLICT (meter_id) DO NOTHING;


-- ── 5. METER READINGS — 12 months (Feb 2025 → Jan 2026) ─────────────────────
-- Electricity (meter 201): realistic Dhaka household 200-420 kWh/month
INSERT INTO meter_reading (meter_id, reading_id, field_worker_id, units_logged, time_from, time_to)
VALUES
  (201,  1, 999, 210, '2025-01-01', '2025-02-01'),
  (201,  2, 999, 245, '2025-02-01', '2025-03-01'),
  (201,  3, 999, 280, '2025-03-01', '2025-04-01'),
  (201,  4, 999, 340, '2025-04-01', '2025-05-01'),
  (201,  5, 999, 395, '2025-05-01', '2025-06-01'),
  (201,  6, 999, 420, '2025-06-01', '2025-07-01'),
  (201,  7, 999, 410, '2025-07-01', '2025-08-01'),
  (201,  8, 999, 380, '2025-08-01', '2025-09-01'),
  (201,  9, 999, 310, '2025-09-01', '2025-10-01'),
  (201, 10, 999, 260, '2025-10-01', '2025-11-01'),
  (201, 11, 999, 230, '2025-11-01', '2025-12-01'),
  (201, 12, 999, 255, '2025-12-01', '2026-01-01')
ON CONFLICT (meter_id, reading_id) DO NOTHING;

-- Water (meter 202): 6000–12000 litres/month
INSERT INTO meter_reading (meter_id, reading_id, field_worker_id, units_logged, time_from, time_to)
VALUES
  (202,  1, 999,  7200, '2025-01-01', '2025-02-01'),
  (202,  2, 999,  7800, '2025-02-01', '2025-03-01'),
  (202,  3, 999,  8400, '2025-03-01', '2025-04-01'),
  (202,  4, 999,  9100, '2025-04-01', '2025-05-01'),
  (202,  5, 999, 10200, '2025-05-01', '2025-06-01'),
  (202,  6, 999, 11500, '2025-06-01', '2025-07-01'),
  (202,  7, 999, 11800, '2025-07-01', '2025-08-01'),
  (202,  8, 999, 10600, '2025-08-01', '2025-09-01'),
  (202,  9, 999,  9200, '2025-09-01', '2025-10-01'),
  (202, 10, 999,  8100, '2025-10-01', '2025-11-01'),
  (202, 11, 999,  7500, '2025-11-01', '2025-12-01'),
  (202, 12, 999,  8000, '2025-12-01', '2026-01-01')
ON CONFLICT (meter_id, reading_id) DO NOTHING;

-- Gas (meter 203): 30–70 cubic metres/month
INSERT INTO meter_reading (meter_id, reading_id, field_worker_id, units_logged, time_from, time_to)
VALUES
  (203,  1, 999, 38, '2025-02-01', '2025-03-01'),
  (203,  2, 999, 42, '2025-03-01', '2025-04-01'),
  (203,  3, 999, 35, '2025-04-01', '2025-05-01'),
  (203,  4, 999, 30, '2025-05-01', '2025-06-01'),
  (203,  5, 999, 28, '2025-06-01', '2025-07-01'),
  (203,  6, 999, 29, '2025-07-01', '2025-08-01'),
  (203,  7, 999, 32, '2025-08-01', '2025-09-01'),
  (203,  8, 999, 40, '2025-09-01', '2025-10-01'),
  (203,  9, 999, 55, '2025-10-01', '2025-11-01'),
  (203, 10, 999, 68, '2025-11-01', '2025-12-01'),
  (203, 11, 999, 65, '2025-12-01', '2026-01-01')
ON CONFLICT (meter_id, reading_id) DO NOTHING;


-- ── 6. BILL DOCUMENTS ────────────────────────────────────────────────────────
-- Electricity bills — 12 months
-- Amounts calculated roughly: first 100 @ 5tk, next 200 @ 6.5tk, rest @ 8tk
INSERT INTO bill_document (bill_document_id, connection_id, bill_type, bill_period_start, bill_period_end, bill_generation_date, unit_consumed, energy_amount, total_amount)
VALUES
  (301, 101, 'Postpaid', '2025-01-01','2025-02-01','2025-02-05', 210,  1290.00,  1380.00),
  (302, 101, 'Postpaid', '2025-02-01','2025-03-01','2025-03-05', 245,  1567.50,  1680.00),
  (303, 101, 'Postpaid', '2025-03-01','2025-04-01','2025-04-05', 280,  1870.00,  2000.00),
  (304, 101, 'Postpaid', '2025-04-01','2025-05-01','2025-05-05', 340,  2390.00,  2560.00),
  (305, 101, 'Postpaid', '2025-05-01','2025-06-01','2025-06-05', 395,  2972.50,  3190.00),
  (306, 101, 'Postpaid', '2025-06-01','2025-07-01','2025-07-05', 420,  3210.00,  3440.00),
  (307, 101, 'Postpaid', '2025-07-01','2025-08-01','2025-08-05', 410,  3130.00,  3360.00),
  (308, 101, 'Postpaid', '2025-08-01','2025-09-01','2025-09-05', 380,  2870.00,  3080.00),
  (309, 101, 'Postpaid', '2025-09-01','2025-10-01','2025-10-05', 310,  2240.00,  2400.00),
  (310, 101, 'Postpaid', '2025-10-01','2025-11-01','2025-11-05', 260,  1820.00,  1950.00),
  (311, 101, 'Postpaid', '2025-11-01','2025-12-01','2025-12-05', 230,  1577.50,  1690.00),
  (312, 101, 'Postpaid', '2025-12-01','2026-01-01','2026-01-05', 255,  1762.50,  1890.00)
ON CONFLICT (bill_document_id) DO NOTHING;

-- Water bills — 12 months
INSERT INTO bill_document (bill_document_id, connection_id, bill_type, bill_period_start, bill_period_end, bill_generation_date, unit_consumed, energy_amount, total_amount)
VALUES
  (401, 102, 'Postpaid', '2025-01-01','2025-02-01','2025-02-05',  7200,  406.00,  435.00),
  (402, 102, 'Postpaid', '2025-02-01','2025-03-01','2025-03-05',  7800,  444.00,  476.00),
  (403, 102, 'Postpaid', '2025-03-01','2025-04-01','2025-04-05',  8400,  482.00,  518.00),
  (404, 102, 'Postpaid', '2025-04-01','2025-05-01','2025-05-05',  9100,  538.00,  578.00),
  (405, 102, 'Postpaid', '2025-05-01','2025-06-01','2025-06-05', 10200,  666.00,  714.00),
  (406, 102, 'Postpaid', '2025-06-01','2025-07-01','2025-07-05', 11500,  770.00,  826.00),
  (407, 102, 'Postpaid', '2025-07-01','2025-08-01','2025-08-05', 11800,  794.00,  852.00),
  (408, 102, 'Postpaid', '2025-08-01','2025-09-01','2025-09-05', 10600,  698.00,  748.00),
  (409, 102, 'Postpaid', '2025-09-01','2025-10-01','2025-10-05',  9200,  546.00,  586.00),
  (410, 102, 'Postpaid', '2025-10-01','2025-11-01','2025-11-05',  8100,  468.00,  502.00),
  (411, 102, 'Postpaid', '2025-11-01','2025-12-01','2025-12-05',  7500,  430.00,  461.00),
  (412, 102, 'Postpaid', '2025-12-01','2026-01-01','2026-01-05',  8000,  460.00,  494.00)
ON CONFLICT (bill_document_id) DO NOTHING;

-- Gas bills — 11 months (connection started Feb 2025)
INSERT INTO bill_document (bill_document_id, connection_id, bill_type, bill_period_start, bill_period_end, bill_generation_date, unit_consumed, energy_amount, total_amount)
VALUES
  (501, 103, 'Postpaid', '2025-02-01','2025-03-01','2025-03-05', 38,  504.00,  540.00),
  (502, 103, 'Postpaid', '2025-03-01','2025-04-01','2025-04-05', 42,  552.00,  592.00),
  (503, 103, 'Postpaid', '2025-04-01','2025-05-01','2025-05-05', 35,  468.00,  502.00),
  (504, 103, 'Postpaid', '2025-05-01','2025-06-01','2025-06-05', 30,  408.00,  437.00),
  (505, 103, 'Postpaid', '2025-06-01','2025-07-01','2025-07-05', 28,  384.00,  412.00),
  (506, 103, 'Postpaid', '2025-07-01','2025-08-01','2025-08-05', 29,  396.00,  424.00),
  (507, 103, 'Postpaid', '2025-08-01','2025-09-01','2025-09-05', 32,  432.00,  463.00),
  (508, 103, 'Postpaid', '2025-09-01','2025-10-01','2025-10-05', 40,  600.00,  643.00),
  (509, 103, 'Postpaid', '2025-10-01','2025-11-01','2025-11-05', 55,  948.00, 1016.00),
  (510, 103, 'Postpaid', '2025-11-01','2025-12-01','2025-12-05', 68, 1228.00, 1316.00),
  (511, 103, 'Postpaid', '2025-12-01','2026-01-01','2026-01-05', 65, 1180.00, 1265.00)
ON CONFLICT (bill_document_id) DO NOTHING;


-- ── 7. BILL_POSTPAID (status + due dates) ────────────────────────────────────
-- Electricity: older bills Paid, Nov Pending, Dec Overdue, Jan Pending
INSERT INTO bill_postpaid (bill_document_id, bill_status, due_date, remarks)
VALUES
  (301, 'Paid',    '2025-02-20', 'Paid via bKash'),
  (302, 'Paid',    '2025-03-20', 'Paid via bKash'),
  (303, 'Paid',    '2025-04-20', 'Paid via Nagad'),
  (304, 'Paid',    '2025-05-20', 'Paid via bKash'),
  (305, 'Paid',    '2025-06-20', 'Paid via bKash'),
  (306, 'Paid',    '2025-07-20', 'Paid via bank'),
  (307, 'Paid',    '2025-08-20', 'Paid via bKash'),
  (308, 'Paid',    '2025-09-20', 'Paid via bKash'),
  (309, 'Paid',    '2025-10-20', 'Paid via Nagad'),
  (310, 'Paid',    '2025-11-20', 'Paid via bKash'),
  (311, 'Overdue', '2025-12-20', NULL),
  (312, 'Pending', '2026-01-25', NULL)
ON CONFLICT (bill_document_id) DO NOTHING;

-- Water: similar pattern
INSERT INTO bill_postpaid (bill_document_id, bill_status, due_date, remarks)
VALUES
  (401, 'Paid',    '2025-02-20', 'Paid via bKash'),
  (402, 'Paid',    '2025-03-20', 'Paid via bKash'),
  (403, 'Paid',    '2025-04-20', 'Paid via bKash'),
  (404, 'Paid',    '2025-05-20', 'Paid via Nagad'),
  (405, 'Paid',    '2025-06-20', 'Paid via bKash'),
  (406, 'Paid',    '2025-07-20', 'Paid via bKash'),
  (407, 'Paid',    '2025-08-20', 'Paid via bank'),
  (408, 'Paid',    '2025-09-20', 'Paid via bKash'),
  (409, 'Paid',    '2025-10-20', 'Paid via bKash'),
  (410, 'Paid',    '2025-11-20', 'Paid via Nagad'),
  (411, 'Paid',    '2025-12-20', 'Paid via bKash'),
  (412, 'Pending', '2026-02-05', NULL)
ON CONFLICT (bill_document_id) DO NOTHING;

-- Gas: recent months unpaid
INSERT INTO bill_postpaid (bill_document_id, bill_status, due_date, remarks)
VALUES
  (501, 'Paid',    '2025-03-20', 'Paid via bKash'),
  (502, 'Paid',    '2025-04-20', 'Paid via bKash'),
  (503, 'Paid',    '2025-05-20', 'Paid via bKash'),
  (504, 'Paid',    '2025-06-20', 'Paid via Nagad'),
  (505, 'Paid',    '2025-07-20', 'Paid via bKash'),
  (506, 'Paid',    '2025-08-20', 'Paid via bKash'),
  (507, 'Paid',    '2025-09-20', 'Paid via bKash'),
  (508, 'Paid',    '2025-10-20', 'Paid via Nagad'),
  (509, 'Overdue', '2025-11-20', NULL),
  (510, 'Overdue', '2025-12-20', NULL),
  (511, 'Pending', '2026-01-25', NULL)
ON CONFLICT (bill_document_id) DO NOTHING;


-- ── 8. VERIFY ────────────────────────────────────────────────────────────────
-- Run these to confirm everything looks right:

-- SELECT count(*) FROM meter_reading;          -- should be 35
-- SELECT count(*) FROM bill_document;          -- should be 35
-- SELECT count(*) FROM bill_postpaid;          -- should be 35
-- SELECT bill_status, count(*) FROM bill_postpaid GROUP BY bill_status;
-- SELECT u.utility_name, bp.bill_status, bd.total_amount
--   FROM bill_document bd
--   JOIN connection c ON bd.connection_id = c.connection_id
--   JOIN utility u ON c.utility_id = u.utility_id
--   LEFT JOIN bill_postpaid bp ON bd.bill_document_id = bp.bill_document_id
--   WHERE c.consumer_id = 7
--   ORDER BY bd.bill_generation_date DESC;
