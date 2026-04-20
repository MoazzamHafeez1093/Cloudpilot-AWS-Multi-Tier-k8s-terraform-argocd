<div align="center">

<img src="docs/architecture.png" alt="CloudPilot Architecture" width="100%"/>

# ☁️ CloudPilot

**Production-Grade Multi-Tier Microservices — Deployed on AWS**

*Built from scratch. Every line of infrastructure is code. Every deployment is automatic.*

<br/>

[![CI Pipeline](https://github.com/MoazzamHafeez1093/Cloudpilot-AWS-Multi-Tier-k8s-terraform-argocd/actions/workflows/ci.yml/badge.svg)](https://github.com/MoazzamHafeez1093/Cloudpilot-AWS-Multi-Tier-k8s-terraform-argocd/actions/workflows/ci.yml)
![AWS](https://img.shields.io/badge/AWS-EC2%20%7C%20VPC%20%7C%20EIP-FF9900?style=flat&logo=amazonaws&logoColor=white)
![Kubernetes](https://img.shields.io/badge/Kubernetes-1.28-326CE5?style=flat&logo=kubernetes&logoColor=white)
![Terraform](https://img.shields.io/badge/Terraform-1.14-7B42BC?style=flat&logo=terraform&logoColor=white)
![Ansible](https://img.shields.io/badge/Ansible-Roles-EE0000?style=flat&logo=ansible&logoColor=white)
![ArgoCD](https://img.shields.io/badge/ArgoCD-v3.3-EF7B4D?style=flat&logo=argo&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED?style=flat&logo=docker&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat&logo=nodedotjs&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?style=flat&logo=githubactions&logoColor=white)

<br/>

> **Push code → 60 seconds → live on AWS. Automatically. Every time.**

</div>

---

## 📌 What Is CloudPilot?

CloudPilot is a **complete end-to-end DevOps project** — not a tutorial copy, not a mock deployment. Real application code, real AWS infrastructure, real CI/CD pipeline that fires on every commit.

It covers the **entire DevOps lifecycle**:

```
Write Code → Containerize → Provision Infrastructure → Configure Server
     → Orchestrate with Kubernetes → Automate CI → GitOps CD with ArgoCD
```

Everything is reproducible. Tear down the infra, run two commands, it's back up exactly as before.

---

## 🏗️ Architecture

<img src="docs/architecture.png" alt="CloudPilot AWS Architecture Diagram" width="100%"/>

<br/>

```
Internet
    │  HTTP :30000
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  AWS EC2  t3.medium  —  eu-north-1  —  Ubuntu 22.04             │
│  Elastic IP: 13.51.149.67                                        │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  microk8s Kubernetes Cluster                               │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────┐  :30000 NodePort     │  │
│  │  │         API Gateway             │◄── all traffic       │  │
│  │  └──────────────┬──────────────────┘                      │  │
│  │                 │ ClusterIP (internal only)                │  │
│  │    ┌────────────┼────────────┐                            │  │
│  │    ▼            ▼            ▼                            │  │
│  │  user        product    notification                      │  │
│  │  :4001        :4002        :4003                          │  │
│  │  SQLite       SQLite       SQLite + async queue           │  │
│  │  PVC          PVC          PVC                            │  │
│  │                                                           │  │
│  │  ArgoCD  :32080  ←  GitOps engine                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  VPC 10.0.0.0/16  →  Subnet 10.0.1.0/24  →  IGW  →  Route Table│
│  Security Group: ports 22, 80, 443, 8080, 30000-32767           │
│  Storage: gp3 EBS 20GB encrypted  +  PVCs per service           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 CI/CD Pipeline

<img src="docs/cicd-pipeline.png" alt="CloudPilot CI/CD Pipeline" width="100%"/>

<br/>

| Stage | Tool | What happens |
|-------|------|-------------|
| **Trigger** | GitHub | Push to `main` on `services/**` or `k8s/**` |
| **Build** | GitHub Actions | 4 Docker images built in parallel (matrix strategy) |
| **Push** | ghcr.io | Images tagged with git SHA and pushed to registry |
| **Update** | Kustomize | Image tags updated in `k8s/overlays/prod/` and committed |
| **Detect** | ArgoCD | Polls repo every 3 minutes, detects new commit |
| **Deploy** | Kubernetes | Rolling update — maxSurge: 1, maxUnavailable: 0 |

**Total time: ~60 seconds from push to live.**

---

## 🛠️ Tech Stack

| Layer | Technology | Detail |
|-------|-----------|--------|
| ☁️ **Cloud** | AWS EC2, VPC, EIP, SG, IAM | eu-north-1, t3.medium, encrypted EBS |
| 🏗️ **IaC** | Terraform 1.14 | 9 resources, tagged, state-managed |
| ⚙️ **Config** | Ansible 4 roles | common, hardening, microk8s, argocd |
| 🐳 **Containers** | Docker multi-stage | Non-root user, HEALTHCHECK, OCI labels |
| ☸️ **Orchestration** | microk8s 1.28 | dns, storage, ingress, registry addons |
| 🔁 **GitOps CD** | ArgoCD v3.3 | Auto-sync, selfHeal, prune enabled |
| ⚡ **CI** | GitHub Actions | Matrix builds, layer caching |
| 📦 **Registry** | ghcr.io | Free, repo-scoped, SHA-tagged images |
| 🟢 **Runtime** | Node.js + Express | 4 independent microservices |
| 🗄️ **Database** | SQLite per service | PersistentVolumeClaims, no shared DB |
| ✅ **Validation** | Zod | Runtime type safety on all inputs |
| 🔐 **Auth** | JWT + bcrypt | Stateless, 12-round hashing |

---

## 📦 Microservices

<details>
<summary><b>🔀 API Gateway — port 3000 (the only public service)</b></summary>

<br/>

Single entry point. Nothing reaches the backend directly.

- Rate limiting: 100 requests / 15 min / IP
- Security headers via helmet
- Proxies by path to downstream ClusterIP services
- `http-proxy-middleware v2` — pinned deliberately (v3 broke pathRewrite)
- Health check at `/health` for Kubernetes liveness probe

</details>

<details>
<summary><b>👤 User Service — port 4001</b></summary>

<br/>

Full authentication system.

- `POST /users/register` — Zod validation, bcrypt 12 rounds, duplicate detection
- `POST /users/login` — timing-attack resistant, JWT 24h expiry
- `GET  /users/me` — JWT-protected
- `GET  /users` — admin-only role check
- SQLite on PersistentVolumeClaim — data survives pod restarts

</details>

<details>
<summary><b>📦 Product Service — port 4002</b></summary>

<br/>

Full product catalogue.

- `GET  /products` — pagination, search, category filter
- `POST /products` — create with validation
- `PUT  /products/:id` — partial update (PATCH-style)
- `DELETE /products/:id` — with existence check
- Parameterized queries throughout — SQL injection proof
- Pre-seeded categories: Electronics, Books, Clothing, General

</details>

<details>
<summary><b>📬 Notification Service — port 4003</b></summary>

<br/>

Async dispatch with production-grade reliability.

- `202 Accepted` immediately — never blocks caller
- SQLite queue: `pending → processing → sent / failed`
- Auto-retry up to 3 attempts
- `POST /notifications/:id/retry` — manual retry endpoint
- SMTP via nodemailer — configurable via Kubernetes Secret

</details>

---

## 📁 Project Structure

```
Cloudpilot-AWS-Multi-Tier-k8s-terraform-argocd/
│
├── 🐳 services/
│   ├── api-gateway/            # Rate limiting, proxy, security headers
│   ├── user-service/           # JWT auth, bcrypt, SQLite
│   ├── product-service/        # CRUD, pagination, search
│   └── notification-service/   # Async email queue, retry logic
│   └── */Dockerfile            # Multi-stage, non-root, HEALTHCHECK, OCI labels
│
├── ☸️ k8s/
│   ├── base/
│   │   ├── */deployment.yaml   # Resources, liveness/readiness probes, imagePullSecrets
│   │   ├── */service.yaml      # ClusterIP internal / NodePort for gateway
│   │   ├── */configmap.yaml    # Non-sensitive env vars
│   │   ├── */secret.yaml       # JWT secret, SMTP credentials
│   │   ├── */pvc.yaml          # Persistent storage per data service
│   │   ├── ingress/            # Nginx ingress routing
│   │   └── kustomization.yaml  # Ties all resources together
│   └── overlays/
│       ├── prod/               # ← ArgoCD watches this path
│       └── dev/
│
├── 🏗️ infra/
│   ├── terraform/
│   │   ├── main.tf             # VPC, EC2, SG, EIP, IAM, auto-inventory
│   │   ├── variables.tf        # Region, instance type, CIDRs, key paths
│   │   ├── outputs.tf          # IP, SSH command, app URL, ArgoCD URL
│   │   └── inventory.tpl       # Auto-generates Ansible hosts.ini
│   └── ansible/
│       ├── playbooks/site.yml  # Master playbook — runs all 4 roles
│       └── roles/
│           ├── common/         # apt packages, swap 2GB, timezone
│           ├── hardening/      # fail2ban, sshd hardening, auto-updates
│           ├── microk8s/       # snap install, addons: dns storage ingress registry
│           └── argocd/         # install, NodePort patch, AppProject, Application
│
├── 🔁 argocd/
│   ├── application.yaml        # Repo, path, auto-sync, selfHeal, prune
│   ├── project.yaml            # AppProject RBAC — source repos, destinations
│   └── notifications.yaml      # Deploy/fail/degrade alerts
│
├── ⚙️ .github/workflows/
│   ├── ci.yml                  # Matrix build → push → kustomize update → commit
│   ├── pr-check.yml            # kubeval + kustomize build on every PR
│   └── destroy.yml             # Manual teardown with DESTROY confirmation gate
│
├── docker-compose.yml          # Full local dev stack with healthcheck depends_on
└── .env.example                # All required env vars documented
```

---

## 🖥️ Live Proof

### All pods running on AWS

<img src="docs/pods-running.png" alt="All pods running" width="100%"/>

### ArgoCD — Synced and Healthy

<img src="docs/argocd-app-tree.png" alt="ArgoCD resource tree" width="100%"/>

### GitHub Actions — CI Green

<img src="docs/github-actions-green.png" alt="GitHub Actions green" width="100%"/>

### AWS EC2 — Running

<img src="docs/aws-ec2-running.png" alt="AWS EC2 running" width="100%"/>

### Terraform Tags — Infrastructure as Code proof

<img src="docs/terraform-tags.png" alt="Terraform tags on EC2" width="100%"/>

### Ansible — Server configuration proof

<img src="docs/ansible-server-config.png" alt="Ansible configured server" width="100%"/>

---

## 🚀 Running Locally

```bash
# Clone
git clone https://github.com/MoazzamHafeez1093/Cloudpilot-AWS-Multi-Tier-k8s-terraform-argocd.git
cd Cloudpilot-AWS-Multi-Tier-k8s-terraform-argocd

# Configure environment
cp .env.example .env

# Start all 4 services + gateway
docker compose up --build

# Verify
curl http://localhost:3000/health
```

All traffic goes through the gateway at `:3000`. Individual services are not exposed.

---

## ☁️ Deploying to AWS

### Prerequisites

```
✅ AWS account + CLI configured (aws configure)
✅ Terraform >= 1.6
✅ Ansible (Linux or WSL on Windows)
✅ SSH key at ~/.ssh/cloudpilot-key.pem
✅ GitHub PAT with write:packages scope
```

### Step 1 — Provision with Terraform

```bash
cd infra/terraform
terraform init
terraform plan
terraform apply
```

Output after apply:
```
instance_public_ip = "x.x.x.x"
app_url            = "http://x.x.x.x:30000"
argocd_url         = "http://x.x.x.x:32080"
ssh_command        = "ssh -i ~/.ssh/cloudpilot-key.pem ubuntu@x.x.x.x"
```

Ansible inventory is **auto-generated** from Terraform output. No manual IP entry.

### Step 2 — Configure with Ansible

```bash
cd infra/ansible
ansible-playbook playbooks/site.yml -i inventory/hosts.ini
```

One command installs and configures everything:
- System packages, 2GB swap, UTC timezone
- SSH hardening, fail2ban, unattended upgrades
- microk8s with dns, storage, ingress, registry addons
- ArgoCD — deployed and immediately syncing from GitHub

### Step 3 — Image Pull Secret

```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_PAT \
  -n default
```

### Step 4 — Access

| Service | URL |
|---------|-----|
| API | `http://EC2_IP:30000` |
| ArgoCD | `http://EC2_IP:32080` — admin / (see below) |

```bash
# Get ArgoCD password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

### Teardown — Stop Billing

```bash
cd infra/terraform
terraform destroy
```

Or from GitHub: Actions → **Destroy — Tear Down AWS Infrastructure** → type `DESTROY`

---

## 📡 API Reference

```bash
# Health check
GET http://EC2_IP:30000/health
→ {"status":"healthy","service":"api-gateway","uptime":338}

# Register
POST http://EC2_IP:30000/api/users/register
{"name":"John","email":"john@example.com","password":"password123"}
→ {"message":"User created successfully","user":{...}}

# Login
POST http://EC2_IP:30000/api/users/login
{"email":"john@example.com","password":"password123"}
→ {"token":"eyJhbGci...","user":{...}}

# Create product
POST http://EC2_IP:30000/api/products
{"name":"MacBook Pro","price":2499.99,"category":"electronics","stock":5}
→ {"message":"Product created","product":{...}}

# List products (with search + pagination)
GET http://EC2_IP:30000/api/products?category=electronics&page=1&limit=10
GET http://EC2_IP:30000/api/products?search=macbook

# Send notification (async)
POST http://EC2_IP:30000/api/notifications/send
{"type":"email","recipient":"user@example.com","subject":"Hi","body":"Welcome!"}
→ {"message":"Notification queued","id":1}
```

---

## 🔒 Security

| Area | Implementation |
|------|---------------|
| Containers | Non-root user (`appuser`), multi-stage builds, no build tools in final image |
| Network | Internal services on ClusterIP — unreachable from internet directly |
| Rate limiting | 100 req / 15 min / IP at gateway |
| Database | Parameterized queries only — zero string concatenation |
| Auth | JWT 24h expiry, bcrypt 12 rounds, timing-attack resistant login |
| Server | Root login disabled, password auth disabled, fail2ban active |
| Storage | EBS encrypted at rest, Kubernetes Secrets for credentials |
| CI/CD | Secrets in GitHub Secrets — never in code or ConfigMaps |

---

## ⚠️ Real Challenges Solved

### 1 — http-proxy-middleware v3 broke everything
v3 silently changed the `pathRewrite` behavior. Requests arrived at services with wrong paths. Debugged by reading proxy logs, identified version as root cause. **Fix: pinned to `^2.0.6`.**

### 2 — Kustomize namePrefix broke service discovery
The prod overlay adds `prod-` prefix to all resource names. The gateway ConfigMap still pointed to `http://user-service:4001`. DNS resolution failed silently — returned 504. **Fix: updated URLs to `http://prod-user-service:4001`.**

### 3 — Private ghcr.io images — ImagePullBackOff
Kubernetes had no credentials to pull from the private registry. **Fix: created `docker-registry` Secret and added `imagePullSecrets` to all Deployments.**

### 4 — npm ci required package-lock.json
`npm ci` is stricter than `npm install` — requires a lockfile. Docker build failed. **Fix: committed `package-lock.json` for all 4 services.**

### 5 — Ansible roles not found on Windows filesystem
WSL treats the Windows mount as world-writable — ignores `ansible.cfg`. Roles path wasn't resolved. **Fix: copied project to WSL home, added `roles_path = ./roles` to cfg.**

---

## 📊 By The Numbers

| What | Count |
|------|-------|
| Microservices | 4 |
| Dockerfiles (multi-stage) | 4 |
| Kubernetes YAML files | 21 |
| Terraform resources | 9 |
| Ansible roles | 4 |
| GitHub Actions workflows | 3 |
| AWS resources provisioned | 9 (VPC, Subnet, IGW, RT, SG, EC2, EIP, IAM Role, IAM Profile) |
| Lines of application code | ~2,500 |
| Push to live | ~60 seconds |

---

## 👤 Author

**Moazzam Hafeez**
BS Computer Science — FAST NUCES Islamabad
Cloud & DevOps Engineering

[![GitHub](https://img.shields.io/badge/GitHub-MoazzamHafeez1093-181717?style=flat&logo=github)](https://github.com/MoazzamHafeez1093)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat&logo=linkedin)](https://linkedin.com/in/yourlinkedin)

---

<div align="center">

*Built with persistence. Debugged with patience. Deployed with pride.*

</div>