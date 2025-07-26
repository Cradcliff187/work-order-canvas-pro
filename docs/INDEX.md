# Documentation Index

This documentation map helps developers quickly find the right documentation for their specific needs and workflow stage.

## 🚀 Getting Started

| File | Description | When to Reference |
|------|-------------|-------------------|
| [README.md](../README.md) | Project overview, tech stack, and quick start guide | First time setup, project introduction, getting the app running |
| [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) | Development setup, testing, and workflow procedures | Setting up local environment, understanding dev workflows |
| [TEST_SCENARIOS.md](./TEST_SCENARIOS.md) | Test data, login credentials, and testing procedures | Finding test user accounts, understanding test data structure |

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
| [OFFLINE_STORAGE_GUIDE.md](./OFFLINE_STORAGE_GUIDE.md) | PWA capabilities and offline data management | Adding offline features, troubleshooting sync issues |
| [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) | Supabase Edge Functions for external integrations | Creating new integrations, debugging serverless functions |
| [MESSAGING_SYSTEM.md](./MESSAGING_SYSTEM.md) | In-app messaging system guide | Building messaging features, understanding visibility rules |

## ⚙️ Operations & Maintenance

| File | Description | When to Reference |
|------|-------------|-------------------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production deployment procedures and environment setup | Deploying to production, configuring environments |
| [SEEDING.md](./SEEDING.md) | Database initialization and test data management | Setting up fresh databases, managing test environments |
| [AUDIT_SYSTEM.md](./AUDIT_SYSTEM.md) | Change tracking, audit logs, and compliance features | Implementing audit requirements, tracking system changes |
| [MIGRATION_HISTORY.md](./MIGRATION_HISTORY.md) | Database migration history and rollback procedures | Understanding schema evolution, troubleshooting migration issues |

## 🧪 Testing & Troubleshooting

| File | Description | When to Reference |
|------|-------------|-------------------|
| [EDGE_FUNCTIONS_TEST.md](./EDGE_FUNCTIONS_TEST.md) | Edge function testing procedures and debugging | Testing serverless functions, debugging integration issues |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Legacy development notes and historical context | Understanding older implementation decisions, troubleshooting legacy code |

## 📱 Quick Navigation by Role

### **New Developer**
Start with: README.md → DEVELOPMENT_GUIDE.md → TEST_SCENARIOS.md → UI_DESIGN_SYSTEM.md

### **Frontend Developer**
Focus on: UI_DESIGN_SYSTEM.md → DATABASE_SCHEMA.md → OFFLINE_STORAGE_GUIDE.md

### **Backend Developer**
Focus on: DATABASE_SCHEMA.md → DATABASE_FUNCTIONS.md → RLS_POLICIES.md → EDGE_FUNCTIONS.md

### **DevOps/Admin**
Focus on: DEPLOYMENT.md → SEEDING.md → MIGRATION_HISTORY.md → AUDIT_SYSTEM.md

### **QA/Testing**
Focus on: TEST_SCENARIOS.md → EDGE_FUNCTIONS_TEST.md → SEEDING.md

## 🔄 Maintenance Notes

- **Update Frequency**: Review and update this index when adding new documentation files
- **Broken Links**: Check all links quarterly to ensure documentation structure remains intact  
- **Content Owners**: Each documentation file should have a clear owner responsible for updates
- **Version Sync**: Ensure all linked documentation reflects the current system architecture

## 📞 Getting Help

If you can't find what you're looking for in this documentation:

1. **Search the codebase**: Many implementation details are documented in code comments
2. **Check Git history**: For context on specific changes or decisions
3. **Team communication**: Reach out to the development team for clarification
4. **Update this index**: If you create new documentation, add it here

---

*Last Updated: Project documentation as of system current state*