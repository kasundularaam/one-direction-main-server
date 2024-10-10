const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

async function sendImagesToFastAPI(directoryPath) {
  const fastAPIEndpoint = "http://localhost:8000/process_images/";
  const form = new FormData();

  try {
    // Read the directory
    const files = await fs.promises.readdir(directoryPath);

    // Filter for JPEG files and limit to 10
    const jpegFiles = files
      .filter(
        (file) =>
          file.toLowerCase().endsWith(".jpg") ||
          file.toLowerCase().endsWith(".jpeg")
      )
      .slice(0, 10);

    // Add each file to the form data
    for (const file of jpegFiles) {
      const filePath = path.join(directoryPath, file);
      const fileStream = fs.createReadStream(filePath);
      form.append("images", fileStream, { filename: file });
    }

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
      "UPLOAD_IMAGES",
      "failed to upload images to image processing server!"
    );
    throw "Failed to upload images";
  }
}

module.exports = { sendImagesToFastAPI };
