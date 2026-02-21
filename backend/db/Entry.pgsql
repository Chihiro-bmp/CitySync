INSERT INTO address (address_id, region_id, house_num, street_name)
VALUES (1, 14, 123, 'Main Street');

INSERT INTO person (person_id, first_name, last_name, date_of_birth, gender, phone_number, national_id, address_id)
VALUES (1, 'John', 'Doe', '1990-01-01', 'Male', '01234567890', '0123456789', 1);

INSERT INTO consumer (person_id, consumer_type, registration_date)
VALUES (1, 'Residential', '2025-06-29');

INSERT INTO meter (meter_id, address_id, meter_type)
VALUES (1, 1, 'Electricity');

INSERT INTO utility_connection (connection_id, consumer_id, meter_id, tariff_id, payment_type, connection_type, connection_date, connection_status)
VALUES (1, 1, 1, 101, 'PREPAID', 'Residential', '2025-06-29', 'Active');

INSERT INTO residential_connection (connection_id, property_type, is_subsidized)
VALUES (1, 'Apartment', false);

INSERT INTO bill_document (bill_document_id, connection_id, bill_type, unit_consumed, energy_amount, total_amount, bill_status)
VALUES (1, 1, 'PREPAID', 0, 100.00, 100.00, 'CANCELLED');

INSERT INTO prepaid_statement (bill_document_id)
VALUES (1);

INSERT INTO payment_method (method_id, method_name)
VALUES (1, 'Mobile Banking');

INSERT INTO mobile_banking (method_id, provider_name, phone_num)
VALUES (1, 'Grameenphone', '01712345678');

INSERT INTO payment (payment_id, bill_document_id, method_id, payment_amount)
VALUES (1, 1, 1, 100.00);

INSERT INTO usage (meter_id, tariff_id, slab_num, time_from, time_to, unit_used)
VALUES (1, 101, 1, '2025-06-01 12:00:00', '2025-06-01 12:01:00', 5);

INSERT INTO usage (meter_id, tariff_id, slab_num, time_from, time_to, unit_used)
VALUES (1, 101, 1, '2025-06-01 12:01:00', '2025-06-01 12:02:00', 5);