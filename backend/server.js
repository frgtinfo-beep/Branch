const express = require("express");
const path = require("path");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const { Resend } = require("resend"); // Swapped Nodemailer for Resend

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

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

// --- API Endpoints ---

// Health Check
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
    response.status(500).json({ message: "Failed to load projects" });
  }
});

// Contact Form Handler (HTTP API approach)
app.post("/api/contact", async (request, response) => {
  const { name, email, company, projectType, budget, message } = request.body;

  if (!name || !email || !message) {
    return response.status(400).json({ message: "Name, email, and message are required." });
  }

  try {
    await resend.emails.send({
      from: "Branch Website <onboarding@resend.dev>", // Required by Resend for testing
      to: "anthilori05@gmail.com", // Delivering straight to your personal testing email
      reply_to: email, // If you click "reply" in your inbox, it goes to the client
      subject: `💼 New Project Inquiry: ${name} (${projectType || "General"})`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #374151;">
          <h2 style="color: #111827;">New Project Inquiry</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Company:</strong> ${company || "—"}</p>
          <p><strong>Type:</strong> ${projectType || "Not specified"}</p>
          <p><strong>Budget:</strong> ${budget || "Not specified"}</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;"/>
          <h3 style="color: #111827;">Message:</h3>
          <p style="white-space: pre-line; background: #f9fafb; padding: 15px; border-radius: 6px;">${message}</p>
        </div>
      `,
    });

    response.status(200).json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("Resend Error:", error);
    response.status(500).json({ success: false, message: "Failed to send email." });
  }
});

// Start Server
app.listen(port, "0.0.0.0", () => {
  console.log(`Branch server is running on port ${port}`);
});