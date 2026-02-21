--
-- PostgreSQL database dump
--

\restrict aAipju6g4USpdbGjbGuNfXjL1Zl4ccYmhOYlOGN6OCa0bxFxfSbrXjtgi2aU0Be

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

-- Started on 2026-02-20 15:20:43

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
-- TOC entry 279 (class 1255 OID 25494)
-- Name: usage_after_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.usage_after_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
	v_connection_id integer;
	-- v_conn_type text;
	v_prepaid_account_id integer;
	v_amount numeric(10, 2);
    v_balance numeric(10, 2);
BEGIN
	-- Find the connection
	SELECT c.connection_id INTO v_connection_id
	FROM utility_connection c
	WHERE c.meter_id = NEW.meter_id;

	IF NOT FOUND THEN
		-- Can't resolve connection; do nothing
		RETURN NEW;
	END IF;

    -- Check if it's prepaid
    SELECT p.prepaid_account_id INTO v_prepaid_account_id
    FROM PREPAID_ACCOUNT p
    WHERE p.connection_id = v_connection_id;

    IF NOT FOUND THEN
        -- No prepaid account found, account is postpaid; do nothing
        RETURN NEW;
    END IF;

    v_amount := NEW.unit_used * (SELECT rate_per_unit FROM tariff_slab WHERE tariff_id = NEW.tariff_id AND slab_num = NEW.slab_num);

    UPDATE prepaid_account
    SET balance = balance - v_amount
    WHERE prepaid_account_id = v_prepaid_account_id
    RETURNING balance INTO v_balance;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'prepaid_account % not found', v_prepaid_account_id;
    END IF;

    INSERT INTO balance_transaction (meter_id, usage_id, prepaid_account_id, transaction_amount, transaction_type, transaction_time, balance_after)
    VALUES (NEW.meter_id, NEW.usage_id, v_prepaid_account_id, v_amount, 'DEBIT', CURRENT_TIMESTAMP, v_balance);

    IF v_balance <= 0 THEN
        -- Optionally, you could also update the connection status to 'suspended' or similar
        UPDATE utility_connection
        SET connection_status = 'SUSPENDED'
        WHERE connection_id = v_connection_id;

        UPDATE meter
        SET is_active = FALSE
        WHERE meter_id = NEW.meter_id;
    END IF;

	RETURN NEW;
END;
$$;


ALTER FUNCTION public.usage_after_insert() OWNER TO postgres;

--
-- TOC entry 267 (class 1255 OID 25517)
-- Name: usage_before_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.usage_before_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- derive usage id from time_to (assumes time_to is NOT NULL)
    NEW.usage_id := to_char(NEW.time_to, 'YYYYMMDDHH24MISS')::BIGINT;
    NEW.usage_id := NEW.usage_id + (NEW.slab_num * 10000000000000000); -- Add slab_num to ensure uniqueness across slabs
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.usage_before_insert() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 222 (class 1259 OID 25038)
-- Name: account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account (
    account_id integer NOT NULL,
    person_id integer NOT NULL,
    account_type character varying(20) NOT NULL,
    email character varying(100) NOT NULL,
    password_hashed character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.account OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 25037)
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
-- TOC entry 5196 (class 0 OID 0)
-- Dependencies: 221
-- Name: account_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.account_account_id_seq OWNED BY public.account.account_id;


--
-- TOC entry 218 (class 1259 OID 25012)
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
-- TOC entry 217 (class 1259 OID 25011)
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
-- TOC entry 5197 (class 0 OID 0)
-- Dependencies: 217
-- Name: address_address_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.address_address_id_seq OWNED BY public.address.address_id;


--
-- TOC entry 257 (class 1259 OID 25368)
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
-- TOC entry 256 (class 1259 OID 25367)
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
-- TOC entry 5198 (class 0 OID 0)
-- Dependencies: 256
-- Name: balance_transaction_transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.balance_transaction_transaction_id_seq OWNED BY public.balance_transaction.transaction_id;


--
-- TOC entry 260 (class 1259 OID 25398)
-- Name: bank; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank (
    method_id integer NOT NULL,
    bank_name character varying(50) NOT NULL,
    account_num character varying(30) NOT NULL
);


ALTER TABLE public.bank OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 25292)
-- Name: bill_document; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bill_document (
    bill_document_id integer NOT NULL,
    connection_id integer NOT NULL,
    bill_type character varying(20) NOT NULL,
    bill_period_start date NOT NULL,
    bill_period_end date NOT NULL,
    bill_generation_date date DEFAULT CURRENT_DATE NOT NULL,
    unit_consumed numeric(10,2) NOT NULL,
    energy_amount numeric(10,2) NOT NULL,
    total_amount numeric(10,2) NOT NULL
);


ALTER TABLE public.bill_document OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 25291)
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
-- TOC entry 5199 (class 0 OID 0)
-- Dependencies: 248
-- Name: bill_document_bill_document_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bill_document_bill_document_id_seq OWNED BY public.bill_document.bill_document_id;


--
-- TOC entry 250 (class 1259 OID 25304)
-- Name: bill_postpaid; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bill_postpaid (
    bill_document_id integer NOT NULL,
    due_date date NOT NULL,
    bill_status character varying(20) DEFAULT 'UNPAID'::character varying,
    remarks character varying(100)
);


ALTER TABLE public.bill_postpaid OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 25244)
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
-- TOC entry 266 (class 1259 OID 25447)
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
-- TOC entry 265 (class 1259 OID 25446)
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
-- TOC entry 5200 (class 0 OID 0)
-- Dependencies: 265
-- Name: complaint_complaint_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.complaint_complaint_id_seq OWNED BY public.complaint.complaint_id;


--
-- TOC entry 242 (class 1259 OID 25212)
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
-- TOC entry 241 (class 1259 OID 25211)
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
-- TOC entry 5201 (class 0 OID 0)
-- Dependencies: 241
-- Name: connection_application_application_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.connection_application_application_id_seq OWNED BY public.connection_application.application_id;


--
-- TOC entry 223 (class 1259 OID 25051)
-- Name: consumer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consumer (
    person_id integer NOT NULL,
    consumer_type character varying(20) NOT NULL,
    registration_date date DEFAULT CURRENT_DATE
);


ALTER TABLE public.consumer OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 25094)
-- Name: electricity_utility; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.electricity_utility (
    utility_id integer NOT NULL,
    voltage_level character varying(20),
    phase_type character varying(20)
);


ALTER TABLE public.electricity_utility OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 25062)
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
-- TOC entry 225 (class 1259 OID 25072)
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
-- TOC entry 236 (class 1259 OID 25163)
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
-- TOC entry 252 (class 1259 OID 25325)
-- Name: fixed_charge_applied; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fixed_charge_applied (
    fixed_charge_id integer NOT NULL,
    bill_document_id integer NOT NULL,
    timeframe character varying(20)
);


ALTER TABLE public.fixed_charge_applied OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 25162)
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
-- TOC entry 5202 (class 0 OID 0)
-- Dependencies: 235
-- Name: fixed_charge_fixed_charge_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fixed_charge_fixed_charge_id_seq OWNED BY public.fixed_charge.fixed_charge_id;


--
-- TOC entry 255 (class 1259 OID 25352)
-- Name: fixed_charge_owed; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fixed_charge_owed (
    fixed_charge_id integer NOT NULL,
    prepaid_account_id integer NOT NULL,
    timeframe character varying(20)
);


ALTER TABLE public.fixed_charge_owed OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 25114)
-- Name: gas_utility; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gas_utility (
    utility_id integer NOT NULL,
    gas_type character varying(20),
    pressure_category character varying(20)
);


ALTER TABLE public.gas_utility OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 25176)
-- Name: meter; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meter (
    meter_id integer NOT NULL,
    address_id integer NOT NULL,
    meter_type character varying(20) NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.meter OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 25175)
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
-- TOC entry 5203 (class 0 OID 0)
-- Dependencies: 237
-- Name: meter_meter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.meter_meter_id_seq OWNED BY public.meter.meter_id;


--
-- TOC entry 246 (class 1259 OID 25255)
-- Name: meter_reading; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meter_reading (
    reading_id integer NOT NULL,
    meter_id integer NOT NULL,
    approved_by integer,
    field_worker_id integer NOT NULL,
    units_logged numeric(10,2) NOT NULL,
    reading_date date DEFAULT CURRENT_DATE NOT NULL,
    time_from timestamp without time zone NOT NULL,
    time_to timestamp without time zone NOT NULL,
    tariff_id integer NOT NULL,
    slab_num integer NOT NULL
);


ALTER TABLE public.meter_reading OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 25254)
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
-- TOC entry 5204 (class 0 OID 0)
-- Dependencies: 245
-- Name: meter_reading_reading_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.meter_reading_reading_id_seq OWNED BY public.meter_reading.reading_id;


--
-- TOC entry 261 (class 1259 OID 25408)
-- Name: mobile_banking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mobile_banking (
    method_id integer NOT NULL,
    provider_name character varying(30) NOT NULL,
    phone_num character varying(15) NOT NULL
);


ALTER TABLE public.mobile_banking OWNER TO postgres;

--
-- TOC entry 264 (class 1259 OID 25429)
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
-- TOC entry 259 (class 1259 OID 25392)
-- Name: payment_method; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_method (
    method_id integer NOT NULL,
    method_name character varying(30)
);


ALTER TABLE public.payment_method OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 25391)
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
-- TOC entry 5205 (class 0 OID 0)
-- Dependencies: 258
-- Name: payment_method_method_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_method_method_id_seq OWNED BY public.payment_method.method_id;


--
-- TOC entry 263 (class 1259 OID 25428)
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
-- TOC entry 5206 (class 0 OID 0)
-- Dependencies: 263
-- Name: payment_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_payment_id_seq OWNED BY public.payment.payment_id;


--
-- TOC entry 262 (class 1259 OID 25418)
-- Name: paypal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.paypal (
    method_id integer NOT NULL,
    paypal_id character varying(50) NOT NULL,
    email character varying(100) NOT NULL
);


ALTER TABLE public.paypal OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 25024)
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
-- TOC entry 219 (class 1259 OID 25023)
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
-- TOC entry 5207 (class 0 OID 0)
-- Dependencies: 219
-- Name: person_person_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.person_person_id_seq OWNED BY public.person.person_id;


--
-- TOC entry 254 (class 1259 OID 25341)
-- Name: prepaid_account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prepaid_account (
    prepaid_account_id integer NOT NULL,
    connection_id integer NOT NULL,
    balance numeric(10,2) NOT NULL
);


ALTER TABLE public.prepaid_account OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 25340)
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
-- TOC entry 5208 (class 0 OID 0)
-- Dependencies: 253
-- Name: prepaid_account_prepaid_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.prepaid_account_prepaid_account_id_seq OWNED BY public.prepaid_account.prepaid_account_id;


--
-- TOC entry 251 (class 1259 OID 25315)
-- Name: prepaid_statement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prepaid_statement (
    bill_document_id integer NOT NULL,
    prepaid_token character varying(50)
);


ALTER TABLE public.prepaid_statement OWNER TO postgres;

--
-- TOC entry 216 (class 1259 OID 25005)
-- Name: region; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.region (
    region_id integer NOT NULL,
    region_name character varying(25) NOT NULL,
    postal_code character varying(10) NOT NULL
);


ALTER TABLE public.region OWNER TO postgres;

--
-- TOC entry 215 (class 1259 OID 25004)
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
-- TOC entry 5209 (class 0 OID 0)
-- Dependencies: 215
-- Name: region_region_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.region_region_id_seq OWNED BY public.region.region_id;


--
-- TOC entry 243 (class 1259 OID 25233)
-- Name: residential_connection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.residential_connection (
    connection_id integer NOT NULL,
    property_type character varying(20),
    is_subsidized boolean DEFAULT false
);


ALTER TABLE public.residential_connection OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 25140)
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
-- TOC entry 234 (class 1259 OID 25152)
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
-- TOC entry 232 (class 1259 OID 25139)
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
-- TOC entry 5210 (class 0 OID 0)
-- Dependencies: 232
-- Name: tariff_tariff_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tariff_tariff_id_seq OWNED BY public.tariff.tariff_id;


--
-- TOC entry 247 (class 1259 OID 25276)
-- Name: usage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usage (
    meter_id integer NOT NULL,
    usage_id bigint NOT NULL,
    reading_id integer,
    time_from timestamp without time zone NOT NULL,
    time_to timestamp without time zone NOT NULL,
    unit_used numeric(10,2) NOT NULL,
    tariff_id integer NOT NULL,
    slab_num integer NOT NULL
);


ALTER TABLE public.usage OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 25088)
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
-- TOC entry 240 (class 1259 OID 25189)
-- Name: utility_connection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.utility_connection (
    connection_id integer NOT NULL,
    tariff_id integer NOT NULL,
    consumer_id integer NOT NULL,
    meter_id integer NOT NULL,
    connection_status character varying(20),
    connection_date date DEFAULT CURRENT_DATE,
    disconnection_date date,
    load_requirement numeric(8,2),
    connection_type character varying(20) NOT NULL
);


ALTER TABLE public.utility_connection OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 25188)
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
-- TOC entry 5211 (class 0 OID 0)
-- Dependencies: 239
-- Name: utility_connection_connection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.utility_connection_connection_id_seq OWNED BY public.utility_connection.connection_id;


--
-- TOC entry 231 (class 1259 OID 25124)
-- Name: utility_region; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.utility_region (
    utility_id integer NOT NULL,
    region_id integer NOT NULL
);


ALTER TABLE public.utility_region OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 25087)
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
-- TOC entry 5212 (class 0 OID 0)
-- Dependencies: 226
-- Name: utility_utility_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.utility_utility_id_seq OWNED BY public.utility.utility_id;


--
-- TOC entry 229 (class 1259 OID 25104)
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
-- TOC entry 4892 (class 2604 OID 25041)
-- Name: account account_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account ALTER COLUMN account_id SET DEFAULT nextval('public.account_account_id_seq'::regclass);


--
-- TOC entry 4890 (class 2604 OID 25015)
-- Name: address address_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address ALTER COLUMN address_id SET DEFAULT nextval('public.address_address_id_seq'::regclass);


--
-- TOC entry 4916 (class 2604 OID 25371)
-- Name: balance_transaction transaction_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transaction ALTER COLUMN transaction_id SET DEFAULT nextval('public.balance_transaction_transaction_id_seq'::regclass);


--
-- TOC entry 4912 (class 2604 OID 25295)
-- Name: bill_document bill_document_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_document ALTER COLUMN bill_document_id SET DEFAULT nextval('public.bill_document_bill_document_id_seq'::regclass);


--
-- TOC entry 4921 (class 2604 OID 25450)
-- Name: complaint complaint_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint ALTER COLUMN complaint_id SET DEFAULT nextval('public.complaint_complaint_id_seq'::regclass);


--
-- TOC entry 4905 (class 2604 OID 25215)
-- Name: connection_application application_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connection_application ALTER COLUMN application_id SET DEFAULT nextval('public.connection_application_application_id_seq'::regclass);


--
-- TOC entry 4899 (class 2604 OID 25166)
-- Name: fixed_charge fixed_charge_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge ALTER COLUMN fixed_charge_id SET DEFAULT nextval('public.fixed_charge_fixed_charge_id_seq'::regclass);


--
-- TOC entry 4901 (class 2604 OID 25179)
-- Name: meter meter_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter ALTER COLUMN meter_id SET DEFAULT nextval('public.meter_meter_id_seq'::regclass);


--
-- TOC entry 4910 (class 2604 OID 25258)
-- Name: meter_reading reading_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_reading ALTER COLUMN reading_id SET DEFAULT nextval('public.meter_reading_reading_id_seq'::regclass);


--
-- TOC entry 4919 (class 2604 OID 25432)
-- Name: payment payment_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment ALTER COLUMN payment_id SET DEFAULT nextval('public.payment_payment_id_seq'::regclass);


--
-- TOC entry 4918 (class 2604 OID 25395)
-- Name: payment_method method_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_method ALTER COLUMN method_id SET DEFAULT nextval('public.payment_method_method_id_seq'::regclass);


--
-- TOC entry 4891 (class 2604 OID 25027)
-- Name: person person_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person ALTER COLUMN person_id SET DEFAULT nextval('public.person_person_id_seq'::regclass);


--
-- TOC entry 4915 (class 2604 OID 25344)
-- Name: prepaid_account prepaid_account_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prepaid_account ALTER COLUMN prepaid_account_id SET DEFAULT nextval('public.prepaid_account_prepaid_account_id_seq'::regclass);


--
-- TOC entry 4889 (class 2604 OID 25008)
-- Name: region region_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.region ALTER COLUMN region_id SET DEFAULT nextval('public.region_region_id_seq'::regclass);


--
-- TOC entry 4897 (class 2604 OID 25143)
-- Name: tariff tariff_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tariff ALTER COLUMN tariff_id SET DEFAULT nextval('public.tariff_tariff_id_seq'::regclass);


--
-- TOC entry 4896 (class 2604 OID 25091)
-- Name: utility utility_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility ALTER COLUMN utility_id SET DEFAULT nextval('public.utility_utility_id_seq'::regclass);


--
-- TOC entry 4903 (class 2604 OID 25192)
-- Name: utility_connection connection_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_connection ALTER COLUMN connection_id SET DEFAULT nextval('public.utility_connection_connection_id_seq'::regclass);


--
-- TOC entry 4933 (class 2606 OID 25045)
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (account_id);


--
-- TOC entry 4927 (class 2606 OID 25017)
-- Name: address address_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_pkey PRIMARY KEY (address_id);


--
-- TOC entry 4983 (class 2606 OID 25375)
-- Name: balance_transaction balance_transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transaction
    ADD CONSTRAINT balance_transaction_pkey PRIMARY KEY (transaction_id);


--
-- TOC entry 4987 (class 2606 OID 25402)
-- Name: bank bank_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank
    ADD CONSTRAINT bank_pkey PRIMARY KEY (method_id);


--
-- TOC entry 4971 (class 2606 OID 25298)
-- Name: bill_document bill_document_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_document
    ADD CONSTRAINT bill_document_pkey PRIMARY KEY (bill_document_id);


--
-- TOC entry 4973 (class 2606 OID 25309)
-- Name: bill_postpaid bill_postpaid_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_postpaid
    ADD CONSTRAINT bill_postpaid_pkey PRIMARY KEY (bill_document_id);


--
-- TOC entry 4965 (class 2606 OID 25248)
-- Name: commercial_connection commercial_connection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_connection
    ADD CONSTRAINT commercial_connection_pkey PRIMARY KEY (connection_id);


--
-- TOC entry 4995 (class 2606 OID 25455)
-- Name: complaint complaint_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint
    ADD CONSTRAINT complaint_pkey PRIMARY KEY (complaint_id);


--
-- TOC entry 4961 (class 2606 OID 25222)
-- Name: connection_application connection_application_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connection_application
    ADD CONSTRAINT connection_application_pkey PRIMARY KEY (application_id);


--
-- TOC entry 4935 (class 2606 OID 25056)
-- Name: consumer consumer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consumer
    ADD CONSTRAINT consumer_pkey PRIMARY KEY (person_id);


--
-- TOC entry 4943 (class 2606 OID 25098)
-- Name: electricity_utility electricity_utility_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.electricity_utility
    ADD CONSTRAINT electricity_utility_pkey PRIMARY KEY (utility_id);


--
-- TOC entry 4937 (class 2606 OID 25066)
-- Name: employee employee_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_pkey PRIMARY KEY (person_id);


--
-- TOC entry 4939 (class 2606 OID 25076)
-- Name: field_worker field_worker_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_worker
    ADD CONSTRAINT field_worker_pkey PRIMARY KEY (person_id);


--
-- TOC entry 4977 (class 2606 OID 25329)
-- Name: fixed_charge_applied fixed_charge_applied_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge_applied
    ADD CONSTRAINT fixed_charge_applied_pkey PRIMARY KEY (fixed_charge_id, bill_document_id);


--
-- TOC entry 4981 (class 2606 OID 25356)
-- Name: fixed_charge_owed fixed_charge_owed_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge_owed
    ADD CONSTRAINT fixed_charge_owed_pkey PRIMARY KEY (fixed_charge_id, prepaid_account_id);


--
-- TOC entry 4955 (class 2606 OID 25169)
-- Name: fixed_charge fixed_charge_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge
    ADD CONSTRAINT fixed_charge_pkey PRIMARY KEY (fixed_charge_id);


--
-- TOC entry 4947 (class 2606 OID 25118)
-- Name: gas_utility gas_utility_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gas_utility
    ADD CONSTRAINT gas_utility_pkey PRIMARY KEY (utility_id);


--
-- TOC entry 4957 (class 2606 OID 25182)
-- Name: meter meter_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter
    ADD CONSTRAINT meter_pkey PRIMARY KEY (meter_id);


--
-- TOC entry 4967 (class 2606 OID 25260)
-- Name: meter_reading meter_reading_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_reading
    ADD CONSTRAINT meter_reading_pkey PRIMARY KEY (reading_id);


--
-- TOC entry 4989 (class 2606 OID 25412)
-- Name: mobile_banking mobile_banking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_banking
    ADD CONSTRAINT mobile_banking_pkey PRIMARY KEY (method_id);


--
-- TOC entry 4985 (class 2606 OID 25397)
-- Name: payment_method payment_method_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_method
    ADD CONSTRAINT payment_method_pkey PRIMARY KEY (method_id);


--
-- TOC entry 4993 (class 2606 OID 25435)
-- Name: payment payment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_pkey PRIMARY KEY (payment_id);


--
-- TOC entry 4991 (class 2606 OID 25422)
-- Name: paypal paypal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paypal
    ADD CONSTRAINT paypal_pkey PRIMARY KEY (method_id);


--
-- TOC entry 4929 (class 2606 OID 25031)
-- Name: person person_national_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person
    ADD CONSTRAINT person_national_id_key UNIQUE (national_id);


--
-- TOC entry 4931 (class 2606 OID 25029)
-- Name: person person_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person
    ADD CONSTRAINT person_pkey PRIMARY KEY (person_id);


--
-- TOC entry 4979 (class 2606 OID 25346)
-- Name: prepaid_account prepaid_account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prepaid_account
    ADD CONSTRAINT prepaid_account_pkey PRIMARY KEY (prepaid_account_id);


--
-- TOC entry 4975 (class 2606 OID 25319)
-- Name: prepaid_statement prepaid_statement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prepaid_statement
    ADD CONSTRAINT prepaid_statement_pkey PRIMARY KEY (bill_document_id);


--
-- TOC entry 4925 (class 2606 OID 25010)
-- Name: region region_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.region
    ADD CONSTRAINT region_pkey PRIMARY KEY (region_id);


--
-- TOC entry 4963 (class 2606 OID 25238)
-- Name: residential_connection residential_connection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.residential_connection
    ADD CONSTRAINT residential_connection_pkey PRIMARY KEY (connection_id);


--
-- TOC entry 4951 (class 2606 OID 25146)
-- Name: tariff tariff_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tariff
    ADD CONSTRAINT tariff_pkey PRIMARY KEY (tariff_id);


--
-- TOC entry 4953 (class 2606 OID 25156)
-- Name: tariff_slab tariff_slab_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tariff_slab
    ADD CONSTRAINT tariff_slab_pkey PRIMARY KEY (tariff_id, slab_num);


--
-- TOC entry 4969 (class 2606 OID 25497)
-- Name: usage usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage
    ADD CONSTRAINT usage_pkey PRIMARY KEY (meter_id, usage_id);


--
-- TOC entry 4959 (class 2606 OID 25195)
-- Name: utility_connection utility_connection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_connection
    ADD CONSTRAINT utility_connection_pkey PRIMARY KEY (connection_id);


--
-- TOC entry 4941 (class 2606 OID 25093)
-- Name: utility utility_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility
    ADD CONSTRAINT utility_pkey PRIMARY KEY (utility_id);


--
-- TOC entry 4949 (class 2606 OID 25128)
-- Name: utility_region utility_region_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_region
    ADD CONSTRAINT utility_region_pkey PRIMARY KEY (utility_id, region_id);


--
-- TOC entry 4945 (class 2606 OID 25108)
-- Name: water_utility water_utility_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.water_utility
    ADD CONSTRAINT water_utility_pkey PRIMARY KEY (utility_id);


--
-- TOC entry 5046 (class 2620 OID 25495)
-- Name: usage usage_after_insert_trg; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER usage_after_insert_trg AFTER INSERT ON public.usage FOR EACH ROW EXECUTE FUNCTION public.usage_after_insert();


--
-- TOC entry 5047 (class 2620 OID 25518)
-- Name: usage usage_before_insert_trg; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER usage_before_insert_trg BEFORE INSERT ON public.usage FOR EACH ROW EXECUTE FUNCTION public.usage_before_insert();


--
-- TOC entry 4998 (class 2606 OID 25046)
-- Name: account account_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(person_id);


--
-- TOC entry 4996 (class 2606 OID 25018)
-- Name: address address_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.region(region_id);


--
-- TOC entry 5034 (class 2606 OID 25376)
-- Name: balance_transaction balance_transaction_bill_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transaction
    ADD CONSTRAINT balance_transaction_bill_document_id_fkey FOREIGN KEY (bill_document_id) REFERENCES public.bill_document(bill_document_id);


--
-- TOC entry 5035 (class 2606 OID 25508)
-- Name: balance_transaction balance_transaction_meter_id_usage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transaction
    ADD CONSTRAINT balance_transaction_meter_id_usage_id_fkey FOREIGN KEY (meter_id, usage_id) REFERENCES public.usage(meter_id, usage_id);


--
-- TOC entry 5036 (class 2606 OID 25381)
-- Name: balance_transaction balance_transaction_prepaid_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transaction
    ADD CONSTRAINT balance_transaction_prepaid_account_id_fkey FOREIGN KEY (prepaid_account_id) REFERENCES public.prepaid_account(prepaid_account_id);


--
-- TOC entry 5037 (class 2606 OID 25403)
-- Name: bank bank_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank
    ADD CONSTRAINT bank_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.payment_method(method_id);


--
-- TOC entry 5026 (class 2606 OID 25299)
-- Name: bill_document bill_document_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_document
    ADD CONSTRAINT bill_document_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.utility_connection(connection_id);


--
-- TOC entry 5027 (class 2606 OID 25310)
-- Name: bill_postpaid bill_postpaid_bill_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_postpaid
    ADD CONSTRAINT bill_postpaid_bill_document_id_fkey FOREIGN KEY (bill_document_id) REFERENCES public.bill_document(bill_document_id);


--
-- TOC entry 5018 (class 2606 OID 25249)
-- Name: commercial_connection commercial_connection_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_connection
    ADD CONSTRAINT commercial_connection_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.utility_connection(connection_id);


--
-- TOC entry 5042 (class 2606 OID 25466)
-- Name: complaint complaint_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint
    ADD CONSTRAINT complaint_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.employee(person_id);


--
-- TOC entry 5043 (class 2606 OID 25471)
-- Name: complaint complaint_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint
    ADD CONSTRAINT complaint_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.field_worker(person_id);


--
-- TOC entry 5044 (class 2606 OID 25461)
-- Name: complaint complaint_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint
    ADD CONSTRAINT complaint_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.utility_connection(connection_id);


--
-- TOC entry 5045 (class 2606 OID 25456)
-- Name: complaint complaint_consumer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint
    ADD CONSTRAINT complaint_consumer_id_fkey FOREIGN KEY (consumer_id) REFERENCES public.consumer(person_id);


--
-- TOC entry 5015 (class 2606 OID 25223)
-- Name: connection_application connection_application_consumer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connection_application
    ADD CONSTRAINT connection_application_consumer_id_fkey FOREIGN KEY (consumer_id) REFERENCES public.consumer(person_id);


--
-- TOC entry 5016 (class 2606 OID 25228)
-- Name: connection_application connection_application_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connection_application
    ADD CONSTRAINT connection_application_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.employee(person_id);


--
-- TOC entry 4999 (class 2606 OID 25057)
-- Name: consumer consumer_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consumer
    ADD CONSTRAINT consumer_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(person_id);


--
-- TOC entry 5003 (class 2606 OID 25099)
-- Name: electricity_utility electricity_utility_utility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.electricity_utility
    ADD CONSTRAINT electricity_utility_utility_id_fkey FOREIGN KEY (utility_id) REFERENCES public.utility(utility_id);


--
-- TOC entry 5000 (class 2606 OID 25067)
-- Name: employee employee_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(person_id);


--
-- TOC entry 5001 (class 2606 OID 25082)
-- Name: field_worker field_worker_assigned_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_worker
    ADD CONSTRAINT field_worker_assigned_region_id_fkey FOREIGN KEY (assigned_region_id) REFERENCES public.region(region_id);


--
-- TOC entry 5002 (class 2606 OID 25077)
-- Name: field_worker field_worker_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_worker
    ADD CONSTRAINT field_worker_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(person_id);


--
-- TOC entry 5029 (class 2606 OID 25335)
-- Name: fixed_charge_applied fixed_charge_applied_bill_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge_applied
    ADD CONSTRAINT fixed_charge_applied_bill_document_id_fkey FOREIGN KEY (bill_document_id) REFERENCES public.bill_document(bill_document_id);


--
-- TOC entry 5030 (class 2606 OID 25330)
-- Name: fixed_charge_applied fixed_charge_applied_fixed_charge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge_applied
    ADD CONSTRAINT fixed_charge_applied_fixed_charge_id_fkey FOREIGN KEY (fixed_charge_id) REFERENCES public.fixed_charge(fixed_charge_id);


--
-- TOC entry 5032 (class 2606 OID 25357)
-- Name: fixed_charge_owed fixed_charge_owed_fixed_charge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge_owed
    ADD CONSTRAINT fixed_charge_owed_fixed_charge_id_fkey FOREIGN KEY (fixed_charge_id) REFERENCES public.fixed_charge(fixed_charge_id);


--
-- TOC entry 5033 (class 2606 OID 25362)
-- Name: fixed_charge_owed fixed_charge_owed_prepaid_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge_owed
    ADD CONSTRAINT fixed_charge_owed_prepaid_account_id_fkey FOREIGN KEY (prepaid_account_id) REFERENCES public.prepaid_account(prepaid_account_id);


--
-- TOC entry 5010 (class 2606 OID 25170)
-- Name: fixed_charge fixed_charge_tariff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge
    ADD CONSTRAINT fixed_charge_tariff_id_fkey FOREIGN KEY (tariff_id) REFERENCES public.tariff(tariff_id);


--
-- TOC entry 5005 (class 2606 OID 25119)
-- Name: gas_utility gas_utility_utility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gas_utility
    ADD CONSTRAINT gas_utility_utility_id_fkey FOREIGN KEY (utility_id) REFERENCES public.utility(utility_id);


--
-- TOC entry 5011 (class 2606 OID 25183)
-- Name: meter meter_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter
    ADD CONSTRAINT meter_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.address(address_id);


--
-- TOC entry 5019 (class 2606 OID 25266)
-- Name: meter_reading meter_reading_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_reading
    ADD CONSTRAINT meter_reading_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.employee(person_id);


--
-- TOC entry 5020 (class 2606 OID 25271)
-- Name: meter_reading meter_reading_field_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_reading
    ADD CONSTRAINT meter_reading_field_worker_id_fkey FOREIGN KEY (field_worker_id) REFERENCES public.field_worker(person_id);


--
-- TOC entry 5021 (class 2606 OID 25261)
-- Name: meter_reading meter_reading_meter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_reading
    ADD CONSTRAINT meter_reading_meter_id_fkey FOREIGN KEY (meter_id) REFERENCES public.meter(meter_id);


--
-- TOC entry 5022 (class 2606 OID 25489)
-- Name: meter_reading meter_reading_tariff_id_slab_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_reading
    ADD CONSTRAINT meter_reading_tariff_id_slab_num_fkey FOREIGN KEY (tariff_id, slab_num) REFERENCES public.tariff_slab(tariff_id, slab_num);


--
-- TOC entry 5038 (class 2606 OID 25413)
-- Name: mobile_banking mobile_banking_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_banking
    ADD CONSTRAINT mobile_banking_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.payment_method(method_id);


--
-- TOC entry 5040 (class 2606 OID 25436)
-- Name: payment payment_bill_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_bill_document_id_fkey FOREIGN KEY (bill_document_id) REFERENCES public.bill_document(bill_document_id);


--
-- TOC entry 5041 (class 2606 OID 25441)
-- Name: payment payment_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.payment_method(method_id);


--
-- TOC entry 5039 (class 2606 OID 25423)
-- Name: paypal paypal_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paypal
    ADD CONSTRAINT paypal_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.payment_method(method_id);


--
-- TOC entry 4997 (class 2606 OID 25032)
-- Name: person person_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person
    ADD CONSTRAINT person_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.address(address_id);


--
-- TOC entry 5031 (class 2606 OID 25347)
-- Name: prepaid_account prepaid_account_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prepaid_account
    ADD CONSTRAINT prepaid_account_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.utility_connection(connection_id);


--
-- TOC entry 5028 (class 2606 OID 25320)
-- Name: prepaid_statement prepaid_statement_bill_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prepaid_statement
    ADD CONSTRAINT prepaid_statement_bill_document_id_fkey FOREIGN KEY (bill_document_id) REFERENCES public.bill_document(bill_document_id);


--
-- TOC entry 5017 (class 2606 OID 25239)
-- Name: residential_connection residential_connection_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.residential_connection
    ADD CONSTRAINT residential_connection_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.utility_connection(connection_id);


--
-- TOC entry 5009 (class 2606 OID 25157)
-- Name: tariff_slab tariff_slab_tariff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tariff_slab
    ADD CONSTRAINT tariff_slab_tariff_id_fkey FOREIGN KEY (tariff_id) REFERENCES public.tariff(tariff_id);


--
-- TOC entry 5008 (class 2606 OID 25147)
-- Name: tariff tariff_utility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tariff
    ADD CONSTRAINT tariff_utility_id_fkey FOREIGN KEY (utility_id) REFERENCES public.utility(utility_id);


--
-- TOC entry 5023 (class 2606 OID 25281)
-- Name: usage usage_meter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage
    ADD CONSTRAINT usage_meter_id_fkey FOREIGN KEY (meter_id) REFERENCES public.meter(meter_id);


--
-- TOC entry 5024 (class 2606 OID 25286)
-- Name: usage usage_reading_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage
    ADD CONSTRAINT usage_reading_id_fkey FOREIGN KEY (reading_id) REFERENCES public.meter_reading(reading_id);


--
-- TOC entry 5025 (class 2606 OID 25484)
-- Name: usage usage_tariff_id_slab_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage
    ADD CONSTRAINT usage_tariff_id_slab_num_fkey FOREIGN KEY (tariff_id, slab_num) REFERENCES public.tariff_slab(tariff_id, slab_num);


--
-- TOC entry 5012 (class 2606 OID 25201)
-- Name: utility_connection utility_connection_consumer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_connection
    ADD CONSTRAINT utility_connection_consumer_id_fkey FOREIGN KEY (consumer_id) REFERENCES public.consumer(person_id);


--
-- TOC entry 5013 (class 2606 OID 25206)
-- Name: utility_connection utility_connection_meter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_connection
    ADD CONSTRAINT utility_connection_meter_id_fkey FOREIGN KEY (meter_id) REFERENCES public.meter(meter_id);


--
-- TOC entry 5014 (class 2606 OID 25196)
-- Name: utility_connection utility_connection_tariff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_connection
    ADD CONSTRAINT utility_connection_tariff_id_fkey FOREIGN KEY (tariff_id) REFERENCES public.tariff(tariff_id);


--
-- TOC entry 5006 (class 2606 OID 25134)
-- Name: utility_region utility_region_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_region
    ADD CONSTRAINT utility_region_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.region(region_id);


--
-- TOC entry 5007 (class 2606 OID 25129)
-- Name: utility_region utility_region_utility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_region
    ADD CONSTRAINT utility_region_utility_id_fkey FOREIGN KEY (utility_id) REFERENCES public.utility(utility_id);


--
-- TOC entry 5004 (class 2606 OID 25109)
-- Name: water_utility water_utility_utility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.water_utility
    ADD CONSTRAINT water_utility_utility_id_fkey FOREIGN KEY (utility_id) REFERENCES public.utility(utility_id);


-- Completed on 2026-02-20 15:20:44

--
-- PostgreSQL database dump complete
--

\unrestrict aAipju6g4USpdbGjbGuNfXjL1Zl4ccYmhOYlOGN6OCa0bxFxfSbrXjtgi2aU0Be

