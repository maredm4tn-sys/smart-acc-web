import nodemailer from "nodemailer";

interface Attachment {
    filename: string;
    content: Buffer | string;
}

export async function sendBackupEmail(to: string, attachments: Attachment[]) {
    // Check for SMTP config
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP Configuration missing. Cannot send email.");
        console.log("Mock Email to:", to);
        console.log("Attachments:", attachments.map(a => a.filename).join(", "));
        return false;
    }

    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: `"Smart Accountant" <${process.env.SMTP_USER}>`,
            to: to,
            subject: `Backup Report - ${new Date().toLocaleDateString()}`,
            text: `Attached are the daily reports for your Smart Accountant system.\n\nDate: ${new Date().toLocaleString()}\n\nIncluded Reports:\n- Inventory\n- Customers\n- Journal Entries\n- Income Statement`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
                    <h2 style="color: #2563eb;">Daily Backup Report</h2>
                    <p>Attached are the daily reports for your Smart Accountant system.</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                    <ul>
                        <li>Inventory Report</li>
                        <li>Customers Report</li>
                        <li>Journal Entries</li>
                        <li>Profit/Income Statement</li>
                    </ul>
                    <hr/>
                    <p style="font-size: 12px; color: #666;">This is an automated message from Smart Accountant System.</p>
                </div>
            `,
            attachments: attachments
        });

        console.log("Message sent: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
}
