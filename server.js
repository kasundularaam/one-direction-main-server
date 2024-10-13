const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");

const { saveFile, flipImage } = require("./utils/image_util");

const { sendImageToProcess } = require("./services/image_process_service");

const { ImageProcessState } = require("./constants/ImageProcessState");
const {
  initDirectories,
  DIR_UPLOAD,
  DIR_TRAIN,
  DIR_PROCESS,
} = require("./utils/directory_util");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set up EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files from the 'public' directory
app.use(express.static("public"));

//==============================M-A-I-N-S-R-V-E-R====================================

//Init directories
initDirectories();

let imageProcessState = ImageProcessState.WAITING_FOR_REQUEST;

let isCollectingForTraining = false;

let predictedDirection = "stop";

function getSaveFilePath() {
  if (imageProcessState === ImageProcessState.COLLECTING_IMAGE) {
    return path.join(DIR_PROCESS, "image_to_process.jpg");
  }
  if (isCollectingForTraining) {
    return path.join(DIR_TRAIN, `${Date.now()}.jpg`);
  }
  return path.join(DIR_UPLOAD, "uploaded_image.jpg");
}

async function handleUploadImageReq(body) {
  try {
    const filePath = getSaveFilePath();

    const flippedImageBuffer = await flipImage(body);
    await saveFile(filePath, flippedImageBuffer);

    io.of("/web").emit("new_image", { path: filePath });

    if (imageProcessState === ImageProcessState.COLLECTING_IMAGE) {
      imageProcessState = ImageProcessState.PROCESSING_IMAGES;
      sendImageToProcess(filePath)
        .then((res) => {
          predictedDirection = res.direction;
          imageProcessState = ImageProcessState.IMAGES_PROCESSED;
        })
        .catch((error) => {
          predictedDirection = "stop";
          imageProcessState = ImageProcessState.IMAGES_PROCESSED;
        });
    }

    return "File uploaded successfully";
  } catch (error) {
    console.log(error);
  }
}

// Socket.IO connection
io.of("/web").on("connection", (socket) => {
  console.log("A client connected");

  socket.on("disconnect", () => {
    console.log("A client disconnected");
  });
});

// Main route handler
app.post("/upload_image", async (req, res) => {
  let body = [];
  req
    .on("data", (chunk) => {
      body.push(chunk);
    })
    .on("end", async () => {
      body = Buffer.concat(body);

      try {
        const result = await handleUploadImageReq(body);

        res.status(200).send(result);
      } catch (err) {
        console.error("Error processing file:", err);
        res.status(500).send("Error processing file");
      }
    });
});

const isTesting = false;

app.get("/directions", (req, res) => {
  console.log(imageProcessState.description);

  if (isTesting) {
    return res.status(200).json({
      state: ImageProcessState.IMAGES_PROCESSED.description,
      directions: [
        {
          direction: "forward",
          speed: 225,
          duration: 100,
        },
        {
          direction: "left",
          speed: 225,
          duration: 500,
        },
        {
          direction: "forward",
          speed: 225,
          duration: 100,
        },
      ],
    });
  }

  if (isCollectingForTraining) {
    return res.status(200).json({
      state: "under_development",
      directions: [],
    });
  }

  if (imageProcessState === ImageProcessState.WAITING_FOR_REQUEST) {
    imageProcessState = ImageProcessState.COLLECTING_IMAGE;
  }

  if (imageProcessState === ImageProcessState.IMAGES_PROCESSED) {
    imageProcessState = ImageProcessState.WAITING_FOR_REQUEST;
    return res.status(200).json({
      state: ImageProcessState.IMAGES_PROCESSED.description,
      directions: [
        {
          direction: predictedDirection,
          speed: 200,
          duration: 200,
        },
      ],
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
