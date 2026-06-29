const express = require("express");
const fs = require("fs");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;
const envPath = path.resolve(process.cwd(), "backend", ".env");

function loadMongoUri() {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  if (!fs.existsSync(envPath)) {
    return undefined;
  }

  const fileContents = fs.readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");
  const match = fileContents.match(/^\s*MONGODB_URI\s*=\s*(.+)\s*$/m);

  return match ? match[1].trim().replace(/^['"]|['"]$/g, "") : undefined;
}

const mongoUri = loadMongoUri();

if (!mongoUri) {
  throw new Error("MONGODB_URI is missing from backend/.env");
}

const client = new MongoClient(mongoUri);
const databaseName = process.env.MONGODB_DB || "Branch";

let database;

async function getDatabase() {
  if (!database) {
    await client.connect();
    database = client.db(databaseName);
  }

  return database;
}

app.use(express.json());
app.use((request, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }

  next();
});
app.use(express.static(path.join(__dirname, "..", "frontend")));

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
        id:
          project._id instanceof ObjectId
            ? project._id.toString()
            : String(project._id),
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

app.get("/api/health", async (request, response) => {
  try {
    await getDatabase();
    response.json({ status: "ok" });
  } catch (error) {
    response.status(500).json({ status: "error" });
  }
});

app.listen(port, () => {
  console.log(`Branch server is running on http://localhost:${port}`);
});
