require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
    },
});

// Verify the connection configuration
transporter.verify((error, success) => {
    if (error) {
        console.error('Error connecting to email server:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

// Generic helper function to send mail
const sendEmail = async (to, subject, text, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Aditya Kumar" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html,
        });

        console.log('Message sent: %s', info.messageId);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

/**
 * 🔹 Send Registration Welcome Email
 */
async function sendRegistrationEmail(userEmail, name) {
    const subject = 'Welcome to Fintech App!';
    const text = `Hi ${name},\n\nThank you for registering with Fintech App! We're excited to have you on board.`;
    const html = `<p>Hi ${name},</p><p>Thank you for registering with Fintech App! We're excited to have you on board.</p>`;
    await sendEmail(userEmail, subject, text, html);
}

/**
 * 🔹 Send Transaction Success Email
 * Fixed to handle descriptive string for transactionType
 */
async function sendTransactionEmail(userEmail, name, amount, transactionType) {
    const subject = `Your ${transactionType} on Fintech App`;
    const text = `Hi ${name},\n\nYou have successfully completed a ${transactionType} of ${amount} INR.`;
    const html = `
        <div style="font-family: sans-serif; color: #333;">
            <h3>Hi ${name},</h3>
            <p>You have successfully completed a <strong>${transactionType}</strong> of <strong>${amount} INR</strong> on Fintech App.</p>
            <p>Your account balance has been updated accordingly.</p>
            <p>Best regards,<br>The Fintech Team</p>
        </div>
    `;
    await sendEmail(userEmail, subject, text, html);
}

/**
 * 🔹 Send Transaction Failure Email
 */
async function sendTranscationFailedEmail(userEmail, name, amount, transactionType) {
    const subject = `Your ${transactionType} Failed`;
    const text = `Hi ${name},\n\nUnfortunately, your ${transactionType} of ${amount} INR failed. Please try again.`;
    const html = `<p>Hi ${name},</p><p>Unfortunately, your <strong>${transactionType}</strong> of <strong>${amount} INR</strong> failed. Please check your balance and try again.</p>`;
    await sendEmail(userEmail, subject, text, html);
}

module.exports = {
    sendRegistrationEmail,
    sendTransactionEmail,
    sendTranscationFailedEmail
};