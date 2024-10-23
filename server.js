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
  getPublicUrl,
} = require("./utils/directory_util");
const driftMap = require("./constants/driftMap");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set up EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

// Init directories
initDirectories();

// State management
let imageProcessState = ImageProcessState.WAITING_FOR_REQUEST;
let isCollectingForTraining = false;
let predictedDirection = "stop";
let processingPromise = null;

// Function to set state without timeout
const setState = (newState) => {
  imageProcessState = newState;
  console.log(`State changed to: ${newState.description}`);
};

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

    // Convert the file path to a URL path
    const publicUrl = getPublicUrl(filePath);
    io.of("/web").emit("new_image", { path: publicUrl });

    if (imageProcessState === ImageProcessState.COLLECTING_IMAGE) {
      setState(ImageProcessState.PROCESSING_IMAGES);

      // Create a new processing promise
      processingPromise = sendImageToProcess(filePath)
        .then((res) => {
          predictedDirection = res.direction;
          setState(ImageProcessState.IMAGES_PROCESSED);
          processingPromise = null;
          return "Processing completed successfully";
        })
        .catch((error) => {
          console.error("Error in image processing:", error);
          predictedDirection = "stop";
          setState(ImageProcessState.IMAGES_PROCESSED);
          processingPromise = null;
          throw error;
        });

      // Wait for the processing to complete
      await processingPromise;
    }
    return "File uploaded successfully";
  } catch (error) {
    console.error("Error in handleUploadImageReq:", error);
    predictedDirection = "stop";
    setState(ImageProcessState.IMAGES_PROCESSED);
    throw error;
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

const isDriftMode = false;

app.get("/directions", async (req, res) => {
  console.log(imageProcessState.description);

  if (isDriftMode) {
    return res.status(200).json({
      state: ImageProcessState.IMAGES_PROCESSED.description,
      directions: driftMap,
    });
  }

  if (isCollectingForTraining) {
    return res.status(200).json({
      state: "under_development",
      directions: [],
    });
  }

  // If we're currently processing, wait for it to complete
  if (processingPromise) {
    try {
      await processingPromise;
    } catch (error) {
      console.error("Error while waiting for processing:", error);
      return res.status(500).json({
        state: ImageProcessState.IMAGES_PROCESSED.description,
        error: "Processing failed",
        directions: [],
      });
    }
  }

  if (imageProcessState === ImageProcessState.WAITING_FOR_REQUEST) {
    setState(ImageProcessState.COLLECTING_IMAGE);
  }

  if (imageProcessState === ImageProcessState.IMAGES_PROCESSED) {
    setState(ImageProcessState.WAITING_FOR_REQUEST);
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

app.get("/", (req, res) => {
  res.render("index", { title: "Image Viewer" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
