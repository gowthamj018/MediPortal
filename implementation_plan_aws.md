# MediVault — Implementation & Deployment Guide (AWS)

## Current Architecture

MediVault is a **Spring Boot 3.2 + React 18** healthcare portal with:
- **Backend**: Java 21, Spring Security + JWT, MySQL 8.0, Redis (OTP/rate-limiting)
- **Frontend**: React 18, React Router, Axios, Lucide Icons, react-phone-input-2
- **SMS / OTP**: Fast2SMS (prod) / Mock logger (dev), provider-switched via Spring profiles
- **Database**: MySQL 8.0 (5 tables)
- **Deployment**: Docker Compose (4 services) → AWS EC2 Free Tier

---

## Database Schema (5 Tables)

```
┌──────────────┐     ┌──────────────┐
│   patients   │     │   doctors    │
├──────────────┤     ├──────────────┤
│ PK: id       │     │ PK: id       │
│ UK: email    │     │ UK: email    │
│ first_name   │     │ first_name   │
│ last_name    │     │ last_name    │
│ email        │     │ email        │
│ phone        │     │ phone        │
│ date_of_birth│     │ specialization│
│ gender       │     │ department   │
│ blood_group  │     │ qualification│
│ weight       │     │ experience_years│
│ height       │     │ available_days│
│ age          │     │ available_time_slots (JSON)│
│ created_at   │     │ consultation_fee│
└───────┬──────┘     │ bio          │
        │            │ created_at   │
        │            └───────┬──────┘
        │                    │
        │   ┌────────────────┴──────────────┐
        │   │        appointments           │
        │   ├───────────────────────────────┤
        │   │ PK: id                        │
        └───┤ FK: patient_id → patients(id) │
            │ FK: doctor_id  → doctors(id)  │
            │ UK: (doctor_id, date, time)   │
            │ appointment_date, time        │
            │ status (SCHEDULED/CONFIRMED/  │
            │         COMPLETED/CANCELLED/  │
            │         NO_SHOW)              │
            │ reason, notes                 │
            └──────┬────────────┬───────────┘
                   │            │
        ┌──────────┴──┐  ┌─────┴──────────┐
        │  documents  │  │ doctor_ratings  │
        ├─────────────┤  ├────────────────┤
        │ PK: id      │  │ PK: id         │
        │ FK: appt_id │  │ FK: doctor_id  │
        │ FK: patient │  │ FK: patient_id │
        │ FK: doctor  │  │ FK: appt_id(UK)│
        │ document_type│  │ rating (1-5)   │
        │ prescription │  │ review (TEXT)  │
        │ _text        │  │ CHECK(1≤r≤5)  │
        │ file_name    │  └────────────────┘
        │ file_path    │
        │ file_type    │
        │ file_size    │
        │ uploaded_at  │
        └─────────────┘
```

### Key Constraints
- `appointments(doctor_id, appointment_date, appointment_time)` → UNIQUE (prevents double-booking)
- `doctor_ratings.appointment_id` → UNIQUE (one rating per appointment)
- `doctor_ratings.rating` → CHECK (1 ≤ rating ≤ 5)
- All FKs use `ON DELETE CASCADE`

---

## Features Implemented

### Authentication (OTP-based, no passwords)
| Feature | Endpoint | Description |
|---------|----------|-------------|
| Generate OTP | `POST /api/auth/generate-otp` | Sends OTP via Fast2SMS (prod) or logs it (dev) |
| Login | `POST /api/auth/login` | Validates OTP from Redis, returns JWT |
| Register Patient | `POST /api/auth/register` | OTP-verified patient registration |
| Register Doctor | `POST /api/auth/register/doctor` | OTP-verified physician registration |

**Rate limiting**: 5 OTP requests per phone per 15-minute window (enforced via Redis).

### Patient Portal
| Feature | Endpoint | Description |
|---------|----------|-------------|
| Dashboard | `GET /api/patient/dashboard` | BMI calculation, stats |
| Appointments | `GET/POST /api/appointments` | Full CRUD + slot validation |
| Reschedule | `PUT /api/appointments/{id}/reschedule` | With available slot check |
| Rate Doctor | `POST /api/appointments/{id}/rate` | 1-5 stars + review, COMPLETED only |
| Booked Slots | `GET /api/appointments/booked-slots` | Filter unavailable times |
| Documents | `GET /api/documents` | Prescriptions + file reports |
| Profile | `GET/PUT /api/patient/profile` | With weight/height/age/BMI |

### Physician Portal
| Feature | Endpoint | Description |
|---------|----------|-------------|
| Dashboard | `GET /api/doctor/dashboard` | Stats, today/upcoming counts |
| Appointments | `GET /api/doctor/appointments` | All/Today/Upcoming filters |
| Complete Appointment | `PUT /api/doctor/appointments/{id}/complete` | Marks status = COMPLETED |
| Write Prescription | `POST /api/doctor/prescriptions` | Text-based prescriptions (today only) |
| Upload Report | `POST /api/doctor/documents/upload` | Lab/Imaging reports (today only) |
| Patient Records | `GET /api/doctor/patients/{patientId}/documents` | Full medical history (auth-gated) |
| Delete Document | `DELETE /api/doctor/documents/{id}` | Doctor can delete own documents |
| Patient List | `GET /api/doctor/patients` | Today's patient list |
| Profile | `GET/PUT /api/doctor/profile` | With available days/slots (JSON) |

### Rating System
- Patients can only rate **after** appointment status = `COMPLETED`
- Each appointment can be rated **once** (unique constraint)
- Doctor rating is **computed dynamically** as AVG from `doctor_ratings` table

---

## Project Structure

```
patient-portal/
├── backend/
│   └── src/main/
│       ├── java/com/mediportal/
│       │   ├── config/       SecurityConfig.java
│       │   ├── controller/   AuthController, AppointmentController,
│       │   │                 DoctorController, DoctorPortalController,
│       │   │                 DocumentController, PatientController
│       │   ├── dto/          JwtResponse, AppointmentResponse, DoctorResponse,
│       │   │                 RegisterRequest, DoctorRegisterRequest,
│       │   │                 PrescriptionRequest, GenerateOtpRequest,
│       │   │                 LoginRequest, MessageResponse
│       │   ├── model/        Patient, Doctor, Appointment, Document, DoctorRating
│       │   ├── repository/   (one per model)
│       │   ├── security/     JwtUtils, AuthTokenFilter, PatientDetailsService
│       │   └── service/      SmsService (Fast2SMS/mock), RedisService
│       └── resources/
│           ├── application.properties        ← shared infrastructure
│           ├── application-dev.properties    ← mock SMS, verbose logs
│           └── application-prod.properties   ← fast2sms, reduced logs
├── frontend/
│   └── src/
│       ├── components/  Sidebar.jsx, DoctorSidebar.jsx
│       ├── context/     AuthContext.jsx
│       ├── pages/       LoginPage, RegisterPage, DoctorRegisterPage,
│       │                DashboardPage, AppointmentsPage, BookAppointmentPage,
│       │                DoctorsPage, DocumentsPage, ProfilePage,
│       │                DoctorDashboardPage, DoctorAppointmentsPage,
│       │                DoctorProfilePage
│       ├── services/    api.js
│       └── styles/      global.css
├── Dockerfile               Backend multi-stage build (JDK build → JRE runtime)
├── Dockerfile.frontend      Frontend multi-stage build (Node build → Nginx)
├── docker-compose.yml       4-service stack (mysql, redis, backend, frontend)
├── nginx.conf               SPA routing + API proxy
├── init.sql                 MySQL DDL (5 tables)
├── .env                     Local dev environment variables (not committed)
└── implementation_plan_aws.md
```

---

## Spring Profiles (Dev vs Prod)

The application uses Spring Boot profiles to automatically switch SMS behaviour:

| Profile | Activated by | SMS | Logging |
|---------|-------------|-----|---------|
| `dev` | `SPRING_PROFILES_ACTIVE=dev` (set in docker-compose.yml) | Mock — OTP printed to Docker logs | DEBUG (verbose) |
| `prod` | `SPRING_PROFILES_ACTIVE=prod` (set on EC2) | Fast2SMS — real SMS | INFO (clean) |

**Property files:**
- `application.properties` — shared: DB, Redis, JWT, CORS, file storage
- `application-dev.properties` — `app.sms.provider=mock`
- `application-prod.properties` — `app.sms.provider=fast2sms`, reads `FAST2SMS_API_KEY` env var

---

## Deployment Guide: Amazon Web Services (AWS) EC2 Free Tier

### Prerequisites
- AWS Account (https://aws.amazon.com/free/)
- Git repository with your code pushed
- Fast2SMS account with wallet balance (https://www.fast2sms.com)

---

### Step 1: Create AWS Account

1. Go to **https://aws.amazon.com/** and sign up.
2. Complete the billing verification (a small hold will be placed on your card).
3. Log in to the **AWS Management Console**.

---

### Step 2: Launch an EC2 Instance (Always Free Tier)

1. Search for **EC2** in the top search bar and click it.
2. Click the orange **Launch Instance** button.
3. Configure the instance:
   - **Name**: `medivault-server`
   - **AMI (Amazon Machine Image)**: Select **Ubuntu**, then choose **Ubuntu Server 22.04 LTS** (ensure it says "Free tier eligible").
   - **Instance Type**: `t2.micro` or `t3.micro` (ensure it says "Free tier eligible").
   - **Key Pair (login)**: Click **Create new key pair**. Name it `medivault-key`, select **RSA** and **.pem**. Click Create. *The file will download to your computer. Keep it safe!*
   - **Network Settings**: Check the boxes for:
     - **Allow SSH traffic from Anywhere**
     - **Allow HTTPS traffic from the internet**
     - **Allow HTTP traffic from the internet**
   - **Configure Storage**: Set to **30 GB** (Free tier eligible max).
4. Click **Launch Instance** at the bottom right.
5. Go back to your Instances list and copy the **Public IPv4 address** of your new server.

---

### Step 3: SSH into the VM & Install Docker

Open your terminal on your local machine. You need to use the `.pem` key you downloaded:

```bash
# First, secure your key file (Mac/Linux/GitBash only)
chmod 400 ~/Downloads/medivault-key.pem

# Connect via SSH
ssh -i "~/Downloads/medivault-key.pem" ubuntu@<YOUR_PUBLIC_IPv4>

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker Engine
curl -fsSL https://get.docker.com | sh

# Add your user to docker group (avoids sudo)
sudo usermod -aG docker $USER

# Apply group change
newgrp docker

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Verify installations
docker --version
docker compose version
```

---

### Step 4: Add Swap Space (Crucial for 1GB t2.micro instances)

Since the `t2.micro` instance only has 1GB of RAM, Docker builds (especially Java) might crash out of memory. Add swap space:

```bash
# Create a 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make it permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

### Step 5: Clone Your Repository

```bash
# Clone your project
git clone <YOUR_REPO_URL> ~/patient-portal
cd ~/patient-portal
```

---

### Step 6: Configure Environment Variables

Create the `.env` file on the server:

```bash
nano .env
```

Paste the following (replace all placeholder values):

```env
# Database
MYSQL_ROOT_PASSWORD=StrongP@ss2026!
JWT_SECRET=YourOwn64CharSecretKeyHere_ChangeThisInProduction_MinLength64Ch

# Network — set to your EC2 instance's Public IPv4
CORS_ALLOWED_ORIGINS=http://<YOUR_PUBLIC_IPv4>
API_URL=http://<YOUR_PUBLIC_IPv4>

# Spring profile — activates application-prod.properties (Fast2SMS, reduced logging)
SPRING_PROFILES_ACTIVE=prod

# Fast2SMS — required when SPRING_PROFILES_ACTIVE=prod
# Get your key from: https://www.fast2sms.com/dashboard/dev-api
# Requires wallet balance of ₹100+ for the Quick SMS (q) route
FAST2SMS_API_KEY=<YOUR_FAST2SMS_API_KEY>
```

> **Important**: Replace all `<...>` placeholders. The `SPRING_PROFILES_ACTIVE=prod` setting automatically activates Fast2SMS for OTP delivery — no other SMS config is needed.

Save and exit (`Ctrl+X → Y → Enter`).

---

### Step 7: Build & Deploy with Docker Compose

```bash
# Build all images and start containers in background
docker compose up -d --build
```

This will:
1. **Pull MySQL 8.0** and **Redis 7** images
2. **Build the backend** (Maven compile inside Docker, ~3-5 min first time)
3. **Build the frontend** (npm install + build, ~2-3 min first time)
4. Start all **4 containers** with proper networking and healthchecks

---

### Step 8: Verify Deployment

```bash
# Check all containers are running
docker compose ps

# Expected output:
# medivault-redis      redis:7-alpine  running   6379/tcp
# medivault-mysql      mysql:8.0       running   3306/tcp
# medivault-backend    ...             running   0.0.0.0:8080->8080/tcp
# medivault-frontend   ...             running   0.0.0.0:80->80/tcp

# Check backend logs — look for "Started PatientPortalApplication"
# Also verify "The following 1 profile is active: prod"
docker compose logs backend --tail 30

# Check MySQL is healthy
docker compose logs mysql --tail 10

# Test backend API directly
curl http://localhost:8080/api/doctors

# Test frontend
curl -I http://localhost:80
```

> **Verify SMS is active**: After a user requests an OTP, check the logs. With `prod` profile you should see `OTP sent successfully via Fast2SMS`. With `dev` profile you would see `[MOCK SMS]`.

---

### Step 9: Access Your Application

Open your browser and go to:
```
http://<YOUR_PUBLIC_IPv4>
```

You should see the MediVault login page with working OTP delivery!

---

## Docker Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      AWS EC2 Instance                         │
│                                                               │
│  ┌──────────┐    ┌──────────────┐    ┌──────────┐ ┌───────┐  │
│  │  Nginx   │    │  Spring Boot │    │ MySQL 8  │ │ Redis │  │
│  │ Frontend │───▶│   Backend    │───▶│ (Volume: │ │ (OTP  │  │
│  │ :80      │/api│   :8080      │    │ mysql-   │ │ cache)│  │
│  └──────────┘    └──────────────┘    │ data)    │ └───────┘  │
│       │                │             └──────────┘            │
│       ▼                ▼                                      │
│  Port 80 (HTTP)   Port 8080           Port 3306   Port 6379  │
│  (public)         (internal)          (internal)  (internal) │
└──────────────────────────────────────────────────────────────┘
                    │
                    ▼
              Internet Users              Fast2SMS API
          http://<PUBLIC_IPv4>       (outbound OTP delivery)
```

**How it works:**
1. Users access `http://<IP>` → Nginx serves the React app
2. React makes API calls to `/api/*` → Nginx proxies to backend:8080
3. Backend validates OTPs via Redis and sends them via Fast2SMS (prod) or logs them (dev)
4. Backend connects to MySQL via internal Docker network (`mysql:3306`)
5. MySQL data persists in a Docker volume (`mysql-data`)
6. Uploaded files (reports, lab results) persist in a Docker volume (`uploads`)

---

## Common Operations

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f mysql
docker compose logs -f frontend

# Verify active Spring profile
docker compose logs backend | grep "profile"
```

### Restart Services
```bash
# Restart everything
docker compose restart

# Restart only backend (e.g., after env var change — no rebuild needed)
docker compose up -d --force-recreate backend
```

### Update & Redeploy
```bash
cd ~/patient-portal

# Pull latest code
git pull origin main

# Rebuild and restart (required when Java/React source changes)
docker compose up -d --build
```

### Reset OTP Rate Limit (Emergency)
If a user is locked out (429 Too Many Requests) before the 15-minute window expires:
```bash
# List all rate-limit keys
docker exec medivault-redis redis-cli KEYS "ATTEMPTS:*"

# Clear a specific phone number's rate limit
docker exec medivault-redis redis-cli DEL "ATTEMPTS:+919XXXXXXXXX"

# Clear all rate limits (use with caution)
docker exec medivault-redis redis-cli FLUSHDB
```

### Access MySQL Directly
```bash
# Connect to MySQL shell
docker exec -it medivault-mysql mysql -uroot -p
# Enter password: StrongP@ss2026!

# Inside MySQL:
USE patientportal;
SHOW TABLES;
SELECT * FROM patients;
SELECT * FROM doctors;
SELECT d.first_name, d.last_name, AVG(r.rating) as avg_rating, COUNT(r.id) as total_ratings
  FROM doctors d LEFT JOIN doctor_ratings r ON d.id = r.doctor_id
  GROUP BY d.id;
```

### Backup Database
```bash
# Export database dump
docker exec medivault-mysql mysqldump -uroot -pStrongP@ss2026! patientportal > backup_$(date +%Y%m%d).sql

# Restore from backup
docker exec -i medivault-mysql mysql -uroot -pStrongP@ss2026! patientportal < backup_20260418.sql
```

### Check Disk Space
```bash
# Docker disk usage
docker system df

# Cleanup unused images/containers
docker system prune -f
```

---

## Troubleshooting

### Backend won't start — "Communications link failure"
MySQL hasn't finished initializing. The backend's `depends_on` with healthcheck should handle this, but if it doesn't:
```bash
docker compose restart backend
```

### "Port 80 already in use"
```bash
sudo lsof -i :80
sudo kill <PID>
docker compose up -d
```

### "Cannot connect from browser"
1. Check AWS EC2 Security Groups to ensure HTTP (port 80) Inbound Rules exist and allow `0.0.0.0/0`.
2. Check container is running: `docker compose ps`

### Frontend shows "Network Error"
The `CORS_ALLOWED_ORIGINS` in `.env` doesn't match the URL you're accessing. Update `.env` and rebuild:
```bash
nano .env  # fix the IP/domain
docker compose up -d --build frontend
```

### OTP not received (Fast2SMS)
```bash
# Check Fast2SMS response in backend logs
docker compose logs backend | grep -i "fast2sms\|OTP\|ERROR"
```
Common causes:
- `status_code: 999` → Add ₹100+ wallet balance at fast2sms.com
- `status_code: 996` → Website verification required in Fast2SMS dashboard
- Empty/null response → Check that `FAST2SMS_API_KEY` is correctly set in `.env`

### OTP rate limit hit (429)
```bash
# Clear rate limit for a specific number
docker exec medivault-redis redis-cli DEL "ATTEMPTS:+91XXXXXXXXXX"
```

---

## Future Enhancements

- **HTTPS**: Add Let's Encrypt SSL with certbot + nginx config
- **Custom Domain**: Point a domain to AWS EC2 Public IP, update CORS
- **Monitoring**: Add Prometheus + Grafana via docker-compose
- **Backups**: Cron job for daily MySQL dumps to S3
- **CI/CD**: GitHub Actions to auto-deploy on push to main
- **Notifications**: Extend SmsService to send appointment reminders via Fast2SMS
