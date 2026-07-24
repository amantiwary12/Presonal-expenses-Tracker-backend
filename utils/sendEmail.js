import nodemailer from "nodemailer";

let brevoTransporter = null;

const getBrevoTransporter = () => {
  if (!process.env.BREVO_SMTP_LOGIN || !process.env.BREVO_SMTP_KEY) {
    return null;
  }
  if (!brevoTransporter) {
    brevoTransporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.BREVO_SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_LOGIN,
        pass: process.env.BREVO_SMTP_KEY,
      },
      connectionTimeout: 10000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    });
  }
  return brevoTransporter;
};

export const sendEmail = async ({ to, subject, text }) => {
  // 1. Primary: Brevo SMTP relay
  const transporter = getBrevoTransporter();
  if (transporter) {
    try {
      return await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.BREVO_SMTP_LOGIN,
        to,
        subject,
        text,
      });
    } catch (brevoError) {
      console.error("Brevo SMTP failed, falling back to Ethereal test preview...", brevoError);
    }
  } else {
    console.warn("BREVO_SMTP_LOGIN / BREVO_SMTP_KEY not set — falling back to Ethereal test preview.");
  }

  // 2. Last Fallback: Ethereal test SMTP preview (local dev only, not delivered to real inbox)
  console.warn("Generating a free test Ethereal SMTP account as final fallback...");
  try {
    const testAccount = await nodemailer.createTestAccount();
    const etherealTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    });

    const info = await etherealTransporter.sendMail({
      from: `"Expense Tracker Forms" <${testAccount.user}>`,
      to,
      subject,
      text,
    });

    console.log(`🔗 Mock email sent! View online: ${nodemailer.getTestMessageUrl(info)}`);
    return info;
  } catch (err) {
    console.error("Failed to send mock Ethereal email:", err);
  }
};