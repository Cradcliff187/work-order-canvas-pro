import React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components';

interface ReportSubmittedProps {
  workOrderNumber: string;
  subcontractorName: string;
  organizationName: string;
  storeLocation: string;
  workPerformed: string;
  hoursWorked?: number;
  invoiceAmount: number;
  submittedDate: string;
  reviewUrl: string;
}

export const ReportSubmitted = ({
  workOrderNumber,
  subcontractorName,
  organizationName,
  storeLocation,
  workPerformed,
  hoursWorked,
  invoiceAmount,
  submittedDate,
  reviewUrl,
}: ReportSubmittedProps) => (
  <Html>
    <Head />
    <Preview>Work completion report submitted for work order #{workOrderNumber}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Work Report Submitted</Heading>
        
        <Text style={text}>
          A work completion report has been submitted and is ready for review.
        </Text>

        <Section style={section}>
          <Text style={label}>Work Order Details:</Text>
          <Text style={detail}><strong>Work Order #:</strong> {workOrderNumber}</Text>
          <Text style={detail}><strong>Subcontractor:</strong> {subcontractorName}</Text>
          <Text style={detail}><strong>Organization:</strong> {organizationName}</Text>
          <Text style={detail}><strong>Store Location:</strong> {storeLocation}</Text>
          <Text style={detail}><strong>Submitted:</strong> {submittedDate}</Text>
        </Section>

        <Section style={section}>
          <Text style={label}>Work Summary:</Text>
          <Text style={description}>{workPerformed}</Text>
        </Section>

        <Section style={section}>
          <Text style={label}>Billing Information:</Text>
          {hoursWorked && (
            <Text style={detail}><strong>Hours Worked:</strong> {hoursWorked}</Text>
          )}
          <Text style={detail}><strong>Invoice Amount:</strong> ${invoiceAmount.toFixed(2)}</Text>
        </Section>

        <Section style={section}>
          <Button style={button} href={reviewUrl}>
            Review & Approve Report
          </Button>
        </Section>

        <Section style={section}>
          <Text style={text}>
            <strong>Action Required:</strong>
          </Text>
          <Text style={text}>
            Please review the submitted work report, including any attached photos and documentation. 
            You can approve or request changes directly from the admin dashboard.
          </Text>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          This email was sent by WorkOrderPro - Work Order Management System
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
};

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
};

const section = {
  margin: '24px 0',
};

const label = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const detail = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
};

const description = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  backgroundColor: '#f9fafb',
  padding: '12px',
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  margin: '16px 0',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const footer = {
  color: '#6b7280',
  fontSize: '12px',
  textAlign: 'center' as const,
};

export default ReportSubmitted;