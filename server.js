const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");
const { sendImagesToFastAPI } = require("./upload_images");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set up EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files from the 'public' directory
app.use(express.static("public"));

const UPLOAD_FOLDER = path.join(__dirname, "public", "uploads");
const IMAGES_TO_PROCESS_FOLDER = path.join(
  __dirname,
  "public",
  "uploads",
  "process"
);

const ImageProcessState = Object.freeze({
  WAITING_FOR_REQUEST: Symbol("waiting_for_request"),
  COLLECTING_IMAGES: Symbol("collecting_images"),
  PROCESSING_IMAGES: Symbol("processing_images"),
  IMAGES_PROCESSED: Symbol("images_processed"),
});

const totalImagesCount = 10;
let collectedImagesCount = 0;
let imageProcessState = ImageProcessState.WAITING_FOR_REQUEST;

// Ensure upload folder exists
if (!fs.existsSync(UPLOAD_FOLDER) || !fs.existsSync(IMAGES_TO_PROCESS_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
  fs.mkdirSync(IMAGES_TO_PROCESS_FOLDER, { recursive: true });
}

// Socket.IO connection
io.of("/web").on("connection", (socket) => {
  console.log("A client connected");

  socket.on("disconnect", () => {
    console.log("A client disconnected");
  });
});

// Route for uploading images
app.post("/upload_image", (req, res) => {
  let body = [];
  req
    .on("data", (chunk) => {
      body.push(chunk);
    })
    .on("end", () => {
      body = Buffer.concat(body);

      if (
        imageProcessState === ImageProcessState.COLLECTING_IMAGES &&
        collectedImagesCount <= totalImagesCount
      ) {
        const filename = `${collectedImagesCount}.jpg`;
        const filepath = path.join(IMAGES_TO_PROCESS_FOLDER, filename);

        fs.writeFile(filepath, body, (err) => {
          if (err) {
            console.error("Error saving file:", err);
            return res.status(500).send("Error saving file");
          }

          collectedImagesCount++;

          if (collectedImagesCount >= totalImagesCount) {
            sendCollectedImages();
          }

          return res.status(200).send("File uploaded successfully");
        });
      } else {
        const filename = "uploaded_image.jpg";
        const filepath = path.join(UPLOAD_FOLDER, filename);

        fs.writeFile(filepath, body, (err) => {
          if (err) {
            console.error("Error saving file:", err);
            return res.status(500).send("Error saving file");
          }

          io.of("/web").emit("new_image", { filename: filename });

          res.status(200).send("File uploaded successfully");
        });
      }
    });
});

function sendCollectedImages() {
  imageProcessState = ImageProcessState.PROCESSING_IMAGES;
  collectedImagesCount = 0;
  sendImagesToFastAPI(IMAGES_TO_PROCESS_FOLDER)
    .then((value) => {
      imageProcessState = ImageProcessState.IMAGES_PROCESSED;
      console.log(value);
    })
    .catch((error) => {
      imageProcessState = ImageProcessState.IMAGES_PROCESSED;
      console.error(error);
    });
}

app.get("/directions", (req, res) => {
  console.log(imageProcessState.description);

  if (imageProcessState === ImageProcessState.WAITING_FOR_REQUEST) {
    imageProcessState = ImageProcessState.COLLECTING_IMAGES;
  }

  if (imageProcessState === ImageProcessState.IMAGES_PROCESSED) {
    imageProcessState = ImageProcessState.WAITING_FOR_REQUEST;
    return res.status(200).json({
      state: ImageProcessState.IMAGES_PROCESSED.description,
      directions: [],
    });
  }

  res.status(200).json({
    state: imageProcessState.description,
    directions: [],
  });
});

// Route for serving the webpage
app.get("/", (req, res) => {
  res.render("index", { title: "Image Viewer" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
