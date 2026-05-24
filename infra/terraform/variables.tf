# ─────────────────────────────────────────────────────────────────────────────
# MEMBRA QR Gateway — Terraform Variables
# ─────────────────────────────────────────────────────────────────────────────

variable "hcloud_token" {
  description = "Hetzner Cloud API token (read+write). Set via TF_VAR_hcloud_token env var or GitHub Secret."
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Deployment environment. Used in resource names and tags."
  type        = string
  default     = "staging"
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be 'staging' or 'production'."
  }
}

variable "server_type" {
  description = "Hetzner server type. cx22 = 2 vCPU / 4 GB RAM. cx32 = 4 vCPU / 8 GB for production."
  type        = string
  default     = "cx22"
}

variable "location" {
  description = "Hetzner datacenter location (nbg1=Nuremberg, fsn1=Falkenstein, hel1=Helsinki)."
  type        = string
  default     = "nbg1"
  validation {
    condition     = contains(["nbg1", "fsn1", "hel1", "ash", "hil"], var.location)
    error_message = "location must be a valid Hetzner datacenter code."
  }
}

variable "ssh_public_key" {
  description = "SSH public key content for the deploy user. Store the private key in GitHub Secrets."
  type        = string
}

variable "allowed_ssh_cidrs" {
  description = "List of CIDR ranges allowed to SSH into the server. Restrict to your team's IPs."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "domain" {
  description = "Primary domain for the application (e.g. app.membra.io). Used for DNS PTR record."
  type        = string
  default     = "app.membra.io"
}

variable "image_tag" {
  description = "Docker image tag to deploy on first boot (e.g. 'latest' or 'v1.1.0')."
  type        = string
  default     = "latest"
}

variable "backup_retention_days" {
  description = "Number of days to retain SQLite backups on the server."
  type        = number
  default     = 30
  validation {
    condition     = var.backup_retention_days >= 7 && var.backup_retention_days <= 365
    error_message = "backup_retention_days must be between 7 and 365."
  }
}
