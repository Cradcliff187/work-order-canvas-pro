# WorkOrderPro

A comprehensive construction work order management system that facilitates workflows between Partners (Property Management), WorkOrderPro (General Contractor), and Subcontractors (Trade Companies). Features company-level access control, multi-organization architecture, and complete financial privacy between organizations.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui components  
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **State**: TanStack Query + React Router
- **Email**: Resend (SMTP for auth emails, API for transactional emails)

## 🚀 Live Application

**Production URL**: https://lovable.dev/projects/9dd2f336-2e89-40cc-b621-dbdacc6b4b12

## Quick Start

```bash
# Clone and install
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install

# Start development server
npm run dev
```

## 📚 Documentation

**Getting Started**
- [Development Guide](./docs/DEVELOPMENT.md) - Setup, testing, and workflows
- [UI Design System](./docs/UI_DESIGN_SYSTEM.md) - Component and styling guidelines

**Architecture**  
- [Database Schema](./docs/DATABASE_SCHEMA.md) - Tables and relationships
- [RLS Policies](./docs/RLS_POLICIES.md) - Security implementation
- [Database Functions](./docs/DATABASE_FUNCTIONS.md) - Server-side operations

**Deployment**
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production procedures
- [Database Seeding](./docs/SEEDING.md) - Test data management

**Troubleshooting**
- [Company Access Guide](./docs/COMPANY_ACCESS_GUIDE.md) - Multi-tenant patterns
- [Offline Storage Guide](./docs/OFFLINE_STORAGE_GUIDE.md) - PWA capabilities

## Development

Use [Lovable](https://lovable.dev/projects/9dd2f336-2e89-40cc-b621-dbdacc6b4b12) for AI-powered editing or work locally with your preferred IDE. See [Development Guide](./docs/DEVELOPMENT.md) for detailed setup instructions.

**Deploy**: Open Lovable → Share → Publish
**Custom Domain**: Project → Settings → Domains → Connect Domain