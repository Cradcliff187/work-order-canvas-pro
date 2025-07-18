
# Documentation Index

This documentation map helps developers quickly find the right documentation for their specific needs and workflow stage.

## 🚀 Getting Started

| File | Description | When to Reference |
|------|-------------|-------------------|
| [README.md](../README.md) | Project overview, tech stack, and production URL | First time setup, project introduction, understanding live application |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Lovable cloud development workflows and testing | Setting up development workflow, understanding cloud-first approach |
| [EMAIL_CONFIGURATION.md](./EMAIL_CONFIGURATION.md) | Complete email system documentation | Setting up emails, troubleshooting delivery, template management |

## 🏗️ Architecture & Design

| File | Description | When to Reference |
|------|-------------|-------------------|
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Complete database structure with table relationships | Understanding data model, designing new features, debugging data issues |
| [UI_DESIGN_SYSTEM.md](./UI_DESIGN_SYSTEM.md) | Component library, styling guidelines, and design patterns | Building new UI components, maintaining design consistency |
| [COMPANY_ACCESS_GUIDE.md](./COMPANY_ACCESS_GUIDE.md) | Multi-tenant architecture and organization-based access control | Understanding user permissions, implementing organization features |

## 🔧 Implementation Reference

| File | Description | When to Reference |
|------|-------------|-------------------|
| [DATABASE_FUNCTIONS.md](./DATABASE_FUNCTIONS.md) | Server-side database functions and stored procedures | Writing complex queries, implementing business logic in DB |
| [RLS_POLICIES.md](./RLS_POLICIES.md) | Row Level Security policies and access control rules | Implementing security features, debugging permission issues |
| [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) | Supabase Edge Functions for email and external integrations | Creating new integrations, debugging serverless functions |
| [OFFLINE_STORAGE_GUIDE.md](./OFFLINE_STORAGE_GUIDE.md) | PWA capabilities and offline data management | Adding offline features, troubleshooting sync issues |

## ⚙️ Operations & Maintenance

| File | Description | When to Reference |
|------|-------------|-------------------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production deployment procedures and IONOS configuration | Managing production environment, email setup, domain configuration |
| [SEEDING.md](./SEEDING.md) | Database initialization and test data management | Setting up fresh databases, managing test environments |
| [AUDIT_SYSTEM.md](./AUDIT_SYSTEM.md) | Change tracking, audit logs, and compliance features | Implementing audit requirements, tracking system changes |
| [MIGRATION_HISTORY.md](./MIGRATION_HISTORY.md) | Database migration history and rollback procedures | Understanding schema evolution, troubleshooting migration issues |

## 🧪 Testing & Troubleshooting

| File | Description | When to Reference |
|------|-------------|-------------------|
| [EMAIL_CONFIGURATION.md](./EMAIL_CONFIGURATION.md) | Email testing procedures and IONOS SMTP troubleshooting | Testing email functions, debugging delivery issues |

## 📱 Quick Navigation by Role

### **New Developer**
Start with: README.md → DEVELOPMENT.md → EMAIL_CONFIGURATION.md → UI_DESIGN_SYSTEM.md

### **Frontend Developer**
Focus on: UI_DESIGN_SYSTEM.md → DATABASE_SCHEMA.md → DEVELOPMENT.md

### **Backend Developer**
Focus on: DATABASE_SCHEMA.md → DATABASE_FUNCTIONS.md → RLS_POLICIES.md → EDGE_FUNCTIONS.md

### **DevOps/Admin**
Focus on: DEPLOYMENT.md → EMAIL_CONFIGURATION.md → SEEDING.md → MIGRATION_HISTORY.md

### **QA/Testing**
Focus on: DEVELOPMENT.md → EMAIL_CONFIGURATION.md → SEEDING.md

## 🌐 Production Quick Links

### **Live Application**
- **Production URL**: https://workorderportal.com
- **Admin Panel**: https://workorderportal.com/admin
- **Email Test Panel**: https://workorderportal.com/admin/email-test
- **Dev Tools**: https://workorderportal.com/dev-tools

### **Development Environment**
- **Lovable Project**: https://lovable.dev/projects/9dd2f336-2e89-40cc-b621-dbdacc6b4b12
- **Supabase Dashboard**: https://supabase.com/dashboard/project/inudoymofztrvxhrlrek

### **Email System**
- **IONOS Email**: support@workorderportal.com
- **SMTP Configuration**: Via Supabase Dashboard → Auth → SMTP
- **Email Logs**: Application → `/admin/email-logs`

## 🔄 Maintenance Notes

- **Update Frequency**: Review and update this index when adding new documentation files
- **Broken Links**: Check all links quarterly to ensure documentation structure remains intact  
- **Content Owners**: Each documentation file should have a clear owner responsible for updates
- **Version Sync**: Ensure all linked documentation reflects the current workorderportal.com production environment

## 📞 Getting Help

If you can't find what you're looking for in this documentation:

1. **Search the codebase**: Many implementation details are documented in code comments
2. **Check Lovable project**: Use AI assistant for specific questions
3. **Email system issues**: Check EMAIL_CONFIGURATION.md first
4. **Production issues**: Start with DEPLOYMENT.md
5. **Update this index**: If you create new documentation, add it here

---

*Last Updated: Production documentation for workorderportal.com with IONOS SMTP integration*
