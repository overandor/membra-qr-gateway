# ─────────────────────────────────────────────────────────────────────────────
# Terraform: Staging environment values
# Usage: terraform apply -var-file=environments/staging.tfvars
# Sensitive values (hcloud_token, ssh_public_key) must be set via env vars:
#   export TF_VAR_hcloud_token="..."
#   export TF_VAR_ssh_public_key="ssh-ed25519 AAAA..."
# ─────────────────────────────────────────────────────────────────────────────

environment   = "staging"
server_type   = "cx22"
location      = "nbg1"
domain        = "staging.membra.io"
image_tag     = "latest"

# Restrict SSH to your team's IPs in production
allowed_ssh_cidrs = ["0.0.0.0/0"]

backup_retention_days = 14
