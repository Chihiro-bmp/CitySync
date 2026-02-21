-- Calculate bill amount from use --- DONE
-- Create bill
-- Calculate late payment fine
-- Create usage from reading --- DONE

-- TRIGGERS
-- Payment -> Update bill/balance --- DONE
-- Usage -> Update balance -- DONE



CREATE OR REPLACE FUNCTION get_rate(p_tariff_id INTEGER, p_slab_num INTEGER) RETURNS NUMERIC(10, 2)
LANGUAGE plpgsql
AS $$
DECLARE
    v_rate NUMERIC(10, 2);
BEGIN
    SELECT rate_per_unit INTO v_rate
    FROM tariff_slab
    WHERE tariff_id = p_tariff_id AND slab_num = p_slab_num;

    RETURN v_rate;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_energy_amount(
    p_connection_id INTEGER,
    p_start_date DATE,
    p_end_date DATE
) RETURNS NUMERIC(10, 2)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total NUMERIC(10, 2);
BEGIN
    SELECT COALESCE(SUM(u.unit_used * get_rate(u.tariff_id, u.slab_num)), 0)
    INTO v_total
    FROM usage u
    JOIN utility_connection c ON u.meter_id = c.meter_id
    WHERE c.connection_id = p_connection_id
      AND u.time_to BETWEEN p_start_date AND p_end_date;

    RETURN v_total;
END
$$;

CREATE OR REPLACE FUNCTION create_usage_from_reading(p_reading_id INTEGER, p_employee_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_meter_id INTEGER;
    v_time_from TIMESTAMP;
    v_time_to TIMESTAMP;
    v_unit_used NUMERIC(10, 2);
    v_tariff_id INTEGER;
    v_slab_num INTEGER;
BEGIN
    IF (SELECT approved_by FROM meter_reading WHERE reading_id = p_reading_id) IS NOT NULL THEN
        RAISE EXCEPTION 'Meter reading has already been approved';
    END IF;

    UPDATE meter_reading
    SET approved_by = p_employee_id
    WHERE reading_id = p_reading_id;

    SELECT meter_id, time_from, time_to, unit_used, tariff_id, slab_num
    INTO v_meter_id, v_time_from, v_time_to, v_unit_used, v_tariff_id, v_slab_num
    FROM meter_reading
    WHERE reading_id = p_reading_id;

    INSERT INTO usage (meter_id, tariff_id, slab_num, time_from, time_to, unit_used)
    VALUES (v_meter_id, v_tariff_id, v_slab_num, v_time_from, v_time_to, v_unit_used);
END;
$$;


-- AFTER INSERT trigger to create prepaid account for new prepaid connection
CREATE OR REPLACE FUNCTION create_prepaid_account_after_insert() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_payment_type text;

BEGIN
    -- Check if the new connection is prepaid
    SELECT payment_type INTO v_payment_type
    FROM utility_connection
    WHERE connection_id = NEW.connection_id;

    IF v_payment_type ILIKE 'PREPAID' THEN
        -- Create a prepaid account with an initial balance of 0
        INSERT INTO prepaid_account (connection_id, balance)
        VALUES (NEW.connection_id, 0);
    END IF;

    RETURN NEW;
END;
$$;

-- DROP TRIGGER IF EXISTS create_prepaid_account_after_insert_trg ON utility_connection;
CREATE TRIGGER create_prepaid_account_after_insert_trg
AFTER INSERT ON utility_connection
FOR EACH ROW
EXECUTE FUNCTION create_prepaid_account_after_insert();


-- BEFORE INSERT trigger to update balance for prepaid transactions and suspend connection if balance goes negative.
CREATE OR REPLACE FUNCTION update_balance_for_transaction() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_balance NUMERIC(10, 2);
    v_connection_id INTEGER;
    v_meter_id INTEGER;
BEGIN
    IF NEW.transaction_type ILIKE 'DEBIT' THEN
        UPDATE prepaid_account
        SET balance = balance - NEW.transaction_amount
        WHERE prepaid_account_id = NEW.prepaid_account_id
        RETURNING balance INTO v_balance;
    ELSIF NEW.transaction_type ILIKE 'CREDIT' THEN
        UPDATE prepaid_account
        SET balance = balance + NEW.transaction_amount
        WHERE prepaid_account_id = NEW.prepaid_account_id
        RETURNING balance INTO v_balance;
    END IF;

    NEW.balance_after := v_balance;

    -- Get the connection_id and meter_id for the transaction
    SELECT c.connection_id, c.meter_id INTO v_connection_id, v_meter_id
    FROM prepaid_account p
    JOIN utility_connection c ON p.connection_id = c.connection_id
    WHERE p.prepaid_account_id = NEW.prepaid_account_id;

    IF v_balance <= 0 THEN
        UPDATE utility_connection
        SET connection_status = 'SUSPENDED'
        WHERE connection_id = v_connection_id;

        UPDATE meter
        SET is_active = FALSE
        WHERE meter_id = v_meter_id;
    ELSE
        UPDATE utility_connection
        SET connection_status = 'ACTIVE'
        WHERE connection_id = v_connection_id;

        UPDATE meter
        SET is_active = TRUE
        WHERE meter_id = v_meter_id;
    END IF;

    RETURN NEW;
END;
$$;

-- DROP TRIGGER IF EXISTS update_balance_for_transaction_trg ON balance_transaction;
CREATE TRIGGER update_balance_for_transaction_trg
BEFORE INSERT ON balance_transaction
FOR EACH ROW
EXECUTE FUNCTION update_balance_for_transaction();


-- BEFORE INSERT trigger to assign a per-meter `usage_id` based on `time_to`.
CREATE OR REPLACE FUNCTION usage_before_insert() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- derive usage id from time_to (assumes time_to is NOT NULL)
    NEW.usage_id := to_char(NEW.time_to, 'YYYYMMDDHH24MISS')::BIGINT;
    NEW.usage_id := NEW.usage_id + (NEW.slab_num * 100000000000000); -- Add slab_num to ensure uniqueness across slabs
    RETURN NEW;
END;
$$;

-- DROP TRIGGER IF EXISTS usage_before_insert_trg ON usage;
CREATE TRIGGER usage_before_insert_trg
BEFORE INSERT ON usage
FOR EACH ROW
EXECUTE FUNCTION usage_before_insert();


-- AFTER INSERT trigger to log transactions for prepaid accounts.
CREATE OR REPLACE FUNCTION usage_after_insert() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	v_connection_id integer;
	v_payment_type text;
	v_prepaid_account_id integer;
	v_amount numeric(10, 2);
BEGIN
	-- Find the connection
	SELECT c.connection_id, c.payment_type INTO v_connection_id, v_payment_type
	FROM utility_connection c
	WHERE c.meter_id = NEW.meter_id;

	IF NOT FOUND OR v_payment_type NOT ILIKE 'PREPAID' THEN
		-- Can't resolve connection or not prepaid; do nothing
		RETURN NEW;
	END IF;

    SELECT p.prepaid_account_id INTO v_prepaid_account_id
    FROM PREPAID_ACCOUNT p
    WHERE p.connection_id = v_connection_id;

    IF NOT FOUND THEN
        -- No prepaid account found, account is postpaid; do nothing
        RETURN NEW;
    END IF;

    v_amount := NEW.unit_used * get_rate(NEW.tariff_id, NEW.slab_num);

    INSERT INTO balance_transaction (meter_id, usage_id, prepaid_account_id, transaction_amount, transaction_type, transaction_time)
    VALUES (NEW.meter_id, NEW.usage_id, v_prepaid_account_id, v_amount, 'DEBIT', CURRENT_TIMESTAMP);

	RETURN NEW;
END;
$$;

-- DROP TRIGGER IF EXISTS usage_after_insert_trg ON usage;
CREATE TRIGGER usage_after_insert_trg
AFTER INSERT ON usage
FOR EACH ROW
EXECUTE FUNCTION usage_after_insert();


-- AFTER INSERT trigger to update bill and balance for payments.
CREATE OR REPLACE FUNCTION payment_after_insert() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_prepaid_account_id INTEGER;
    v_connection_id INTEGER;
    v_bill_type VARCHAR(20);
BEGIN
    UPDATE bill_document
    SET bill_status = 'PAID'
    WHERE bill_document_id = NEW.bill_document_id
    RETURNING connection_id, bill_type INTO v_connection_id, v_bill_type;

    -- For prepaid payments, log transaction
    IF v_bill_type ILIKE 'PREPAID' THEN
        SELECT prepaid_account_id INTO v_prepaid_account_id
        FROM prepaid_account
        WHERE connection_id = v_connection_id;

        INSERT INTO balance_transaction (bill_document_id, prepaid_account_id, transaction_amount, transaction_type, transaction_time)
        VALUES (NEW.bill_document_id, v_prepaid_account_id, NEW.payment_amount, 'CREDIT', CURRENT_TIMESTAMP);
    END IF;

    RETURN NEW;
END;
$$;

-- DROP TRIGGER IF EXISTS payment_after_insert_trg ON payment;
CREATE TRIGGER payment_after_insert_trg
AFTER INSERT ON payment
FOR EACH ROW
EXECUTE FUNCTION payment_after_insert();

