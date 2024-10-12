const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

async function sendImageToProcess(filePath) {
  const fastAPIEndpoint = "http://localhost:8000/process_images/";
  const form = new FormData();

  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at the specified path: ${filePath}`);
    }

    const fileName = path.basename(filePath);
    const fileStream = fs.createReadStream(filePath);
    form.append("image", fileStream, { filename: fileName });

    // Send the request
    const response = await axios.post(fastAPIEndpoint, form, {
      headers: {
        ...form.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    return response.data;
  } catch (error) {
    console.error(
      "UPLOAD_IMAGE",
      "Failed to upload image to processing server:",
      error.message
    );
    throw new Error("Failed to upload image");
  }
}

module.exports = { sendImageToProcess };
