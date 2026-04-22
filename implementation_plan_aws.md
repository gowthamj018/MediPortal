# MediPortal — Implementation & Deployment Guide

## Current Architecture

MediVault is a **Spring Boot 3.2 + React 18** healthcare portal with:
- **Backend**: Java 21, Spring Security + JWT, MySQL 8.0
- **Frontend**: React 18, React Router, Axios, Lucide Icons
- **Database**: MySQL 8.0 (5 tables)
- **Deployment**: Docker Compose → AWS EC2 Free Tier

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
│ password     │     │ password     │
│ phone        │     │ specialization│
│ date_of_birth│     │ department   │
│ gender       │     │ qualification│
│ address      │     │ experience_years│
│ blood_group  │     │ available_days│
│ weight       │     │ consultation_fee│
│ height       │     │ created_at   │
│ age          │     └───────┬──────┘
│ created_at   │             │
└───────┬──────┘             │
        │                    │
        │   ┌────────────────┴──────────────┐
        │   │        appointments           │
        │   ├───────────────────────────────┤
        │   │ PK: id                        │
        └───┤ FK: patient_id → patients(id) │
            │ FK: doctor_id  → doctors(id)  │
            │ UK: (doctor_id, date, time)   │
            │ appointment_date, time        │
            │ status, reason, notes         │
            │ appointment_type              │
            └──────┬────────────┬───────────┘
                   │            │
        ┌──────────┴──┐  ┌─────┴──────────┐
        │  documents  │  │ doctor_ratings  │
        ├─────────────┤  ├────────────────┤
        │ PK: id      │  │ PK: id         │
        │ FK: appt_id │  │ FK: doctor_id  │
        │ FK: patient  │  │ FK: patient_id │
        │ FK: doctor   │  │ FK: appt_id(UK)│
        │ document_type│  │ rating (1-5)   │
        │ prescription │  │ review (TEXT)  │
        │ _text        │  │ CHECK(1≤r≤5)  │
        └─────────────┘  └────────────────┘
```

### Key Constraints
- `patients.email` and `doctors.email` → UNIQUE
- `appointments(doctor_id, appointment_date, appointment_time)` → UNIQUE (prevents double-booking)
- `doctor_ratings.appointment_id` → UNIQUE (one rating per appointment)
- `doctor_ratings.rating` → CHECK (1 ≤ rating ≤ 5)
- All FKs use `ON DELETE CASCADE`

---

## Features Implemented

### Patient Portal
| Feature | Endpoint | Description |
|---------|----------|-------------|
| Registration | `POST /api/auth/register` | With weight/height/age for BMI |
| Login | `POST /api/auth/login` | Returns JWT with ROLE_PATIENT |
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
| Registration | `POST /api/auth/register/doctor` | Self-registration |
| Dashboard | `GET /api/doctor/dashboard` | Stats, today's schedule |
| Appointments | `GET /api/doctor/appointments` | All/Today/Upcoming filters |
| Prescriptions | `POST /api/doctor/prescriptions` | Text-based prescriptions |
| Upload Reports | `POST /api/doctor/documents/upload` | Lab/Imaging reports |
| Patient List | `GET /api/doctor/patients` | All patients |

### Rating System
- Patients can only rate **after** appointment status = `COMPLETED`
- Each appointment can be rated **once** (unique constraint)
- Doctor rating is **computed dynamically** as AVG from `doctor_ratings` table
- Doctors with no ratings show "New" badge (no star rating displayed)

---

## Project Structure

```
patient-portal/
├── backend/
│   └── src/main/java/com/patientportal/
│       ├── config/          SecurityConfig.java
│       ├── controller/      AuthController, AppointmentController,
│       │                    DoctorController, DoctorPortalController,
│       │                    DocumentController, PatientController
│       ├── dto/             JwtResponse, AppointmentResponse,
│       │                    DoctorResponse, RegisterRequest,
│       │                    DoctorRegisterRequest, PrescriptionRequest
│       ├── model/           Patient, Doctor, Appointment,
│       │                    Document, DoctorRating
│       ├── repository/      PatientRepo, DoctorRepo, AppointmentRepo,
│       │                    DocumentRepo, DoctorRatingRepo
│       └── security/        JwtUtils, AuthTokenFilter, PatientDetailsService
├── frontend/
│   └── src/
│       ├── components/      Sidebar.jsx, DoctorSidebar.jsx
│       ├── context/         AuthContext.jsx
│       ├── pages/           LoginPage, RegisterPage, DoctorRegisterPage,
│       │                    DashboardPage, AppointmentsPage, BookAppointmentPage,
│       │                    DoctorsPage, DocumentsPage, ProfilePage,
│       │                    DoctorDashboardPage, DoctorAppointmentsPage,
│       │                    DoctorPrescriptionPage, DoctorUploadPage
│       ├── services/        api.js
│       └── styles/          global.css
├── Dockerfile               Backend multi-stage build
├── Dockerfile.frontend      Frontend multi-stage build
├── docker-compose.yml       3-service stack
├── nginx.conf               SPA routing + API proxy
├── init.sql                 MySQL DDL (5 tables)
├── .env                     Environment variables
└── implementation_plan.md   This file
```

---

## Deployment Guide: Amazon Web Services (AWS) EC2 Free Tier

### Prerequisites
- AWS Account (https://aws.amazon.com/free/)
- Git repository with your code pushed

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

Since the `t2.micro` instance only has 1GB of RAM, Docker builds (especially Java) might crash out of memory. We need to add swap space:

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

Edit the `.env` file with your VM's Public IPv4:

```bash
nano .env
```

Update these values:

```env
MYSQL_ROOT_PASSWORD=StrongP@ss2026!
JWT_SECRET=YourOwn64CharSecretKeyHere_ChangeThisInProduction_MinLength64Ch
CORS_ALLOWED_ORIGINS=http://<YOUR_PUBLIC_IPv4>
API_URL=http://<YOUR_PUBLIC_IPv4>
```

> **Important**: Replace `<YOUR_PUBLIC_IPv4>` with your AWS EC2 instance's actual public IP address.

Save and exit (`Ctrl+X → Y → Enter`).

---

### Step 7: Build & Deploy with Docker Compose

```bash
# Build all images and start containers in background
docker compose up -d --build
```

This will:
1. **Pull MySQL 8.0** image and initialize the database using `init.sql`
2. **Build the backend** (Maven compile inside Docker, ~3-5 min first time)
3. **Build the frontend** (npm install + build, ~2-3 min first time)
4. Start all 3 containers with proper networking

---

### Step 8: Verify Deployment

```bash
# Check all containers are running
docker compose ps

# Expected output:
# medivault-mysql      mysql:8.0    running   0.0.0.0:3306->3306/tcp
# medivault-backend    ...          running   0.0.0.0:8080->8080/tcp
# medivault-frontend   ...          running   0.0.0.0:80->80/tcp

# Check backend logs (look for "Started PatientPortalApplication")
docker compose logs backend --tail 30

# Check MySQL is healthy
docker compose logs mysql --tail 10

# Test backend API directly
curl http://localhost:8080/api/doctors

# Test frontend
curl -I http://localhost:80
```

---

### Step 9: Access Your Application

Open your browser and go to:
```
http://<YOUR_PUBLIC_IPv4>
```

You should see the MediVault login page!

---

## Docker Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   AWS EC2 Instance                       │
│                                                          │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  Nginx   │    │  Spring Boot │    │   MySQL 8.0  │   │
│  │ Frontend │───▶│   Backend    │───▶│  (Volume:    │   │
│  │ :80      │/api│   :8080      │    │  mysql-data) │   │
│  └──────────┘    └──────────────┘    └──────────────┘   │
│       │                │                                 │
│       ▼                ▼                                 │
│  Port 80 (HTTP)   Port 8080           Port 3306          │
│  (public)         (internal)          (internal)         │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
              Internet Users
         http://<PUBLIC_IPv4>
```

**How it works:**
1. Users access `http://<IP>` → Nginx serves the React app
2. React makes API calls to `/api/*` → Nginx proxies to backend:8080
3. Backend connects to MySQL via internal Docker network (`mysql:3306`)
4. MySQL data persists in a Docker volume (`mysql-data`)
5. Uploaded files persist in a Docker volume (`uploads`)

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
```

### Restart Services
```bash
# Restart everything
docker compose restart

# Restart only backend (e.g., after code change)
docker compose restart backend
```

### Update & Redeploy
```bash
cd ~/patient-portal

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose up -d --build
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

---

## Future Enhancements

- **HTTPS**: Add Let's Encrypt SSL with certbot + nginx config
- **Custom Domain**: Point a domain to AWS EC2 Public IP, update CORS
- **Monitoring**: Add Prometheus + Grafana via docker-compose
- **Backups**: Cron job for daily MySQL dumps to object storage
- **CI/CD**: GitHub Actions to auto-deploy on push
