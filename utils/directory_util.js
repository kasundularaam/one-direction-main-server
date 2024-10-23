const path = require("path");
const fs = require("fs");

// Assuming this file is in the /utils directory, we need to go up one level to reach the root
const ROOT_DIR = path.join(__dirname, "..");

const DIR_UPLOAD = path.join(ROOT_DIR, "public", "uploads");
const DIR_TRAIN = path.join(ROOT_DIR, "public", "uploads", "train");
const DIR_PROCESS = path.join(ROOT_DIR, "public", "uploads", "process");

function initDirectories() {
  if (
    !fs.existsSync(DIR_UPLOAD) ||
    !fs.existsSync(DIR_PROCESS) ||
    !fs.existsSync(DIR_TRAIN)
  ) {
    fs.mkdirSync(DIR_UPLOAD, { recursive: true });
    fs.mkdirSync(DIR_PROCESS, { recursive: true });
    fs.mkdirSync(DIR_TRAIN, { recursive: true });
  }
}

function getPublicUrl(filePath) {
  // Convert absolute file path to URL path
  const relativePath = path.relative(path.join(ROOT_DIR, "public"), filePath);
  return "/" + relativePath.split(path.sep).join("/");
}

module.exports = {
  initDirectories,
  DIR_UPLOAD,
  DIR_TRAIN,
  DIR_PROCESS,
  getPublicUrl,
};
