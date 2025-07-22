
import { lazy } from 'react';

// Admin pages
export const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
export const EmployeeDashboard = lazy(() => import('./admin/EmployeeDashboard'));
export const AdminUsers = lazy(() => import('./admin/AdminUsers'));
export const AdminOrganizations = lazy(() => import('./admin/AdminOrganizations'));
export const AdminWorkOrders = lazy(() => import('./admin/AdminWorkOrders'));
export const AdminWorkOrderDetail = lazy(() => import('./admin/AdminWorkOrderDetail'));
export const AdminWorkOrderEdit = lazy(() => import('./admin/AdminWorkOrderEdit'));
export const AdminAnalytics = lazy(() => import('./admin/AdminAnalytics'));
export const AdminEmailTemplates = lazy(() => import('./admin/AdminEmailTemplates'));
export const AdminReports = lazy(() => import('./admin/AdminReports'));
export const AdminReportDetail = lazy(() => import('./admin/AdminReportDetail'));
export const AdminProfile = lazy(() => import('./admin/AdminProfile'));
export const AdminEmployees = lazy(() => import('./admin/AdminEmployees'));
export const AdminInvoices = lazy(() => import('./admin/AdminInvoices'));
export const EmployeeTimeReports = lazy(() => import('./admin/EmployeeTimeReports'));
export const EmployeeTimeReport = lazy(() => import('./admin/EmployeeTimeReport'));
export const ReceiptHistory = lazy(() => import('./admin/ReceiptHistory'));
export const SystemHealthCheck = lazy(() => import('./admin/SystemHealthCheck'));
export const TestEmailPage = lazy(() => import('./admin/TestEmailPage'));
export const AdminOrganizationDiagnostics = lazy(() => import('./admin/AdminOrganizationDiagnostics'));

// Conditionally export DevTools only in development
export const DevTools = import.meta.env.DEV 
  ? lazy(() => import('./admin/dev/DevTools'))
  : null;

// Partner pages
export const PartnerDashboard = lazy(() => import('./partner/PartnerDashboard'));
export const PartnerProfile = lazy(() => import('./partner/PartnerProfile'));

// Additional partner pages needed by routes
export const SubmitWorkOrder = lazy(() => import('./partner/SubmitWorkOrder'));
export const WorkOrderList = lazy(() => import('./partner/WorkOrderList'));
export const WorkOrderDetail = lazy(() => import('./partner/WorkOrderDetail'));
export const PartnerLocations = lazy(() => import('./partner/PartnerLocations'));
export const PartnerReports = lazy(() => import('./partner/PartnerReports'));
export const PartnerReportDetail = lazy(() => import('./partner/PartnerReportDetail'));

// Subcontractor pages
export const SubcontractorDashboard = lazy(() => import('./subcontractor/SubcontractorDashboard'));
export const SubcontractorWorkOrders = lazy(() => import('./subcontractor/SubcontractorWorkOrders'));
export const SubcontractorWorkOrderDetail = lazy(() => import('./subcontractor/SubcontractorWorkOrderDetail'));
export const SubcontractorProfile = lazy(() => import('./subcontractor/SubcontractorProfile'));

// Additional subcontractor pages needed by routes
export const SubmitReport = lazy(() => import('./subcontractor/SubmitReport'));
export const ReportHistory = lazy(() => import('./subcontractor/ReportHistory'));
export const ReportDetail = lazy(() => import('./subcontractor/ReportDetail'));
export const SubmitInvoice = lazy(() => import('./subcontractor/SubmitInvoice'));
export const SubcontractorInvoices = lazy(() => import('./subcontractor/SubcontractorInvoices'));

// Auth pages
export const Auth = lazy(() => import('./Auth'));
export const ResetPassword = lazy(() => import('./ResetPassword'));
