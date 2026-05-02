const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email using the configured SMTP server.
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"InternalX Notifications" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[Email Service] Message sent successfully to ${to} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email Service] Error sending email to ${to}:`, error);
    return { success: false, error };
  }
};

const sendTaskAssignmentEmail = async (userEmail, userName, taskTitle, assignedBy, projectName) => {
  const subject = `[InternalX] New Task Assigned: ${taskTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #8b5cf6; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px;">New Task Assignment</h2>
      <p style="font-size: 16px; color: #374151;">Hello <strong>${userName}</strong>,</p>
      <p style="font-size: 16px; color: #374151;">You have been assigned a new task by <strong>${assignedBy}</strong>.</p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1f2937;">Task Details</h3>
        <p style="margin: 5px 0;"><strong>Title:</strong> ${taskTitle}</p>
        ${projectName ? `<p style="margin: 5px 0;"><strong>Project:</strong> ${projectName}</p>` : ''}
      </div>
      
      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">Log in to the InternalX portal to view your tasks and update their status.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">This is an automated message from InternalX. Please do not reply.</p>
    </div>
  `;
  return await sendEmail({ to: userEmail, subject, html });
};

const sendOTPEmail = async (userEmail, userName, otp) => {
  const subject = `[InternalX] Your Login OTP`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #8b5cf6; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px;">Login Authentication</h2>
      <p style="font-size: 16px; color: #374151;">Hello <strong>${userName}</strong>,</p>
      <p style="font-size: 16px; color: #374151;">Your One-Time Password (OTP) for logging in is:</p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
        <h1 style="margin: 0; color: #1f2937; letter-spacing: 5px;">${otp}</h1>
      </div>
      
      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">This OTP is valid for 5 minutes. Do not share it with anyone.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">This is an automated message from InternalX. Please do not reply.</p>
    </div>
  `;
  return await sendEmail({ to: userEmail, subject, html });
};

const sendPasswordResetEmail = async (userEmail, userName, resetUrl) => {
  const subject = `[InternalX] Password Reset Request`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #8b5cf6; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px;">Password Reset Request</h2>
      <p style="font-size: 16px; color: #374151;">Hello <strong>${userName}</strong>,</p>
      <p style="font-size: 16px; color: #374151;">We received a request to reset your password. Click the button below to set a new password:</p>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
      </div>
      
      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">This link is valid for 15 minutes. If you did not request this, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">This is an automated message from InternalX. Please do not reply.</p>
    </div>
  `;
  return await sendEmail({ to: userEmail, subject, html });
};

module.exports = {
  transporter,
  sendEmail,
  sendTaskAssignmentEmail,
  sendOTPEmail,
  sendPasswordResetEmail
};
