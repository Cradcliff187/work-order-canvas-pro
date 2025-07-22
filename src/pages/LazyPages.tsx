
import { lazy } from 'react';

// Admin pages
export const AdminDashboard = lazy(() => import('./AdminDashboard'));
export const EmployeeDashboard = lazy(() => import('./EmployeeDashboard'));
export const AdminUsers = lazy(() => import('./AdminUsers'));
export const AdminOrganizations = lazy(() => import('./AdminOrganizations'));
export const AdminWorkOrders = lazy(() => import('./AdminWorkOrders'));
export const AdminWorkOrderDetail = lazy(() => import('./AdminWorkOrderDetail'));
export const AdminWorkOrderEdit = lazy(() => import('./AdminWorkOrderEdit'));
export const AdminAnalytics = lazy(() => import('./AdminAnalytics'));
export const AdminEmailTemplates = lazy(() => import('./AdminEmailTemplates'));
export const AdminReports = lazy(() => import('./AdminReports'));
export const AdminReportDetail = lazy(() => import('./AdminReportDetail'));
export const AdminProfile = lazy(() => import('./AdminProfile'));
export const AdminEmployees = lazy(() => import('./AdminEmployees'));
export const AdminInvoices = lazy(() => import('./AdminInvoices'));
export const EmployeeTimeReports = lazy(() => import('./EmployeeTimeReports'));
export const EmployeeTimeReport = lazy(() => import('./EmployeeTimeReport'));
export const ReceiptHistory = lazy(() => import('./ReceiptHistory'));
export const SystemHealthCheck = lazy(() => import('./SystemHealthCheck'));
export const TestEmailPage = lazy(() => import('./TestEmailPage'));
export const AdminOrganizationDiagnostics = lazy(() => import('./AdminOrganizationDiagnostics'));

// Conditionally export DevTools only in development
export const DevTools = import.meta.env.DEV 
  ? lazy(() => import('./admin/dev/DevTools'))
  : null;

// Partner pages
export const PartnerDashboard = lazy(() => import('./PartnerDashboard'));
export const PartnerWorkOrders = lazy(() => import('./PartnerWorkOrders'));
export const PartnerWorkOrderDetail = lazy(() => import('./PartnerWorkOrderDetail'));
export const PartnerWorkOrderForm = lazy(() => import('./PartnerWorkOrderForm'));
export const PartnerProfile = lazy(() => import('./PartnerProfile'));

// Subcontractor pages
export const SubcontractorDashboard = lazy(() => import('./SubcontractorDashboard'));
export const SubcontractorWorkOrders = lazy(() => import('./SubcontractorWorkOrders'));
export const SubcontractorWorkOrderDetail = lazy(() => import('./SubcontractorWorkOrderDetail'));
export const SubcontractorReports = lazy(() => import('./SubcontractorReports'));
export const SubcontractorReportForm = lazy(() => import('./SubcontractorReportForm'));
export const SubcontractorProfile = lazy(() => import('./SubcontractorProfile'));

// Auth pages
export const Login = lazy(() => import('./Login'));
export const Register = lazy(() => import('./Register'));
export const ForgotPassword = lazy(() => import('./ForgotPassword'));
export const ResetPassword = lazy(() => import('./ResetPassword'));
