import nodemailer from 'nodemailer';
import { config } from '../config/env';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'AYPA Accra Diocese <no-reply@aypa-accra.org>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const createTransporter = () => {
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return null;
};

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async ({ to, subject, html, text }: SendEmailParams): Promise<boolean> => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`[Email Service - Simulated Send]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body Snippet: ${text || html.slice(0, 150)}...`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
      text: text || subject,
    });
    console.log(`[Email Service] Successfully sent email to ${to}`);
    return true;
  } catch (error) {
    console.error(`[Email Service Error] Failed to send email to ${to}:`, error);
    // Return false but do not throw - email failure should not crash valid registration or reset logic
    return false;
  }
};

const getBaseEmailTemplate = (title: string, contentHtml: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background-color: #00205B; color: #ffffff; padding: 24px; text-align: center; border-bottom: 4px solid #D4AF37; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 4px 0 0 0; font-size: 12px; color: #D4AF37; text-transform: uppercase; tracking: 1px; }
    .content { padding: 32px 24px; line-height: 1.6; font-size: 14px; color: #334155; }
    .btn { display: inline-block; background-color: #00205B; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px; margin-top: 16px; border: 1px solid #D4AF37; }
    .footer { background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AYPA Accra Diocese</h1>
      <p>Anglican Youth Association Platform</p>
    </div>
    <div class="content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Anglican Youth Association — Accra Diocese. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

export const sendMemberRegistrationEmail = async (user: { name: string; email: string; branchName?: string }) => {
  const loginUrl = `${FRONTEND_URL}/login`;
  const html = getBaseEmailTemplate(
    'Welcome to AYPA Accra Diocese',
    `
      <h2 style="color: #00205B; margin-top: 0;">Welcome, ${user.name}!</h2>
      <p>Thank you for joining the Anglican Youth Association (AYPA) Accra Diocese online community platform.</p>
      <p><strong>Parish / Branch:</strong> ${user.branchName || 'Accra Diocese Branch'}</p>
      <p>Your member account is active. You can now log into your youth portal to view events, devotionals, and parish announcements.</p>
      <p><a href="${loginUrl}" class="btn">Log In to AYPA Workspace</a></p>
    `
  );

  return sendEmail({
    to: user.email,
    subject: 'Welcome to AYPA Accra Diocese Community',
    html,
  });
};

export const sendExecutivePendingApprovalEmail = async (user: { name: string; email: string; role: string; branchName?: string }) => {
  const html = getBaseEmailTemplate(
    'Executive Registration Pending Approval',
    `
      <h2 style="color: #00205B; margin-top: 0;">Registration Received, ${user.name}</h2>
      <p>Your application for executive registration on the AYPA Accra Diocese platform has been submitted successfully.</p>
      <p><strong>Requested Role:</strong> ${user.role.replace(/_/g, ' ').toUpperCase()}</p>
      <p><strong>Parish / Branch:</strong> ${user.branchName || 'Accra Diocese Secretariat'}</p>
      <p>Because executive roles grant supervisory and management permissions, your account requires administrative verification. You will receive an email as soon as an administrator reviews and approves your account.</p>
    `
  );

  return sendEmail({
    to: user.email,
    subject: 'AYPA Executive Account Pending Approval',
    html,
  });
};

export const sendPasswordResetEmail = async (user: { name: string; email: string; resetToken: string }) => {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${user.resetToken}`;
  const html = getBaseEmailTemplate(
    'Reset Your AYPA Password',
    `
      <h2 style="color: #00205B; margin-top: 0;">Hello ${user.name},</h2>
      <p>We received a request to reset the password for your AYPA Accra Diocese account.</p>
      <p>Click the button below to choose a new password. This link is valid for 1 hour.</p>
      <p><a href="${resetUrl}" class="btn">Reset My Password</a></p>
      <p style="font-size: 12px; color: #64748b; margin-top: 24px;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
    `
  );

  return sendEmail({
    to: user.email,
    subject: 'Reset Your Password — AYPA Accra Diocese',
    html,
  });
};

export const sendTenureChangeEmail = async (user: { name: string; email: string; newRole: string; reason?: string }) => {
  const loginUrl = `${FRONTEND_URL}/login`;
  const html = getBaseEmailTemplate(
    'AYPA Executive Appointment Update',
    `
      <h2 style="color: #00205B; margin-top: 0;">Appointment Update — ${user.name}</h2>
      <p>This is an official notification that your executive appointment status on the AYPA Accra Diocese platform has been updated.</p>
      <p><strong>Current Role:</strong> ${user.newRole.replace(/_/g, ' ').toUpperCase()}</p>
      ${user.reason ? `<p><strong>Details / Reason:</strong> ${user.reason}</p>` : ''}
      <p>Your general AYPA membership, history, and parish affiliation remain active. You can log into your account at any time.</p>
      <p><a href="${loginUrl}" class="btn">Access AYPA Portal</a></p>
    `
  );

  return sendEmail({
    to: user.email,
    subject: 'AYPA Executive Tenure & Role Status Update',
    html,
  });
};

export const sendExecutiveAppointmentEmail = async (params: {
  name: string;
  email: string;
  role: string;
  position?: string;
  scope?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const loginUrl = `${FRONTEND_URL}/login`;
  const html = getBaseEmailTemplate(
    'Official Executive Appointment',
    `
      <h2 style="color: #00205B; margin-top: 0;">Executive Appointment Confirmation</h2>
      <p>Dear ${params.name},</p>
      <p>We are pleased to inform you that you have been appointed to an executive position on the AYPA Accra Diocese platform.</p>
      <p><strong>Executive Role:</strong> ${params.role.replace(/_/g, ' ').toUpperCase()}</p>
      ${params.position ? `<p><strong>Title / Position:</strong> ${params.position}</p>` : ''}
      ${params.scope ? `<p><strong>Organizational Scope:</strong> ${params.scope}</p>` : ''}
      ${params.startDate ? `<p><strong>Start Date:</strong> ${params.startDate}</p>` : ''}
      ${params.endDate ? `<p><strong>End Date:</strong> ${params.endDate}</p>` : ''}
      <p>Your member account has been updated with your new executive responsibilities and permissions. You may now log in to access executive tools and workspace features.</p>
      <p><a href="${loginUrl}" class="btn">Log In to AYPA Executive Workspace</a></p>
    `
  );

  return sendEmail({
    to: params.email,
    subject: 'Official Executive Appointment — AYPA Accra Diocese',
    html,
  });
};

export const sendEventRegistrationConfirmationEmail = async (params: {
  fullName: string;
  email: string;
  eventName: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  registrationId?: string;
}) => {
  const html = getBaseEmailTemplate(
    'Event Registration Confirmation',
    `
      <h2 style="color: #00205B; margin-top: 0;">Event Registration Confirmed</h2>
      <p>Dear ${params.fullName},</p>
      <p>Thank you for registering for <strong>${params.eventName}</strong>.</p>
      ${params.eventDate ? `<p><strong>Date:</strong> ${params.eventDate}</p>` : ''}
      ${params.eventTime ? `<p><strong>Time:</strong> ${params.eventTime}</p>` : ''}
      ${params.eventLocation ? `<p><strong>Location:</strong> ${params.eventLocation}</p>` : ''}
      ${params.registrationId ? `<p><strong>Registration Reference:</strong> ${params.registrationId}</p>` : ''}
      <p>We look forward to your participation in this AYPA event.</p>
    `
  );

  return sendEmail({
    to: params.email,
    subject: `Registration Confirmed: ${params.eventName} — AYPA Accra Diocese`,
    html,
  });
};
