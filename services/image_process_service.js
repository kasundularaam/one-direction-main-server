const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

async function sendImageToProcess(filePath) {
  const fastAPIEndpoint = "http://localhost:8000/process_images/";
  const form = new FormData();
  const TWO_MINUTES = 2 * 60 * 1000; // 2 minutes in milliseconds

  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at the specified path: ${filePath}`);
    }

    const fileName = path.basename(filePath);
    const fileStream = fs.createReadStream(filePath);
    form.append("image", fileStream, { filename: fileName });

    // Send the request with timeout configuration
    const response = await axios.post(fastAPIEndpoint, form, {
      headers: {
        ...form.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: TWO_MINUTES, // Set timeout to 2 minutes
    });

    return response.data;
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      throw new Error("Request timed out after 2 minutes");
    }
    console.error("Error details:", error);
    throw new Error("Failed to upload image");
  }
}

module.exports = { sendImageToProcess };
