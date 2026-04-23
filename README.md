# OneWay Interview

A one-way video interview platform where administrators set up interview questions and invite candidates, who then record and submit video responses at their own pace.

## Architecture

```
OneWayInterview/
├── server/           # Express API (port 5001)
├── admin-app/        # Admin portal - React + Vite (port 3001)
├── candidate-app/    # Candidate portal - React + Vite (port 3002)
├── deploy/           # EC2 manual deployment (Nginx, PM2, setup script)
├── terraform/        # One-command AWS deployment via Terraform
└── package.json      # Root scripts (concurrently)
```

| Component | Tech Stack |
|-----------|-----------|
| **Server** | Node.js, Express, sql.js (SQLite), Multer |
| **Admin App** | React 18, Vite, TailwindCSS, React Router v6, Lucide Icons |
| **Candidate App** | React 18, Vite, TailwindCSS, React Router v6, MediaRecorder API |

## Features

### Admin Portal (port 3001)
- Create and manage interview positions
- Add up to 5 questions per position
- Invite candidates with auto-generated one-time interview links (1-hour expiry)
- Dashboard with candidate stats and status filters
- View candidate video responses with in-browser playback
- Resend interview links or request resubmission
- Copy/open interview links directly from the UI for testing

### Candidate Portal (port 3002)
- Token-based access via unique interview link
- Record video answers (max 3 minutes per question) using device camera
- Re-record before moving to next question
- Submit interview with optional comment
- Cross-browser support (Chrome, Edge, Safari)

## Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- A modern web browser with camera/microphone access

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/tjblavakumar/OneWayInterview.git
cd OneWayInterview
```

### 2. Install all dependencies

```bash
# Install root dependencies (concurrently)
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install admin app dependencies
cd admin-app && npm install && cd ..

# Install candidate app dependencies
cd candidate-app && npm install && cd ..
```

### 3. Configure environment

```bash
# Copy the example env file
cp server/.env.example server/.env
```

Default `.env` values work out of the box for local development:

```env
PORT=5001
NODE_ENV=development
ADMIN_APP_URL=http://localhost:3001
CANDIDATE_APP_URL=http://localhost:3002
STORAGE_MODE=local
LOCAL_UPLOAD_DIR=./uploads
EMAIL_MODE=console
```

### 4. Start all services

**Option A — Run all three at once (recommended):**

```bash
npm run dev
```

**Option B — Run individually in separate terminals:**

```bash
# Terminal 1: API Server
cd server && npm run dev

# Terminal 2: Admin Portal
cd admin-app && npx vite --port 3001

# Terminal 3: Candidate Portal
cd candidate-app && npx vite --port 3002
```

### 5. Open in browser

| Service | URL |
|---------|-----|
| Admin Portal | http://localhost:3001 |
| Candidate Portal | http://localhost:3002 |
| API Server | http://localhost:5001 |

## Quick Test Flow

1. Open **Admin Portal** → go to **Positions** → create a position → add 1–5 questions
2. Go to **Candidates** → click **Invite Candidate** → fill in name, email, position, expiry → **Send**
3. A green banner appears with the interview link — click **Copy** or **Open**
4. The link opens the **Candidate Portal** where the candidate can record video responses
5. After submission, go back to Admin → click the candidate → view video responses

> **Note:** In development mode, emails are logged to the server console instead of being sent. Interview links are visible directly in the admin UI.

## API Endpoints

### Admin API (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/positions` | List all positions |
| POST | `/positions` | Create a position |
| DELETE | `/positions/:id` | Delete a position |
| GET | `/positions/:id/questions` | List questions for a position |
| POST | `/positions/:id/questions` | Add a question |
| PUT | `/questions/:id` | Update a question |
| DELETE | `/questions/:id` | Delete a question |
| GET | `/candidates` | List candidates (filterable) |
| POST | `/candidates` | Create candidate & send link |
| GET | `/candidates/:id` | Candidate detail with responses |
| POST | `/candidates/:id/resend-link` | Resend interview link |
| POST | `/candidates/:id/request-resubmit` | Request resubmission |
| POST | `/candidates/:id/mark-complete` | Mark interview complete |
| GET | `/dashboard/stats` | Dashboard statistics |

### Candidate API (`/api/candidate`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/interview/:token` | Validate link & get questions |
| POST | `/interview/:token/start` | Start interview (marks token used) |
| POST | `/interview/:token/upload` | Upload video for a question |
| POST | `/interview/:token/submit` | Submit interview |

## Data Storage (Development)

- **Database:** SQLite file at `server/data/interview.db` (auto-created on first run)
- **Videos:** Local filesystem at `server/uploads/videos/{candidateId}/`
- **Emails:** Logged to server console

## AWS Deployment

Two deployment options are available for production on AWS EC2:

### Option A — Terraform (recommended, zero-touch)

```bash
cd terraform/
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — set key_pair_name at minimum

terraform init
terraform apply   # ~5 minutes, fully automated
```

This creates an EC2 instance (Ubuntu 24.04), installs everything, builds both apps,
configures Nginx with self-signed SSL, and starts the API server via PM2.
See [`terraform/README.md`](terraform/README.md) for full details.

Tear down with `terraform destroy`.

### Option B — Manual EC2 Setup

```bash
# SSH into an Ubuntu 24.04 EC2 instance, then:
git clone https://github.com/tjblavakumar/OneWayInterview.git
cd OneWayInterview
chmod +x deploy/setup.sh
sudo bash deploy/setup.sh
```

See [`deploy/EC2-SETUP-GUIDE.md`](deploy/EC2-SETUP-GUIDE.md) for step-by-step instructions.

### Production URLs

| URL | Service |
|-----|--------|
| `https://<EC2-IP>/` | Admin Portal |
| `https://<EC2-IP>/candidate/` | Candidate Portal |
| `https://<EC2-IP>/api/health` | API Health Check |

> **Note:** Accept the self-signed certificate warning in your browser.
> Camera access requires HTTPS, which is why SSL is configured.

## Future Enhancements

- S3 video storage and SES email integration
- Admin authentication
- Candidate email notifications via SMTP/SES
- Video transcription and AI-assisted evaluation

## License

Private — internal use only.
