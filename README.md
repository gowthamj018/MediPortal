# 🏥 MediVault — Patient Portal

A full-stack patient portal application with a **Spring Boot** backend and **React** frontend.

---

## 📋 Features

- **Authentication** — JWT-based login & registration
- **Dashboard** — Health overview with stats and upcoming appointments
- **Appointments** — Schedule, view, and cancel appointments (3-step booking flow)
- **Find Doctors** — Browse doctors by specialization with search & filter
- **My Records** — View, download, and manage prescriptions & reports
- **Profile** — View and edit personal & medical information

---

## 🚀 Quick Start

### Prerequisites
- Java 17+
- Maven 3.8+
- Node.js 18+ & npm

---

### Backend Setup

```bash
cd backend
mvn spring-boot:run
```

Backend runs on **http://localhost:8080**

H2 Console (dev only): http://localhost:8080/h2-console
- JDBC URL: `jdbc:h2:mem:patientportal`
- Username: `sa` | Password: *(empty)*

---

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on **http://localhost:3000**

---

## 🔑 Demo Credentials

| Field    | Value              |
|----------|--------------------|
| Email    | demo@patient.com   |
| Password | demo123            |

---

## 🗂️ Project Structure

```
patient-portal/
├── backend/                        # Spring Boot
│   ├── src/main/java/com/patientportal/
│   │   ├── config/                 # Security, CORS, DataSeeder
│   │   ├── controller/             # REST endpoints
│   │   ├── dto/                    # Request/Response DTOs
│   │   ├── model/                  # JPA Entities
│   │   ├── repository/             # Spring Data repositories
│   │   └── security/               # JWT utils & filters
│   └── pom.xml
│
└── frontend/                       # React
    ├── public/
    └── src/
        ├── components/             # Sidebar
        ├── context/                # Auth context
        ├── pages/                  # All page components
        ├── services/               # Axios API instance
        └── styles/                 # Global CSS
```

---

## 🛠️ Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Backend   | Spring Boot 3.2, Spring Security, Spring Data JPA |
| Auth      | JWT (jjwt 0.12.3) |
| Database  | H2 (dev) — swap for MySQL/PostgreSQL in production |
| Frontend  | React 18, React Router v6 |
| HTTP      | Axios |
| Icons     | Lucide React |
| UI Fonts  | Playfair Display + DM Sans |

---

## 🗄️ Production Database

To use MySQL instead of H2, update `application.properties`:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/patientportal
spring.datasource.username=your_user
spring.datasource.password=your_pass
spring.datasource.driverClassName=com.mysql.cj.jdbc.Driver
spring.jpa.database-platform=org.hibernate.dialect.MySQLDialect
spring.jpa.hibernate.ddl-auto=update
```

And add MySQL dependency to `pom.xml`:
```xml
<dependency>
  <groupId>com.mysql</groupId>
  <artifactId>mysql-connector-j</artifactId>
  <scope>runtime</scope>
</dependency>
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register patient |
| POST | `/api/auth/login` | Login & get JWT |
| GET | `/api/appointments` | All appointments |
| GET | `/api/appointments/upcoming` | Upcoming appointments |
| POST | `/api/appointments` | Book appointment |
| PUT | `/api/appointments/{id}/cancel` | Cancel appointment |
| GET | `/api/doctors` | List all doctors |
| GET | `/api/documents` | All patient documents |
| GET | `/api/documents/download/{id}` | Download a document |
| GET | `/api/patient/profile` | Get profile |
| PUT | `/api/patient/profile` | Update profile |

---

## 🎨 Design

Clean and modern design using:
- **Playfair Display** serif for headings
- **DM Sans** for body text
- Deep navy sidebar with teal accent palette
- Card-based layout with subtle shadows
- Smooth animations and micro-interactions
