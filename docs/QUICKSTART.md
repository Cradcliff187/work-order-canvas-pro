# WorkOrderPortal Quick Start Guide

Get up and running with the Work Order Portal in under 10 minutes.

## 🚀 Quick Setup (5 minutes)

### 1. Clone and Install
```bash
git clone <YOUR_GIT_URL>
cd workorderportal
npm install
npm run dev
```

### 2. Access the Application
- **Local Development**: http://localhost:5173
- **Dev Tools Panel**: Navigate to `/dev-tools` for development utilities
- **No .env files needed** - Supabase configuration is hardcoded for development

### 3. Database Setup
The application connects to a live Supabase database:
- **Project ID**: `inudoymofztrvxhrlrek` 
- **URL**: `https://inudoymofztrvxhrlrek.supabase.co`
- Database is pre-configured with test data and organizations

## 🏗️ Architecture Highlights

### Organization-Based Authentication (Critical)
- **NOT user-type based** - everything revolves around organizations
- **organization_members table** is the core relationship model
- Users can belong to multiple organizations with different roles

### Key Tables Structure
```
organizations (internal/partner/subcontractor)
├── organization_members (user-org relationships with roles)
├── partner_locations (for partner organizations)
└── work_orders (created by partners, assigned to subcontractors)
```

### Queue-Based Email System
- **Automated processing** every 5 minutes via edge function
- **Email queue table** for reliable delivery
- **Template-based system** with context data
- **No manual email triggers** - all automatic

### Multi-Tenant Data Isolation
- **Organization-scoped data** with RLS policies
- **Partner location numbering** for work order tracking
- **Financial privacy** between organizations

## 🔧 Development Workflow

### Test Data & Users
See [TEST_SCENARIOS.md](./TEST_SCENARIOS.md) for complete test data including:
- **Test login password**: `Test123!` for all users
- **14 test users** across admin/employee/partner/subcontractor roles
- **8 organizations** with realistic data relationships
- **16 work orders** in various workflow states

### Quick Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Database Seeding
1. Navigate to `/dev-tools` in your browser
2. Use "Setup Test Environment" button
3. Or call database functions directly via RPC

## 🛠️ Common Development Tasks

### Adding New Organizations
```typescript
// Use the admin interface or direct database insert
const { data, error } = await supabase
  .from('organizations')
  .insert({
    name: 'New Organization',
    organization_type: 'partner', // or 'subcontractor', 'internal'
    contact_email: 'contact@org.com',
    initials: 'ORG'
  });
```

### Debugging Authentication Issues
1. **Check JWT tokens** - organization data should be in `app_metadata`
2. **Verify organization memberships** in `organization_members` table
3. **Use dev tools** - `/dev-tools` has auth debugging panel
4. **Check RLS policies** - data visibility is organization-scoped

### Understanding User Permissions
```typescript
// Users can have multiple organization memberships
const { data: memberships } = await supabase
  .from('organization_members')
  .select('organization_id, role, organizations(name, organization_type)')
  .eq('user_id', profileId);
```

## 📚 Quick Reference

### Key URLs
- **Local Development**: http://localhost:5173
- **Dev Tools**: http://localhost:5173/dev-tools
- **Supabase Dashboard**: https://supabase.com/dashboard/project/inudoymofztrvxhrlrek

### Essential Documentation
- [Test Scenarios & Data](./TEST_SCENARIOS.md) - Complete test data guide
- [Development Guide](./DEVELOPMENT_GUIDE.md) - Comprehensive development workflow
- [Database Schema](./DATABASE_SCHEMA.md) - Full database documentation
- [Email System](./EMAIL_SYSTEM.md) - Queue-based email architecture

### Database Connection Info
- **Project**: inudoymofztrvxhrlrek
- **Connection**: Pre-configured in `src/integrations/supabase/client.ts`
- **Auth**: Automatic with localStorage persistence

### Key API Endpoints
- **Work Orders**: `/work_orders` table
- **Organizations**: `/organizations` table  
- **Messages**: `/work_order_messages` for real-time chat
- **Email Queue**: `/email_queue` for automated emails

## 🎯 Next Steps

1. **Explore Test Data** - Check [TEST_SCENARIOS.md](./TEST_SCENARIOS.md) for complete workflows
2. **Try Different User Types** - Login as admin/partner/subcontractor to see different views
3. **Review Architecture** - Study the organization-based permission system
4. **Start Development** - Use the comprehensive [Development Guide](./DEVELOPMENT_GUIDE.md)

## 💡 Pro Tips

- **Use `/dev-tools`** for quick database operations and debugging
- **Organization membership** determines what users can see/do
- **Email system is automatic** - no manual triggers needed
- **Work order numbering** is smart (org-location-sequence)
- **RLS policies** handle all data security - trust the system

---

*Last updated: 2024-01-XX | See [Documentation Standards](./DOCUMENTATION_STANDARDS.md) for maintenance guidelines*