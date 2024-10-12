const ImageProcessState = Object.freeze({
  WAITING_FOR_REQUEST: Symbol("waiting_for_request"),
  COLLECTING_IMAGE: Symbol("collecting_image"),
  PROCESSING_IMAGES: Symbol("processing_images"),
  IMAGES_PROCESSED: Symbol("images_processed"),
});

module.exports = { ImageProcessState };
