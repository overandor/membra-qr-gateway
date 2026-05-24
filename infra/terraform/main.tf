# ─────────────────────────────────────────────────────────────────────────────
# MEMBRA QR Gateway — Hetzner Cloud Infrastructure
# ─────────────────────────────────────────────────────────────────────────────
# Provider: Hetzner Cloud (hcloud)
# Resources: server, firewall, DNS record
#
# Usage:
#   terraform init
#   terraform plan -var-file=environments/staging.tfvars
#   terraform apply -var-file=environments/staging.tfvars
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }

  backend "s3" {
    # Use Hetzner Object Storage or any S3-compatible backend
    # Set via environment variables:
    #   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3
    bucket = "membra-terraform-state"
    key    = "membra-qr-gateway/terraform.tfstate"
    region = "eu-central-1"
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

# ── SSH Key ───────────────────────────────────────────────────────────────────
resource "hcloud_ssh_key" "deploy_key" {
  name       = "membra-${var.environment}-deploy"
  public_key = var.ssh_public_key
  labels = {
    environment = var.environment
    project     = "membra-qr-gateway"
  }
}

# ── Firewall ──────────────────────────────────────────────────────────────────
resource "hcloud_firewall" "membra" {
  name = "membra-${var.environment}-firewall"
  labels = {
    environment = var.environment
    project     = "membra-qr-gateway"
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = var.allowed_ssh_cidrs
    description = "SSH access"
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
    description = "HTTP (ACME + redirect to HTTPS)"
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
    description = "HTTPS"
  }

  # Allow all outbound
  rule {
    direction       = "out"
    protocol        = "tcp"
    port            = "1-65535"
    destination_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction       = "out"
    protocol        = "udp"
    port            = "1-65535"
    destination_ips = ["0.0.0.0/0", "::/0"]
  }
}

# ── Server ────────────────────────────────────────────────────────────────────
resource "hcloud_server" "membra" {
  name        = "membra-${var.environment}"
  image       = "ubuntu-22.04"
  server_type = var.server_type   # cx22 = 2 vCPU, 4GB RAM
  location    = var.location
  ssh_keys    = [hcloud_ssh_key.deploy_key.id]

  firewall_ids = [hcloud_firewall.membra.id]

  labels = {
    environment = var.environment
    project     = "membra-qr-gateway"
    managed_by  = "terraform"
  }

  # Cloud-init: install Docker on first boot
  user_data = <<-CLOUDINIT
    #cloud-config
    package_update: true
    package_upgrade: true
    packages:
      - curl
      - git
      - ufw
      - fail2ban

    runcmd:
      # Install Docker
      - curl -fsSL https://get.docker.com | sh
      - usermod -aG docker ubuntu
      # Install Docker Compose plugin
      - apt-get install -y docker-compose-plugin
      # Create app directory
      - mkdir -p /opt/membra-qr-gateway
      - mkdir -p /etc/membra
      # Create membra system user
      - useradd --uid 1001 --gid docker --shell /bin/bash --create-home membra
      - chown membra:docker /opt/membra-qr-gateway
      # Enable fail2ban
      - systemctl enable fail2ban
      - systemctl start fail2ban
      # UFW rules (firewall already handles this, ufw as extra layer)
      - ufw allow 22/tcp
      - ufw allow 80/tcp
      - ufw allow 443/tcp
      - ufw --force enable
  CLOUDINIT

  lifecycle {
    prevent_destroy = false
    ignore_changes  = [user_data]
  }
}

# ── Primary IP (static) ───────────────────────────────────────────────────────
resource "hcloud_primary_ip" "membra" {
  name          = "membra-${var.environment}-ip"
  datacenter    = "${var.location}-dc3"
  type          = "ipv4"
  assignee_type = "server"
  auto_delete   = false

  labels = {
    environment = var.environment
    project     = "membra-qr-gateway"
  }
}

# ── DNS Record ────────────────────────────────────────────────────────────────
# Note: this uses a generic DNS resource — replace with your DNS provider
# (Cloudflare, Route53, etc.) in a real deployment
resource "hcloud_rdns" "membra" {
  server_id  = hcloud_server.membra.id
  ip_address = hcloud_server.membra.ipv4_address
  dns_ptr    = var.domain
}
