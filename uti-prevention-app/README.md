# BladderWise — UTI Prevention Behaviour App (starter)

A local-development starter using React + Vite, FastAPI, SQLAlchemy, and PostgreSQL.
Patients can register with their name and contact number, receive a unique patient ID,
complete a clinic-assisted medical history, record water intake, bladder activity, and
daily symptoms, and download their own records as an Excel workbook.

## Requirements
- Python 3.11+
- Node.js LTS
- PostgreSQL
- VS Code (optional)

## 1. Create the database
Open pgAdmin Query Tool or `psql` and run:

```sql
CREATE DATABASE uti_prevention;
```

## 2. Configure the backend
Open PowerShell in the project root:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env`:
- Set `YOUR_POSTGRES_PASSWORD` to the password for your local PostgreSQL user.
- Replace `REPLACE_WITH_A_LONG_RANDOM_SECRET` with a long random secret.
- Keep `.env` private and never commit it.

The backend and frontend are configured to use API port 8001. If you choose a different backend port, create `frontend/.env` from `frontend/.env.example` and set `VITE_API_URL` to `http://127.0.0.1:<port>`.

Example secret generation:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Run the API from the `backend` directory:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

If port 8001 is unavailable, pick another free port and keep the frontend `.env` synced to that same URL.

Check:
- http://127.0.0.1:8001/health
- http://127.0.0.1:8001/docs

The starter creates its initial tables on startup for convenience. Use Alembic migrations before production.

## 3. Run the frontend
Open a second PowerShell terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL Vite prints, usually http://localhost:5173.

## Deploy the frontend to Vercel
The Vercel deployment serves the React frontend. The FastAPI backend and PostgreSQL
database must be hosted separately; Vercel's frontend deployment does not run the local
backend or provide its database.

1. Push this project to a Git provider and import it into Vercel.
2. Set the Vercel project **Root Directory** to `uti-prevention-app/frontend` (or `frontend`
   if `uti-prevention-app` itself is the repository root). Keep the framework preset as
   **Vite**. The included `vercel.json` configures `npm run build`, the `dist` output, and
   a fallback to `index.html`.
3. Deploy the FastAPI backend to a Python-capable host and create a managed PostgreSQL
   database. Configure the backend's `DATABASE_URL` and `SECRET_KEY` using that host's
   environment-variable settings; do not use local `.env` files in production.
4. In Vercel, add `VITE_API_URL` for the Production environment, using the backend's
   public base URL (for example, `https://api.example.com`, without a trailing slash).
   Add it to Preview too if preview deployments should use the API. Redeploy after setting
   or changing this build-time variable.
5. Set the backend's `FRONTEND_ORIGIN` to the exact deployed frontend origin, such as
   `https://your-project.vercel.app`. For a custom domain, include its origin as well;
   add any preview deployment origins explicitly if they need API access.
6. Verify the backend at `https://<your-api-host>/health`, then open the Vercel deployment
   and test registration and a protected API request.

Do not expose `DATABASE_URL` or `SECRET_KEY` as frontend variables. Only `VITE_API_URL`
belongs in Vercel's frontend environment; Vite embeds `VITE_` variables in browser code.

## 4. Test
1. Create an account with your name, contact number, email, and password of at least 10 characters.
2. Note the patient ID shown on the dashboard.
3. Open **Patient history** and complete the clinic-assisted intake. Age is the first field,
   history questions require a yes/no answer, and the note is optional.
4. Record water intake with the 1-glass (250 ml) or 2-glass (500 ml) buttons, or enter a
   custom amount; each drink is saved with its timestamp. Record daily symptoms. The
   bladder log remains available as optional tracking.
5. Click **Export my Excel workbook** to download patient, intake, and tracking data.
6. Click **Test protected API connection** to test JWT-protected `/api/auth/me`.

## Initial database tables
- `users`: account identity, password hash, role, active status, creation time.
- `patient_profiles`: optional legacy age, menopause status, medical-condition notes, and recurrent UTI history.
- `clinic_intakes`: clinic-assisted age, menstrual/menopausal history, yes/no medical history, and optional note.
- `patient_identities`: generated patient ID, name, and contact number.
- `water_logs`, `bladder_logs`, and `daily_check_ins`: patient-owned tracking history.

The Excel export is generated on demand and includes only the authenticated patient's records,
including a separate clinic-intake sheet when an intake has been saved.

## Important security and clinical notes
This is a development starter, not a production-ready health system. The demo frontend holds its JWT in React memory only, so refreshing the page signs the user out. Exported workbooks contain personal and health information; store and share them securely. Before production, add a carefully designed session strategy (prefer secure, HttpOnly cookies where appropriate), rate limiting, password reset, email verification, audit logging, backup/restore testing, access controls, and security review.

Use synthetic data only during development. Obtain ethics approval and informed consent before research data collection. The app is educational and must not diagnose a UTI or replace clinical assessment. Symptom escalation and any clinical rules should be reviewed by qualified clinicians.
