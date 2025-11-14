import nodemailer from 'nodemailer';
import config from '../config/index.js';

/**
 * Email service using Nodemailer
 */
let transporter = null;

/**
 * Initialize email transporter
 */
const initTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: config.email.smtpHost,
    port: config.email.smtpPort,
    secure: false, // true for 465, false for other ports
    auth: {
      user: config.email.smtpUser,
      pass: config.email.smtpPass,
    },
  });

  return transporter;
};

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @param {string} options.text - Email text content (optional)
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const emailTransporter = initTransporter();

    // In development, log email instead of sending if SMTP is not configured
    if (config.server.nodeEnv === 'development' && !config.email.smtpUser) {
      console.log('📧 Email (mock):', {
        to,
        subject,
        html: html.substring(0, 100) + '...',
      });
      return { success: true, messageId: 'mock-email-id' };
    }

    const info = await emailTransporter.sendMail({
      from: `"CRM System" <${config.email.from}>`,
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      html,
    });

    console.log('📧 Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    // Don't throw error - email failures shouldn't break the app
    return { success: false, error: error.message };
  }
};

/**
 * Send notification email for lead updates
 */
export const sendLeadUpdateEmail = async (lead, updateType, updatedBy) => {
  try {
    // Only send if lead has an email
    if (!lead.email) return;

    const subject = `Lead ${updateType}: ${lead.firstName} ${lead.lastName}`;
    const html = `
      <h2>Lead ${updateType}</h2>
      <p>Hello,</p>
      <p>The lead <strong>${lead.firstName} ${lead.lastName}</strong> has been ${updateType.toLowerCase()}.</p>
      <p><strong>Status:</strong> ${lead.status}</p>
      ${lead.assignedTo ? `<p><strong>Assigned to:</strong> ${lead.assignedTo.firstName} ${lead.assignedTo.lastName}</p>` : ''}
      <p><strong>Updated by:</strong> ${updatedBy.firstName} ${updatedBy.lastName}</p>
      <p>Best regards,<br>CRM System</p>
    `;

    return await sendEmail({
      to: lead.email,
      subject,
      html,
    });
  } catch (error) {
    console.error('Failed to send lead update email:', error);
    return { success: false, error: error.message };
  }
};

