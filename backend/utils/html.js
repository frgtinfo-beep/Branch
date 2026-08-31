const ESCAPE_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

// For interpolating untrusted strings into HTML email bodies/admin views —
// anywhere we build markup with string concatenation instead of a templating
// engine that escapes by default.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPE_MAP[char]);
}

module.exports = { escapeHtml };
