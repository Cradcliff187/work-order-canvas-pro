
# WorkOrderPro Development Guide

## Overview

This guide covers development workflows for WorkOrderPro using Lovable's cloud-based development platform. All development happens in the cloud with automatic deployment to the live workorderportal.com application.

## Cloud-First Development Setup

### Prerequisites

- **Lovable Account**: Access to the WorkOrderPro project in Lovable
- **Web Browser**: Modern browser for Lovable platform access
- **Internet Connection**: Required for cloud development

### Development Environment

**No Local Setup Required:**
- All development happens in Lovable's cloud platform
- Environment variables automatically managed
- Database connections handled automatically
- No Docker, Node.js, or local tools needed

### Access the Development Environment

1. **Navigate to Lovable Project**
   ```
   https://lovable.dev/projects/9dd2f336-2e89-40cc-b621-dbdacc6b4b12
   ```

2. **Start Developing**
   - Use AI assistant for code changes
   - Edit code directly in browser
   - Changes auto-deploy to production

3. **Live Application**
   ```
   https://workorderportal.com
   ```

## Development Workflow

### Making Changes

#### Using AI Assistant (Recommended)
1. Describe desired changes in natural language
2. AI assistant implements changes
3. Review changes in real-time preview
4. Changes automatically deploy to production

#### Direct Code Editing
1. Enable code editing in account settings
2. Edit files directly in Lovable editor
3. Save changes for automatic deployment
4. Test on live application

### Database Development

#### Database Management
- **Schema Changes**: Handled through Lovable migrations
- **Test Data**: Use `/dev-tools` seeding functions
- **Production Data**: Managed through live Supabase instance

#### Seeding Workflow

**Using Dev Tools Panel (Recommended):**
1. Navigate to `/dev-tools` on workorderportal.com
2. Use **Database Seeding** section:
   - **Seed Database**: Populate with test data using `seed_test_data()` function
   - **Clear Test Data**: Remove all test data using `clear_test_data()` function

**Test Data Patterns:**
- **Organizations**: 8 total (1 internal, 3 partners, 4 subcontractors)
- **Work Orders**: Sample orders across different statuses
- **Users**: Test users for each role type
- **Assignments**: Work order assignments to test users

### Email System Development

#### Email Testing
1. **Navigate to Email Test Panel**: `/admin/email-test`
2. **Select Email Type**: Choose from 6 available email functions
3. **Provide Test Data**: Fill required fields for email template
4. **Send Test Email**: Verify delivery and formatting
5. **Monitor Results**: Check email logs and delivery status

#### Email Template Development
- **Auth Templates**: Edit in Supabase Dashboard → Authentication → Email Templates
- **App Templates**: Stored in `email_templates` database table
- **Template Variables**: Use handlebars syntax `{{variable_name}}`

### Testing Guide

#### User Roles and Access

**Test User Credentials:**
- **Admin**: Use your existing admin account
- **Partner**: partner1@abc.com, partner2@xyz.com (password: Test123!)
- **Subcontractor**: sub1@pipes.com, sub2@sparks.com (password: Test123!)
- **Employee**: employee1@workorderpro.com (password: Test123!)

#### Testing Workflows

**Complete Work Order Lifecycle:**
1. Login as partner user
2. Create new work order
3. Login as admin
4. Assign work order to subcontractor
5. Login as subcontractor
6. Submit work report
7. Login as admin
8. Review and approve report
9. Verify email notifications at each step

#### Email Testing Workflow
1. **Setup Test Data**: Use dev tools to seed database
2. **Create Test Users**: Use existing test credentials
3. **Test Email Functions**: Use `/admin/email-test` panel
4. **Verify Delivery**: Check email logs and actual delivery
5. **Test Templates**: Verify all template variables render correctly

### Hot Reloading and Debugging

**Real-Time Development:**
- Lovable provides instant preview updates
- Changes reflect immediately in browser
- No build or restart processes needed

**Debugging Tools:**
- **Browser DevTools**: Standard debugging capabilities
- **Supabase Dashboard**: Database and function monitoring
- **Email Logs**: Application-level email tracking at `/admin/email-logs`
- **Function Logs**: Supabase Dashboard → Functions → Logs

### Production Considerations

#### Direct Production Development
- **Live Environment**: All changes deploy directly to workorderportal.com
- **User Impact**: Consider user activity when making changes
- **Testing**: Always test in development areas (`/dev-tools`, `/admin/email-test`)

#### Safety Practices
- **Database Seeding**: Use test data functions to avoid polluting production
- **Email Testing**: Use test panel to avoid sending emails to real users
- **User Management**: Use test user accounts for development testing

### Common Development Tasks

#### Adding New Features
```typescript
// 1. Describe feature to AI assistant
"Add a new report type for maintenance schedules"

// 2. AI implements:
// - Database schema changes
// - Frontend components
// - Backend logic
// - Email notifications

// 3. Test using dev tools and test panel
```

#### Database Changes
- **Schema Updates**: Handled automatically through Lovable
- **Data Migration**: Test with seeding functions first
- **Index Creation**: Monitor performance via Supabase Dashboard

#### Email System Changes
- **New Email Types**: Add to Edge Functions and templates
- **Template Updates**: Edit templates in database or Supabase Dashboard
- **Trigger Changes**: Update database triggers for new workflows

### Performance Monitoring

#### Application Performance
- **Supabase Dashboard**: Monitor database performance
- **Function Logs**: Track Edge Function execution times
- **Email Delivery**: Monitor via `/admin/email-logs`

#### User Experience
- **Live Site Monitoring**: Check workorderportal.com regularly
- **Error Tracking**: Monitor browser console for client errors
- **Email Delivery**: Verify templates render correctly across email clients

### Additional Resources

#### Documentation
- **Email Configuration**: See `EMAIL_CONFIGURATION.md`
- **Database Schema**: See `DATABASE_SCHEMA.md`
- **Deployment Guide**: See `DEPLOYMENT.md`

#### External Resources
- **Lovable Documentation**: https://docs.lovable.dev
- **Supabase Dashboard**: Project management and monitoring
- **IONOS Email**: Email account management

This development guide provides all essential information for productive cloud-based development using Lovable's platform, with emphasis on the live workorderportal.com environment and professional email system integration.
