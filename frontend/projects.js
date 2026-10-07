const projectsList = document.getElementById("projects-list");
const projectsState = document.getElementById("projects-state");
const apiBaseUrl = "https://branchdb.onrender.com";

// translations.js exposes the active language; fall back to Dutch copy if it hasn't loaded
const FALLBACK = {
  projects_empty: "Er zijn nog geen projecten toegevoegd.",
  projects_error: "De projecten kunnen nu niet worden geladen.",
  project_image: "Projectafbeelding",
  project_untitled: "Project zonder titel",
  project_no_desc: "Nog geen beschrijving beschikbaar.",
};
const t = (key) => (window.branchT && window.branchT(key)) || FALLBACK[key];

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
    image.textContent = t("project_image");
  }

  const content = document.createElement("div");
  content.className = "project-content";

  const title = document.createElement("h2");
  title.textContent = project.title || t("project_untitled");

  const description = document.createElement("p");
  description.textContent =
    project.description || t("project_no_desc");

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
      projectsState.textContent = t("projects_empty");
      return;
    }

    projectsState.remove();

    projects.forEach((project, index) => {
      projectsList.appendChild(createProjectRow(project, index));
    });
  } catch (error) {
    projectsState.textContent = t("projects_error");
    console.error(error);
  }
}

if (projectsList && projectsState) {
  loadProjects();
}
