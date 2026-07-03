const express = require("express");
const path = require("path");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const nodemailer = require("nodemailer");

require("dotenv").config({ path: path.resolve(process.cwd(), "backend", ".env") });

const app = express();
const port = process.env.PORT || 3000;


if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is missing from your environment configurations.");
}

// Global Middleware
app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"] }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));

// MongoDB Connection Logic
const client = new MongoClient(process.env.MONGODB_URI);
const databaseName = process.env.MONGODB_DB || "Branch";
let database;

async function getDatabase() {
  if (!database) {
    await client.connect();
    database = client.db(databaseName);
  }
  return database;
}

// Mailer Setup (Direct routing through Gmail SSL via Port 465)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, 
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, 
  },
});

app.get("/api/health", async (request, response) => {
  try {
    await getDatabase();
    response.json({ status: "ok" });
  } catch (error) {
    response.status(500).json({ status: "error" });
  }
});

// Get Projects
app.get("/api/projects", async (request, response) => {
  try {
    const db = await getDatabase();
    const projects = await db
      .collection("projects")
      .find({})
      .sort({ createdAt: -1, _id: -1 })
      .toArray();

    response.json(
      projects.map((project) => ({
        id: project._id instanceof ObjectId ? project._id.toString() : String(project._id),
        title: project.title || "Untitled Project",
        description: project.description || "",
        imageUrl: project.imageUrl || "",
      })),
    );
  } catch (error) {
    console.error("Failed to load projects:", error);
    response.status(500).json({ message: "Failed to load projects" });
  }
});

// Contact Form Handler
app.post("/api/contact", async (request, response) => {
  const { name, email, company, projectType, budget, message } = request.body;

  if (!name || !email || !message) {
    return response.status(400).json({ message: "Name, email, and message are required." });
  }
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px; color: #1f2937; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background-color: #111827; padding: 32px 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.025em; }
        .header p { color: #9ca3af; margin: 4px 0 0 0; font-size: 14px; }
        .content { padding: 32px 24px; }
        .badge { display: inline-block; padding: 4px 12px; background-color: #f3f4f6; color: #374151; font-size: 12px; font-weight: 600; border-radius: 9999px; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 0.05em; }
        .grid { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .grid td { padding: 10px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
        .label { font-size: 13px; color: #6b7280; font-weight: 500; width: 30%; }
        .value { font-size: 15px; color: #111827; font-weight: 500; }
        .message-box { background-color: #f9fafb; border-radius: 8px; border: 1px solid #f3f4f6; padding: 20px; margin-top: 24px; }
        .message-title { font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
        .message-text { font-size: 15px; line-height: 1.6; color: #374151; white-space: pre-line; margin: 0; }
        .footer { background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Branch Portal</h1>
          <p>New Business Lead Received</p>
        </div>
        <div class="content">
          <span class="badge">Project Inquiry</span>
          <table class="grid">
            <tr>
              <td class="label">Client Name</td>
              <td class="value">${name}</td>
            </tr>
            <tr>
              <td class="label">Email Address</td>
              <td class="value"><a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a></td>
            </tr>
            <tr>
              <td class="label">Company</td>
              <td class="value">${company || "—"}</td>
            </tr>
            <tr>
              <td class="label">Project Type</td>
              <td class="value">${projectType || "Not specified"}</td>
            </tr>
            <tr>
              <td class="label">Budget Range</td>
              <td class="value" style="color: #16a34a; font-weight: 600;">${budget || "Not specified"}</td>
            </tr>
          </table>
          <div class="message-box">
            <div class="message-title">Client Message</div>
            <p class="message-text">${message}</p>
          </div>
        </div>
        <div class="footer">
          © 2026 Branch. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Branch Website" <${process.env.EMAIL_USER}>`, 
    replyTo: email,
    to: "anthilori25@gmail.com",
    subject: `💼 New Project Inquiry: ${name} (${projectType || "General"})`,
    text: `Name: ${name}\nEmail: ${email}\nCompany: ${company || "N/A"}\nProject Type: ${projectType || "Not specified"}\nBudget: ${budget || "Not specified"}\n\nMessage:\n${message}`,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    response.status(200).json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("Email sending failed:", error);
    response.status(500).json({ success: false, message: "Failed to send email due to a backend error." });
  }
});

// Start Server
app.listen(port, "0.0.0.0", () => {
  console.log(`Branch server is running on port ${port}`);
});