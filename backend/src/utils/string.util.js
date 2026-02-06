/**
 * Escape special regex characters in a string to prevent ReDoS attacks
 * when using user input in $regex or RegExp()
 * @param {string} str - User-provided search string
 * @returns {string} - Escaped string safe for regex
 */
function escapeRegex(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { escapeRegex };
