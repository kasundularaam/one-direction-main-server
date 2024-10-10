const fs = require("fs");
const sharp = require("sharp");

async function flipImage(inputBuffer) {
  try {
    return sharp(inputBuffer).flip().flop().toBuffer();
  } catch (error) {
    console.log(error);
  }
}

function saveFile(filepath, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filepath, data, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

module.exports = { flipImage, saveFile };
