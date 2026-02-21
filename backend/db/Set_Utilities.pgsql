INSERT INTO utility (utility_id, utility_name, utility_type, billing_cycle, unit_of_measurement, status)
VALUES (1, 'Electricity_LV', 'Electricity', 'Monthly', 'kWh', 'Active');

INSERT INTO electricity_utility (utility_id, voltage_level, phase_type)
VALUES (1, '220V', 'Single Phase');

INSERT INTO utility_region (utility_id, region_id)
VALUES (1, 14);

-- Tariff LT-A
INSERT INTO tariff (tariff_id, utility_id, tariff_name, consumer_category, billing_method, effective_from, is_active)
VALUES (101, 1, 'LT-A', 'Residential', 'Slab', '2024-02-29', true);

INSERT INTO tariff_slab (tariff_id, slab_num, unit_from, unit_to, rate_per_unit)
VALUES (101, 1, 0, 75, 5.26),
       (101, 2, 76, 200, 7.2),
       (101, 3, 201, 300, 7.59),
       (101, 4, 301, 400, 8.02),
       (101, 5, 401, 600, 12.67),
       (101, 6, 601, NULL, 14.61);

INSERT INTO fixed_charge (fixed_charge_id, tariff_id, charge_name, charge_amount, charge_frequency, is_mandatory)
VALUES (1011, 101, 'Meter Rent', 25.00, 'Monthly', true),
       (1012, 101, 'Demand Charge', 42.00, 'Monthly', true);


