import { lazy } from 'react';

// Admin Pages
export const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
export const AdminTimeManagement = lazy(() => import('@/pages/admin/AdminTimeManagement'));

// Employee Pages
export const EmployeeDashboardEmployee = lazy(() => import('@/pages/employee/Dashboard'));
export const EmployeeTimeReportsPage = lazy(() => import('@/pages/employee/TimeReports'));
export const TimeReportSubmission = lazy(() => import('@/pages/employee/TimeReportSubmission'));
export const DailyRoute = lazy(() => import('@/pages/employee/DailyRoute'));
// EmployeeReceiptsPage removed - replaced with SmartReceiptFlow
export const PipelineDashboard = lazy(() => import('@/pages/admin/PipelineDashboard'));
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
export const AdminSubcontractorBills = lazy(() => import('@/pages/admin/SubcontractorBills'));
export const ReceiptHistory = lazy(() => import('@/pages/admin/ReceiptHistory'));
export const AdminReceipts = lazy(() => import('@/pages/admin/AdminReceipts'));
export const AdminUtilities = lazy(() => import('@/pages/admin/AdminUtilities'));
export const AdminProjects = lazy(() => import('@/pages/admin/Projects'));

// Partner Invoicing Pages
export const SelectReports = lazy(() => import('@/pages/admin/partner-billing/SelectReports'));
export const PartnerInvoiceDetail = lazy(() => import('@/pages/admin/partner-billing/PartnerInvoiceDetail'));
export const PartnerInvoices = lazy(() => import('@/pages/admin/partner-billing/PartnerInvoices'));

// Partner Pages
export const PartnerDashboard = lazy(() => import('@/pages/partner/PartnerDashboard'));
export const SubmitWorkOrder = lazy(() => import('@/pages/partner/SubmitWorkOrder'));
export const WorkOrderList = lazy(() => import('@/pages/partner/WorkOrderList'));
export const WorkOrderDetail = lazy(() => import('@/pages/partner/WorkOrderDetail'));
export const PartnerLocations = lazy(() => import('@/pages/partner/PartnerLocations'));
export const PartnerProfile = lazy(() => import('@/pages/partner/PartnerProfile'));
export const PartnerInvoicesPage = lazy(() => import('@/pages/partner/PartnerInvoices'));

// Subcontractor Pages
export const SubcontractorDashboard = lazy(() => import('@/pages/subcontractor/SubcontractorDashboard'));
export const SubcontractorWorkOrders = lazy(() => import('@/pages/subcontractor/SubcontractorWorkOrders'));
export const SubcontractorWorkOrderDetail = lazy(() => import('@/pages/subcontractor/SubcontractorWorkOrderDetail'));
export const SubmitReport = lazy(() => import('@/pages/subcontractor/SubmitReport'));
export const ReportHistory = lazy(() => import('@/pages/subcontractor/ReportHistory'));
export const ReportDetail = lazy(() => import('@/pages/subcontractor/ReportDetail'));
export const SubcontractorProfile = lazy(() => import('@/pages/subcontractor/SubcontractorProfile'));
export const SubmitBill = lazy(() => import('@/pages/subcontractor/SubmitBill'));
export const SubcontractorBills = lazy(() => import('@/pages/subcontractor/SubcontractorBills'));

// Other Pages
export const Auth = lazy(() => import('@/pages/Auth'));
// DevTools removed - no longer needed


// Report Pages
export const AdminReports = lazy(() => import('@/pages/admin/AdminReports'));
export const AdminReportDetail = lazy(() => import('@/pages/admin/AdminReportDetail'));
export const PartnerReports = lazy(() => import('@/pages/partner/PartnerReports'));
export const PartnerReportDetail = lazy(() => import('@/pages/partner/PartnerReportDetail'));

// System Pages
export const SystemHealthCheck = lazy(() => import('@/pages/admin/SystemHealthCheck'));
export const TestEmailPage = lazy(() => import('@/pages/admin/TestEmailPage'));
export const BillingDashboard = lazy(() => import('@/pages/admin/BillingDashboard'));
export const SecurityAudit = lazy(() => import('@/pages/admin/SecurityAudit'));

// Component-level lazy loading  
export const SmartReceiptFlow = lazy(() => import('@/components/receipts/SmartReceiptFlow').then(module => ({ default: module.SmartReceiptFlow })));
export const FileUpload = lazy(() => import('@/components/FileUpload').then(module => ({ default: module.FileUpload })));

// Future modal components (currently unused but ready for implementation)
// export const RetroactiveTimeModal = lazy(() => import('@/components/employee/retroactive/RetroactiveTimeModal').then(module => ({ default: module.RetroactiveTimeModal })));

// Migration Pages - REMOVED (migration complete)
