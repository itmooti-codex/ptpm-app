# App Deployment Procedure — Cloudflare Tunnel + Docker + GitHub Actions

## Overview

This is the standard procedure for deploying any new web app to a public URL using the itmooti infrastructure. Learned from deploying `n8n.awesomate.ai` (Feb 2026).

## Infrastructure Summary

| Component | Details |
|-----------|---------|
| **Deploy server** | Public IP: `15.204.34.114`, Private IP: `10.65.65.15` |
| **SSH access** | User: `admin`, Key: `~/.ssh/id_ed25519` |
| **Deploy path** | `/srv/projects/<app-name>/` |
| **GitHub org** | `itmooti` |
| **Cloudflare Account ID** | `87b9a19e13a4483ff4af7dc002733763` |
| **Cloudflare Zone (awesomate.ai)** | `2d016639a8eccda2d6a9259ded9a7a21` |
| **Cloudflare API Token** | `VKxcyQ6ddPJLZ7lBboGCVfPpA1OIk-tMUAsmBjjc` |
| **GH PAT** | Get from `gh auth token` (gho_ OAuth token, works for git clone) |

## Cloudflare API Token Permissions

The Cloudflare API token requires these permissions:
- **Account** > Cloudflare Tunnel: Edit
- **Zone** > DNS: Edit
- **Zone** > Zone: Read

The token is scoped to specific zones (domains). **When deploying to a new domain** (not `awesomate.ai`):
1. Go to Cloudflare dashboard > **My Profile** > **API Tokens**
2. Edit the token
3. Under **Zone Resources**, add the new domain
4. Save — otherwise tunnel creation or DNS record creation will return 403 Forbidden

To look up the Zone ID for another domain:
```python
import urllib.request, json

url = 'https://api.cloudflare.com/client/v4/zones?name=<domain.com>'
token = 'VKxcyQ6ddPJLZ7lBboGCVfPpA1OIk-tMUAsmBjjc'

req = urllib.request.Request(url)
req.add_header('Authorization', f'Bearer {token}')
resp = urllib.request.urlopen(req)
result = json.loads(resp.read())
print(result['result'][0]['id'])  # Zone ID
```

## Critical Lesson: Use Per-App Tunnels, NOT Shared Tunnel

There is a shared Cloudflare Tunnel `vitalstats-kc1` (ID: `3c5b5989-7ed0-4ec1-bb2f-2d94ee1e1e2d`) running inside a **Kubernetes cluster**. It handles `*.awesomate.ai`, `*.vitalstats.app`, etc. via K8s services.

**DO NOT add app-specific ingress rules to this shared tunnel.** The K8s cluster cannot reach the deploy server (`15.204.34.114` / `10.65.65.15`) — this results in 502 Bad Gateway errors.

**Instead, each app gets its own dedicated Cloudflare Tunnel** running as a Docker container alongside the app (pattern used by `thc-portal`, `phyx-nurse-admin`, `bb-dashboard`, `n8n-onboarding`).

## Step-by-Step Procedure

### Prerequisites
- App has: `Dockerfile`, `docker-compose.yml`, `nginx.conf`, `.github/workflows/deploy.yml`
- Know the target subdomain (e.g., `n8n.awesomate.ai`)
- Know the port assignment (check `PORT-REGISTRY.md` or existing containers)
- Cloudflare API token has permissions for the target domain (see above)

### Step 1: Create Dedicated Cloudflare Tunnel

```python
# Use Python to avoid curl shell escaping issues
import urllib.request, json

url = 'https://api.cloudflare.com/client/v4/accounts/87b9a19e13a4483ff4af7dc002733763/cfd_tunnel'
token = 'VKxcyQ6ddPJLZ7lBboGCVfPpA1OIk-tMUAsmBjjc'

data = json.dumps({'name': '<app-name>', 'config_src': 'cloudflare'}).encode()
req = urllib.request.Request(url, data=data, method='POST')
req.add_header('Authorization', f'Bearer {token}')
req.add_header('Content-Type', 'application/json')

resp = urllib.request.urlopen(req)
result = json.loads(resp.read())
tunnel = result['result']
# SAVE: tunnel['id'] and tunnel['token']
```

### Step 2: Configure Tunnel Ingress

The service should be `http://app:80` — this is the Docker Compose service name, reachable within the Docker network.

```python
tunnel_id = '<tunnel-id-from-step-1>'
url = f'https://api.cloudflare.com/client/v4/accounts/87b9a19e13a4483ff4af7dc002733763/cfd_tunnel/{tunnel_id}/configurations'

config = {
  'config': {
    'ingress': [
      {'service': 'http://app:80', 'hostname': '<subdomain>.awesomate.ai', 'originRequest': {}},
      {'service': 'http_status:404', 'originRequest': {}}
    ]
  }
}

data = json.dumps(config).encode()
req = urllib.request.Request(url, data=data, method='PUT')
req.add_header('Authorization', f'Bearer {token}')
req.add_header('Content-Type', 'application/json')
resp = urllib.request.urlopen(req)
```

### Step 3: Create DNS CNAME Record

```python
zone_id = '2d016639a8eccda2d6a9259ded9a7a21'  # awesomate.ai — change for other domains
url = f'https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records'

data = json.dumps({
    'type': 'CNAME',
    'name': '<subdomain>',  # just the subdomain part, e.g. 'n8n'
    'content': f'{tunnel_id}.cfargotunnel.com',
    'proxied': True,
    'ttl': 1
}).encode()

req = urllib.request.Request(url, data=data, method='POST')
req.add_header('Authorization', f'Bearer {token}')
req.add_header('Content-Type', 'application/json')
resp = urllib.request.urlopen(req)
```

**Note:** The wildcard `*.awesomate.ai` CNAME already exists pointing to the shared K8s tunnel. The specific CNAME record takes priority over the wildcard for proxied records.

### Step 4: Add Tunnel to docker-compose.yml

```yaml
  tunnel:
    image: cloudflare/cloudflared:latest
    command: tunnel run --token ${CLOUDFLARE_TUNNEL_TOKEN}
    restart: unless-stopped
    depends_on:
      - app
```

### Step 5: Update deploy.yml .env Section

Add `CLOUDFLARE_TUNNEL_TOKEN` to the printf block:

```yaml
            printf '%s\n' \
              "VITE_VITALSYNC_API_KEY=${{ secrets.VITE_VITALSYNC_API_KEY }}" \
              "VITE_VITALSYNC_SLUG=${{ secrets.VITE_VITALSYNC_SLUG }}" \
              "CLOUDFLARE_TUNNEL_TOKEN=${{ secrets.CLOUDFLARE_TUNNEL_TOKEN }}" \
              > .env
```

Also ensure `workflow_dispatch:` is in the `on:` triggers for manual deploys:

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
```

### Step 6: Set GitHub Repository Secrets

Use `gh secret set` for each:

| Secret | Value | Source |
|--------|-------|--------|
| `SERVER_HOST` | `15.204.34.114` | Public IP of deploy server |
| `SERVER_USER` | `admin` | SSH username |
| `SSH_PRIVATE_KEY` | Contents of `~/.ssh/id_ed25519` | `gh secret set SSH_PRIVATE_KEY < ~/.ssh/id_ed25519` |
| `GH_PAT` | Output of `gh auth token` | GitHub OAuth token |
| `CLOUDFLARE_TUNNEL_TOKEN` | Token from Step 1 | Tunnel creation response |
| `VITE_VITALSYNC_API_KEY` | App-specific | VitalStats API key for this app's account |
| `VITE_VITALSYNC_SLUG` | App-specific | VitalStats account slug for this app |

Add any other app-specific secrets as needed (JWT_SECRET, DB_PASSWORD, etc.).

### Step 7: Push and Deploy

```bash
git push origin main
# Or trigger manually:
gh workflow run deploy.yml --repo itmooti/<app-name> --ref main
```

### Step 8: Verify

1. Check GitHub Actions: `gh run list --repo itmooti/<app-name> --limit 1`
2. Check containers: `ssh admin@15.204.34.114 "docker ps --filter name=<app-name>"`
3. Test URL: `curl -s -o /dev/null -w '%{http_code}' https://<subdomain>.awesomate.ai`

## Troubleshooting

### 502 Bad Gateway
- Tunnel can't reach the app. Check that tunnel ingress points to `http://app:80` (Docker service name), NOT an IP address.
- Check tunnel container is running: `docker ps --filter name=<app>-tunnel`
- Check tunnel logs: `docker logs <app>-tunnel-1`
- If you accidentally added ingress to the shared K8s tunnel, remove it and create a per-app tunnel instead.

### 403 Forbidden on Cloudflare API
- The API token doesn't have permission for the target domain. Edit the token in Cloudflare dashboard and add the zone (see "Cloudflare API Token Permissions" above).

### SSH Timeout in GitHub Actions
- `SERVER_HOST` must be the **public IP** (`15.204.34.114`), NOT the private IP (`10.65.65.15`). GitHub Actions runners are on the public internet and cannot reach private IPs.

### Shell Escaping in Cloudflare API Calls
- Use Python `urllib.request` instead of `curl` for Cloudflare API calls. Complex JSON with special characters (like `__configuration_flags`) causes shell escaping issues with curl.
- Alternative: write JSON to a temp file and use `curl -d @/tmp/file.json`

### Existing Apps on Server
Check what's running: `ssh admin@15.204.34.114 "docker ps --format 'table {{.Names}}\t{{.Ports}}'"`

Known apps (as of Feb 2026):
- `phyx-contact-lookup` — port 3000
- `phyx-nurse-admin` — port 3010 (+ tunnel)
- `thc-portal` — port 3020 (+ tunnel)
- `bb-dashboard` — port 3030
- `n8n-onboarding` — port 3050 (+ tunnel)
- `database` — MySQL port 3306

## Files That Every Deployed App Needs

1. **Dockerfile** — Multi-stage: `node:20-alpine` build -> `nginx:alpine` serve
2. **docker-compose.yml** — App service + tunnel service + any APIs/DBs
3. **nginx.conf** — SPA fallback (`try_files $uri $uri/ /index.html`), static caching, gzip
4. **.github/workflows/deploy.yml** — SSH deploy via `appleboy/ssh-action@v1` with `workflow_dispatch`
5. **.env.example** — Document required env vars
