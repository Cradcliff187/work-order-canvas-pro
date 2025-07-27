import { lazy } from 'react';

// Admin Pages
export const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
export const EmployeeDashboard = lazy(() => import('@/pages/admin/EmployeeDashboard'));
export const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'));
export const AdminOrganizations = lazy(() => import('@/pages/admin/AdminOrganizations'));
export const AdminPartnerLocations = lazy(() => import('@/pages/admin/AdminPartnerLocations'));
export const AdminWorkOrders = lazy(() => import('@/pages/admin/AdminWorkOrders'));
export const AdminWorkOrderDetail = lazy(() => import('@/pages/admin/AdminWorkOrderDetail'));
export const AdminWorkOrderEdit = lazy(() => import('@/pages/admin/AdminWorkOrderEdit'));
export const AdminSubmitReport = lazy(() => import('@/pages/admin/AdminSubmitReport'));
export const AdminAnalytics = lazy(() => import('@/pages/admin/AdminAnalytics'));
export const AdminEmailTemplates = lazy(() => import('@/pages/admin/AdminEmailTemplates'));
export const AdminProfile = lazy(() => import('@/pages/admin/AdminProfile'));
export const AdminEmployees = lazy(() => import('@/pages/admin/AdminEmployees'));
export const AdminInvoices = lazy(() => import('@/pages/admin/AdminInvoices'));
export const EmployeeTimeReports = lazy(() => import('@/pages/admin/EmployeeTimeReports'));
export const EmployeeTimeReport = lazy(() => import('@/pages/admin/EmployeeTimeReport'));
export const ReceiptHistory = lazy(() => import('@/pages/admin/ReceiptHistory'));
export const AdminUtilities = lazy(() => import('@/pages/admin/AdminUtilities'));
export const AdminApprovals = lazy(() => import('@/pages/admin/AdminApprovals'));

// Partner Pages
export const PartnerDashboard = lazy(() => import('@/pages/partner/PartnerDashboard'));
export const SubmitWorkOrder = lazy(() => import('@/pages/partner/SubmitWorkOrder'));
export const WorkOrderList = lazy(() => import('@/pages/partner/WorkOrderList'));
export const WorkOrderDetail = lazy(() => import('@/pages/partner/WorkOrderDetail'));
export const PartnerLocations = lazy(() => import('@/pages/partner/PartnerLocations'));
export const PartnerProfile = lazy(() => import('@/pages/partner/PartnerProfile'));

// Subcontractor Pages
export const SubcontractorDashboard = lazy(() => import('@/pages/subcontractor/SubcontractorDashboard'));
export const SubcontractorWorkOrders = lazy(() => import('@/pages/subcontractor/SubcontractorWorkOrders'));
export const SubcontractorWorkOrderDetail = lazy(() => import('@/pages/subcontractor/SubcontractorWorkOrderDetail'));
export const SubmitReport = lazy(() => import('@/pages/subcontractor/SubmitReport'));
export const ReportHistory = lazy(() => import('@/pages/subcontractor/ReportHistory'));
export const ReportDetail = lazy(() => import('@/pages/subcontractor/ReportDetail'));
export const SubcontractorProfile = lazy(() => import('@/pages/subcontractor/SubcontractorProfile'));
export const SubmitInvoice = lazy(() => import('@/pages/subcontractor/SubmitInvoice'));
export const SubcontractorInvoices = lazy(() => import('@/pages/subcontractor/SubcontractorInvoices'));

// Other Pages
export const Auth = lazy(() => import('@/pages/Auth'));
export const DevTools = lazy(() => import('@/pages/DevTools'));


// Report Pages
export const AdminReports = lazy(() => import('@/pages/admin/AdminReports'));
export const AdminReportDetail = lazy(() => import('@/pages/admin/AdminReportDetail'));
export const PartnerReports = lazy(() => import('@/pages/partner/PartnerReports'));
export const PartnerReportDetail = lazy(() => import('@/pages/partner/PartnerReportDetail'));

// System Pages
export const SystemHealthCheck = lazy(() => import('@/pages/admin/SystemHealthCheck'));
export const TestEmailPage = lazy(() => import('@/pages/admin/TestEmailPage'));

