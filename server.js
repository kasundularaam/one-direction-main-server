const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set up EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files from the 'public' directory
app.use(express.static("public"));

const UPLOAD_FOLDER = path.join(__dirname, "public", "uploads");

// Ensure upload folder exists
if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
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
  console.log("Received upload request");
  console.log("Content-Type:", req.get("Content-Type"));
  console.log("Content-Length:", req.get("Content-Length"));

  let body = [];
  req
    .on("data", (chunk) => {
      console.log("Received chunk of size:", chunk.length);
      body.push(chunk);
    })
    .on("end", () => {
      body = Buffer.concat(body);
      console.log("Total received data size:", body.length);

      const filename = "uploaded_image.jpg";
      const filepath = path.join(UPLOAD_FOLDER, filename);

      fs.writeFile(filepath, body, (err) => {
        if (err) {
          console.error("Error saving file:", err);
          return res.status(500).send("Error saving file");
        }

        console.log("File saved successfully");
        // Emit the image to connected clients
        io.of("/web").emit("new_image", { filename: filename });

        res.status(200).send("File uploaded successfully");
      });
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
