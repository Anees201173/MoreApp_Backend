const nodemailer = require("nodemailer");
const config = require("../config/config");

// Create transporter
const createTransporter = () => {
  console.log("Email config:", {
    host: config.email.host,
    port: config.email.port,
    user: config.email.user,
    pass: config.email.pass ? "SET" : "NOT SET",
  });

  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: false,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
    debug: true, // Enable debug logs
    logger: true, // Enable logger
  });
};

// Send email
const sendEmail = async (options) => {
  try {
    // Check if Gmail credentials are properly set
    const hasGmailCredentials =
      config.email.user &&
      config.email.pass &&
      config.email.user.includes("@gmail.com");

    console.log("here are the gmail credentials:", hasGmailCredentials);

    if (!hasGmailCredentials) {
      // Use Ethereal Email for testing when Gmail credentials are not available
      const testAccount = await nodemailer.createTestAccount();

      const transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const mailOptions = {
        from: `${options.fromName || "Swiss Mail"} <${testAccount.user}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const info = await transporter.sendMail(mailOptions);

      console.log("📧 TEST EMAIL SENT via Ethereal:");
      console.log("From:", mailOptions.from);
      console.log("To:", options.to);
      console.log("Subject:", options.subject);
      console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
      console.log("-------------------");

      return {
        messageId: info.messageId,
        response: info.response,
        previewUrl: nodemailer.getTestMessageUrl(info),
        ethereal: true,
      };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `${options.fromName || "Swiss Mail "} <${config.email.user}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
};

// Send welcome email
const sendWelcomeEmail = async (user) => {
  const options = {
    to: user.email,
    subject: "Welcome to Our Platform!",
    html: `
      <h1>Welcome ${user.first_name}!</h1>
      <p>Thank you for joining our platform. We're excited to have you aboard!</p>
      <p>Your account has been successfully created with the email: ${user.email}</p>
      <p>If you have any questions, feel free to contact our support team.</p>
      <br>
      <p>Best regards,<br>The Team</p>
    `,
  };

  return await sendEmail(options);
};

// Send password reset email
const sendPasswordResetEmail = async (user, otp) => {
  const options = {
    to: user.email,
    subject: "Your Password Reset OTP",
    html: `
      <h2>Password Reset Request</h2>
      <p>Hi <strong>${user.first_name}</strong>,</p>
      <p>You have requested to reset your password for your account.</p>
      <p>Your One-Time Password (OTP) is:</p>

      <div style="
        font-size: 24px;
        font-weight: bold;
        background-color: #f3f4f6;
        color: #111827;
        padding: 12px 20px;
        display: inline-block;
        border-radius: 6px;
        letter-spacing: 3px;
        margin: 10px 0;
      ">${otp}</div>

      <p>This OTP is valid for <strong>10 minutes</strong>. Please do not share it with anyone.</p>

      <p>If you did not request this password reset, you can safely ignore this email.</p>
      <br>
      <p>Best regards,<br><strong>The SwissCRM Team</strong></p>
    `,
  };

  return await sendEmail(options);
};

// Send email verification
const sendEmailVerification = async (user, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const options = {
    to: user.email,
    subject: "Please Verify Your Email",
    html: `
      <h1>Email Verification</h1>
      <p>Hi ${user.first_name},</p>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
      <br>
      <p>Best regards,<br>The Team</p>
    `,
  };

  return await sendEmail(options);
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEmailVerification,
};
