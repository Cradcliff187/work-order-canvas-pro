
# WorkOrderPro

A comprehensive construction work order management system that facilitates workflows between Partners (Property Management), WorkOrderPro (General Contractor), and Subcontractors (Trade Companies). Features company-level access control, multi-organization architecture, and complete financial privacy between organizations.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui components  
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **State**: TanStack Query + React Router
- **Email**: IONOS SMTP via Supabase Auth
- **Hosting**: Lovable with automatic deployment

## 🚀 Live Application

**Production URL**: https://workorderportal.com

## Quick Start

Development is done entirely through Lovable's platform:

1. Open the project in [Lovable](https://lovable.dev)
2. Make changes using the AI assistant or code editor
3. Changes auto-deploy to production

No local development setup required - all environment configuration is handled automatically.

## 📚 Documentation

**Getting Started**
- [Development Guide](./docs/DEVELOPMENT.md) - Lovable development workflows
- [UI Design System](./docs/UI_DESIGN_SYSTEM.md) - Component and styling guidelines
- [Email Configuration](./docs/EMAIL_CONFIGURATION.md) - Email system documentation

**Architecture**  
- [Database Schema](./docs/DATABASE_SCHEMA.md) - Tables and relationships
- [RLS Policies](./docs/RLS_POLICIES.md) - Security implementation
- [Database Functions](./docs/DATABASE_FUNCTIONS.md) - Server-side operations
- [Edge Functions](./docs/EDGE_FUNCTIONS.md) - Serverless function documentation

**Deployment**
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production configuration
- [Database Seeding](./docs/SEEDING.md) - Test data management

**Troubleshooting**
- [Company Access Guide](./docs/COMPANY_ACCESS_GUIDE.md) - Multi-tenant patterns
- [Offline Storage Guide](./docs/OFFLINE_STORAGE_GUIDE.md) - PWA capabilities

## Production Configuration

- **Domain**: workorderportal.com (IONOS)
- **Email**: support@workorderportal.com (IONOS SMTP)
- **Database**: Supabase (inudoymofztrvxhrlrek)
- **Deployment**: Automatic via Lovable

## Development

This project is built and deployed through [Lovable](https://lovable.dev). All development happens in the Lovable platform with automatic deployment to production.

**No local setup required** - Lovable handles all environment configuration, build processes, and deployments automatically.
