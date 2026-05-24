# ─────────────────────────────────────────────────────────────────────────────
# Terraform: Production environment values
# Usage: terraform apply -var-file=environments/production.tfvars
# Sensitive values (hcloud_token, ssh_public_key) must be set via env vars:
#   export TF_VAR_hcloud_token="..."
#   export TF_VAR_ssh_public_key="ssh-ed25519 AAAA..."
# ─────────────────────────────────────────────────────────────────────────────

environment   = "production"
server_type   = "cx32"         # 4 vCPU, 8 GB RAM for production
location      = "nbg1"
domain        = "app.membra.io"
image_tag     = "latest"

# Restrict SSH to known IPs — add your team's static IPs here
allowed_ssh_cidrs = [
  # Add your office/VPN CIDR here — do NOT leave as 0.0.0.0/0 in production
  "0.0.0.0/0"
]

backup_retention_days = 30
