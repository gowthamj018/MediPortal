-- ============================================================
-- MediVault Patient Portal — MySQL Schema Initialization
-- ============================================================
-- This file is auto-executed by MySQL Docker on first startup.
-- Hibernate (ddl-auto=update) will also manage the schema,
-- but this provides the reference DDL with all constraints.
-- ============================================================

CREATE DATABASE IF NOT EXISTS patientportal
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE patientportal;

-- -----------------------------------------------------------
-- 1. PATIENTS
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
    id              BIGINT          AUTO_INCREMENT PRIMARY KEY,
    first_name      VARCHAR(100)    NOT NULL,
    last_name       VARCHAR(100)    NOT NULL,
    email           VARCHAR(255)    NOT NULL,
    password        VARCHAR(255)    NOT NULL,
    phone           VARCHAR(20),
    date_of_birth   DATE,
    gender          VARCHAR(30),
    address         VARCHAR(500),
    blood_group     VARCHAR(5),
    weight          DOUBLE,
    height          DOUBLE,
    age             INT,
    profile_picture VARCHAR(500),
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_patients_email UNIQUE (email),
    INDEX idx_patients_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------
-- 2. DOCTORS
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctors (
    id               BIGINT          AUTO_INCREMENT PRIMARY KEY,
    first_name       VARCHAR(100)    NOT NULL,
    last_name        VARCHAR(100)    NOT NULL,
    email            VARCHAR(255)    NOT NULL,
    password         VARCHAR(255)    NOT NULL,
    phone            VARCHAR(20),
    specialization   VARCHAR(100),
    department       VARCHAR(100),
    qualification    VARCHAR(255),
    experience_years INT,
    bio              TEXT,
    profile_picture  VARCHAR(500),
    available_days   VARCHAR(100),
    available_from   VARCHAR(10),
    available_to     VARCHAR(10),
    consultation_fee DOUBLE,
    created_at       DATETIME        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_doctors_email UNIQUE (email),
    INDEX idx_doctors_email (email),
    INDEX idx_doctors_specialization (specialization)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------
-- 3. APPOINTMENTS
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
    id                BIGINT        AUTO_INCREMENT PRIMARY KEY,
    patient_id        BIGINT        NOT NULL,
    doctor_id         BIGINT        NOT NULL,
    appointment_date  DATE          NOT NULL,
    appointment_time  TIME          NOT NULL,
    status            VARCHAR(20)   DEFAULT 'SCHEDULED',
    reason            VARCHAR(500),
    notes             TEXT,
    appointment_type  VARCHAR(50)   DEFAULT 'In-Person',
    created_at        DATETIME      DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id)
        REFERENCES patients(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_appt_doctor FOREIGN KEY (doctor_id)
        REFERENCES doctors(id) ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_appt_patient (patient_id),
    INDEX idx_appt_doctor (doctor_id),
    INDEX idx_appt_date (appointment_date),
    INDEX idx_appt_doctor_date (doctor_id, appointment_date),
    UNIQUE INDEX uk_appt_slot (doctor_id, appointment_date, appointment_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------
-- 4. DOCUMENTS
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id                BIGINT        AUTO_INCREMENT PRIMARY KEY,
    appointment_id    BIGINT        NULL,
    patient_id        BIGINT        NOT NULL,
    doctor_id         BIGINT        NOT NULL,
    file_name         VARCHAR(500),
    original_name     VARCHAR(500),
    file_type         VARCHAR(100),
    file_size         BIGINT,
    file_path         VARCHAR(1000),
    document_type     VARCHAR(30)   NOT NULL,
    description       VARCHAR(500),
    prescription_text TEXT,
    uploaded_at       DATETIME      DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_doc_appointment FOREIGN KEY (appointment_id)
        REFERENCES appointments(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_doc_patient FOREIGN KEY (patient_id)
        REFERENCES patients(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_doc_doctor FOREIGN KEY (doctor_id)
        REFERENCES doctors(id) ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_doc_patient (patient_id),
    INDEX idx_doc_doctor (doctor_id),
    INDEX idx_doc_type (document_type),
    INDEX idx_doc_patient_type (patient_id, document_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------
-- 5. DOCTOR RATINGS
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctor_ratings (
    id              BIGINT        AUTO_INCREMENT PRIMARY KEY,
    doctor_id       BIGINT        NOT NULL,
    patient_id      BIGINT        NOT NULL,
    appointment_id  BIGINT        NOT NULL,
    rating          INT           NOT NULL,
    review          TEXT,
    created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_rating_range CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT fk_rating_doctor FOREIGN KEY (doctor_id)
        REFERENCES doctors(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_rating_patient FOREIGN KEY (patient_id)
        REFERENCES patients(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_rating_appointment FOREIGN KEY (appointment_id)
        REFERENCES appointments(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uk_rating_appointment UNIQUE (appointment_id),

    INDEX idx_rating_doctor (doctor_id),
    INDEX idx_rating_patient (patient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
