Failed Vibe Coding Project.

Back to coding myself. Less fun, more bugs than it's worth, backend looks messy, and it's too difficult to keep track of features.

---

<del>

# GED Math Tutoring (Next.js + Postgres + Docker)

Private tutoring app for GED math practice: placement, four math tracks, assignments and quizzes with a count-up timer, tutor grading for short answers, integrity logging for copy/paste events, and a GED readiness progress bar.

## Local development

1. Copy `.env.example` to `.env` and adjust as needed. For Postgres user `postgres` with **no password**, use `DATABASE_URL="postgresql://postgres@localhost:5432/ged_tutoring?schema=public"` (same URL shape as in the NAS section, “Postgres URL when there is no password”). Set **`SESSION_SECRET`** to a long random string (changing it later will sign everyone out).
2. Start Postgres (Docker example):

```bash
docker compose up -d db
```

3. Install dependencies and run migrations + seed:

```bash
npm install
npx prisma migrate deploy
npm run db:seed
```

4. Start Next.js:

```bash
npm run dev
```

Open `http://localhost:3000/login` and choose **Niece** or **Tutor** (no passwords).

### After seeding

The database has two user rows (student + tutor) used only for “who is at the keyboard.” Login is **two buttons** on `/login`. Optional: set `SEED_STUDENT_EMAIL` / `SEED_TUTOR_EMAIL` if you ever need to change the internal unique emails (not shown in the UI).

## NAS deployment (Docker Compose) — step by step

This app is meant to run on a home NAS using **Docker Compose**: one **Postgres** service and one **Next.js** (`web`) service. The `web` image is built from this repo’s [`Dockerfile`](Dockerfile) (`output: "standalone"`). On every start, [`docker-entrypoint.sh`](docker-entrypoint.sh) runs **`prisma migrate deploy`**, then starts **`node server.js`** on port **3000** inside the container.

> **Important:** The bundled [`docker-compose.yml`](docker-compose.yml) configures Postgres with **`POSTGRES_HOST_AUTH_METHOD=trust`** (no password for user `postgres`) and publishes Postgres on **host port 5432**. That is **only appropriate on a trusted home LAN**. Do not expose Postgres (or plain HTTP for the app) to the internet without TLS, strong auth, and firewall rules.

### Postgres URL when there is no password

Prisma and the app read **`DATABASE_URL`**. If Postgres uses user **`postgres`** and **no password**, omit the password segment entirely:

```text
postgresql://postgres@HOST:5432/ged_tutoring?schema=public
```

Do **not** use `postgresql://postgres:@...` unless you intend an empty password; the canonical no-password form is **`postgres@`** right after `://`.

If you use **Docker Compose** from this repo, `web` is already wired to `postgresql://postgres@db:5432/ged_tutoring?schema=public`. For a **separate** Postgres instance on your NAS, set `DATABASE_URL` in `compose.env` (or your deployment UI) to your host and port, still without `:password`.

### 0) What you need on the NAS

- **Docker** and **Docker Compose v2** (plugin `docker compose`, not legacy `docker-compose`). Synology “Container Manager”, QNAP “Container Station”, TrueNAS SCALE, Unraid, etc. all map to this—use whatever UI runs Compose, or SSH and use the CLI.
- **Git** on the NAS *or* a way to copy the project folder onto the NAS (ZIP, SMB share, `rsync`, etc.).
- Enough disk for the **Postgres volume** (starts small; grows with usage).
- Optional but strongly recommended: a **reverse proxy** on the NAS (Caddy, Traefik, Nginx Proxy Manager) for **HTTPS** and custom hostnames.

### 1) Put the project on the NAS

**Option A — Git clone (recommended if you use Git on the NAS):**

```bash
cd /volume1/docker   # example path; use a folder you prefer
git clone <YOUR_REPO_URL> ged-tutoring
cd ged-tutoring
```

**Option B — Copy from your PC:** copy the whole project directory to a folder on the NAS (for example `\\NAS\docker\ged-tutoring` or `/volume1/docker/ged-tutoring`). Ensure hidden files are copied if your tool supports it (`.gitignore`, etc. are optional on the NAS; `.env` should be created on the NAS, not copied from an insecure channel).

You must have at least: `Dockerfile`, `docker-compose.yml`, `docker-entrypoint.sh`, `package.json`, `package-lock.json`, `prisma/`, `src/`, `public/`, `next.config.ts`, and the rest of the app source—**the same tree you would build from on your computer**.

### 2) Create secrets for Compose (do not commit these)

On the NAS, in the project folder, create a file **only you can read** (example name: `compose.env`). Docker Compose can load it with `--env-file`.

Example `compose.env` (adjust values):

```env
SESSION_SECRET=PASTE_A_LONG_RANDOM_STRING_AT_LEAST_32_CHARS
# Optional: only if Postgres is NOT the bundled `db` service (same no-password URL shape):
# DATABASE_URL=postgresql://postgres@192.168.1.50:5432/ged_tutoring?schema=public
```

Generate a secret (pick one approach):

- Linux/macOS: `openssl rand -base64 48`
- PowerShell: `[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))`

**Never** commit `compose.env` or any real `.env` to Git.

### 3) Review ports and database credentials

Open [`docker-compose.yml`](docker-compose.yml) and confirm:

- **`web` → `ports`**: `"3000:3000"` means the app is on **http://NAS_IP:3000** on your LAN unless you put a reverse proxy in front.
- **`db` → `ports`**: `"5432:5432"` publishes Postgres to the NAS LAN on **5432**. If that collides with another Postgres instance, change the **left** side only (host port), e.g. `"55432:5432"`.
- **Postgres auth:** the sample Compose file uses **trust / no password** for user `postgres`. If you switch to password auth, add `:PASSWORD` in `DATABASE_URL` and configure Postgres accordingly (`POSTGRES_PASSWORD`, `pg_hba.conf`, etc.).

### 4) Line endings for `docker-entrypoint.sh` (Windows users)

The entrypoint must run inside **Linux** containers. If you edited `docker-entrypoint.sh` on Windows and the container fails with `/bin/sh^M` or “bad interpreter”, convert to **LF** line endings (VS Code: bottom-right “CRLF” → “LF”, or `dos2unix docker-entrypoint.sh`) before building on the NAS.

### 5) Build and start the stack

From the project directory on the NAS:

```bash
docker compose --env-file compose.env up -d --build
```

What this does:

1. Pulls `postgres:16-alpine` if missing.
2. Builds the `web` image (multi-stage: `npm ci`, `prisma generate`, `next build`, copies standalone output).
3. Starts **`db`**, waits until it is **healthy** (`pg_isready`), then starts **`web`**.
4. On `web` startup, runs **`prisma migrate deploy`** against the `db` service, then **`node server.js`**.

**Check logs:**

```bash
docker compose logs -f web
```

You should see “Running database migrations…” then “Starting server…”, and the app should listen on **0.0.0.0:3000** inside the container.

**Check containers:**

```bash
docker compose ps
```

### 6) Seed the database (first time only)

The production **`web` image does not include the seed script toolchain** (`tsx` + dev files). The **first** time you bring up a fresh database, create users and curriculum by running the seed **from a machine with Node.js** (your PC is fine) while pointed at the NAS Postgres port.

1. Ensure the NAS firewall allows **TCP 5432** from **your PC only** (temporary rule), or use an SSH tunnel if you prefer not to expose Postgres.
2. On your PC, in a clone of the **same** project (same migrations/seed as what you deployed):

**Windows (PowerShell or cmd):**

```bash
cd ged-tutoring
npm install
set DATABASE_URL=postgresql://postgres@YOUR_NAS_IP:5432/ged_tutoring?schema=public
npx prisma migrate deploy
npm run db:seed
```

**macOS / Linux:**

```bash
cd ged-tutoring
npm install
export DATABASE_URL="postgresql://postgres@YOUR_NAS_IP:5432/ged_tutoring?schema=public"
npx prisma migrate deploy
npm run db:seed
```

Use the **same** host, port, database name, and user (and password, if any) as in the `DATABASE_URL` your `web` container uses.

3. Remove or narrow the firewall rule when finished.

After seeding, open **`http://YOUR_NAS_IP:3000/login`** and tap **Niece** or **Tutor**.

### 7) Put HTTPS and a friendly URL in front (recommended)

Do **not** rely on plain HTTP if the app is reachable outside your LAN.

Typical pattern:

1. Create a DNS name (for example `ged.yourdomain.com`) pointing to your home IP.
2. On the NAS, run **Caddy**, **Traefik**, or **Nginx Proxy Manager** as a reverse proxy.
3. Terminate TLS there and **reverse-proxy to** `http://127.0.0.1:3000` (or the Docker bridge address your NAS uses—often `http://localhost:3000` on the NAS host works if port 3000 is published).

Exact proxy config depends on your NAS OS and chosen product; follow that product’s guide for “reverse proxy to local HTTP backend”.

### 8) Updates when you change the app

On the NAS, in the project folder:

```bash
git pull   # if you use Git
docker compose --env-file compose.env up -d --build
```

`web` will rebuild and run migrations again on start. If a migration ever needs a manual step, handle it deliberately (back up first).

### 9) Backups

- **Database:** back up the Docker volume **`ged_pg_data`** (Compose-defined name). On many NAS systems you can include Docker volumes in scheduled backup jobs; otherwise use `docker run` with a Postgres dump (`pg_dump`) on a schedule.
- **Secrets:** keep a copy of `compose.env` (or equivalent) in a **password manager**, not only on disk.

### 10) Troubleshooting (short)

- **`web` exits right away / migrate errors:** read `docker compose logs web`. Common causes: DB not reachable, wrong `DATABASE_URL`, or migrations out of sync with the image you built.
- **Port 3000 or 5432 already in use:** change the **host** side of `ports:` in `docker-compose.yml`.
- **Login page shows an error about setup:** confirm you ran **`npm run db:seed`** against this database at least once.
- **Session issues after changing `SESSION_SECRET`:** everyone must sign in again; that is expected.
- **Switched Postgres from password to no-password (or changed `POSTGRES_HOST_AUTH_METHOD`):** the official Postgres image only applies auth settings on **first database init**. An existing `ged_pg_data` volume keeps the old cluster; to re-init you must remove the volume (this **wipes the database**) or adjust `pg_hba.conf` inside the volume manually.

## Security notes

- Never commit `.env`, `compose.env`, or real credentials to Git.
- Prefer **HTTPS** and **LAN-only** exposure for Postgres.
- Change default Postgres passwords if anything beyond trusted LAN can reach the NAS, or if you move off `trust` authentication.

</del>
