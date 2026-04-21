const nodemailer = require('nodemailer');

let testAccount = null;
let transporter = null;

// Initialize the Nodemailer transporter using Ethereal Email (Free Testing SMTP)
async function getTransporter() {
  if (transporter) return transporter;
  
  try {
    // Generate test SMTP service account from ethereal.email
    testAccount = await nodemailer.createTestAccount();
    
    // Create reusable transporter object using the default SMTP transport
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
    
    console.log(`\n📧 Ethereal Email Service Initialized`);
    console.log(`Test Account: ${testAccount.user}\n`);
    
    return transporter;
  } catch (error) {
    console.error('Failed to initialize Ethereal Email Service:', error);
    throw error;
  }
}

/**
 * Sends a structured OTP email using standard SaaS styling matching the frontend.
 * @param {string} to - The recipient's email address
 * @param {string} otp - The 6-digit OTP code to display
 * @param {string} type - 'signup' or 'login' to adjust messaging context
 */
async function sendOtpEmail(to, otp, type) {
  try {
    const mailTransporter = await getTransporter();
    
    const subject = type === 'signup' 
        ? 'Welcome to BaatCheet! Verify your Email' 
        : 'BaatCheet Login Verification Code';
        
    const greeting = type === 'signup'
        ? 'Welcome to BaatCheet! To complete your registration,'
        : 'Welcome back to BaatCheet! To securely log into your account,';

    // Premium structured HTML email template matching the Glassmorphism Dark theme vibes
    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          margin: 0; padding: 0; background-color: #07090f; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #f8fafc;
        }
        .container {
          width: 100%; max-width: 600px; margin: 40px auto; background-color: #121621; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 40px; text-align: center;
        }
        h1 {
          color: #00f0ff; font-weight: 700; margin-bottom: 15px; font-size: 28px;
        }
        p {
          font-size: 16px; line-height: 1.6; color: #94a3b8;
        }
        .otp-box {
          margin: 40px auto; padding: 20px; background: rgba(138, 43, 226, 0.1); border: 2px dashed #8a2be2; border-radius: 12px; display: inline-block;
        }
        .otp-code {
          font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #fff; margin: 0;
        }
        .footer {
          margin-top: 50px; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>BaatCheet Platform</h1>
        <p>${greeting} please use the following One-Time Password (OTP). This code will expire in exactly <strong>15 minutes</strong>.</p>
        
        <div class="otp-box">
          <p class="otp-code">${otp}</p>
        </div>
        
        <p>If you did not request this OTP, please ignore this email. Your data remains completely secure.</p>
        
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} BaatCheet. The premier Next-Gen News & Discussion Platform.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await mailTransporter.sendMail({
      from: '"BaatCheet Security" <security@baatcheet.app>',
      to: to,
      subject: subject,
      html: htmlTemplate,
    });

    console.log("\n-----------------------------------------------------------");
    console.log(`✉️ OTP Email sent for ${type} to: ${to}`);
    console.log(`Message ID: ${info.messageId}`);
    // IMPORTANT: Log the preview URL from ethereal!
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    console.log("-----------------------------------------------------------\n");
    
    return true;
  } catch (error) {
    console.error('Error sending OTP Email:', error);
    return false;
  }
}

module.exports = {
  sendOtpEmail
};
