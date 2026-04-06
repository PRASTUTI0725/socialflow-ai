/**
 * Notification Service — placeholders for future integrations
 * Currently logs to console. Ready for WhatsApp, Email, Scheduling tool integration.
 */

// --- Types ---

interface NotificationPayload {
  clientId: string;
  clientName: string;
  action: string;
  meta: Record<string, string>;
}

// --- Placeholder implementations ---

export function sendApprovalNotification(payload: NotificationPayload): void {
  // TODO: Integrate with WhatsApp Business API
  // TODO: Integrate with Email service (SendGrid, Resend)
  console.log(`[NOTIFICATION] Strategy approved for ${payload.clientName}`, payload.meta);
}

export function sendPipelineCreatedNotification(payload: NotificationPayload): void {
  console.log(`[NOTIFICATION] Pipeline created for ${payload.clientName}`, payload.meta);
}

export function sendRejectionNotification(payload: NotificationPayload): void {
  console.log(`[NOTIFICATION] Strategy rejected for ${payload.clientName}`, payload.meta);
}

export function sendScheduleReminder(payload: NotificationPayload): void {
  console.log(`[NOTIFICATION] Schedule reminder for ${payload.clientName}`, payload.meta);
}

// --- Future integration hooks ---

export async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  // Placeholder for WhatsApp Business API
  // Would use: POST https://graph.facebook.com/v17.0/{phone_number_id}/messages
  console.log(`[WHATSAPP] Would send to ${phone}: ${message}`);
  return true;
}

export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  // Placeholder for email service (SendGrid, Resend, etc.)
  console.log(`[EMAIL] Would send to ${to}: ${subject}`);
  return true;
}

export async function schedulePost(platform: string, content: string, date: string): Promise<boolean> {
  // Placeholder for scheduling tool integration (Buffer, Later, etc.)
  console.log(`[SCHEDULE] Would schedule on ${platform} for ${date}: ${content.slice(0, 50)}...`);
  return true;
}
