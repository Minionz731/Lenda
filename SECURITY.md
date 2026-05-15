# Security Policy

## Reporting Security Vulnerabilities

**Please do NOT open a public issue for security vulnerabilities.**

If you discover a security vulnerability, please email us at: **mloyicz@gmail.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide an estimated timeline for a fix.

## Security Best Practices

### Authentication & Authorization
- ✅ Passwords are hashed with bcryptjs (10 salt rounds minimum)
- ✅ JWT tokens expire after 7 days (configurable)
- ✅ Rate limiting on authentication endpoints
- ✅ Brute force protection recommended for production
- ❌ Never hardcode credentials
- ❌ Never log sensitive data

### Environment Variables
- ✅ Use `.env` files for local development (never commit)
- ✅ Copy `.env.example` as template
- ✅ Change all defaults in production
- ❌ Never expose `.env` files in version control
- ❌ Never use defaults for `JWT_SECRET` in production

### Database Security
- ✅ Use parameterized queries (pg library handles this)
- ✅ Validate all inputs server-side
- ✅ Use role-based access control (RBAC)
- ✅ Implement audit logging for sensitive operations
- ❌ Never concatenate user input into queries
- ❌ Never expose database errors to clients

### API Security
- ✅ HTTPS only in production
- ✅ CORS configured to specific origins
- ✅ Helmet.js for HTTP headers
- ✅ Rate limiting enabled
- ✅ Input validation with express-validator
- ❌ Never return stack traces to clients
- ❌ Never expose internal system information

### File Uploads
- ✅ Validate file types
- ✅ Scan uploads for malware (recommended)
- ✅ Store outside web root
- ✅ Limit file size (5MB default)
- ❌ Never trust user-provided file names
- ❌ Never execute uploaded files

### Dependencies
- ✅ Keep dependencies up to date
- ✅ Review security advisories: `npm audit`
- ✅ Use lock files (package-lock.json)
- ❌ Don't use deprecated packages
- ❌ Avoid unverified/untrusted packages

### Logging & Monitoring
- ✅ Log security events
- ✅ Monitor suspicious activity
- ✅ Don't log sensitive data (passwords, tokens)
- ✅ Use structured logging (Winston)
- ❌ Never log credentials or PII unnecessarily

## Production Checklist

Before deploying to production:

- [ ] Change all `.env` defaults
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/SSL
- [ ] Review CORS settings
- [ ] Update database credentials
- [ ] Enable database backups
- [ ] Set up monitoring and alerts
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Review security headers with Helmet
- [ ] Enable rate limiting appropriately
- [ ] Set up log aggregation
- [ ] Plan incident response procedures
- [ ] Enable WAF (Web Application Firewall) if available

## Security Updates

We recommend:
1. Enable Dependabot alerts (GitHub)
2. Review security advisories regularly
3. Test security updates in staging first
4. Apply critical patches immediately
5. Document all security updates

## Third-Party Security

- Only use trusted npm packages
- Verify package ownership
- Check for security issues with `npm audit`
- Review package source code for critical dependencies
- Monitor security mailing lists

## Data Protection

- Implement GDPR compliance if needed
- Encrypt sensitive data at rest
- Use HTTPS for all data in transit
- Implement data retention policies
- Ensure proper user consent for data usage
- Provide data export/deletion capabilities

## Further Reading

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-syntax.html)

---

Thank you for helping keep Lenda secure! 🔒
