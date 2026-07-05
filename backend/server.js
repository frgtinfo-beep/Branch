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

app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"] }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));


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

// Contact Form Handler
app.post("/api/contact", async (request, response) => {
  const { name, email, company, projectType, budget, message } = request.body;

  if (!name || !email || !message) {
    return response.status(400).json({ message: "Name, email, and message are required." });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail", 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, 
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    replyTo: email,
    subject: `💼 New Project Inquiry: ${name} (${projectType || "General"})`,
    html: `
      
        New Project Inquiry
        
          
            Name:
            ${name}
          
            Email:
            ${email}

            Company:
            ${company || "—"}
          
            Type:
            ${projectType || "Not specified"}
          
            Budget:
            ${budget || "Not specified"}
          
        
        Message:
        ${message}
      
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    response.status(200).json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("Mail Error:", error);
    response.status(500).json({ success: false, message: "Failed to send email. Please try again later." });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Branch server is running on port ${port}`);
});