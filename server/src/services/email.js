const nodemailer = require('nodemailer');

const EMAIL_MODE = process.env.EMAIL_MODE || 'console';

let transporter = null;

function getTransporter() {
  if (EMAIL_MODE === 'console') return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, html }) {
  if (EMAIL_MODE === 'console') {
    console.log('\n===== EMAIL =====');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${html}`);
    console.log('=================\n');
    return;
  }

  const transport = getTransporter();
  await transport.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@onewayinterview.com',
    to,
    subject,
    html,
  });
}

async function sendInterviewLink(candidate, token) {
  const baseUrl = process.env.CANDIDATE_APP_URL || 'http://localhost:3002';
  const link = `${baseUrl}/interview/${token}`;

  await sendEmail({
    to: candidate.email,
    subject: `One-Way Video Interview Invitation - ${candidate.position_title || 'Open Position'}`,
    html: `
      <h2>Hello ${candidate.name},</h2>
      <p>You have been invited to complete a one-way video interview for the position of <strong>${candidate.position_title || 'Open Position'}</strong>.</p>
      <p>Please click the link below to start your interview:</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Start Interview</a></p>
      <p><small>This link is valid for 1 hour and can only be used once.</small></p>
      <p>Good luck!</p>
    `,
  });
}

async function sendSubmissionConfirmation(candidate) {
  await sendEmail({
    to: candidate.email,
    subject: 'Interview Submitted Successfully',
    html: `
      <h2>Thank you, ${candidate.name}!</h2>
      <p>Your one-way video interview responses have been successfully submitted.</p>
      <p>The recruiting team will review your responses and get back to you.</p>
      <p>Best regards,<br>The Interview Team</p>
    `,
  });
}

async function sendResubmitRequest(candidate, token, message) {
  const baseUrl = process.env.CANDIDATE_APP_URL || 'http://localhost:3002';
  const link = `${baseUrl}/interview/${token}`;

  await sendEmail({
    to: candidate.email,
    subject: 'Request to Resubmit Your Video Interview',
    html: `
      <h2>Hello ${candidate.name},</h2>
      <p>The recruiting team has requested that you resubmit your video interview.</p>
      ${message ? `<p><strong>Message from recruiter:</strong> ${message}</p>` : ''}
      <p>Please click the link below to record new responses:</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Re-record Interview</a></p>
      <p><small>This link is valid for 1 hour and can only be used once.</small></p>
    `,
  });
}

module.exports = { sendEmail, sendInterviewLink, sendSubmissionConfirmation, sendResubmitRequest };
