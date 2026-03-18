/**
 * Email service using Hostinger SMTP (credentials from .env)
 */
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: true, // SSL
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
});

// Verify connection on startup
transporter.verify((error) => {
    if (error) console.warn('📧 SMTP not connected:', error.message);
    else console.log('📧 Email service ready (Hostinger SMTP)');
});

const FROM = process.env.MAIL_FROM || `"Dropwing OS" <${process.env.SMTP_USER}>`;

/**
 * Send a task assignment email
 */
const sendTaskAssigned = async ({ to, toName, taskTitle, assignedBy, dueDate }) => {
    return transporter.sendMail({
        from: FROM,
        to,
        subject: `📋 New Task Assigned: ${taskTitle}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f14; color: #e2e0f0; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <span style="font-size: 28px;">⬡</span>
          <h2 style="color: #6c63ff; margin: 8px 0 0;">Dropwing Groups</h2>
        </div>
        <h3 style="color: #ffffff;">Hi ${toName},</h3>
        <p>You have been assigned a new task:</p>
        <div style="background: #1a1a2e; border-left: 4px solid #6c63ff; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #6c63ff; margin: 0 0 8px;">${taskTitle}</h4>
          ${dueDate ? `<p style="margin: 0; color: #9d9bb5; font-size: 14px;">Due: ${new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>` : ''}
          ${assignedBy ? `<p style="margin: 4px 0 0; color: #9d9bb5; font-size: 14px;">Assigned by: ${assignedBy}</p>` : ''}
        </div>
        <p><a href="http://localhost:5173/tasks" style="background: #6c63ff; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Task →</a></p>
        <p style="color: #6b6989; font-size: 12px; margin-top: 32px;">Dropwing Groups Internal Portal · dropwinggroups.com</p>
      </div>
    `,
    });
};

/**
 * Send an announcement notification email
 */
const sendAnnouncementEmail = async ({ to, toName, title, body, postedBy }) => {
    return transporter.sendMail({
        from: FROM,
        to,
        subject: `📢 New Announcement: ${title}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f14; color: #e2e0f0; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <span style="font-size: 28px;">⬡</span>
          <h2 style="color: #6c63ff; margin: 8px 0 0;">Dropwing Groups</h2>
        </div>
        <h3 style="color: #ffffff;">Hi ${toName},</h3>
        <p>A new announcement has been posted:</p>
        <div style="background: #1a1a2e; border-left: 4px solid #ff6584; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #ff6584; margin: 0 0 8px;">${title}</h4>
          ${body ? `<p style="margin: 0; color: #c8c6d6; font-size: 14px;">${body}</p>` : ''}
          ${postedBy ? `<p style="margin: 8px 0 0; color: #9d9bb5; font-size: 12px;">Posted by: ${postedBy}</p>` : ''}
        </div>
        <p><a href="http://localhost:5173/announcements" style="background: #ff6584; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Announcement →</a></p>
        <p style="color: #6b6989; font-size: 12px; margin-top: 32px;">Dropwing Groups Internal Portal · dropwinggroups.com</p>
      </div>
    `,
    });
};

/**
 * Send a leave request status email
 */
const sendLeaveStatus = async ({ to, toName, status, startDate, endDate, reviewedBy }) => {
    const approved = status === 'approved';
    const color = approved ? '#22c55e' : '#ef4444';
    const emoji = approved ? '✅' : '❌';
    return transporter.sendMail({
        from: FROM,
        to,
        subject: `${emoji} Leave Request ${approved ? 'Approved' : 'Rejected'}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f14; color: #e2e0f0; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <span style="font-size: 28px;">⬡</span>
          <h2 style="color: #6c63ff; margin: 8px 0 0;">Dropwing Groups</h2>
        </div>
        <h3 style="color: #ffffff;">Hi ${toName},</h3>
        <p>Your leave request has been <strong style="color: ${color};">${status}</strong>.</p>
        <div style="background: #1a1a2e; border-left: 4px solid ${color}; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #c8c6d6;">Period: ${new Date(startDate).toLocaleDateString('en-IN')} – ${new Date(endDate).toLocaleDateString('en-IN')}</p>
          ${reviewedBy ? `<p style="margin: 4px 0 0; color: #9d9bb5; font-size: 13px;">Reviewed by: ${reviewedBy}</p>` : ''}
        </div>
        <p><a href="http://localhost:5173/leave" style="background: ${color}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Details →</a></p>
        <p style="color: #6b6989; font-size: 12px; margin-top: 32px;">Dropwing Groups Internal Portal · dropwinggroups.com</p>
      </div>
    `,
    });
};

/**
 * Generic notification email
 */
const sendGenericEmail = async ({ to, subject, html }) => {
    return transporter.sendMail({ from: FROM, to, subject, html });
};

module.exports = { sendTaskAssigned, sendAnnouncementEmail, sendLeaveStatus, sendGenericEmail };
