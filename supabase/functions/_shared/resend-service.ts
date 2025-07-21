
/**
 * Resend email service for WorkOrderPortal
 * Provides a simple interface to send emails using the Resend API
 */

interface SendEmailParams {
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
  from?: string;
}

interface SendEmailResponse {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send an email using the Resend API
 */
export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
  from = "AKC Contracting <support@akcllc.com>"
}: SendEmailParams): Promise<SendEmailResponse> {
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      return {
        success: false,
        error: "RESEND_API_KEY environment variable is not set"
      };
    }

    const payload = {
      from,
      to,
      subject,
      html,
      ...(replyTo && { reply_to: replyTo })
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", responseData);
      return {
        success: false,
        error: responseData.message || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    console.log("Email sent successfully:", responseData.id);
    
    return {
      success: true,
      id: responseData.id
    };

  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}
