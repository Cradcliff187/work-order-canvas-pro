
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

interface WorkOrderReceivedProps {
  workOrderNumber: string;
  organizationName: string;
  storeLocation: string;
  tradeName: string;
  description: string;
  submittedDate: string;
  adminDashboardUrl: string;
  logoUrl?: string;
  companyName?: string;
  supportEmail?: string;
  poweredBy?: string;
}

export const WorkOrderReceived = ({
  workOrderNumber,
  organizationName,
  storeLocation,
  tradeName,
  description,
  submittedDate,
  adminDashboardUrl,
  logoUrl = '',
  companyName = 'AKC Contracting',
  supportEmail = 'support@akcllc.com',
  poweredBy = 'Powered by WorkOrderPortal'
}: WorkOrderReceivedProps) => (
  <Html>
    <Head />
    <Preview>New work order #{workOrderNumber} has been received and requires assignment</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          {logoUrl && (
            <img src={logoUrl} height="60" alt={`${companyName} Logo`} style={logo} />
          )}
          <Heading style={h1}>{companyName} Work Order Portal</Heading>
        </Section>

        <Heading style={h2}>New Work Order Received</Heading>
        
        <Text style={text}>
          A new work order has been submitted and is ready for assignment.
        </Text>

        <Section style={section}>
          <Text style={label}>Work Order Details:</Text>
          <Text style={detail}><strong>Work Order #:</strong> {workOrderNumber}</Text>
          <Text style={detail}><strong>Organization:</strong> {organizationName}</Text>
          <Text style={detail}><strong>Store Location:</strong> {storeLocation}</Text>
          <Text style={detail}><strong>Trade:</strong> {tradeName}</Text>
          <Text style={detail}><strong>Submitted:</strong> {submittedDate}</Text>
        </Section>

        <Section style={section}>
          <Text style={label}>Description:</Text>
          <Text style={descriptionStyle}>{description}</Text>
        </Section>

        <Section style={section}>
          <Button style={button} href={adminDashboardUrl}>
            View & Assign Work Order
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          {poweredBy}<br/>
          For support, contact us at <Link href={`mailto:${supportEmail}`} style={footerLink}>{supportEmail}</Link>
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

const header = {
  textAlign: 'center' as const,
  marginBottom: '32px',
  backgroundColor: '#1e40af',
  padding: '20px',
  borderRadius: '8px 8px 0 0',
};

const logo = {
  margin: '0 auto 10px',
};

const h1 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
};

const h2 = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 24px 0',
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

const descriptionStyle = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  backgroundColor: '#f9fafb',
  padding: '12px',
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
} as const;

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

const footerLink = {
  color: '#2563eb',
  textDecoration: 'none',
};

export default WorkOrderReceived;
