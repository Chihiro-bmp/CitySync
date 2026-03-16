--
-- PostgreSQL database dump
--

\restrict Cm7l7rjrqLqOuogHfFpi5xb826VSM0tu6GgMfZaxJjYVTrYUBWfBlzLdLkB0p7e

-- Dumped from database version 16.12
-- Dumped by pg_dump version 16.12

-- Started on 2026-03-01 02:22:42

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 268 (class 1255 OID 17355)
-- Name: calculate_energy_amount(integer, date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_energy_amount(p_connection_id integer, p_start_date date, p_end_date date) RETURNS numeric
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


ALTER FUNCTION public.calculate_energy_amount(p_connection_id integer, p_start_date date, p_end_date date) OWNER TO postgres;

--
-- TOC entry 270 (class 1255 OID 17357)
-- Name: create_prepaid_account_after_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_prepaid_account_after_insert() RETURNS trigger
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


ALTER FUNCTION public.create_prepaid_account_after_insert() OWNER TO postgres;

--
-- TOC entry 269 (class 1255 OID 17356)
-- Name: create_usage_from_reading(integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_usage_from_reading(p_reading_id integer, p_employee_id integer) RETURNS void
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


ALTER FUNCTION public.create_usage_from_reading(p_reading_id integer, p_employee_id integer) OWNER TO postgres;

--
-- TOC entry 267 (class 1255 OID 17354)
-- Name: get_rate(integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_rate(p_tariff_id integer, p_slab_num integer) RETURNS numeric
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


ALTER FUNCTION public.get_rate(p_tariff_id integer, p_slab_num integer) OWNER TO postgres;

--
-- TOC entry 285 (class 1255 OID 17365)
-- Name: payment_after_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.payment_after_insert() RETURNS trigger
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


ALTER FUNCTION public.payment_after_insert() OWNER TO postgres;

--
-- TOC entry 282 (class 1255 OID 17359)
-- Name: update_balance_for_transaction(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_balance_for_transaction() RETURNS trigger
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


ALTER FUNCTION public.update_balance_for_transaction() OWNER TO postgres;

--
-- TOC entry 284 (class 1255 OID 17363)
-- Name: usage_after_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.usage_after_insert() RETURNS trigger
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


ALTER FUNCTION public.usage_after_insert() OWNER TO postgres;

--
-- TOC entry 283 (class 1255 OID 17361)
-- Name: usage_before_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.usage_before_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- derive usage id from time_to (assumes time_to is NOT NULL)
    NEW.usage_id := to_char(NEW.time_to, 'YYYYMMDDHH24MISS')::BIGINT;
    NEW.usage_id := NEW.usage_id + (NEW.slab_num * 100000000000000); -- Add slab_num to ensure uniqueness across slabs
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.usage_before_insert() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 222 (class 1259 OID 16905)
-- Name: account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account (
    account_id integer NOT NULL,
    person_id integer NOT NULL,
    account_type character varying(20) NOT NULL,
    email character varying(100) NOT NULL,
    password_hashed character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    avatar_b64 text
);


ALTER TABLE public.account OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16904)
-- Name: account_account_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.account_account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.account_account_id_seq OWNER TO postgres;

--
-- TOC entry 5259 (class 0 OID 0)
-- Dependencies: 221
-- Name: account_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.account_account_id_seq OWNED BY public.account.account_id;


--
-- TOC entry 218 (class 1259 OID 16879)
-- Name: address; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.address (
    address_id integer NOT NULL,
    region_id integer NOT NULL,
    house_num character varying(20) NOT NULL,
    street_name character varying(50) NOT NULL,
    landmark character varying(50)
);


ALTER TABLE public.address OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16878)
-- Name: address_address_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.address_address_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.address_address_id_seq OWNER TO postgres;

--
-- TOC entry 5260 (class 0 OID 0)
-- Dependencies: 217
-- Name: address_address_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.address_address_id_seq OWNED BY public.address.address_id;


--
-- TOC entry 257 (class 1259 OID 17246)
-- Name: balance_transaction; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.balance_transaction (
    transaction_id integer NOT NULL,
    meter_id integer,
    usage_id bigint,
    bill_document_id integer,
    prepaid_account_id integer NOT NULL,
    transaction_amount numeric(10,2) NOT NULL,
    transaction_type character varying(20) NOT NULL,
    transaction_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    balance_after numeric(10,2) NOT NULL,
    CONSTRAINT balance_transaction_check CHECK ((((meter_id IS NOT NULL) AND (usage_id IS NOT NULL) AND (bill_document_id IS NULL)) OR ((bill_document_id IS NOT NULL) AND (meter_id IS NULL) AND (usage_id IS NULL))))
);


ALTER TABLE public.balance_transaction OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 17245)
-- Name: balance_transaction_transaction_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.balance_transaction_transaction_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.balance_transaction_transaction_id_seq OWNER TO postgres;

--
-- TOC entry 5261 (class 0 OID 0)
-- Dependencies: 256
-- Name: balance_transaction_transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.balance_transaction_transaction_id_seq OWNED BY public.balance_transaction.transaction_id;


--
-- TOC entry 260 (class 1259 OID 17276)
-- Name: bank; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank (
    method_id integer NOT NULL,
    bank_name character varying(50) NOT NULL,
    account_num character varying(30) NOT NULL
);


ALTER TABLE public.bank OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 17170)
-- Name: bill_document; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bill_document (
    bill_document_id integer NOT NULL,
    connection_id integer NOT NULL,
    bill_type character varying(20) NOT NULL,
    bill_generation_date date DEFAULT CURRENT_DATE NOT NULL,
    unit_consumed numeric(10,2) NOT NULL,
    energy_amount numeric(10,2) NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    bill_status character varying(20) DEFAULT 'UNPAID'::character varying
);


ALTER TABLE public.bill_document OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 17169)
-- Name: bill_document_bill_document_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bill_document_bill_document_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bill_document_bill_document_id_seq OWNER TO postgres;

--
-- TOC entry 5262 (class 0 OID 0)
-- Dependencies: 248
-- Name: bill_document_bill_document_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bill_document_bill_document_id_seq OWNED BY public.bill_document.bill_document_id;


--
-- TOC entry 250 (class 1259 OID 17183)
-- Name: bill_postpaid; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bill_postpaid (
    bill_document_id integer NOT NULL,
    bill_period_start date NOT NULL,
    bill_period_end date NOT NULL,
    due_date date NOT NULL,
    remarks character varying(100)
);


ALTER TABLE public.bill_postpaid OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 17089)
-- Name: commercial_connection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.commercial_connection (
    connection_id integer NOT NULL,
    business_name character varying(50),
    operating_hours character varying(30),
    tax_id character varying(30)
);


ALTER TABLE public.commercial_connection OWNER TO postgres;

--
-- TOC entry 265 (class 1259 OID 17325)
-- Name: complaint; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.complaint (
    complaint_id integer NOT NULL,
    consumer_id integer,
    connection_id integer,
    assigned_by integer,
    assigned_to integer,
    complaint_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text,
    status character varying(20),
    assignment_date date,
    resolution_date date,
    remarks character varying(200)
);


ALTER TABLE public.complaint OWNER TO postgres;

--
-- TOC entry 264 (class 1259 OID 17324)
-- Name: complaint_complaint_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.complaint_complaint_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.complaint_complaint_id_seq OWNER TO postgres;

--
-- TOC entry 5263 (class 0 OID 0)
-- Dependencies: 264
-- Name: complaint_complaint_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.complaint_complaint_id_seq OWNED BY public.complaint.complaint_id;


--
-- TOC entry 244 (class 1259 OID 17100)
-- Name: connection_application; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.connection_application (
    application_id integer NOT NULL,
    consumer_id integer NOT NULL,
    reviewed_by integer,
    utility_type character varying(50) NOT NULL,
    application_date date DEFAULT CURRENT_DATE NOT NULL,
    status character varying(20) DEFAULT 'Pending'::character varying NOT NULL,
    requested_connection_type character varying(50) NOT NULL,
    address text NOT NULL,
    review_date date,
    approval_date date,
    priority character varying(20) DEFAULT 'Normal'::character varying
);


ALTER TABLE public.connection_application OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 17099)
-- Name: connection_application_application_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.connection_application_application_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.connection_application_application_id_seq OWNER TO postgres;

--
-- TOC entry 5264 (class 0 OID 0)
-- Dependencies: 243
-- Name: connection_application_application_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.connection_application_application_id_seq OWNED BY public.connection_application.application_id;


--
-- TOC entry 223 (class 1259 OID 16918)
-- Name: consumer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consumer (
    person_id integer NOT NULL,
    consumer_type character varying(20) NOT NULL,
    registration_date date DEFAULT CURRENT_DATE
);


ALTER TABLE public.consumer OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16961)
-- Name: electricity_utility; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.electricity_utility (
    utility_id integer NOT NULL,
    voltage_level character varying(20),
    phase_type character varying(20)
);


ALTER TABLE public.electricity_utility OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16929)
-- Name: employee; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee (
    person_id integer NOT NULL,
    role character varying(30) NOT NULL,
    employee_num character varying(20) NOT NULL,
    hire_date date NOT NULL,
    employment_status character varying(20)
);


ALTER TABLE public.employee OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16939)
-- Name: field_worker; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.field_worker (
    person_id integer NOT NULL,
    assigned_region_id integer,
    expertise character varying(50),
    skillset character varying(100)
);


ALTER TABLE public.field_worker OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 17030)
-- Name: fixed_charge; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fixed_charge (
    fixed_charge_id integer NOT NULL,
    tariff_id integer NOT NULL,
    charge_name character varying(30),
    charge_amount numeric(10,2) NOT NULL,
    charge_frequency character varying(20) NOT NULL,
    is_mandatory boolean DEFAULT false NOT NULL
);


ALTER TABLE public.fixed_charge OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 17203)
-- Name: fixed_charge_applied; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fixed_charge_applied (
    fixed_charge_id integer NOT NULL,
    bill_document_id integer NOT NULL,
    timeframe character varying(20)
);


ALTER TABLE public.fixed_charge_applied OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 17029)
-- Name: fixed_charge_fixed_charge_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fixed_charge_fixed_charge_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fixed_charge_fixed_charge_id_seq OWNER TO postgres;

--
-- TOC entry 5265 (class 0 OID 0)
-- Dependencies: 235
-- Name: fixed_charge_fixed_charge_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fixed_charge_fixed_charge_id_seq OWNED BY public.fixed_charge.fixed_charge_id;


--
-- TOC entry 255 (class 1259 OID 17230)
-- Name: fixed_charge_owed; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fixed_charge_owed (
    fixed_charge_id integer NOT NULL,
    prepaid_account_id integer NOT NULL,
    timeframe character varying(20)
);


ALTER TABLE public.fixed_charge_owed OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16981)
-- Name: gas_utility; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gas_utility (
    utility_id integer NOT NULL,
    gas_type character varying(20),
    pressure_category character varying(20)
);


ALTER TABLE public.gas_utility OWNER TO postgres;

--
-- TOC entry 266 (class 1259 OID 17379)
-- Name: google_pay; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.google_pay (
    method_id integer NOT NULL,
    google_account_email character varying(100) NOT NULL,
    phone_num character varying(15)
);


ALTER TABLE public.google_pay OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 17043)
-- Name: meter; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meter (
    meter_id integer NOT NULL,
    address_id integer NOT NULL,
    meter_type character varying(20) NOT NULL,
    is_active boolean DEFAULT false NOT NULL
);


ALTER TABLE public.meter OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 17042)
-- Name: meter_meter_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.meter_meter_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.meter_meter_id_seq OWNER TO postgres;

--
-- TOC entry 5266 (class 0 OID 0)
-- Dependencies: 237
-- Name: meter_meter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.meter_meter_id_seq OWNED BY public.meter.meter_id;


--
-- TOC entry 246 (class 1259 OID 17122)
-- Name: meter_reading; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meter_reading (
    reading_id integer NOT NULL,
    meter_id integer NOT NULL,
    tariff_id integer NOT NULL,
    slab_num integer NOT NULL,
    approved_by integer,
    field_worker_id integer NOT NULL,
    time_from timestamp without time zone NOT NULL,
    time_to timestamp without time zone NOT NULL,
    units_logged numeric(10,2) NOT NULL,
    reading_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.meter_reading OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 17121)
-- Name: meter_reading_reading_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.meter_reading_reading_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.meter_reading_reading_id_seq OWNER TO postgres;

--
-- TOC entry 5267 (class 0 OID 0)
-- Dependencies: 245
-- Name: meter_reading_reading_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.meter_reading_reading_id_seq OWNED BY public.meter_reading.reading_id;


--
-- TOC entry 261 (class 1259 OID 17286)
-- Name: mobile_banking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mobile_banking (
    method_id integer NOT NULL,
    provider_name character varying(30) NOT NULL,
    phone_num character varying(15) NOT NULL
);


ALTER TABLE public.mobile_banking OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 17307)
-- Name: payment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment (
    payment_id integer NOT NULL,
    bill_document_id integer NOT NULL,
    method_id integer NOT NULL,
    payment_amount numeric(10,2) NOT NULL,
    payment_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status character varying(20)
);


ALTER TABLE public.payment OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 17270)
-- Name: payment_method; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_method (
    method_id integer NOT NULL,
    method_name character varying(30),
    consumer_id integer,
    is_default boolean DEFAULT false
);


ALTER TABLE public.payment_method OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 17269)
-- Name: payment_method_method_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_method_method_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_method_method_id_seq OWNER TO postgres;

--
-- TOC entry 5268 (class 0 OID 0)
-- Dependencies: 258
-- Name: payment_method_method_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_method_method_id_seq OWNED BY public.payment_method.method_id;


--
-- TOC entry 262 (class 1259 OID 17306)
-- Name: payment_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_payment_id_seq OWNER TO postgres;

--
-- TOC entry 5269 (class 0 OID 0)
-- Dependencies: 262
-- Name: payment_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_payment_id_seq OWNED BY public.payment.payment_id;


--
-- TOC entry 220 (class 1259 OID 16891)
-- Name: person; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.person (
    person_id integer NOT NULL,
    address_id integer NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    date_of_birth date NOT NULL,
    gender character varying(10),
    phone_number character varying(15) NOT NULL,
    national_id character varying(10) NOT NULL
);


ALTER TABLE public.person OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16890)
-- Name: person_person_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.person_person_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.person_person_id_seq OWNER TO postgres;

--
-- TOC entry 5270 (class 0 OID 0)
-- Dependencies: 219
-- Name: person_person_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.person_person_id_seq OWNED BY public.person.person_id;


--
-- TOC entry 254 (class 1259 OID 17219)
-- Name: prepaid_account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prepaid_account (
    prepaid_account_id integer NOT NULL,
    connection_id integer NOT NULL,
    balance numeric(10,2) NOT NULL
);


ALTER TABLE public.prepaid_account OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 17218)
-- Name: prepaid_account_prepaid_account_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.prepaid_account_prepaid_account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.prepaid_account_prepaid_account_id_seq OWNER TO postgres;

--
-- TOC entry 5271 (class 0 OID 0)
-- Dependencies: 253
-- Name: prepaid_account_prepaid_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.prepaid_account_prepaid_account_id_seq OWNED BY public.prepaid_account.prepaid_account_id;


--
-- TOC entry 251 (class 1259 OID 17193)
-- Name: prepaid_statement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prepaid_statement (
    bill_document_id integer NOT NULL,
    prepaid_token character varying(50)
);


ALTER TABLE public.prepaid_statement OWNER TO postgres;

--
-- TOC entry 216 (class 1259 OID 16872)
-- Name: region; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.region (
    region_id integer NOT NULL,
    region_name character varying(25) NOT NULL,
    postal_code character varying(10) NOT NULL
);


ALTER TABLE public.region OWNER TO postgres;

--
-- TOC entry 215 (class 1259 OID 16871)
-- Name: region_region_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.region_region_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.region_region_id_seq OWNER TO postgres;

--
-- TOC entry 5272 (class 0 OID 0)
-- Dependencies: 215
-- Name: region_region_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.region_region_id_seq OWNED BY public.region.region_id;


--
-- TOC entry 241 (class 1259 OID 17078)
-- Name: residential_connection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.residential_connection (
    connection_id integer NOT NULL,
    property_type character varying(20),
    is_subsidized boolean DEFAULT false
);


ALTER TABLE public.residential_connection OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 17007)
-- Name: tariff; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tariff (
    tariff_id integer NOT NULL,
    utility_id integer,
    tariff_name character varying(50) NOT NULL,
    consumer_category character varying(30) NOT NULL,
    billing_method character varying(30) NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    is_active boolean DEFAULT true
);


ALTER TABLE public.tariff OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 17019)
-- Name: tariff_slab; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tariff_slab (
    tariff_id integer NOT NULL,
    slab_num integer NOT NULL,
    charge_type character varying(20),
    unit_from numeric(10,2) NOT NULL,
    unit_to numeric(10,2),
    rate_per_unit numeric(10,4) NOT NULL
);


ALTER TABLE public.tariff_slab OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 17006)
-- Name: tariff_tariff_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tariff_tariff_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tariff_tariff_id_seq OWNER TO postgres;

--
-- TOC entry 5273 (class 0 OID 0)
-- Dependencies: 232
-- Name: tariff_tariff_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tariff_tariff_id_seq OWNED BY public.tariff.tariff_id;


--
-- TOC entry 247 (class 1259 OID 17149)
-- Name: usage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usage (
    meter_id integer NOT NULL,
    usage_id bigint NOT NULL,
    tariff_id integer NOT NULL,
    slab_num integer NOT NULL,
    reading_id integer,
    time_from timestamp without time zone NOT NULL,
    time_to timestamp without time zone NOT NULL,
    unit_used numeric(10,2) NOT NULL
);


ALTER TABLE public.usage OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16955)
-- Name: utility; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.utility (
    utility_id integer NOT NULL,
    utility_name character varying(50) NOT NULL,
    utility_type character varying(50) NOT NULL,
    billing_cycle character varying(20) NOT NULL,
    unit_of_measurement character varying(20) NOT NULL,
    status character varying(20)
);


ALTER TABLE public.utility OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 17056)
-- Name: utility_connection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.utility_connection (
    connection_id integer NOT NULL,
    tariff_id integer NOT NULL,
    consumer_id integer NOT NULL,
    meter_id integer NOT NULL,
    payment_type character varying(20) NOT NULL,
    connection_type character varying(20) NOT NULL,
    connection_status character varying(20),
    connection_date date DEFAULT CURRENT_DATE,
    disconnection_date date,
    load_requirement numeric(8,2)
);


ALTER TABLE public.utility_connection OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 17055)
-- Name: utility_connection_connection_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.utility_connection_connection_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.utility_connection_connection_id_seq OWNER TO postgres;

--
-- TOC entry 5274 (class 0 OID 0)
-- Dependencies: 239
-- Name: utility_connection_connection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.utility_connection_connection_id_seq OWNED BY public.utility_connection.connection_id;


--
-- TOC entry 231 (class 1259 OID 16991)
-- Name: utility_region; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.utility_region (
    utility_id integer NOT NULL,
    region_id integer NOT NULL
);


ALTER TABLE public.utility_region OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16954)
-- Name: utility_utility_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.utility_utility_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.utility_utility_id_seq OWNER TO postgres;

--
-- TOC entry 5275 (class 0 OID 0)
-- Dependencies: 226
-- Name: utility_utility_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.utility_utility_id_seq OWNED BY public.utility.utility_id;


--
-- TOC entry 229 (class 1259 OID 16971)
-- Name: water_utility; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.water_utility (
    utility_id integer NOT NULL,
    pressure_level character varying(20),
    water_source character varying(20),
    quality_grade character varying(20)
);


ALTER TABLE public.water_utility OWNER TO postgres;

--
-- TOC entry 4898 (class 2604 OID 16908)
-- Name: account account_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account ALTER COLUMN account_id SET DEFAULT nextval('public.account_account_id_seq'::regclass);


--
-- TOC entry 4896 (class 2604 OID 16882)
-- Name: address address_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address ALTER COLUMN address_id SET DEFAULT nextval('public.address_address_id_seq'::regclass);


--
-- TOC entry 4922 (class 2604 OID 17249)
-- Name: balance_transaction transaction_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transaction ALTER COLUMN transaction_id SET DEFAULT nextval('public.balance_transaction_transaction_id_seq'::regclass);


--
-- TOC entry 4918 (class 2604 OID 17173)
-- Name: bill_document bill_document_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_document ALTER COLUMN bill_document_id SET DEFAULT nextval('public.bill_document_bill_document_id_seq'::regclass);


--
-- TOC entry 4928 (class 2604 OID 17328)
-- Name: complaint complaint_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint ALTER COLUMN complaint_id SET DEFAULT nextval('public.complaint_complaint_id_seq'::regclass);


--
-- TOC entry 4912 (class 2604 OID 17103)
-- Name: connection_application application_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connection_application ALTER COLUMN application_id SET DEFAULT nextval('public.connection_application_application_id_seq'::regclass);


--
-- TOC entry 4905 (class 2604 OID 17033)
-- Name: fixed_charge fixed_charge_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge ALTER COLUMN fixed_charge_id SET DEFAULT nextval('public.fixed_charge_fixed_charge_id_seq'::regclass);


--
-- TOC entry 4907 (class 2604 OID 17046)
-- Name: meter meter_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter ALTER COLUMN meter_id SET DEFAULT nextval('public.meter_meter_id_seq'::regclass);


--
-- TOC entry 4916 (class 2604 OID 17125)
-- Name: meter_reading reading_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_reading ALTER COLUMN reading_id SET DEFAULT nextval('public.meter_reading_reading_id_seq'::regclass);


--
-- TOC entry 4926 (class 2604 OID 17310)
-- Name: payment payment_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment ALTER COLUMN payment_id SET DEFAULT nextval('public.payment_payment_id_seq'::regclass);


--
-- TOC entry 4924 (class 2604 OID 17273)
-- Name: payment_method method_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_method ALTER COLUMN method_id SET DEFAULT nextval('public.payment_method_method_id_seq'::regclass);


--
-- TOC entry 4897 (class 2604 OID 16894)
-- Name: person person_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person ALTER COLUMN person_id SET DEFAULT nextval('public.person_person_id_seq'::regclass);


--
-- TOC entry 4921 (class 2604 OID 17222)
-- Name: prepaid_account prepaid_account_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prepaid_account ALTER COLUMN prepaid_account_id SET DEFAULT nextval('public.prepaid_account_prepaid_account_id_seq'::regclass);


--
-- TOC entry 4895 (class 2604 OID 16875)
-- Name: region region_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.region ALTER COLUMN region_id SET DEFAULT nextval('public.region_region_id_seq'::regclass);


--
-- TOC entry 4903 (class 2604 OID 17010)
-- Name: tariff tariff_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tariff ALTER COLUMN tariff_id SET DEFAULT nextval('public.tariff_tariff_id_seq'::regclass);


--
-- TOC entry 4902 (class 2604 OID 16958)
-- Name: utility utility_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility ALTER COLUMN utility_id SET DEFAULT nextval('public.utility_utility_id_seq'::regclass);


--
-- TOC entry 4909 (class 2604 OID 17059)
-- Name: utility_connection connection_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_connection ALTER COLUMN connection_id SET DEFAULT nextval('public.utility_connection_connection_id_seq'::regclass);


--
-- TOC entry 5209 (class 0 OID 16905)
-- Dependencies: 222
-- Data for Name: account; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account (account_id, person_id, account_type, email, password_hashed, is_active, created_at, avatar_b64) FROM stdin;
1	1	consumer	john.doe@example.com	$2b$10$UvohxDPcI/wnEe18H/lck.pETXnhE4hhgW3SABuKcz7WnxjdoxdVC	t	2026-02-21 01:01:17.213463	data:image/jpeg;base64,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qbdQT6dcoRHxGM1dMUr4GV/llkXxvX4Ux90DiaqaiBva5Y8GMYZ28TOxV8kavA9s/wD0YmS/wxGZmcieNInxB+1+ETWM2jiZzPAjczs3UYc7qByfK/jZ++xIVP6ZVfASgdL4i9EV1U76h4yL0SasyxMMZeiqiADUrwSxzUfK4Vas0dy//wBU/wDJonr/ALIIG87gsMazGNe/uGCO6JuUmE/eB+HdBB0y9Ut5xhdon33L2nW4hQTtLHGxPBMIX7lsGLLQd7StP0Uw8w/KdnF7ZdCt3c1K/Uo6iq18xNu7EqJQ/qOU+OosjjM1hPhJgfSIbt7n7N/AgzDp8kURel2Rmm+bDMjBesxy0qagM3FLCQ+JhgfM8M35gPij2IOuDeXc8+n5gGFO0/ZuXh6cR6JO5aiXhvueEgjT0pc6OqYRt3IV9l/krAL+UmnfwJ/6mMf9RN/PoSPsh4bljuijZLnwLTD7z1wsJL2fxIrr8R9D9zwf7p/7SVm/7sR4K/PFtqT+5qLfUdk+YO0JG2787g+mkQPshZf8lt0CFLdmr1B8H9RD/wCKbB/qfB2pmTFdX39IJSYlx+ls3/um4Ui6Um5h8MsY37lcNDV56v8AU9OetG24umWs/wDcQyL8zoD1PUCLEIelOiGQAHj7fcRKNw+t19LD7lyGZyqFRKlvMwlvbL3BXzfWJWiG6mYUnQw8yQjybjCJkVL4ddTt5/KBQAdQ4OGH1//aAAwDAQACAAMAAAAQ88888888888888888888888888888o888U8888888888888888888888888888888888888888888888888088888888888888888888888888888888cRPGQ+8888888888888888488888880yJD9ilIY8088888888488888s888888A/xyyHNay7AGY8888888o888888888887lmD6F980AqPKF2888888o88888888880ujHAj5DgRJdDBUbX88888o8888888888ERh7H8PefhJvh3uBfDz088o88888888884GDRQyL49+vgYD1WPeFn88o88888888888HK8swuO46YFNT9AtJew48o88888888888vyqbokVxwkF0sfmc0t9h8o888888888802a2DLhp00XSnJFmSn86s8o8888888888U1XP8wLjxf3T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
2	1	employee	john.doe@example.com	$2b$10$xOisWEdKPAAswPNAFDhFa.oseEKOcfk5pfQqBdbzh7kIbV4WOpu82	t	2026-02-21 01:01:17.213845	data:image/jpeg;base64,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qbdQT6dcoRHxGM1dMUr4GV/llkXxvX4Ux90DiaqaiBva5Y8GMYZ28TOxV8kavA9s/wD0YmS/wxGZmcieNInxB+1+ETWM2jiZzPAjczs3UYc7qByfK/jZ++xIVP6ZVfASgdL4i9EV1U76h4yL0SasyxMMZeiqiADUrwSxzUfK4Vas0dy//wBU/wDJonr/ALIIG87gsMazGNe/uGCO6JuUmE/eB+HdBB0y9Ut5xhdon33L2nW4hQTtLHGxPBMIX7lsGLLQd7StP0Uw8w/KdnF7ZdCt3c1K/Uo6iq18xNu7EqJQ/qOU+OosjjM1hPhJgfSIbt7n7N/AgzDp8kURel2Rmm+bDMjBesxy0qagM3FLCQ+JhgfM8M35gPij2IOuDeXc8+n5gGFO0/ZuXh6cR6JO5aiXhvueEgjT0pc6OqYRt3IV9l/krAL+UmnfwJ/6mMf9RN/PoSPsh4bljuijZLnwLTD7z1wsJL2fxIrr8R9D9zwf7p/7SVm/7sR4K/PFtqT+5qLfUdk+YO0JG2787g+mkQPshZf8lt0CFLdmr1B8H9RD/wCKbB/qfB2pmTFdX39IJSYlx+ls3/um4Ui6Um5h8MsY37lcNDV56v8AU9OetG24umWs/wDcQyL8zoD1PUCLEIelOiGQAHj7fcRKNw+t19LD7lyGZyqFRKlvMwlvbL3BXzfWJWiG6mYUnQw8yQjybjCJkVL4ddTt5/KBQAdQ4OGH1//aAAwDAQACAAMAAAAQ88888888888888888888888888888o888U8888888888888888888888888888888888888888888888888088888888888888888888888888888888cRPGQ+8888888888888888488888880yJD9ilIY8088888888488888s888888A/xyyHNay7AGY8888888o888888888887lmD6F980AqPKF2888888o88888888880ujHAj5DgRJdDBUbX88888o8888888888ERh7H8PefhJvh3uBfDz088o88888888884GDRQyL49+vgYD1WPeFn88o88888888888HK8swuO46YFNT9AtJew48o88888888888vyqbokVxwkF0sfmc0t9h8o888888888802a2DLhp00XSnJFmSn86s8o8888888888U1XP8wLjxf3T9Zevv/x7R8o8888888888kIGVFe/3gs0KhQxNlKnBP8AKPPPPPPPPPPnue5gtBzW9CSYR5i45EovPKOMBxMMMPPPIMXkAwfqRwionI42iWZHPPKLIqYeM2i2LF31HnniMWShz7NFGt84/PPLLEH2C3WpuhCsEBmtBa1AOL+stJRp8/PPOIWHyZkhOLHTZ6H1x1qtYm91jefXf8vPPKhEKS1q9Q13PN1wPLHzV45H2Y7Y1bHvPPOivioiyfYLLIv7My5uoulzPd7v1xFXPPPPIkryI9PfdjLNueWJQB7+0pulgi5bPPPAPHPHHPDCDPPPOAipIBxcDpfw95LIfPPPPKPPPPPPPPPPPPCtPYejMKmtzwHiHPLPPPKPPPPPPPPPPPPPPjs+AYENhpcuDA9PPPPKPPPPPPPPPPPPPPPNqyLelvQZyxXi/PPPKPPPPPPPPPPPPPPPFm0QL0435HdeH/PPPLAAAAENPPPPPPPPOETiguewzqDeE/BfPPLAAAAAEOvMPPPPPNpz7rEAvTFhVMay/PPPvvjjiAEAAFPPPPLI9c8dqkyIqEYzBPPPPsvvvuiAAAAPPCEANJFHyqEd6LEcXOPPPAoggvgvIAIAPPIIHPHPAH3Hf/AQPPAPPHP/xAAhEQEBAQADAAIDAQEBAAAAAAABABEQITEgQDBBYVFgcf/aAAgBAwEBPxD/ALXLPuiYUTrAkzHH2d4Flk8hMa4+qG8Biyz4ZZZJkIfU3bA4xw22GORxhwpn0vNvfCcAwQ/g2TZay5M+iDevU17u7rWx8LYzJ3nCw8JHCcD0/nHJf+kJsLo37F4xLJONg5wcZylh3+cO5truwkHcjHfKcJJpPhIHuwbArG2OBpP5unn0F7pc0WmLLGydYSMDJ/l+xfpWjLy2Gwz8v8sNZjl3TQl6n0g213VnZLJbY2WRbXshnUS5Lv8ALlkcCdEMo06h3jbTwhu1yZzgOMS2yJNseyOuB/Lodm8ynG1cwP3wbReBAeMabOOpNWYbx7bL5Lvyz8Gij9RfqHZNuxFBGHDrgz3E+g4wnUgneQjGCPa9vkfZsnV/jZzP6Kzn0lwHD7PXGbyY/wAgzqHfDD3Fjd7fIBkxa4Bt29idjrHjJkx7MO21o+XbhnPaE8t9ngbcu1LX4n6QWxWqG9SSnkH1u6JM6bOjssF0RP5a/bvFqk4n+Zx5agggdBwfg8xcgHc+AeGl+u7QZBq9LYN2krBuoewUuyTrZTNZrpLzAZPRs9C3T5PI3ZpJHc7dQBjbe20gdwBCWu8KO+DWcY9yRCzaxGLGQE3Qs4yMgRWovzEeQTNlO9j/AFv7wP3fuJH3l3pF/aGXbN14cYyzpaNi+rT5yyQL1jX0xdIDeGLM8g/3LpbpwMwWEpwml136iPSLx9sn4MsmedvCOvrItLrINCecZIXpPHHtjscaj364p5B+MeZv73rN6DYNYME84Ge5sH62kp8AloJn7Lb3J0QB9VlLbdJLHk9MNbfwkevGpk+/UfLNZGxslTYmB7ALB8hjy/UbLOBuIjku7YRavvC/YHImrU6urbbftPBw/h//xAAgEQEBAQACAgMBAQEAAAAAAAABABEhMRBBIDBAUWFg/9oACAECAQE/EP8Attt/YoSSRc/HhBh39OUra2+By22GW0P5Vzw622+dtttn4UO/jWWrZBZBZZZPhY22+DfxagsLLLqRbe4xN8ZDjCNluRQNv4NLJcjOW1crzC/qjXVkGQd8ZdRDmUL4h37xsMqtHsl9bgwsDwGHPCzbbIjm1OPGyye/etm18LR4LvZac8NidRO8fBoapyQDSTi9xYXT7cid3mYs0gsewWQDi4WZb1KOZDklPG2eOXJgPPe6fauc2yPVlARMu3EljVsh4KANritORzsziwEtOp4DpxPF3+5qzYbaMuQtGMnutkyi2wxcpjiz1a8LJiZLZjYMYTjcr3x9ruQ7xFsDNJ/i17hMWF3ckPJb6JWWbyw4oMmhdjb+DAPlp9GWb1rD3MerMVCJqERxYuxiU87JO21LWLCB8JQz0fJeDxhHF3h3Nvdwj156Lkjk2DsP6jffjvIthkkdyGrPKJ8y9S6rp+TcUWc2B4g3Dm32X8thCvJltnA2bCfRPalydw5cvGzdIXNiYeDfxZmOB8vcMvAEdWIz7IceQdNtwiqWTxcQxO7Dcl6hEeIXkN3c6BcFvgn7mMUXWDj4M5ssXvWiN8+K7ZEKTUba0RoAaTlGCWZSdJcikuJOJNzY3ZkZFycfEOy9/IuKAql1Sd0yOcXZEw8Q/MkALBhe4DgheGB7OwuwQ5HuiDh4sWwbM2R4c1J2hj1QGPll1if4QRmTbjzJ7kusnSHkWVqoMG36WfCwvcn3B/ZI82Zl0DDs6+J1Dh7ZDlz+PNe/Dn3i5gn93+1t9zjtmXud92ryd5bOSdSGcH43bCCWQ4l4t1CkuG2tg25tZkx5ssoBh+XInBD6ebm8hepx5I06h25L4TCeF0Tm7dv9oTj872Cd2THkkchc9l15C8eMvJhnjGxPy8xCHGbjKzcWz3qY2+AdCK26+1/lhDErChwjzboRt2ETFeYrCRAOo/GNgYu2WrqDeY9DfxtvXhMefAT8H8HeeFaT6kOovq3AaYJAxnD5v49uLF/hGOvqfyPk+r//xAAqEAEAAgICAgIBBQEBAAMBAAABABEhMUFRYXEQgTAgQFCRobHBYNHh8f/aAAgBAQABPxAz/N6Q1+o1/N6Q1+pWfzbD9Wn/AMCCv/kly5f6T+aZW1DSQAizXQmQNzRlCbgOtyqGVB4c/F/mv+Lv4LWnxMuqic//AJgkm3nTKSmyFqdQBG1n9EyYalwb/GzmGv4a5cuBe5SEKAG7YtUnAWCfDTiFfpAcWiUQfUP1RuyF24DkaCUvsAsjAA8kGELER0xQ1/AsPzsWnxNpDFVU4WVsgfccmINW3MNA3eGCUs5SyhEBIqwrFcEovmMzFY6l7pCnEf0LsliQN22PPtL0Jhb2WpuFFI6RmkLQZf7K/wAbD8qxcSrLEqIUwOvcQBmHojrZZ25nQkZhBEbyZUAoJTuU7lTn48Kl+ZSslkRWTKl8pKiFpDtUjNotK5gR6HZixFpBlkVy/wCJrMQR4C5Re3iKsC8rq4SLCDFSnxpUctfN6sO010z0Z6srUZSglxRIRqzUuSLAxiD08xIwjG0f+yBh6xLII/xDBFQHbKdOYW37mOp3CQz4EC8wrzL9y3zkMvRntB3LcrCsfhEVDsxdCDFXGMxdUlII2QYZcC0ovdHic3IHKmkP4XCAoPdwBKcJTNixN5FlZhiCsQZbLb3Fvb8Z7jZzLVFeYslu5buDrcHzDGZCR3UVVo8s3ETVV7PEwbwEc3MIgI4piqiu3Huoawxg4emH8KUDQGYowqQ7EAtEJUCmcRHcSEpAvE9I3MS4ag84l/MA8wb1Keobgy5lFUlNkqdrUEwRGJkEpIKYqZOJE6EF2RWfwTHiOroM9nEuDdwYZYVDCJeGO64vJjRpB9w9EfUQ0L9SveUP/qgXCJ5SLxf9xDkQtpjmmdiCkEYalQZob6YUS6S1QBQ/wEhQipnD5QdghEi/gX4pNrFPqVByxFMbctEYZDWoMAXzMQS6mkjsYYJ33UW0HqM6nqJYX6JqMHUKtq8y8CE6m1l6gAiQyviUu4GjOJV/mlN1OKgOJgoqL1LaGZNLGNkNW8IIDnI14hiQjyS2rhK3D96zSP3yYIVqrgmkgbRKh5EAU7+pWirGCWCEj9t7ML2Y9BUXMESyNPuWm32woKnqUIvkbnYH1KSmOqDxGwJ5qX5YlLuBFQCbGKwOeCpkAuIx3qWzI6cKSPMyxaKVHZUzZiEHXb0ghSxmMRGsMRE/OLMIH94zSHmgOHJC0NKg+PhCLWaMNgOocirjXncAGNyjpghatYhEo5mDh8ggNI2Ss+ZX3RyLhCLmglo2wVslACWEe4VwwxCYoK9klAQvMcM/UR25IZiE6yxjUBInxyTKhiYUQBZeJvYHUNU3UBw+U7EbOEgHRgjkY/6g/rP2jEhosjiZDHajBByIAqGYFgV3mYTLCLloC5bOzjmoEONggIW1SpzdxmGo7hQsv38ID4RRgYjqB20cKPlDRvEt6+opCMOQSULo5IHIizuXodcIhzcS3DCfCpUhW3YrNRihymEAuCrUX3KoLuJQCPcdHaVOB6gq0PQzlD93UECdRxTIzJnEDQiCwHJKYyXiVDHlKh3AmWWygpXao6A1m3RFrFsTUvaCpxmWCbURKg5i6l/HEouPILiqSFuvSLi5o0MOLXAUAiTJxmh3mYwsLYNT/YFJRWSKxfDxBDcwzBDKZ8xAI4xHWR0tgiqCInEP3jBhhHPCyMXgk0BqVoc5yQGy4gtpW86i6gGM+YwjLBMpLJM2kFxm118MGIKoOcwQh2Y1JYZtVRd3FLq8zGa4GRhjBNoWIgHHtgih5uBhseEghWl7llbUwxJ2RbG3cGy8vUG5cj1mVwr3CFBtNRljEMjyRWfqP2zFgMlVLupemBQ4NwMn4OUwYaBj+4cat2zDejgaIeDOiDbYE4+CUS63EEFZhBLvEBox+CbPBYn5uCai1hMhsZpB9kHfuBE4h5JfKmhqNB6C6hjjojM4UeoWKp0yujD3C7dxf5Gkyws7ibQTDoX2RCX+7uKZyxio5U4JVC2sr2wiEvtGYLbdiw8wHgg48NHAubAjVvcyKigxrF7TWInYSiYiozKQbZYS45MS1NOPddw20lbzyJM7IUNw8FA0SHT5k5h0bJV4i4G+YN9LhNko4b08x3bKUUziQ7IcD9Kl9VK0Q1hQKLsl+ICH+Ir6k7fuOnYIf3TFi+Jjqrg7gd1ey+ItLogKTBUPyCqVqGeCh0HqMg5gNjwcRKIDkcJH1wOUwXEMFRzMXOJl38BXwNy63HhCVy9Kg7xQuA81ATgDEDzGFw3VmZ8ND0lgZ4tzCB2zY3MiXCMIqyZuBCSwYhGRNZ5nvoBp+kNaQiWGOkInlCJcza4blnNpr6h+5fgTLiO5KU9LCADUp7UrfG1Zjn5ij4wzmGGT5Zml9hOZbFwSr8ygWXEUSwTi5XOTaalImtzBq55yvHwDABa5YDnW1XEyyBR/6EoHFnD7CLwCFuEnQ0jJHYFaJSQ+73LhLonE8KczFVF4J2BmJcRizc4zhVMCa5hQnPzXL1GN4GCaH7l18LiUxZRL96wAkrde4pgM0eJVkCscxSb09CwwQ2uZlpL7nqNgmE//AFWCQRRlkHlh/wCR14oQUqPqo12zGcWUjxKqoACuWI2fExtwRozpBNwQKHSbJfswa1DqALApOiCWXSbKSoYDYxHDmEyFgcwY7NUxasqdx2DFSJuVIk/zRW0UfqH7RlSTicjvJxDgOIlsBzTN3I31bKv6m6W36Idq1KOoL0jZWgorca7ulcFShpo/wlz1hj6lHctMNis5FRsUAzFM0R2ELvErbVYm/W6sAlAZC1F/++B4jg6MJQ+4V57ubSjEX2kuVkcI6xNKJcdCnJMMAxjlsiNUxQ5jGcanuAaV9kmH6T9oswEmhGMxtLgojiFYupVZ6xg4heCKPkgAAN/hYbqpM5IYuItBzxmDmjh4kGsKBOcQLjcS1zEiX3JbtBb9whijtWhhwL2YMx6E2q2DrUOGJS0TU6NzSdhOPWLOmNZavSkz/qH0uXmLm44JYIa9hTGcglkxk0k6CPiAFxSNmxhQQCgKP3LMJXjxCAWU0XKRmpixmLgl5g2EFxU88QmzK1wOIqyVVqdkNNu6APUCdTk3+O06JROCioisteoFWIoAzb/k8ZCjdP6QNQFuM2awJBeN6SWViEcUcwWYzsnZ/wBmJXiDdZqn9xlK3A+465lKEQBaGT4gdNhiXG5KZYHUctfULo6wquEnDTjcGJX7h+BD8NsokEi28wUDSGc1q6l8uWwlpSmIJTSbr+xWeKWkRyOArczmBe9zYRtmoWSZ8wFwwiAysMZN3uBQZIchF8QeZxKo7PKY4GzAIUABdWV2wS0ZeRCC22G/gv8Ag+1EtCtZlIq74imJZNUtCD1Sq/N11cHYgAKmr8t/ldShTogbmKlEUXBKojsAdpXldn1MROBGYtxuKjZzF4gBV+wtId0Ly+2N9xt6hYzCjcq9Q80Jh1CUol9wguBfITySmqo9Yl534hnfEHOOxErAqnUpzPDiVwzL5Cooj3GTJzABRj1AzAxD8Fy5cuXLly/xuowulU8NRWwH3Kmt4dZv3DZaicwJM7UZPkg6sDKpGGojcOQB5Y5swG59o+ZlW8QtqDGZUKIJKCCiIUktEeCkF+gsRh8sr2Jhu4ehKi7h9zhHqT+qWxxg4vE3DjESuJmVCAlYFXTfwKoGIfhafC0F5hBlMr8X8XLh+nSOn8R7Orf9iFbvglFYXSBqhMFwax0GdhgChZFt/f1D+2CJhFNcpsV25YBLqouIYZlO4PJLRzuVETp5GCgYHHcGr9CNUwCz6Y601dYhw+FxIN5XeoIAB1Hv+kSpf7wlEfUROsdMZkRU5mkyXs+D8SrMNSuwQHWHuwwv5GYWoLkpmkGeWX5iA3NtkuCQf1f5ZR9qVUp7bqO3SagA0fcNfAXCBDbUtntF8xw3C0GvguLZUrDSdMtFDupaiz1AK9LALAI40NMV5iMi8EuxDWeYee1bkiAaSlRwZmkbh/oTtQQ/CowuxxN6tDxOEH1CWgf1B7YcKiFB7YGX9ucC2Fb+9FMEQc8oXKOz0vMDRDpLhLjuOz8MIPswXMEuU6aHUyZxl5lIiJ2MXyUup7QgtMdkxEViX6+QZeYJHcWovUbvMMdSVxY/9wQDBxGvcjYRWRauLDEP3VhoPE2h+HaONtAg5COHqWiku4mTzABkgxqUtzDsxArpCUQM73nDBiBag0ReTmXG4MZaw2/JC7RuaQmkag7oK6DqBaIxwIieGUtCB7l3FNReopZe4JipzFEMJgYmlxvuAEeFR1EDLLMN8Hcoiv8AqQaeuZhhjK3LNRxhdMwUUNfgVQcRSEhK65MDkl/A8OBuGykxDuNARbVu/j9IiKgghAe2Z3OsEIbz7ElxGWnDKuGEwdDFhjti3G+0CZdQ1BxiO3pIKuBaagseGCbiZaLiAHNStnkhv/VLjA/csIUmTiDEcR+Fy8R0YDd6O5d5lXuLNh2wSEKqyGwXfKVAAPExUeYx3BbMyEZ+S37hoIa/BpMdxFxTsioc3EF9PRUU1fpcygmVdMkcp5LWXGsbRcYalnuCrjqQujE5r4g8gHupXWa0OZjIYhBudU2riUQc2Yj6iuVAuEEtCGMOgiEHNskdBytVjVfSIKrp7VCCV7lNp+2NDdGcwfcSpUy5AQ4nSkD/APTEQiDywSVc7YglN0MzOLhdzPkYrDLG6/MXy13Vy2tVfwMx2zaVcXwqJfvdYOIfgdB5jxtmp6elnEMFW6SvhcumKXqw8xDdjyouWbT4W0Jb+aaq2M1oELjXhRmYArruBHVqiHiCV6i2sVcw4IHau+rhmaSYYN4lNuBL5wpDBBxH1Bb2QMUJklnFEEUTgZjKLXWLhobFZmvREhkZUGCcEBfEJWFDECdYBcCZuQZOotjILcFuwEC4C2Ja4NlXL3ZfMNE6i4jxLnEvwmQjFcCA9TJnL8OEZuptvmVAFDiUOsRNVpzCIGboWFVQUpLIVnxk0+4nYs4cwIFFJUaiwQZYZXlIVqPUoI3UuPe4piGy54GWaTSAasCQtqNDxEWK0ReZsgYLW4gIZyEBmUBbBkY6zBGgqzHPbLRVqjZHgyyW7gUS0MwswzZmbjqA8wgbyU3B7qCCfcNXx8DGu2E8uRBiIJYxhbzEw3KMvBHVW6B1DToATHP4ghfLzAnSpmowmolHZUdvS4uCiqmUzPmJSl4EFSLgktbrEouCwIxYa7RWpw7nmD6QgbB08zahK4mkNj1GMyagxZrcctzyRwkgVGHqtktBLuZ+04XDJQfMcktNqyreWCYAIZvU/uWSAw3FPybGoYGVwoNycILZvnEozbtYepd0xK5OblzRuY9F4uANoEuafHM4qYUCiBd+pxGrzYAoNfh4w1hBVQCOseCABA4grxHR5NENlzTK8EhOoJIpKzLzW81xAZzxxN9VUuMdXANFMGhUOSmIedra4glgACBmMwIAlth6mBR0RjLiGouSshk6R5tcuJW+SbSowJmmNoh4RLH+iD0rysMl5vuAPMJkhq8IncjmKUx3HQlrlhmEpUCAEWL8CgJg1ARJRN+6gleqpb7g3U0h+pfgWlw3E6gqmOnWteoNsIZpAbD2iS09DmW4B4uWJ6hqBcL7iwcdxIbdaYLInZAqZ7jlofUewHtmlFwZQfyejcBE8zbBTnEI6iXCKE3MYjU0agXGZvCrL1BYRBaPcN61W6jq0OMfAU7i9egIVY+dSiivghHgTaQqSuBwtBqpZthFVCMRa37+CzULwPFuISCnUQCgiVFFGEvtKyPQiMysHlGFh0/BUP1Aba+HiV8CM2DcNQx3ZFrTfBFLs+2UD15A0WeSf+CiL6/rjN2vJFbBDl+qYhqr3HBJOFKZAj2gwIdBKIQFfIbgg2J/UAWlZdwd7lZ+AA41FOorhhzbpcEY00eIrWW03LQgZsjwILCnBD+8ESqlYqiIVOZuAQoDBUuNXcQqziGF9BHpWpqoi1EwVGiwimbEcwJdhlVH6Z4iYlG14hZDEwwKPwEY+Dx8piVKJRElZiYgRMQjOYMITqEH6RDdlYYbhWco3Eqqag7hlDE7zLsbDZ5iELyqWxmyjMqGz/yJcrzLMgq5uERDHLNMPuBgWaxmZc+akvm4Nu5SYVjUZYuNtzPDJDqXQVYIwQxKAYAIF8c6vEDiDH4N0UPh4+K+GJDU+onyfoq4HxX6WJCY0YqoJkuSXD2qJZXGEvmUPU/ojRQPshyIX4ii4RmSwmE9Yyu/dMZyHvKAIE9EWq16iVu5ddxjcIsLCCpaCZl3gdszILKGoAAaIFQ6/A5jn8PEPw1KlflfMZBY8RlbDIykHAqaTUXn4vWJTkYFyyh1iX4R4BENojIxzuXL+C7hCqiNtmQoBKiieCDcDb9QaAAdQ6h+h1DX6a+GGv3J7Q3BYxoaDKeZaA2UiQbWYMO0sYUx5CNWoUVUp4gcCBLPgSKyXeILZqUg7aXwSvC+hBJVaeiGAAHBAqGv06Q1+A/cPwLiikuNcdkBMcq11lGTEs4iqDj5x3MS5pZecMo1Ok2iClj/ACBMkxh4EEgLlRCAGv4sYktGF4fBF1QM3j6whhlqJlrmCXF8wbl/CotzmNQ2yj2ywRaNdYSYdT+kgVD4uH8SyyANT7ewhiStnCNuF5jCsG7ga6GayxVf9oJr+yUOSNOSUmR/ctix0MFsl0iUtX4IIrf6QR6YShiWG5eq1bmeh0qW7Z5Az/QDVLkb54ZZVfxaTZgQDIj4sOyBAbZxiVMdHMRvJ1P/AOfLenB1Ve5rRwIKTVQZpGYzyxmOdcTfleXMbN2VdELI2VzfcMDRU7qYkFeSWSgbF1LykWl59wklifxR3M7C9swRlxAKtBGRiyLr3HD1cugjlBpsvEMC+M8L4hdE5PioQCK4I8SqbQK8hxRFHOYlKYeZvHMwCEfV0PCYbi1ZBgCxYDAwnDA9+xB3/FFbbEDhrxLa9Ds91LRXLXsR32mBp9Q7e1vbFIuOBELAxqF2HDqX7BktvnDZKIOUvh87WbrIUxhtKjrKJsLYKjkh9EqjhqVKo9FBL5BRvBGqxIsEvcS04I8RV7Cbhr+IYnpl/ZlgtzBMbYO0dWorqe1tZTKN2dZhpkdCdCsaR4BXqXNzk4S8FllaT/FATo/oImCpsmAo5thDaH7njhFtCGws4GMy0HRzBvJXkIpZLWeM4RtLYx9mApGEZu1XdT3/AAuPwn7W8QnriC5VaJhCqB4GoT+euYATDTKNWEsL/mpYUbeYkCuKxFjQGKUFVEVcN6QTMw8OnNTZs9Ev2XqNxfpgxXz5hwIdQgqLw9YiHkhuATtrLgoRfmowtA6SXdEvwkfjXsKf7jU4G1EJK1mLhemDefwP4z9k6gDdWlz6R07GhdnbDIpp9wSADiV3AZg6gEmuGIy47IA+h4j0uBHTELEy46+AJU3AO5bxMjCkWVe8wTaH9RLYW7Jkh3usYS8TXDDMPUuXZrual/v+wY/Xcf2F/luiEy0iRt/9oVp6jsX/AKoYMvxpFUVR3Hj430W+Bm4ZHC15pye5QhtxuqVGCRAIKEB2kBoqcoxIVD9sVYj2Q4gC4PgRqwjeL9TxidxrukpUapaLnD3CqdGCdgKL6v8AXnuah+O5mV2lo5h83+MTLKLajPthCvMBiK7tiVyWa4YVf+Me0r1Fa85Cyg9LGwBIFc6hSIyDtgkYlFSzJiJgjxCIcfREXIo1D2hepVNNaU3Spe0sWtxmU8Fi5RMTvcMVQoaSJwGu2lACGKxCZXbmPhYgbL5ghZQ+3P66I/ov8VfnqJiNlJSFjH7BF5HcytzXJ6Z3QAckxNpOyAVziYYSPg7lErxyQchDiNgLyEQWQWaD3BxwagOYk5shrA+CMC2By+ooBFJ7iFGeITxSDAHNJkEm3WSxHqqhEdnwW4DuSy24OY1AROwrmuJS48zSr6jNUfOBf/YYK/Bw/Bcv8Z+UHpVR9owGjb2BCzHgFL+5UBjDQMU9LmCKqf1bmGoryFzP1s2og4PoZmKvOqypu8Qy8LQjKkwnAr1yEuf2rRDkf+wloU8vMAbjKWvmDEXcoliI8Wyw6yh24jcawZYisXgceIZeyMtPUqUalfg4fuQNymN8i41SPV0ucIdyEEsxy16vMG5US4KUmOmXgw01/aU7jK59pNOXaILAk25EoqV+k0iPaXMl5ZEYya9olx9aJQoI9PEDbDfeKgLnVpZX2hB8eTnFT+qIHWE6QxsLjOBhb4DEX+K2viBhTQvA1DUBUI1+E7Eo1LJfxmZ/R6mYP5WVJa19xZRukOpUqjEYA/rTAAeYuAgWq8+osnP+nfxzEuUREBWx0zKzZryfJEGgtEUPUplWGlmUi23MH+upyt/QWG7DpIG1d7jJX+c6h+oNKeiAn6RLB4uL55lXMwnUFrCKA01B5jodtOb1A4NQDBDJ+BfhtWktAs1+bl/B8I4lw+FHLly2H68fTE865yjWMXrEc1Z9Ec1RXGJe7DpSwKZXx5+X4Bwgj3mWNodTfsg0dBCH9y36xzCQAFQ1GLSExiaPx4CV3u1EBrESz/pmHrwGggpjzNPjhNP0Pz//2Q==
3	1	employee	adnath@example.com	$2b$10$OQT7J0Y.VAf9gCY/5mq8MOGqMW.XUWwwW2KAVv1.BtZosdoaJ4kkK	t	2026-02-21 01:03:55.64978	data:image/jpeg;base64,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qbdQT6dcoRHxGM1dMUr4GV/llkXxvX4Ux90DiaqaiBva5Y8GMYZ28TOxV8kavA9s/wD0YmS/wxGZmcieNInxB+1+ETWM2jiZzPAjczs3UYc7qByfK/jZ++xIVP6ZVfASgdL4i9EV1U76h4yL0SasyxMMZeiqiADUrwSxzUfK4Vas0dy//wBU/wDJonr/ALIIG87gsMazGNe/uGCO6JuUmE/eB+HdBB0y9Ut5xhdon33L2nW4hQTtLHGxPBMIX7lsGLLQd7StP0Uw8w/KdnF7ZdCt3c1K/Uo6iq18xNu7EqJQ/qOU+OosjjM1hPhJgfSIbt7n7N/AgzDp8kURel2Rmm+bDMjBesxy0qagM3FLCQ+JhgfM8M35gPij2IOuDeXc8+n5gGFO0/ZuXh6cR6JO5aiXhvueEgjT0pc6OqYRt3IV9l/krAL+UmnfwJ/6mMf9RN/PoSPsh4bljuijZLnwLTD7z1wsJL2fxIrr8R9D9zwf7p/7SVm/7sR4K/PFtqT+5qLfUdk+YO0JG2787g+mkQPshZf8lt0CFLdmr1B8H9RD/wCKbB/qfB2pmTFdX39IJSYlx+ls3/um4Ui6Um5h8MsY37lcNDV56v8AU9OetG24umWs/wDcQyL8zoD1PUCLEIelOiGQAHj7fcRKNw+t19LD7lyGZyqFRKlvMwlvbL3BXzfWJWiG6mYUnQw8yQjybjCJkVL4ddTt5/KBQAdQ4OGH1//aAAwDAQACAAMAAAAQ88888888888888888888888888888o888U8888888888888888888888888888888888888888888888888088888888888888888888888888888888cRPGQ+8888888888888888488888880yJD9ilIY8088888888488888s888888A/xyyHNay7AGY8888888o888888888887lmD6F980AqPKF2888888o88888888880ujHAj5DgRJdDBUbX88888o8888888888ERh7H8PefhJvh3uBfDz088o88888888884GDRQyL49+vgYD1WPeFn88o88888888888HK8swuO46YFNT9AtJew48o88888888888vyqbokVxwkF0sfmc0t9h8o888888888802a2DLhp00XSnJFmSn86s8o8888888888U1XP8wLjxf3T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
\.


--
-- TOC entry 5205 (class 0 OID 16879)
-- Dependencies: 218
-- Data for Name: address; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.address (address_id, region_id, house_num, street_name, landmark) FROM stdin;
1	14	123	Main Street	\N
\.


--
-- TOC entry 5244 (class 0 OID 17246)
-- Dependencies: 257
-- Data for Name: balance_transaction; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.balance_transaction (transaction_id, meter_id, usage_id, bill_document_id, prepaid_account_id, transaction_amount, transaction_type, transaction_time, balance_after) FROM stdin;
1	\N	\N	1	1	100.00	CREDIT	2026-02-21 00:58:34.647236	100.00
2	1	120250601120100	\N	1	26.30	DEBIT	2026-02-21 00:58:34.647236	73.70
3	1	120250601120200	\N	1	26.30	DEBIT	2026-02-21 00:58:34.647236	47.40
4	1	120250228235900	\N	1	1107.23	DEBIT	2026-02-25 23:31:37.246134	-1059.83
5	1	120250331235900	\N	1	1288.70	DEBIT	2026-02-25 23:31:37.246134	-2348.53
6	1	120250430235900	\N	1	1634.55	DEBIT	2026-02-25 23:31:37.246134	-3983.08
7	1	120250531235900	\N	1	2051.40	DEBIT	2026-02-25 23:31:37.246134	-6034.48
8	1	120250630235900	\N	1	2210.52	DEBIT	2026-02-25 23:31:37.246134	-8245.00
9	1	120250731235900	\N	1	2132.93	DEBIT	2026-02-25 23:31:37.246134	-10377.93
10	1	120250831235900	\N	1	1919.90	DEBIT	2026-02-25 23:31:37.246134	-12297.83
11	1	120250930235900	\N	1	1687.15	DEBIT	2026-02-25 23:31:37.246134	-13984.98
12	1	120251031235900	\N	1	1393.90	DEBIT	2026-02-25 23:31:37.246134	-15378.88
13	1	120251130235900	\N	1	1212.43	DEBIT	2026-02-25 23:31:37.246134	-16591.31
14	1	120251231235900	\N	1	1341.30	DEBIT	2026-02-25 23:31:37.246134	-17932.61
15	1	120260131235900	\N	1	1421.52	DEBIT	2026-02-25 23:31:37.246134	-19354.13
\.


--
-- TOC entry 5247 (class 0 OID 17276)
-- Dependencies: 260
-- Data for Name: bank; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank (method_id, bank_name, account_num) FROM stdin;
2	City Bank	9875666342
\.


--
-- TOC entry 5236 (class 0 OID 17170)
-- Dependencies: 249
-- Data for Name: bill_document; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bill_document (bill_document_id, connection_id, bill_type, bill_generation_date, unit_consumed, energy_amount, total_amount, bill_status) FROM stdin;
1	1	PREPAID	2026-02-21	0.00	100.00	100.00	PAID
\.


--
-- TOC entry 5237 (class 0 OID 17183)
-- Dependencies: 250
-- Data for Name: bill_postpaid; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bill_postpaid (bill_document_id, bill_period_start, bill_period_end, due_date, remarks) FROM stdin;
\.


--
-- TOC entry 5229 (class 0 OID 17089)
-- Dependencies: 242
-- Data for Name: commercial_connection; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.commercial_connection (connection_id, business_name, operating_hours, tax_id) FROM stdin;
\.


--
-- TOC entry 5252 (class 0 OID 17325)
-- Dependencies: 265
-- Data for Name: complaint; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.complaint (complaint_id, consumer_id, connection_id, assigned_by, assigned_to, complaint_date, description, status, assignment_date, resolution_date, remarks) FROM stdin;
1	1	\N	\N	\N	2026-02-21 00:00:00	saleh ekta sagol	Pending	\N	\N	\N
\.


--
-- TOC entry 5231 (class 0 OID 17100)
-- Dependencies: 244
-- Data for Name: connection_application; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.connection_application (application_id, consumer_id, reviewed_by, utility_type, application_date, status, requested_connection_type, address, review_date, approval_date, priority) FROM stdin;
\.


--
-- TOC entry 5210 (class 0 OID 16918)
-- Dependencies: 223
-- Data for Name: consumer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consumer (person_id, consumer_type, registration_date) FROM stdin;
1	Residential	2025-06-29
\.


--
-- TOC entry 5215 (class 0 OID 16961)
-- Dependencies: 228
-- Data for Name: electricity_utility; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.electricity_utility (utility_id, voltage_level, phase_type) FROM stdin;
1	220V	Single Phase
\.


--
-- TOC entry 5211 (class 0 OID 16929)
-- Dependencies: 224
-- Data for Name: employee; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee (person_id, role, employee_num, hire_date, employment_status) FROM stdin;
\.


--
-- TOC entry 5212 (class 0 OID 16939)
-- Dependencies: 225
-- Data for Name: field_worker; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.field_worker (person_id, assigned_region_id, expertise, skillset) FROM stdin;
\.


--
-- TOC entry 5223 (class 0 OID 17030)
-- Dependencies: 236
-- Data for Name: fixed_charge; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fixed_charge (fixed_charge_id, tariff_id, charge_name, charge_amount, charge_frequency, is_mandatory) FROM stdin;
1011	101	Meter Rent	25.00	Monthly	t
1012	101	Demand Charge	42.00	Monthly	t
\.


--
-- TOC entry 5239 (class 0 OID 17203)
-- Dependencies: 252
-- Data for Name: fixed_charge_applied; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fixed_charge_applied (fixed_charge_id, bill_document_id, timeframe) FROM stdin;
\.


--
-- TOC entry 5242 (class 0 OID 17230)
-- Dependencies: 255
-- Data for Name: fixed_charge_owed; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fixed_charge_owed (fixed_charge_id, prepaid_account_id, timeframe) FROM stdin;
\.


--
-- TOC entry 5217 (class 0 OID 16981)
-- Dependencies: 230
-- Data for Name: gas_utility; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gas_utility (utility_id, gas_type, pressure_category) FROM stdin;
3	Natural Gas	Low
\.


--
-- TOC entry 5253 (class 0 OID 17379)
-- Dependencies: 266
-- Data for Name: google_pay; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.google_pay (method_id, google_account_email, phone_num) FROM stdin;
3	abc@gmail.com	\N
\.


--
-- TOC entry 5225 (class 0 OID 17043)
-- Dependencies: 238
-- Data for Name: meter; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.meter (meter_id, address_id, meter_type, is_active) FROM stdin;
1	1	Electricity	f
2	1	Digital	t
3	1	Analog	t
\.


--
-- TOC entry 5233 (class 0 OID 17122)
-- Dependencies: 246
-- Data for Name: meter_reading; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.meter_reading (reading_id, meter_id, tariff_id, slab_num, approved_by, field_worker_id, time_from, time_to, units_logged, reading_date) FROM stdin;
\.


--
-- TOC entry 5248 (class 0 OID 17286)
-- Dependencies: 261
-- Data for Name: mobile_banking; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mobile_banking (method_id, provider_name, phone_num) FROM stdin;
1	Grameenphone	01712345678
\.


--
-- TOC entry 5250 (class 0 OID 17307)
-- Dependencies: 263
-- Data for Name: payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment (payment_id, bill_document_id, method_id, payment_amount, payment_date, status) FROM stdin;
1	1	1	100.00	2026-02-21 00:58:34.647236	\N
\.


--
-- TOC entry 5246 (class 0 OID 17270)
-- Dependencies: 259
-- Data for Name: payment_method; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_method (method_id, method_name, consumer_id, is_default) FROM stdin;
1	Mobile Banking	\N	f
2	bank	1	t
3	google_pay	1	f
\.


--
-- TOC entry 5207 (class 0 OID 16891)
-- Dependencies: 220
-- Data for Name: person; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.person (person_id, address_id, first_name, last_name, date_of_birth, gender, phone_number, national_id) FROM stdin;
1	1	John	Doe	1990-01-01	Male	01234567890	0123456789
\.


--
-- TOC entry 5241 (class 0 OID 17219)
-- Dependencies: 254
-- Data for Name: prepaid_account; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.prepaid_account (prepaid_account_id, connection_id, balance) FROM stdin;
1	1	-19354.13
\.


--
-- TOC entry 5238 (class 0 OID 17193)
-- Dependencies: 251
-- Data for Name: prepaid_statement; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.prepaid_statement (bill_document_id, prepaid_token) FROM stdin;
1	\N
\.


--
-- TOC entry 5203 (class 0 OID 16872)
-- Dependencies: 216
-- Data for Name: region; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.region (region_id, region_name, postal_code) FROM stdin;
1	Motijheel	1000
2	Dhaka Sadar	1100
3	Nilkhet	1205
4	Kochukhet	1206
5	Mohammadpur	1207
6	Kamrangirchar	1211
7	Tejgaon	1208
8	Dhanmondi	1209
9	Gulshan	1212
10	Banani	1213
11	Khilgaon	1214
12	Banani	1219
13	Tejgaon	1215
14	Mirpur	1216
15	Shantinagar	1217
16	Mohammadpur	1222
17	Motijheel	1223
18	Lalmati	1225
19	Khilkhet	1229
20	Uttara	1230
\.


--
-- TOC entry 5228 (class 0 OID 17078)
-- Dependencies: 241
-- Data for Name: residential_connection; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.residential_connection (connection_id, property_type, is_subsidized) FROM stdin;
1	Apartment	f
2	Apartment	f
3	Apartment	f
\.


--
-- TOC entry 5220 (class 0 OID 17007)
-- Dependencies: 233
-- Data for Name: tariff; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tariff (tariff_id, utility_id, tariff_name, consumer_category, billing_method, effective_from, effective_to, is_active) FROM stdin;
101	1	LT-A	Residential	Slab	2024-02-29	\N	t
102	2	Residential Water Tariff	Residential	Slab	2024-01-01	\N	t
103	3	Residential Gas Tariff	Residential	Slab	2024-01-01	\N	t
\.


--
-- TOC entry 5221 (class 0 OID 17019)
-- Dependencies: 234
-- Data for Name: tariff_slab; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tariff_slab (tariff_id, slab_num, charge_type, unit_from, unit_to, rate_per_unit) FROM stdin;
101	1	\N	0.00	75.00	5.2600
101	2	\N	76.00	200.00	7.2000
101	3	\N	201.00	300.00	7.5900
101	4	\N	301.00	400.00	8.0200
101	5	\N	401.00	600.00	12.6700
101	6	\N	601.00	\N	14.6100
102	1	FLAT	0.00	20.00	8.5000
102	2	FLAT	20.01	40.00	12.0000
102	3	FLAT	40.01	\N	18.0000
103	1	FLAT	0.00	30.00	9.0000
103	2	FLAT	30.01	60.00	13.5000
103	3	FLAT	60.01	\N	19.0000
\.


--
-- TOC entry 5234 (class 0 OID 17149)
-- Dependencies: 247
-- Data for Name: usage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usage (meter_id, usage_id, tariff_id, slab_num, reading_id, time_from, time_to, unit_used) FROM stdin;
1	120250601120100	101	1	\N	2025-06-01 12:00:00	2025-06-01 12:01:00	5.00
1	120250601120200	101	1	\N	2025-06-01 12:01:00	2025-06-01 12:02:00	5.00
1	120250228235900	101	1	\N	2025-02-01 00:00:00	2025-02-28 23:59:00	210.50
1	120250331235900	101	1	\N	2025-03-01 00:00:00	2025-03-31 23:59:00	245.00
1	120250430235900	101	1	\N	2025-04-01 00:00:00	2025-04-30 23:59:00	310.75
1	120250531235900	101	1	\N	2025-05-01 00:00:00	2025-05-31 23:59:00	390.00
1	120250630235900	101	1	\N	2025-06-01 00:00:00	2025-06-30 23:59:00	420.25
1	120250731235900	101	1	\N	2025-07-01 00:00:00	2025-07-31 23:59:00	405.50
1	120250831235900	101	1	\N	2025-08-01 00:00:00	2025-08-31 23:59:00	365.00
1	120250930235900	101	1	\N	2025-09-01 00:00:00	2025-09-30 23:59:00	320.75
1	120251031235900	101	1	\N	2025-10-01 00:00:00	2025-10-31 23:59:00	265.00
1	120251130235900	101	1	\N	2025-11-01 00:00:00	2025-11-30 23:59:00	230.50
1	120251231235900	101	1	\N	2025-12-01 00:00:00	2025-12-31 23:59:00	255.00
1	120260131235900	101	1	\N	2026-01-01 00:00:00	2026-01-31 23:59:00	270.25
2	120250228235800	102	1	\N	2025-02-01 00:00:00	2025-02-28 23:58:00	18.50
2	120250331235800	102	1	\N	2025-03-01 00:00:00	2025-03-31 23:58:00	19.75
2	220250430235800	102	2	\N	2025-04-01 00:00:00	2025-04-30 23:58:00	22.00
2	220250531235800	102	2	\N	2025-05-01 00:00:00	2025-05-31 23:58:00	25.50
2	220250630235800	102	2	\N	2025-06-01 00:00:00	2025-06-30 23:58:00	27.25
2	220250731235800	102	2	\N	2025-07-01 00:00:00	2025-07-31 23:58:00	26.00
2	220250831235800	102	2	\N	2025-08-01 00:00:00	2025-08-31 23:58:00	24.50
2	220250930235800	102	2	\N	2025-09-01 00:00:00	2025-09-30 23:58:00	22.75
2	120251031235800	102	1	\N	2025-10-01 00:00:00	2025-10-31 23:58:00	20.00
2	120251130235800	102	1	\N	2025-11-01 00:00:00	2025-11-30 23:58:00	19.25
2	120251231235800	102	1	\N	2025-12-01 00:00:00	2025-12-31 23:58:00	18.75
2	120260131235800	102	1	\N	2026-01-01 00:00:00	2026-01-31 23:58:00	18.00
3	220250228235700	103	2	\N	2025-02-01 00:00:00	2025-02-28 23:57:00	52.00
3	220250331235700	103	2	\N	2025-03-01 00:00:00	2025-03-31 23:57:00	44.50
3	220250430235700	103	2	\N	2025-04-01 00:00:00	2025-04-30 23:57:00	35.75
3	120250531235700	103	1	\N	2025-05-01 00:00:00	2025-05-31 23:57:00	28.00
3	120250630235700	103	1	\N	2025-06-01 00:00:00	2025-06-30 23:57:00	22.50
3	120250731235700	103	1	\N	2025-07-01 00:00:00	2025-07-31 23:57:00	20.00
3	120250831235700	103	1	\N	2025-08-01 00:00:00	2025-08-31 23:57:00	21.25
3	120250930235700	103	1	\N	2025-09-01 00:00:00	2025-09-30 23:57:00	28.75
3	220251031235700	103	2	\N	2025-10-01 00:00:00	2025-10-31 23:57:00	38.00
3	220251130235700	103	2	\N	2025-11-01 00:00:00	2025-11-30 23:57:00	48.50
3	220251231235700	103	2	\N	2025-12-01 00:00:00	2025-12-31 23:57:00	62.75
3	320260131235700	103	3	\N	2026-01-01 00:00:00	2026-01-31 23:57:00	68.00
\.


--
-- TOC entry 5214 (class 0 OID 16955)
-- Dependencies: 227
-- Data for Name: utility; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.utility (utility_id, utility_name, utility_type, billing_cycle, unit_of_measurement, status) FROM stdin;
1	Electricity_LV	Electricity	Monthly	kWh	Active
2	Water	water	Monthly	m³	Active
3	Gas	gas	Monthly	m³	Active
\.


--
-- TOC entry 5227 (class 0 OID 17056)
-- Dependencies: 240
-- Data for Name: utility_connection; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.utility_connection (connection_id, tariff_id, consumer_id, meter_id, payment_type, connection_type, connection_status, connection_date, disconnection_date, load_requirement) FROM stdin;
1	101	1	1	PREPAID	Residential	SUSPENDED	2025-06-29	\N	\N
2	102	1	2	Postpaid	Residential	Active	2024-01-15	\N	5.00
3	103	1	3	Postpaid	Residential	Active	2024-01-15	\N	3.00
\.


--
-- TOC entry 5218 (class 0 OID 16991)
-- Dependencies: 231
-- Data for Name: utility_region; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.utility_region (utility_id, region_id) FROM stdin;
1	14
2	14
3	14
\.


--
-- TOC entry 5216 (class 0 OID 16971)
-- Dependencies: 229
-- Data for Name: water_utility; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.water_utility (utility_id, pressure_level, water_source, quality_grade) FROM stdin;
2	Medium	Municipal	Grade A
\.


--
-- TOC entry 5276 (class 0 OID 0)
-- Dependencies: 221
-- Name: account_account_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.account_account_id_seq', 4, false);


--
-- TOC entry 5277 (class 0 OID 0)
-- Dependencies: 217
-- Name: address_address_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.address_address_id_seq', 2, false);


--
-- TOC entry 5278 (class 0 OID 0)
-- Dependencies: 256
-- Name: balance_transaction_transaction_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.balance_transaction_transaction_id_seq', 16, false);


--
-- TOC entry 5279 (class 0 OID 0)
-- Dependencies: 248
-- Name: bill_document_bill_document_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bill_document_bill_document_id_seq', 2, false);


--
-- TOC entry 5280 (class 0 OID 0)
-- Dependencies: 264
-- Name: complaint_complaint_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.complaint_complaint_id_seq', 2, false);


--
-- TOC entry 5281 (class 0 OID 0)
-- Dependencies: 243
-- Name: connection_application_application_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.connection_application_application_id_seq', 1, false);


--
-- TOC entry 5282 (class 0 OID 0)
-- Dependencies: 235
-- Name: fixed_charge_fixed_charge_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fixed_charge_fixed_charge_id_seq', 1013, false);


--
-- TOC entry 5283 (class 0 OID 0)
-- Dependencies: 237
-- Name: meter_meter_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.meter_meter_id_seq', 3, true);


--
-- TOC entry 5284 (class 0 OID 0)
-- Dependencies: 245
-- Name: meter_reading_reading_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.meter_reading_reading_id_seq', 1, false);


--
-- TOC entry 5285 (class 0 OID 0)
-- Dependencies: 258
-- Name: payment_method_method_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_method_method_id_seq', 4, false);


--
-- TOC entry 5286 (class 0 OID 0)
-- Dependencies: 262
-- Name: payment_payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_payment_id_seq', 2, false);


--
-- TOC entry 5287 (class 0 OID 0)
-- Dependencies: 219
-- Name: person_person_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.person_person_id_seq', 2, false);


--
-- TOC entry 5288 (class 0 OID 0)
-- Dependencies: 253
-- Name: prepaid_account_prepaid_account_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.prepaid_account_prepaid_account_id_seq', 2, false);


--
-- TOC entry 5289 (class 0 OID 0)
-- Dependencies: 215
-- Name: region_region_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.region_region_id_seq', 21, false);


--
-- TOC entry 5290 (class 0 OID 0)
-- Dependencies: 232
-- Name: tariff_tariff_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tariff_tariff_id_seq', 103, true);


--
-- TOC entry 5291 (class 0 OID 0)
-- Dependencies: 239
-- Name: utility_connection_connection_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.utility_connection_connection_id_seq', 3, true);


--
-- TOC entry 5292 (class 0 OID 0)
-- Dependencies: 226
-- Name: utility_utility_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.utility_utility_id_seq', 3, true);


--
-- TOC entry 4940 (class 2606 OID 16912)
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (account_id);


--
-- TOC entry 4934 (class 2606 OID 16884)
-- Name: address address_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_pkey PRIMARY KEY (address_id);


--
-- TOC entry 4990 (class 2606 OID 17253)
-- Name: balance_transaction balance_transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transaction
    ADD CONSTRAINT balance_transaction_pkey PRIMARY KEY (transaction_id);


--
-- TOC entry 4994 (class 2606 OID 17280)
-- Name: bank bank_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank
    ADD CONSTRAINT bank_pkey PRIMARY KEY (method_id);


--
-- TOC entry 4978 (class 2606 OID 17177)
-- Name: bill_document bill_document_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_document
    ADD CONSTRAINT bill_document_pkey PRIMARY KEY (bill_document_id);


--
-- TOC entry 4980 (class 2606 OID 17187)
-- Name: bill_postpaid bill_postpaid_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_postpaid
    ADD CONSTRAINT bill_postpaid_pkey PRIMARY KEY (bill_document_id);


--
-- TOC entry 4970 (class 2606 OID 17093)
-- Name: commercial_connection commercial_connection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_connection
    ADD CONSTRAINT commercial_connection_pkey PRIMARY KEY (connection_id);


--
-- TOC entry 5000 (class 2606 OID 17333)
-- Name: complaint complaint_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint
    ADD CONSTRAINT complaint_pkey PRIMARY KEY (complaint_id);


--
-- TOC entry 4972 (class 2606 OID 17110)
-- Name: connection_application connection_application_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connection_application
    ADD CONSTRAINT connection_application_pkey PRIMARY KEY (application_id);


--
-- TOC entry 4942 (class 2606 OID 16923)
-- Name: consumer consumer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consumer
    ADD CONSTRAINT consumer_pkey PRIMARY KEY (person_id);


--
-- TOC entry 4950 (class 2606 OID 16965)
-- Name: electricity_utility electricity_utility_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.electricity_utility
    ADD CONSTRAINT electricity_utility_pkey PRIMARY KEY (utility_id);


--
-- TOC entry 4944 (class 2606 OID 16933)
-- Name: employee employee_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_pkey PRIMARY KEY (person_id);


--
-- TOC entry 4946 (class 2606 OID 16943)
-- Name: field_worker field_worker_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_worker
    ADD CONSTRAINT field_worker_pkey PRIMARY KEY (person_id);


--
-- TOC entry 4984 (class 2606 OID 17207)
-- Name: fixed_charge_applied fixed_charge_applied_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge_applied
    ADD CONSTRAINT fixed_charge_applied_pkey PRIMARY KEY (fixed_charge_id, bill_document_id);


--
-- TOC entry 4988 (class 2606 OID 17234)
-- Name: fixed_charge_owed fixed_charge_owed_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge_owed
    ADD CONSTRAINT fixed_charge_owed_pkey PRIMARY KEY (fixed_charge_id, prepaid_account_id);


--
-- TOC entry 4962 (class 2606 OID 17036)
-- Name: fixed_charge fixed_charge_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge
    ADD CONSTRAINT fixed_charge_pkey PRIMARY KEY (fixed_charge_id);


--
-- TOC entry 4954 (class 2606 OID 16985)
-- Name: gas_utility gas_utility_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gas_utility
    ADD CONSTRAINT gas_utility_pkey PRIMARY KEY (utility_id);


--
-- TOC entry 5002 (class 2606 OID 17383)
-- Name: google_pay google_pay_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.google_pay
    ADD CONSTRAINT google_pay_pkey PRIMARY KEY (method_id);


--
-- TOC entry 4964 (class 2606 OID 17049)
-- Name: meter meter_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter
    ADD CONSTRAINT meter_pkey PRIMARY KEY (meter_id);


--
-- TOC entry 4974 (class 2606 OID 17128)
-- Name: meter_reading meter_reading_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_reading
    ADD CONSTRAINT meter_reading_pkey PRIMARY KEY (reading_id);


--
-- TOC entry 4996 (class 2606 OID 17290)
-- Name: mobile_banking mobile_banking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_banking
    ADD CONSTRAINT mobile_banking_pkey PRIMARY KEY (method_id);


--
-- TOC entry 4992 (class 2606 OID 17275)
-- Name: payment_method payment_method_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_method
    ADD CONSTRAINT payment_method_pkey PRIMARY KEY (method_id);


--
-- TOC entry 4998 (class 2606 OID 17313)
-- Name: payment payment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_pkey PRIMARY KEY (payment_id);


--
-- TOC entry 4936 (class 2606 OID 16898)
-- Name: person person_national_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person
    ADD CONSTRAINT person_national_id_key UNIQUE (national_id);


--
-- TOC entry 4938 (class 2606 OID 16896)
-- Name: person person_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person
    ADD CONSTRAINT person_pkey PRIMARY KEY (person_id);


--
-- TOC entry 4986 (class 2606 OID 17224)
-- Name: prepaid_account prepaid_account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prepaid_account
    ADD CONSTRAINT prepaid_account_pkey PRIMARY KEY (prepaid_account_id);


--
-- TOC entry 4982 (class 2606 OID 17197)
-- Name: prepaid_statement prepaid_statement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prepaid_statement
    ADD CONSTRAINT prepaid_statement_pkey PRIMARY KEY (bill_document_id);


--
-- TOC entry 4932 (class 2606 OID 16877)
-- Name: region region_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.region
    ADD CONSTRAINT region_pkey PRIMARY KEY (region_id);


--
-- TOC entry 4968 (class 2606 OID 17083)
-- Name: residential_connection residential_connection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.residential_connection
    ADD CONSTRAINT residential_connection_pkey PRIMARY KEY (connection_id);


--
-- TOC entry 4958 (class 2606 OID 17013)
-- Name: tariff tariff_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tariff
    ADD CONSTRAINT tariff_pkey PRIMARY KEY (tariff_id);


--
-- TOC entry 4960 (class 2606 OID 17023)
-- Name: tariff_slab tariff_slab_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tariff_slab
    ADD CONSTRAINT tariff_slab_pkey PRIMARY KEY (tariff_id, slab_num);


--
-- TOC entry 4976 (class 2606 OID 17153)
-- Name: usage usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage
    ADD CONSTRAINT usage_pkey PRIMARY KEY (meter_id, usage_id);


--
-- TOC entry 4966 (class 2606 OID 17062)
-- Name: utility_connection utility_connection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_connection
    ADD CONSTRAINT utility_connection_pkey PRIMARY KEY (connection_id);


--
-- TOC entry 4948 (class 2606 OID 16960)
-- Name: utility utility_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility
    ADD CONSTRAINT utility_pkey PRIMARY KEY (utility_id);


--
-- TOC entry 4956 (class 2606 OID 16995)
-- Name: utility_region utility_region_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_region
    ADD CONSTRAINT utility_region_pkey PRIMARY KEY (utility_id, region_id);


--
-- TOC entry 4952 (class 2606 OID 16975)
-- Name: water_utility water_utility_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.water_utility
    ADD CONSTRAINT water_utility_pkey PRIMARY KEY (utility_id);


--
-- TOC entry 5054 (class 2620 OID 17358)
-- Name: utility_connection create_prepaid_account_after_insert_trg; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER create_prepaid_account_after_insert_trg AFTER INSERT ON public.utility_connection FOR EACH ROW EXECUTE FUNCTION public.create_prepaid_account_after_insert();


--
-- TOC entry 5058 (class 2620 OID 17366)
-- Name: payment payment_after_insert_trg; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER payment_after_insert_trg AFTER INSERT ON public.payment FOR EACH ROW EXECUTE FUNCTION public.payment_after_insert();


--
-- TOC entry 5057 (class 2620 OID 17360)
-- Name: balance_transaction update_balance_for_transaction_trg; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_balance_for_transaction_trg BEFORE INSERT ON public.balance_transaction FOR EACH ROW EXECUTE FUNCTION public.update_balance_for_transaction();


--
-- TOC entry 5055 (class 2620 OID 17364)
-- Name: usage usage_after_insert_trg; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER usage_after_insert_trg AFTER INSERT ON public.usage FOR EACH ROW EXECUTE FUNCTION public.usage_after_insert();


--
-- TOC entry 5056 (class 2620 OID 17362)
-- Name: usage usage_before_insert_trg; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER usage_before_insert_trg BEFORE INSERT ON public.usage FOR EACH ROW EXECUTE FUNCTION public.usage_before_insert();


--
-- TOC entry 5005 (class 2606 OID 16913)
-- Name: account account_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(person_id);


--
-- TOC entry 5003 (class 2606 OID 16885)
-- Name: address address_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.region(region_id);


--
-- TOC entry 5041 (class 2606 OID 17254)
-- Name: balance_transaction balance_transaction_bill_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transaction
    ADD CONSTRAINT balance_transaction_bill_document_id_fkey FOREIGN KEY (bill_document_id) REFERENCES public.bill_document(bill_document_id);


--
-- TOC entry 5042 (class 2606 OID 17264)
-- Name: balance_transaction balance_transaction_meter_id_usage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transaction
    ADD CONSTRAINT balance_transaction_meter_id_usage_id_fkey FOREIGN KEY (meter_id, usage_id) REFERENCES public.usage(meter_id, usage_id);


--
-- TOC entry 5043 (class 2606 OID 17259)
-- Name: balance_transaction balance_transaction_prepaid_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transaction
    ADD CONSTRAINT balance_transaction_prepaid_account_id_fkey FOREIGN KEY (prepaid_account_id) REFERENCES public.prepaid_account(prepaid_account_id);


--
-- TOC entry 5045 (class 2606 OID 17281)
-- Name: bank bank_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank
    ADD CONSTRAINT bank_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.payment_method(method_id);


--
-- TOC entry 5033 (class 2606 OID 17178)
-- Name: bill_document bill_document_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_document
    ADD CONSTRAINT bill_document_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.utility_connection(connection_id);


--
-- TOC entry 5034 (class 2606 OID 17188)
-- Name: bill_postpaid bill_postpaid_bill_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_postpaid
    ADD CONSTRAINT bill_postpaid_bill_document_id_fkey FOREIGN KEY (bill_document_id) REFERENCES public.bill_document(bill_document_id);


--
-- TOC entry 5023 (class 2606 OID 17094)
-- Name: commercial_connection commercial_connection_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_connection
    ADD CONSTRAINT commercial_connection_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.utility_connection(connection_id);


--
-- TOC entry 5049 (class 2606 OID 17344)
-- Name: complaint complaint_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint
    ADD CONSTRAINT complaint_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.employee(person_id);


--
-- TOC entry 5050 (class 2606 OID 17349)
-- Name: complaint complaint_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint
    ADD CONSTRAINT complaint_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.field_worker(person_id);


--
-- TOC entry 5051 (class 2606 OID 17339)
-- Name: complaint complaint_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint
    ADD CONSTRAINT complaint_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.utility_connection(connection_id);


--
-- TOC entry 5052 (class 2606 OID 17334)
-- Name: complaint complaint_consumer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint
    ADD CONSTRAINT complaint_consumer_id_fkey FOREIGN KEY (consumer_id) REFERENCES public.consumer(person_id);


--
-- TOC entry 5024 (class 2606 OID 17111)
-- Name: connection_application connection_application_consumer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connection_application
    ADD CONSTRAINT connection_application_consumer_id_fkey FOREIGN KEY (consumer_id) REFERENCES public.consumer(person_id);


--
-- TOC entry 5025 (class 2606 OID 17116)
-- Name: connection_application connection_application_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connection_application
    ADD CONSTRAINT connection_application_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.employee(person_id);


--
-- TOC entry 5006 (class 2606 OID 16924)
-- Name: consumer consumer_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consumer
    ADD CONSTRAINT consumer_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(person_id);


--
-- TOC entry 5010 (class 2606 OID 16966)
-- Name: electricity_utility electricity_utility_utility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.electricity_utility
    ADD CONSTRAINT electricity_utility_utility_id_fkey FOREIGN KEY (utility_id) REFERENCES public.utility(utility_id);


--
-- TOC entry 5007 (class 2606 OID 16934)
-- Name: employee employee_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(person_id);


--
-- TOC entry 5008 (class 2606 OID 16949)
-- Name: field_worker field_worker_assigned_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_worker
    ADD CONSTRAINT field_worker_assigned_region_id_fkey FOREIGN KEY (assigned_region_id) REFERENCES public.region(region_id);


--
-- TOC entry 5009 (class 2606 OID 16944)
-- Name: field_worker field_worker_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_worker
    ADD CONSTRAINT field_worker_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(person_id);


--
-- TOC entry 5036 (class 2606 OID 17213)
-- Name: fixed_charge_applied fixed_charge_applied_bill_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge_applied
    ADD CONSTRAINT fixed_charge_applied_bill_document_id_fkey FOREIGN KEY (bill_document_id) REFERENCES public.bill_document(bill_document_id);


--
-- TOC entry 5037 (class 2606 OID 17208)
-- Name: fixed_charge_applied fixed_charge_applied_fixed_charge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge_applied
    ADD CONSTRAINT fixed_charge_applied_fixed_charge_id_fkey FOREIGN KEY (fixed_charge_id) REFERENCES public.fixed_charge(fixed_charge_id);


--
-- TOC entry 5039 (class 2606 OID 17235)
-- Name: fixed_charge_owed fixed_charge_owed_fixed_charge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge_owed
    ADD CONSTRAINT fixed_charge_owed_fixed_charge_id_fkey FOREIGN KEY (fixed_charge_id) REFERENCES public.fixed_charge(fixed_charge_id);


--
-- TOC entry 5040 (class 2606 OID 17240)
-- Name: fixed_charge_owed fixed_charge_owed_prepaid_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge_owed
    ADD CONSTRAINT fixed_charge_owed_prepaid_account_id_fkey FOREIGN KEY (prepaid_account_id) REFERENCES public.prepaid_account(prepaid_account_id);


--
-- TOC entry 5017 (class 2606 OID 17037)
-- Name: fixed_charge fixed_charge_tariff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge
    ADD CONSTRAINT fixed_charge_tariff_id_fkey FOREIGN KEY (tariff_id) REFERENCES public.tariff(tariff_id);


--
-- TOC entry 5012 (class 2606 OID 16986)
-- Name: gas_utility gas_utility_utility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gas_utility
    ADD CONSTRAINT gas_utility_utility_id_fkey FOREIGN KEY (utility_id) REFERENCES public.utility(utility_id);


--
-- TOC entry 5053 (class 2606 OID 17384)
-- Name: google_pay google_pay_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.google_pay
    ADD CONSTRAINT google_pay_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.payment_method(method_id);


--
-- TOC entry 5018 (class 2606 OID 17050)
-- Name: meter meter_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter
    ADD CONSTRAINT meter_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.address(address_id);


--
-- TOC entry 5026 (class 2606 OID 17134)
-- Name: meter_reading meter_reading_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_reading
    ADD CONSTRAINT meter_reading_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.employee(person_id);


--
-- TOC entry 5027 (class 2606 OID 17139)
-- Name: meter_reading meter_reading_field_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_reading
    ADD CONSTRAINT meter_reading_field_worker_id_fkey FOREIGN KEY (field_worker_id) REFERENCES public.field_worker(person_id);


--
-- TOC entry 5028 (class 2606 OID 17129)
-- Name: meter_reading meter_reading_meter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_reading
    ADD CONSTRAINT meter_reading_meter_id_fkey FOREIGN KEY (meter_id) REFERENCES public.meter(meter_id);


--
-- TOC entry 5029 (class 2606 OID 17144)
-- Name: meter_reading meter_reading_tariff_id_slab_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_reading
    ADD CONSTRAINT meter_reading_tariff_id_slab_num_fkey FOREIGN KEY (tariff_id, slab_num) REFERENCES public.tariff_slab(tariff_id, slab_num);


--
-- TOC entry 5046 (class 2606 OID 17291)
-- Name: mobile_banking mobile_banking_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_banking
    ADD CONSTRAINT mobile_banking_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.payment_method(method_id);


--
-- TOC entry 5047 (class 2606 OID 17314)
-- Name: payment payment_bill_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_bill_document_id_fkey FOREIGN KEY (bill_document_id) REFERENCES public.bill_document(bill_document_id);


--
-- TOC entry 5044 (class 2606 OID 17374)
-- Name: payment_method payment_method_consumer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_method
    ADD CONSTRAINT payment_method_consumer_id_fkey FOREIGN KEY (consumer_id) REFERENCES public.consumer(person_id);


--
-- TOC entry 5048 (class 2606 OID 17319)
-- Name: payment payment_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.payment_method(method_id);


--
-- TOC entry 5004 (class 2606 OID 16899)
-- Name: person person_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person
    ADD CONSTRAINT person_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.address(address_id);


--
-- TOC entry 5038 (class 2606 OID 17225)
-- Name: prepaid_account prepaid_account_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prepaid_account
    ADD CONSTRAINT prepaid_account_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.utility_connection(connection_id);


--
-- TOC entry 5035 (class 2606 OID 17198)
-- Name: prepaid_statement prepaid_statement_bill_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prepaid_statement
    ADD CONSTRAINT prepaid_statement_bill_document_id_fkey FOREIGN KEY (bill_document_id) REFERENCES public.bill_document(bill_document_id);


--
-- TOC entry 5022 (class 2606 OID 17084)
-- Name: residential_connection residential_connection_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.residential_connection
    ADD CONSTRAINT residential_connection_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.utility_connection(connection_id);


--
-- TOC entry 5016 (class 2606 OID 17024)
-- Name: tariff_slab tariff_slab_tariff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tariff_slab
    ADD CONSTRAINT tariff_slab_tariff_id_fkey FOREIGN KEY (tariff_id) REFERENCES public.tariff(tariff_id);


--
-- TOC entry 5015 (class 2606 OID 17014)
-- Name: tariff tariff_utility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tariff
    ADD CONSTRAINT tariff_utility_id_fkey FOREIGN KEY (utility_id) REFERENCES public.utility(utility_id);


--
-- TOC entry 5030 (class 2606 OID 17154)
-- Name: usage usage_meter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage
    ADD CONSTRAINT usage_meter_id_fkey FOREIGN KEY (meter_id) REFERENCES public.meter(meter_id);


--
-- TOC entry 5031 (class 2606 OID 17159)
-- Name: usage usage_reading_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage
    ADD CONSTRAINT usage_reading_id_fkey FOREIGN KEY (reading_id) REFERENCES public.meter_reading(reading_id);


--
-- TOC entry 5032 (class 2606 OID 17164)
-- Name: usage usage_tariff_id_slab_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage
    ADD CONSTRAINT usage_tariff_id_slab_num_fkey FOREIGN KEY (tariff_id, slab_num) REFERENCES public.tariff_slab(tariff_id, slab_num);


--
-- TOC entry 5019 (class 2606 OID 17068)
-- Name: utility_connection utility_connection_consumer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_connection
    ADD CONSTRAINT utility_connection_consumer_id_fkey FOREIGN KEY (consumer_id) REFERENCES public.consumer(person_id);


--
-- TOC entry 5020 (class 2606 OID 17073)
-- Name: utility_connection utility_connection_meter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_connection
    ADD CONSTRAINT utility_connection_meter_id_fkey FOREIGN KEY (meter_id) REFERENCES public.meter(meter_id);


--
-- TOC entry 5021 (class 2606 OID 17063)
-- Name: utility_connection utility_connection_tariff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_connection
    ADD CONSTRAINT utility_connection_tariff_id_fkey FOREIGN KEY (tariff_id) REFERENCES public.tariff(tariff_id);


--
-- TOC entry 5013 (class 2606 OID 17001)
-- Name: utility_region utility_region_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_region
    ADD CONSTRAINT utility_region_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.region(region_id);


--
-- TOC entry 5014 (class 2606 OID 16996)
-- Name: utility_region utility_region_utility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_region
    ADD CONSTRAINT utility_region_utility_id_fkey FOREIGN KEY (utility_id) REFERENCES public.utility(utility_id);


--
-- TOC entry 5011 (class 2606 OID 16976)
-- Name: water_utility water_utility_utility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.water_utility
    ADD CONSTRAINT water_utility_utility_id_fkey FOREIGN KEY (utility_id) REFERENCES public.utility(utility_id);


-- Completed on 2026-03-01 02:22:43

--
-- PostgreSQL database dump complete
--

\unrestrict Cm7l7rjrqLqOuogHfFpi5xb826VSM0tu6GgMfZaxJjYVTrYUBWfBlzLdLkB0p7e

