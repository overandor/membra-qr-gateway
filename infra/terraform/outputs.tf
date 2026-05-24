# ─────────────────────────────────────────────────────────────────────────────
# MEMBRA QR Gateway — Terraform Outputs
# ─────────────────────────────────────────────────────────────────────────────

output "server_id" {
  description = "Hetzner Cloud server ID"
  value       = hcloud_server.membra.id
}

output "server_ip" {
  description = "Public IPv4 address of the MEMBRA server"
  value       = hcloud_server.membra.ipv4_address
}

output "server_ipv6" {
  description = "Public IPv6 address of the MEMBRA server"
  value       = hcloud_server.membra.ipv6_address
}

output "ssh_command" {
  description = "SSH command to connect to the server"
  value       = "ssh ubuntu@${hcloud_server.membra.ipv4_address}"
}

output "api_url" {
  description = "API base URL (configure DNS to point domain to server_ip)"
  value       = "https://${var.domain}/api"
}

output "app_url" {
  description = "Frontend application URL"
  value       = "https://${var.domain}"
}

output "server_datacenter" {
  description = "Hetzner datacenter where the server is deployed"
  value       = hcloud_server.membra.datacenter
}

output "environment" {
  description = "Deployment environment"
  value       = var.environment
}

output "deploy_instructions" {
  description = "Next steps after terraform apply"
  value       = <<-EOT
    Server provisioned at: ${hcloud_server.membra.ipv4_address}

    Next steps:
    1. Add DNS A record: ${var.domain} -> ${hcloud_server.membra.ipv4_address}
    2. SSH in: ssh ubuntu@${hcloud_server.membra.ipv4_address}
    3. Copy .env: scp .env ubuntu@${hcloud_server.membra.ipv4_address}:/etc/membra/app.env
    4. Clone repo: git clone https://github.com/membra/membra-qr-gateway /opt/membra-qr-gateway
    5. Run deploy: cd /opt/membra-qr-gateway && bash scripts/deploy_${var.environment}.sh
    6. Issue TLS cert: certbot certonly --nginx -d ${var.domain}
  EOT
}
