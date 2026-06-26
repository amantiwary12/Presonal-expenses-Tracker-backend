import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, text }) => {
  // 1. If SMTP credentials are provided in .env, use Gmail/SMTP
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      return await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        text,
      });
    } catch (smtpError) {
      console.error("Gmail SMTP failed, falling back to FormSubmit API...", smtpError);
    }
  }

  // 2. Fallback: Automatically send real email to HR's inbox using Submify zero-config delivery API!
  console.log(`🚀 Dispatching real email to ${to} using Submify zero-config delivery API...`);
  try {
    const response = await fetch(`https://submify.vercel.app/${to.trim()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        _subject: subject,
        Message: text,
      }),
    });

    if (response.status === 200) {
      console.log(`✅ Real email successfully sent automatically to ${to} via Submify API!`);
      return { success: true, provider: "submify" };
    } else {
      console.error("Submify API returned failure status:", response.status);
    }
  } catch (apiError) {
    console.error("Failed to deliver real email via Submify API:", apiError);
  }

  // 3. Last Fallback: Ethereal test SMTP preview
  console.warn("Generating a free test Ethereal SMTP account as final fallback...");
  try {
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

    const info = await transporter.sendMail({
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