# WorkOrderPro

A comprehensive construction work order management system built with React, TypeScript, and Supabase.

## Project Overview

WorkOrderPro is a full-stack web application designed for managing construction work orders across multiple organizations with **company-level access control**. It enables partners to submit work orders, which are then routed to subcontractor organizations for completion, providing complete transparency while maintaining financial privacy between companies.

## WorkOrderPro Business Model

WorkOrderPro facilitates a three-party construction management workflow:

**🏢 Partners (Property Management)** → **🔧 WorkOrderPro (General Contractor)** → **⚡ Subcontractors (Trade Companies)**

### Organization Types

- **🏢 Partner Organizations**: Property management companies that submit work orders for their locations
- **⚡ Subcontractor Organizations**: Trade companies (plumbing, HVAC, electrical) that perform the work  
- **🔧 Internal Organization**: The general contractor company (WorkOrderPro Internal) that manages the workflow

### Company-Level Access Features

- **Team-Based Work Orders**: Multiple team members can collaborate on the same work orders
- **Organization-Level Assignments**: Work orders can be assigned to entire organizations, not just individuals
- **Company Financial Privacy**: Each organization can only see their own financial data (invoices, costs)
- **Cross-Company Transparency**: Work order details and reports are shared between relevant parties
- **Scalable User Management**: Add unlimited users to organizations without individual access setup

**Live URL**: https://lovable.dev/projects/9dd2f336-2e89-40cc-b621-dbdacc6b4b12

## Database Architecture

WorkOrderPro uses a PostgreSQL database with 12 core tables, implementing:

- **Complete audit logging** tracking all changes across 11 tables
- **Row Level Security (RLS)** with role-based access control
- **Multi-tenant architecture** supporting multiple organizations
- **Email notification system** with templates and delivery tracking
- **File attachment support** via Supabase Storage
- **Analytics capabilities** with materialized views for reporting
- **Edge Functions** for secure server-side operations and database management

## Edge Functions

The application uses Supabase Edge Functions for secure server-side operations:

### Available Functions
- **Database Management**: `seed-database`, `clear-test-data`
- **Email Notifications**: `email-work-order-created`, `email-work-order-assigned`, `email-work-order-completed`, `email-report-submitted`, `email-report-reviewed`, `email-welcome`
- **Invoice Processing**: `invoice-submitted`, `invoice-status-changed`
- **Webhooks**: `resend-webhook`

### Quick Deployment
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy seed-database

# View logs
supabase functions logs seed-database --tail

# Set environment variables
supabase secrets set RESEND_API_KEY=your_key_here
```

### Documentation
- **[Edge Functions Deployment Guide](supabase/functions/DEPLOY.md)** - Complete deployment instructions
- **[Edge Functions Development Guide](supabase/functions/README.md)** - Development and testing guide
- **[Main Deployment Guide](docs/DEPLOYMENT.md)** - Full application deployment

### Documentation

**📊 Database & Architecture**
- [Database Schema](./docs/DATABASE_SCHEMA.md) - Complete table structure and relationships
- [RLS Policies](./docs/RLS_POLICIES.md) - Row Level Security implementation
- [Audit System](./docs/AUDIT_SYSTEM.md) - Change tracking and compliance
- [Database Functions](./docs/DATABASE_FUNCTIONS.md) - PostgreSQL functions and helpers
- [Migration History](./docs/MIGRATION_HISTORY.md) - Complete migration timeline

**🚀 Development & Deployment**
- [Development Guide](./docs/DEVELOPMENT.md) - Local development setup and testing
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment procedures
- [Database Seeding](./docs/SEEDING.md) - Edge Function-based seeding guide
- [Test Checklist](./docs/TEST_CHECKLIST.md) - Comprehensive testing procedures

**🔧 Troubleshooting & Maintenance**
- [Troubleshooting Guide](./docs/RLS_POLICIES.md#comprehensive-troubleshooting-guide) - Common issues and solutions
- [Company Access Guide](./docs/COMPANY_ACCESS_GUIDE.md) - Multi-tenant access patterns
- [Offline Storage Guide](./docs/OFFLINE_STORAGE_GUIDE.md) - PWA offline capabilities

### Key Features

- **Company-Level Access Control**: Organization-based access with team collaboration
- **Role-Based Access**: Admin, Employee, Partner, and Subcontractor user types
- **Multi-Organization Architecture**: Partners, subcontractors, and internal organizations
- **Work Order Lifecycle**: From submission to completion with status tracking
- **Organization-Level Assignments**: Work orders assigned to entire companies
- **Report Management**: Subcontractor reports with photo attachments
- **Financial Privacy**: Company-level financial data isolation
- **Email Notifications**: Automated notifications for all workflow stages
- **Analytics Dashboard**: Performance metrics and geographic distribution
- **Audit Trail**: Complete change history for compliance
- **Team Collaboration**: Multiple users per organization with shared access

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Authentication, Storage, Edge Functions)
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Email Service**: Resend API integration
- **File Storage**: Supabase Storage with public buckets
- **Database Seeding**: Edge Function-based seeding for secure, server-side data initialization

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/9dd2f336-2e89-40cc-b621-dbdacc6b4b12) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/9dd2f336-2e89-40cc-b621-dbdacc6b4b12) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
