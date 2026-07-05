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

// MongoDB Connection
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

// 1. Setup Nodemailer Transporter (Matching your Authentic Edge code)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,        
    pass: process.env.EMAIL_PASS 
  }
});

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

// 2. Contact Form Route
app.post("/api/contact", async (req, res) => {
    const { name, email, company, projectType, budget, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: "Name, email, and message are required." });
    }

    try {
        // 3. Configure and send the email
        const mailOptions = {
            from: `"Branch Contact" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, // Sending to yourself for testing
            replyTo: email, 
            subject: `New Inquiry from ${name} (${projectType || "General"})`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
                    <h2 style="text-transform: uppercase; letter-spacing: 2px; text-align: center;">New Project Inquiry</h2>
                    <hr style="border: 0; border-top: 1px solid #000; margin: 20px 0;">
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Company:</strong> ${company || "—"}</p>
                    <p><strong>Type:</strong> ${projectType || "Not specified"}</p>
                    <p><strong>Budget:</strong> ${budget || "Not specified"}</p>
                    <p style="background: #f9f9f9; padding: 15px; border-left: 4px solid #000; font-style: italic; margin-top: 20px;">
                        ${message}
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "Email sent successfully" });

    } catch (error) {
        console.error("Email Sending Error:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

// Start Server
app.listen(port, "0.0.0.0", () => {
  console.log(`Branch server is running on port ${port}`);
});