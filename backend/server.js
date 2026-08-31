const express = require("express");
const path = require("path");
const cors = require('cors');
const session = require("express-session");
const { ObjectId } = require("mongodb");
const nodemailer = require("nodemailer");
const { escapeHtml } = require("./utils/html");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const { assertEnv, config } = require("./config/env");
assertEnv();

const { getDatabase, ensureIndexes } = require("./db");
const { startBillingScheduler } = require("./jobs/scheduler");
const transactionsRouter = require("./routes/transactions");
const onboardingRouter = require("./routes/onboarding");
const webhooksRouter = require("./routes/webhooks");
const adminRouter = require("./routes/admin");

const app = express();
const port = process.env.PORT || 3000;

// Render (and most PaaS hosts) terminate TLS at their edge and forward plain
// HTTP internally — without this, Express sees every request as insecure,
// so the session cookie's `secure` flag silently drops the cookie entirely.
app.set("trust proxy", 1);

app.use(cors());

// Global Middleware
app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"] }));
app.use(
  express.json({
    // Capture the exact raw bytes GoCardless signed — needed to verify the
    // webhook signature, which must run against the untouched body, not the
    // reserialized JSON.
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: config.sessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" },
  }),
);
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.use("/api/transactions", transactionsRouter);
app.use("/onboarding", onboardingRouter);
app.use("/webhooks", webhooksRouter);
app.use(adminRouter);

// --- API Endpoints ---

app.get("/api/health", async (request, response) => {
  try {
    await getDatabase();
    response.json({ status: "ok" });
  } catch (error) {
    response.status(500).json({ status: "error" });
  }
});

app.get("/api/projects", async (request, response) => {
  try {
    const db = await getDatabase();
    const projects = await db.collection("projects").find({}).sort({ createdAt: -1, _id: -1 }).toArray();

    response.json(
      projects.map((project) => ({
        id: project._id instanceof ObjectId ? project._id.toString() : String(project._id),
        title: project.title || "Untitled Project",
        description: project.description || "",
        imageUrl: project.imageUrl || "",
      })),
    );
  } catch (error) {
    response.status(500).json({ message: "Failed to load projects" });
  }
});
// 1. Setup Nodemailer Transporter (Exact same as the working test)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,        
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// 2. Contact Form Route
// 2. Contact Form Route
const EMAIL_PATTERN = /^[^\s@"<>]+@[^\s@"<>]+\.[^\s@"<>]+$/;

app.post("/api/contact", async (request, response) => {
    const { name, email, company, projectType, budget, message } = request.body || {};

    if (!name || !email || !message || typeof name !== "string" || typeof email !== "string" || typeof message !== "string") {
        return response.status(400).json({ success: false, error: "name, email, and message are required" });
    }
    if (!EMAIL_PATTERN.test(email)) {
        return response.status(400).json({ success: false, error: "A valid email address is required" });
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeCompany = escapeHtml(company || "—");
    const safeProjectType = escapeHtml(projectType || "Not Specified");
    const safeBudget = escapeHtml(budget || "Not Specified");
    const safeMessage = escapeHtml(message);
    // Subject headers can't contain raw newlines — collapse them defensively
    // even though EMAIL_PATTERN already excludes whitespace from `email`.
    const subjectSafeName = name.replace(/[\r\n]+/g, " ");

    try {
        // --- 1. Send Notification to Admin (You) ---
        await transporter.sendMail({
            from: `"Branch Inquiries" <${process.env.GMAIL_USER}>`,
            to: "frgtinfo@gmail.com", // Sending to yourself
            replyTo: email,
            subject: `💼 New Project Inquiry: ${subjectSafeName}`,
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                    <div style="height: 6px; background: linear-gradient(to right, #003399, #009ce3, #6dd45c); background-color: #003399;"></div>
                    <div style="background-color: #ffffff; padding: 40px 20px 30px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                        <h1 style="margin: 0; color: #fff; font-size: 42px; font-weight: 800; letter-spacing: -1.5px; background: linear-gradient(to right, #003399, #009ce3, #6dd45c); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                            Branch
                        </h1>
                        <p style="color: #6b7280; margin: 15px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                            New Project Inquiry
                        </p>
                    </div>
                    <div style="padding: 30px;">
                        <h2 style="color: #111827; font-size: 18px; margin-top: 0; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">Client Details</h2>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                            <tr>
                                <td style="padding: 10px 0; color: #6b7280; font-size: 14px; width: 120px;"><strong>Name:</strong></td>
                                <td style="padding: 10px 0; color: #111827; font-size: 15px;">${safeName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #6b7280; font-size: 14px;"><strong>Email:</strong></td>
                                <td style="padding: 10px 0; font-size: 15px;">
                                    <a href="mailto:${safeEmail}" style="color: #009ce3; text-decoration: none; font-weight: 500;">${safeEmail}</a>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #6b7280; font-size: 14px;"><strong>Company:</strong></td>
                                <td style="padding: 10px 0; color: #111827; font-size: 15px;">${safeCompany}</td>
                            </tr>
                        </table>
                        <h2 style="color: #111827; font-size: 18px; margin-top: 0; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">Project Scope</h2>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                            <tr>
                                <td style="padding: 10px 0; color: #6b7280; font-size: 14px; width: 120px;"><strong>Type:</strong></td>
                                <td style="padding: 10px 0; color: #111827; font-size: 15px; font-weight: 500;">${safeProjectType}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #6b7280; font-size: 14px;"><strong>Budget:</strong></td>
                                <td style="padding: 10px 0; color: #6dd45c; font-size: 15px; font-weight: 600;">${safeBudget}</td>
                            </tr>
                        </table>
                        <h2 style="color: #111827; font-size: 18px; margin-top: 0; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">Message</h2>
                        <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; color: #374151; font-size: 15px; line-height: 1.6; white-space: pre-wrap; border-left: 4px solid #009ce3;">${safeMessage}</div>
                    </div>
                    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 Branch. All rights reserved.</p>
                    </div>
                </div>
            `
        });

        // --- 2. Send Confirmation to Client ---
        await transporter.sendMail({
            from: `"Branch" <${process.env.GMAIL_USER}>`,
            to: email, // Sending to the client who submitted the form
            subject: `Thank you for reaching out, ${subjectSafeName}!`,
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                    
                    <!-- Gradient Accent Bar -->
                    <div style="height: 6px; background: linear-gradient(to right, #003399, #009ce3, #6dd45c); background-color: #003399;"></div>

                    <!-- Header -->
                    <div style="background-color: #ffffff; padding: 30px 20px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                        <h1 style="margin: 0; color: #fff; font-size: 32px; font-weight: 800; letter-spacing: -1px; background: linear-gradient(to right, #003399, #009ce3, #6dd45c); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                            Branch
                        </h1>
                    </div>

                    <!-- Content -->
                    <div style="padding: 40px 30px; color: #374151; font-size: 16px; line-height: 1.6;">
                        <p style="margin-top: 0; font-size: 18px; color: #111827; font-weight: 600;">Hi ${safeName},</p>
                        
                        <p>Thank you for reaching out to us! This is an automated message to confirm that we have successfully received your project inquiry.</p>
                        
                        <p>Our team is currently reviewing the details you provided. We aim to respond to all inquiries within 1 to 2 business days to discuss the next steps and how we can help you grow.</p>
                        
                        <p>If you have any additional information you'd like to share in the meantime, feel free to reply directly to this email.</p>
                        
                        <p style="margin-bottom: 0; margin-top: 30px;">Best regards,<br><strong style="color: #111827;">The Branch Team</strong></p>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 Branch. All rights reserved.</p>
                    </div>

                </div>
            `
        });
        
        // Respond with success only after both emails are sent
        response.status(200).json({ success: true, message: "Emails sent successfully" });
    } catch (error) {
        console.error("Mail Error:", error);
        response.status(500).json({ success: false, error: "Failed to send email." });
    }
});

// Start Server
async function start() {
  await ensureIndexes();

  app.listen(port, "0.0.0.0", () => {
    console.log(`Branch server is running on port ${port}`);
  });

  startBillingScheduler();
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});