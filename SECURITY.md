# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security vulnerabilities through one of these methods:

1. **GitHub Security Advisories** (Preferred)
   - Go to the [Security tab](../../security/advisories)
   - Click "Report a vulnerability"
   - Fill out the form with details

2. **Email**
   - Send details to: [security@your-domain.com]
   - Use a descriptive subject line
   - Include as much information as possible

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution Target**: Within 30 days (depending on severity)

### Safe Harbor

We support safe harbor for security researchers who:
- Make a good faith effort to avoid privacy violations
- Do not access or modify data belonging to others
- Give us reasonable time to fix issues before disclosure

## Security Best Practices

When deploying QA Flow:

1. **Always set a strong `JWT_SECRET`**
   ```bash
   JWT_SECRET=$(openssl rand -base64 32)
   ```

2. **Change default credentials immediately**
   - Default admin password is `admin123`
   - Change it after first login

3. **Use HTTPS in production**
   - Deploy behind a reverse proxy (nginx, Caddy)
   - Enable TLS/SSL certificates

4. **Keep dependencies updated**
   - Run `pnpm audit` regularly
   - Update Playwright and other dependencies

5. **Restrict network access**
   - Don't expose the application directly to the internet
   - Use firewalls and VPNs when possible
