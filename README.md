
# WorkOrderPortal

A comprehensive construction work order management system that facilitates workflows between Partners (Property Management), WorkOrderPortal (General Contractor), and Subcontractors (Trade Companies). Features company-level access control, multi-organization architecture, and complete financial privacy between organizations.

## 🎯 Features

- 🏢 **Multi-Organization Architecture** - Partners, subcontractors, and internal teams with complete data isolation
- 📋 **Smart Work Order Management** - Location-based numbering, status tracking, and assignment workflows  
- 💰 **Financial Privacy** - Organization-level invoice isolation with secure payment tracking
- 👥 **Role-Based Access Control** - Granular permissions for admins, employees, partners, and subcontractors
- 💬 **Real-time Messaging** - In-app communication with role-based visibility
- 📱 **Progressive Web App** - Offline support with IndexedDB storage and mobile optimization
- 📧 **Automated Email Notifications** - Transactional emails via Resend for all workflow events
- 📊 **Analytics & Reporting** - Performance tracking, financial summaries, and audit trails
- 🔒 **Enterprise Security** - Row-level security, audit logging, and compliance features

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui components  
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **State**: TanStack Query + React Router
- **Email**: Resend (All emails including auth - SMTP configured but bypassed)
- **Real-time**: Real-time subscriptions via Supabase
- **Offline Storage**: IndexedDB for offline message queue

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
- [Edge Functions](./docs/EDGE_FUNCTIONS.md) - Server-side functions and email system
- [Email System](./docs/EMAIL_SYSTEM.md) - Unified Resend email architecture

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
