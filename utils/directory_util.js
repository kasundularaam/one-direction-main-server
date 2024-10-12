const DIR_UPLOAD = path.join(__dirname, "public", "uploads");
const DIR_TRAIN = path.join(__dirname, "public", "uploads", "train");
const DIR_PROCESS = path.join(__dirname, "public", "uploads", "process");

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

module.exports = {
  DIR_UPLOAD,
  DIR_TRAIN,
  DIR_PROCESS,
  initDirectories,
};
