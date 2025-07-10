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

interface WorkOrderCompletedProps {
  workOrderNumber: string;
  organizationName: string;
  storeLocation: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  tradeName: string;
  subcontractorName: string;
  completedDate: string;
  workPerformed: string;
  invoiceAmount: number;
  workOrderUrl: string;
}

export const WorkOrderCompleted = ({
  workOrderNumber,
  organizationName,
  storeLocation,
  streetAddress,
  city,
  state,
  zipCode,
  tradeName,
  subcontractorName,
  completedDate,
  workPerformed,
  invoiceAmount,
  workOrderUrl,
}: WorkOrderCompletedProps) => (
  <Html>
    <Head />
    <Preview>Work order #{workOrderNumber} has been completed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Work Order Completed</Heading>
        
        <Text style={text}>
          Great news! Work order #{workOrderNumber} has been completed successfully.
        </Text>

        <Section style={section}>
          <Text style={label}>Work Order Details:</Text>
          <Text style={detail}><strong>Work Order #:</strong> {workOrderNumber}</Text>
          <Text style={detail}><strong>Organization:</strong> {organizationName}</Text>
          <Text style={detail}><strong>Store Location:</strong> {storeLocation}</Text>
          <Text style={detail}><strong>Trade:</strong> {tradeName}</Text>
          <Text style={detail}><strong>Completed By:</strong> {subcontractorName}</Text>
          <Text style={detail}><strong>Completion Date:</strong> {completedDate}</Text>
        </Section>

        <Section style={section}>
          <Text style={label}>Work Location:</Text>
          <Text style={detail}>{streetAddress}</Text>
          <Text style={detail}>{city}, {state} {zipCode}</Text>
        </Section>

        <Section style={section}>
          <Text style={label}>Work Summary:</Text>
          <Text style={description}>{workPerformed}</Text>
        </Section>

        <Section style={section}>
          <Text style={label}>Final Invoice Amount:</Text>
          <Text style={detail}><strong>${invoiceAmount.toFixed(2)}</strong></Text>
        </Section>

        <Section style={section}>
          <Button style={button} href={workOrderUrl}>
            View Complete Work Order
          </Button>
        </Section>

        <Section style={section}>
          <Text style={text}>
            The work has been completed and approved. All documentation, photos, and invoicing details 
            are available in your admin dashboard for your records.
          </Text>
        </Section>

        <Section style={section}>
          <Text style={text}>
            <strong>Next Steps:</strong>
          </Text>
          <Text style={text}>
            • Review the completed work documentation<br/>
            • Process payment according to your billing procedures<br/>
            • Archive the work order for future reference
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

export default WorkOrderCompleted;