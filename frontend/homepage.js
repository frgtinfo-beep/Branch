// ==========================================
// 1. API & CONFIGURATION
// ==========================================
const projectsList = document.getElementById("projects-list");
const projectsState = document.getElementById("projects-state");

const apiBaseUrl =
  window.location.protocol === "file:" || window.location.port === "5500"
    ? `${window.location.protocol === "file:" ? "http" : window.location.protocol.slice(0, -1)}://${window.location.hostname || "localhost"}:3000`
    : "";

// ==========================================
// 2. DYNAMIC PROJECT RENDERING
// ==========================================
function createProjectRow(project, index) {
  const row = document.createElement("div");
  row.className = `project-row${index % 2 === 1 ? " reverse" : ""}`;

  const image = document.createElement("div");
  image.className = "project-image";

  if (project.imageUrl) {
    image.classList.add("has-image");
    image.style.backgroundImage = `url('${project.imageUrl}')`;
  } else {
    image.classList.add("is-empty");
    image.textContent = "Project image";
  }

  const content = document.createElement("div");
  content.className = "project-content";

  const title = document.createElement("h2");
  title.textContent = project.title || "Untitled Project";

  const description = document.createElement("p");
  description.textContent = project.description || "No project description available yet.";

  content.append(title, description);
  row.append(image, content);

  return row;
}

async function loadProjects() {
  try {
    const response = await fetch(`${apiBaseUrl}/api/projects`);

    if (!response.ok) {
      throw new Error("Request failed");
    }

    const projects = await response.json();

    if (!projects.length) {
      projectsState.textContent = "No projects have been added yet.";
      return;
    }

    projectsState.remove();

    projects.forEach((project, index) => {
      projectsList.appendChild(createProjectRow(project, index));
    });
  } catch (error) {
    projectsState.textContent = "Unable to load projects right now.";
    console.error(error);
  }
}

// Initialize project loading if elements exist on page
if (projectsList && projectsState) {
  loadProjects();
}

// ==========================================
// 3. RESTORED FUNCTIONS (FROM HTML FILE)
// ==========================================

// Mobile Navbar Hamburger Toggle
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });
}

// Google Translate Initialization Widget
function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: 'en',
    includedLanguages: 'en,nl,fr,de,es', // English, Dutch, French, German, Spanish
    layout: google.translate.TranslateElement.InlineLayout.SIMPLE
  }, 'google_translate_element');
}