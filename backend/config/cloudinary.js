const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

let isCloudinaryConfigured = false;

if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  isCloudinaryConfigured = true;
  console.log("Cloudinary Media Storage configured successfully!");
} else {
  console.log("\n=====================================================================");
  console.warn("⚠️  CLOUDINARY CONFIGURATION NOTICE:");
  console.warn("Cloudinary credentials are missing from your .env file.");
  console.warn("Generated PDFs will be stored locally in the backend/uploads/ directory.");
  console.warn("=====================================================================\n");
}

/**
 * Uploads a file (buffer or filePath) to Cloudinary or falls back to saving on local disk.
 * @param {string} filePath - Path to the local file to upload.
 * @param {string} folder - Destination folder.
 * @returns {Promise<string>} - The public URL of the uploaded file.
 */
const uploadPDF = async (filePath, folder = 'invoices') => {
  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: folder,
        resource_type: 'raw', // PDF is uploaded as raw or image
        access_mode: 'public'
      });
      return result.secure_url;
    } catch (error) {
      console.error(`Cloudinary Upload Error: ${error.message}. Falling back to local URL.`);
    }
  }

  // Fallback: Copy the file to the local public uploads directory and return a relative URL
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fileName = path.basename(filePath);
  const destPath = path.join(uploadsDir, fileName);
  
  if (filePath !== destPath) {
    fs.copyFileSync(filePath, destPath);
  }

  // Return the endpoint url to fetch the file locally
  const port = process.env.PORT || 5002;
  return `http://localhost:${port}/uploads/${fileName}`;
};

module.exports = {
  cloudinary,
  uploadPDF,
  getIsCloudinaryConfigured: () => isCloudinaryConfigured
};
