
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
}

export const WorkOrderReceived = ({
  workOrderNumber,
  organizationName,
  storeLocation,
  tradeName,
  description,
  submittedDate,
  adminDashboardUrl,
}: WorkOrderReceivedProps) => (
  <Html>
    <Head />
    <Preview>New work order #{workOrderNumber} has been received and requires assignment</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New Work Order Received</Heading>
        
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
          <Text style={description}>{description}</Text>
        </Section>

        <Section style={section}>
          <Button style={button} href={adminDashboardUrl}>
            View & Assign Work Order
          </Button>
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

export default WorkOrderReceived;
