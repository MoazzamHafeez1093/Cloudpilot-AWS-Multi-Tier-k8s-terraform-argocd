<div align="center">

# 🚀 CloudPilot

### Production-Grade Microservices on AWS — Built From Scratch

*A complete DevOps portfolio project demonstrating end-to-end cloud infrastructure,*
*containerization, Kubernetes orchestration, and GitOps CI/CD automation.*

[![CI — Build, Push, Update Manifests](https://github.com/MoazzamHafeez1093/Cloudpilot-AWS-Multi-Tier-k8s-terraform-argocd/actions/workflows/ci.yml/badge.svg)](https://github.com/MoazzamHafeez1093/Cloudpilot-AWS-Multi-Tier-k8s-terraform-argocd/actions/workflows/ci.yml)
![AWS](https://img.shields.io/badge/AWS-EC2-FF9900?logo=amazonaws)
![Kubernetes](https://img.shields.io/badge/Kubernetes-1.28-326CE5?logo=kubernetes)
![Terraform](https://img.shields.io/badge/Terraform-1.14-7B42BC?logo=terraform)
![ArgoCD](https://img.shields.io/badge/ArgoCD-v3.3-EF7B4D?logo=argo)
![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED?logo=docker)

</div>

---

## 📖 What Is This?

CloudPilot is a **fully functional microservices application** deployed on real AWS infrastructure — not a tutorial, not a demo with mock data. Every piece of this project is production-grade: the code runs, the infrastructure is live, the CI/CD pipeline fires on every commit, and ArgoCD automatically deploys changes without any manual intervention.

This project was built to demonstrate the complete DevOps lifecycle — from writing application code to provisioning cloud infrastructure to automating deployments — the way it's actually done in the industry.

**If you push a code change, within 60 seconds it's running on AWS. That's what this project proves.**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
└─────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              AWS EC2  (eu-north-1 / t3.medium)               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           microk8s Kubernetes Cluster                │    │
│  │                                                      │    │
│  │   ┌──────────────────┐  :30000 (public NodePort)    │    │
│  │   │   API Gateway    │◄──── all external traffic    │    │
│  │   └────────┬─────────┘                              │    │
│  │            │ proxies to                              │    │
│  │   ┌────────▼──────────────────────────────────┐     │    │
│  │   │          Internal ClusterIP Services       │     │    │
│  │   │                                            │     │    │
│  │   │  ┌──────────────┐  ┌──────────────────┐   │     │    │
│  │   │  │ user-service │  │ product-service  │   │     │    │
│  │   │  │    :4001     │  │     :4002        │   │     │    │
│  │   │  │  SQLite DB   │  │   SQLite DB      │   │     │    │
│  │   │  └──────────────┘  └──────────────────┘   │     │    │
│  │   │                                            │     │    │
│  │   │  ┌─────────────────────┐                  │     │    │
│  │   │  │ notification-service│                  │     │    │
│  │   │  │       :4003         │                  │     │    │
│  │   │  │  Async email queue  │                  │     │    │
│  │   │  └─────────────────────┘                  │     │    │
│  │   └────────────────────────────────────────────┘    │    │
│  │                                                      │    │
│  │   ┌──────────────────┐  :32080 (ArgoCD UI)          │    │
│  │   │      ArgoCD      │◄──── GitOps engine           │    │
│  │   └──────────────────┘                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Networking: VPC → Public Subnet → IGW → Route Table        │
│  Security:   SG (ports 22, 80, 443, 8080, 30000-32767)      │
│  Storage:    gp3 EBS (20GB encrypted) + PVCs per service     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 CI/CD Pipeline

Every push to `main` triggers this fully automated flow:

```
Developer pushes code
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│                    GitHub Actions                          │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Build        │  │ Build        │  │ Build          │  │
│  │ api-gateway  │  │ user-service │  │ product-service│  │
│  │ image        │  │ image        │  │ image          │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘  │
│         │    (parallel)   │                   │           │
│         └────────────────►├◄──────────────────┘           │
│                           │                               │
│                    ┌──────▼────────┐                      │
│                    │ Push all 4    │                      │
│                    │ images to     │                      │
│                    │ ghcr.io with  │                      │
│                    │ git SHA tag   │                      │
│                    └──────┬────────┘                      │
│                           │                               │
│                    ┌──────▼────────┐                      │
│                    │ Update image  │                      │
│                    │ tags in       │                      │
│                    │ kustomization │                      │
│                    │ .yaml + commit│                      │
│                    └──────┬────────┘                      │
└───────────────────────────┼───────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  ArgoCD detects change  │
              │  in k8s/overlays/prod/  │
              └────────────┬────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │  Rolling deployment     │
              │  Zero downtime          │
              │  Self-healing enabled   │
              └─────────────────────────┘
```

**Total time from push to live: ~60 seconds.**

---

## 🛠️ Tech Stack

| Category | Technology | Why |
|----------|-----------|-----|
| **Cloud** | AWS EC2, VPC, EIP, SG | Industry standard, real infrastructure |
| **IaC** | Terraform 1.14 | Declarative, reproducible infrastructure |
| **Config Mgmt** | Ansible | Idempotent server configuration |
| **Containers** | Docker (multi-stage) | Lean images, non-root user, HEALTHCHECK |
| **Orchestration** | Kubernetes (microk8s 1.28) | Self-healing, rolling updates, scaling |
| **GitOps CD** | ArgoCD v3.3 | Repo is the single source of truth |
| **CI** | GitHub Actions | Matrix builds, layer caching, free |
| **Registry** | GitHub Container Registry | Free, integrated with repo |
| **Runtime** | Node.js + Express | Fast, lightweight, familiar |
| **Database** | SQLite per service | No external DB needed, persistent volumes |
| **Validation** | Zod | Runtime type safety on all inputs |
| **Auth** | JWT + bcrypt | Stateless auth, 12-round hashing |

---

## 📦 Services

### 🔀 API Gateway (port 3000)
The only public-facing service. All external traffic enters here.

- Rate limiting: 100 requests per 15 minutes per IP
- Proxies to all downstream services by path
- Health check endpoint for Kubernetes liveness probes
- Uses `http-proxy-middleware v2` (v3 broke pathRewrite — pinned deliberately)

### 👤 User Service (port 4001)
Handles all authentication and user management.

- `POST /users/register` — bcrypt hashing, Zod validation, duplicate email detection
- `POST /users/login` — timing-attack resistant comparison, JWT issuance (24h expiry)
- `GET  /users/me` — JWT-protected, returns current user
- `GET  /users` — admin-only endpoint

### 📦 Product Service (port 4002)
Full product catalogue with real-world features.

- Paginated listing with search and category filtering
- Partial updates (PATCH-style PUT)
- Parameterized queries throughout — SQL injection proof
- Pre-seeded categories: Electronics, Books, Clothing, General

### 📬 Notification Service (port 4003)
Async email dispatch with production-grade reliability.

- `202 Accepted` response — never makes callers wait
- SQLite-backed queue with status tracking: `pending → processing → sent/failed`
- Automatic retry up to 3 attempts with exponential backoff
- Manual retry endpoint: `POST /notifications/:id/retry`
- SMTP via nodemailer (configurable via env vars)

---

## 📁 Project Structure

```
Cloudpilot-AWS-Multi-Tier-k8s-terraform-argocd/
│
├── 🐳 services/
│   ├── api-gateway/
│   │   ├── server.js           # Rate limiting, proxy middleware
│   │   ├── Dockerfile          # Multi-stage, non-root, HEALTHCHECK
│   │   └── package.json        # http-proxy-middleware pinned to v2
│   ├── user-service/
│   │   ├── server.js           # JWT, bcrypt, SQLite
│   │   └── Dockerfile
│   ├── product-service/
│   │   ├── server.js           # CRUD, pagination, search
│   │   └── Dockerfile
│   └── notification-service/
│       ├── server.js           # Async queue, retry logic
│       └── Dockerfile
│
├── ☸️  k8s/
│   ├── base/
│   │   ├── api-gateway/        # Deployment, Service, ConfigMap
│   │   ├── user-service/       # Deployment, Service, ConfigMap, Secret, PVC
│   │   ├── product-service/    # Deployment, Service, ConfigMap, PVC
│   │   ├── notification-service/ # Deployment, Service, ConfigMap, Secret, PVC
│   │   ├── ingress/            # Nginx ingress routing
│   │   └── kustomization.yaml  # Ties everything together
│   └── overlays/
│       ├── prod/               # ← ArgoCD watches this
│       └── dev/
│
├── 🏗️  infra/
│   ├── terraform/
│   │   ├── main.tf             # VPC, EC2, SG, EIP, IAM
│   │   ├── variables.tf        # All configurable inputs
│   │   ├── outputs.tf          # IP, SSH command, app URLs
│   │   └── inventory.tpl       # Auto-generates Ansible inventory
│   └── ansible/
│       ├── playbooks/site.yml  # Master playbook
│       └── roles/
│           ├── common/         # Packages, swap, timezone
│           ├── hardening/      # fail2ban, sshd config, auto-updates
│           ├── microk8s/       # K8s install + addons
│           └── argocd/         # ArgoCD install + app deployment
│
├── 🔁 argocd/
│   ├── application.yaml        # App definition — repo, path, sync policy
│   ├── project.yaml            # AppProject — RBAC scoping
│   └── notifications.yaml      # Slack/webhook alerts on deploy
│
├── ⚙️  .github/workflows/
│   ├── ci.yml                  # Build → Push → Update manifests
│   ├── pr-check.yml            # Validate YAML on PRs
│   └── destroy.yml             # Manual AWS teardown
│
├── docker-compose.yml          # Full local dev stack
└── .env.example                # Environment variable template
```

---

## 🚀 Running Locally

```bash
# 1. Clone the repo
git clone https://github.com/MoazzamHafeez1093/Cloudpilot-AWS-Multi-Tier-k8s-terraform-argocd.git
cd Cloudpilot-AWS-Multi-Tier-k8s-terraform-argocd

# 2. Set up environment
cp .env.example .env
# Edit .env with your values

# 3. Start everything
docker compose up --build

# 4. Test it works
curl http://localhost:3000/health
```

Services will be available at:
- API Gateway: `http://localhost:3000`
- All routes go through the gateway — individual services are not exposed

---

## ☁️ Deploying to AWS

### Prerequisites
- AWS account (free tier works for testing)
- AWS CLI configured: `aws configure`
- Terraform >= 1.6 installed
- Ansible installed (Linux/WSL)
- SSH key pair in `~/.ssh/cloudpilot-key.pem`

### Step 1 — Provision Infrastructure

```bash
cd infra/terraform
terraform init
terraform plan    # Review what will be created
terraform apply   # Creates VPC, EC2, SG, EIP — ~90 seconds
```

Terraform outputs:
```
instance_public_ip = "x.x.x.x"
app_url            = "http://x.x.x.x:30000"
argocd_url         = "http://x.x.x.x:32080"
ssh_command        = "ssh -i ~/.ssh/cloudpilot-key.pem ubuntu@x.x.x.x"
```

The Ansible inventory is **auto-generated** from Terraform output — no manual IP entry needed.

### Step 2 — Configure Server

```bash
cd infra/ansible
ansible-playbook playbooks/site.yml -i inventory/hosts.ini
```

This single command:
- Installs all system packages and configures swap
- Hardens SSH (disables root login, password auth)
- Installs and configures microk8s with dns, storage, ingress addons
- Installs ArgoCD and applies the Application manifest
- ArgoCD immediately begins syncing from the GitHub repo

Takes approximately 5-10 minutes.

### Step 3 — Create Image Pull Secret

```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_PAT \
  -n default
```

### Step 4 — Access the Application

| What | URL | Notes |
|------|-----|-------|
| API | `http://EC2_IP:30000` | All endpoints |
| ArgoCD | `http://EC2_IP:32080` | Username: `admin` |

Get ArgoCD admin password:
```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

### Destroying Infrastructure (Stop Billing)

**Option A — GitHub Actions (recommended):**
Go to repo → Actions → **Destroy — Tear Down AWS Infrastructure** → Run workflow → type `DESTROY`

**Option B — Local:**
```bash
cd infra/terraform
terraform destroy
```

---

## 📡 API Reference

### Health Check
```bash
GET http://EC2_IP:30000/health

# Response
{"status":"healthy","service":"api-gateway","version":"1.0.0","uptime":338}
```

### Register User
```bash
POST http://EC2_IP:30000/api/users/register
Content-Type: application/json

{"name":"John Doe","email":"john@example.com","password":"securepassword"}

# Response
{"message":"User created successfully","user":{"id":1,"name":"John Doe","email":"john@example.com","role":"user"}}
```

### Login
```bash
POST http://EC2_IP:30000/api/users/login
Content-Type: application/json

{"email":"john@example.com","password":"securepassword"}

# Response
{"token":"eyJhbGci...","user":{"id":1,"name":"John Doe","role":"user"}}
```

### Create Product
```bash
POST http://EC2_IP:30000/api/products
Content-Type: application/json

{"name":"MacBook Pro","price":2499.99,"category":"electronics","stock":5}

# Response
{"message":"Product created","product":{"id":1,"name":"MacBook Pro","price":2499.99}}
```

### Get Products (with search + pagination)
```bash
GET http://EC2_IP:30000/api/products?category=electronics&page=1&limit=10

GET http://EC2_IP:30000/api/products?search=laptop
```

### Send Notification
```bash
POST http://EC2_IP:30000/api/notifications/send
Content-Type: application/json

{"type":"email","recipient":"user@example.com","subject":"Welcome","body":"CloudPilot works!"}

# Response (immediate — async processing)
{"message":"Notification queued","id":1}
```

---

## 🔒 Security Highlights

- **Non-root containers** — every Dockerfile creates a dedicated `appuser` and drops privileges
- **Multi-stage builds** — no build tools in final images, minimal attack surface
- **ClusterIP for internal services** — user/product/notification services unreachable from internet
- **Rate limiting** at gateway — 100 req/15min per IP
- **Parameterized SQL** — zero string concatenation in any query
- **JWT with expiry** — 24-hour tokens, stateless verification
- **bcrypt 12 rounds** — resistant to brute force
- **Timing-attack resistant login** — always runs bcrypt.compare even when user doesn't exist
- **SSH hardening** — root login disabled, password auth disabled, fail2ban installed
- **Encrypted EBS** — root volume encrypted at rest
- **Secrets management** — JWT secret and SMTP credentials in Kubernetes Secrets, never in ConfigMaps or code

---

## ⚠️ Challenges Faced & How They Were Solved

### 1. http-proxy-middleware v3 broke pathRewrite
**Problem:** After installing the latest version, all proxied requests were arriving at downstream services with incorrect paths (`/register` instead of `/users/register`).

**Root cause:** v3 completely changed the `pathRewrite` API and error handler syntax.

**Fix:** Pinned to `^2.0.6` in `package.json`. Documented the reason in comments.

**Lesson:** Never blindly install the latest version of a library in production code.

---

### 2. Kubernetes service names prefixed by Kustomize
**Problem:** After ArgoCD deployed the app, all pods were in `ImagePullBackOff` then when fixed, the gateway couldn't reach services. Error: `504 Gateway Timeout`.

**Root cause:** The Kustomize prod overlay adds `namePrefix: prod-` to all resources. So `user-service` becomes `prod-user-service`. The ConfigMap still pointed to `http://user-service:4001`.

**Fix:** Updated ConfigMap URLs to use the `prod-` prefix. Now a permanent fix in the manifests.

**Lesson:** Always verify actual resource names in the cluster match what your app expects.

---

### 3. Private ghcr.io images couldn't be pulled by Kubernetes
**Problem:** All pods stuck in `ImagePullBackOff`. The cluster had no credentials to pull from ghcr.io.

**Root cause:** GitHub Container Registry packages were set to Private by default.

**Fix:** Created a `docker-registry` Secret with GitHub PAT credentials and patched all Deployments to reference it via `imagePullSecrets`.

**Lesson:** Either make images public or pre-create pull secrets before ArgoCD syncs.

---

### 4. npm ci failing in Docker build — missing package-lock.json
**Problem:** `npm ci` requires a `package-lock.json` but we only had `package.json` committed.

**Root cause:** `npm ci` is stricter than `npm install` — it requires a lockfile for reproducible builds.

**Fix:** Ran `npm install` locally first to generate the lockfile, then committed it.

**Lesson:** Always commit `package-lock.json`. It ensures every build produces identical dependency trees.

---

### 5. Ansible roles path not found
**Problem:** `ansible-playbook` couldn't find roles when run from inside the project directory.

**Root cause:** Ansible looks for roles relative to the playbook file location, and the Windows filesystem mount point was treated as "world writable" causing ansible.cfg to be ignored.

**Fix:** Copied the ansible directory to WSL home, added explicit `roles_path = ./roles` to `ansible.cfg`.

**Lesson:** Run Ansible from a Linux-native path, not a Windows mount.

---

## 📊 Project Stats

| Metric | Value |
|--------|-------|
| Total files | 60+ |
| Lines of code | ~2,500 |
| Docker images | 4 |
| Kubernetes manifests | 21 |
| Terraform resources | 9 |
| Ansible roles | 4 |
| GitHub Actions workflows | 3 |
| AWS resources provisioned | VPC, Subnet, IGW, Route Table, SG, EC2, EIP, IAM Role |
| Time from push to live | ~60 seconds |

---

## 👤 Author

**Moazzam Hafeez**
BS Computer Science — FAST NUCES Islamabad (Final Semester)
Focused on Cloud & DevOps Engineering

[![GitHub](https://img.shields.io/badge/GitHub-MoazzamHafeez1093-181717?logo=github)](https://github.com/MoazzamHafeez1093)

---

<div align="center">

*Built with persistence, debugged with patience, deployed with pride.*

</div>