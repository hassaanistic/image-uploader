import express from 'express';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import { google } from 'googleapis';
import bufferToStream from 'buffer-to-stream';
import fetch from 'node-fetch';

// Initialize Express
const app = express();

// Enable CORS for Shopify domain
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true,
}));

// Middleware to handle file uploads
app.use(fileUpload({
  createParentPath: true
}));

// Middleware to handle JSON request bodies
app.use(express.json());

// Google Drive authentication
const auth = new google.auth.GoogleAuth({
  keyFile: './credentials.json',
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

// Function to upload image to Google Drive
async function uploadToGoogleDrive(fileBuffer, fileName, mimeType) {
  const fileMetadata = {
    name: fileName,
    parents: ['14tJhTAbT76hLLVuPXJmo1iMJnO7xEZ9J'], // Replace with your folder ID
  };

  const media = {
    mimeType: mimeType,
    body: bufferToStream(fileBuffer),
  };

  const response = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, webViewLink',
  });

  return response.data.webViewLink;
}

app.get('/', (req, res) => {
  res.send('Shopify Image Uploader');
})
// Combined endpoint to handle image upload and sending data to Google Sheets
app.post('/submit-form', async (req, res) => {
  try {
    // Check if a file has been uploaded
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: 'No files were uploaded.' });
    }

    // Upload image to Google Drive
    const imageFile = req.files.image;
    const imageLink = await uploadToGoogleDrive(imageFile.data, imageFile.name, imageFile.mimetype);

    // Get form data (name, email)
    const { name, email } = req.body;


    // Send the data to Google Sheets
    const googleSheetsResponse = await fetch('https://script.google.com/macros/s/AKfycbyDJLcU_3HzW4l5nqXmJF2EEZ1ZYiPpmx0PvYSEMc4laChO651VO6gT25P3-Lo4IDs29g/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        email: email,
        imageURL: imageLink
      })
    });

    const result = await googleSheetsResponse.text();

    // Respond with success message and result from Google Sheets
    res.json({
      message: 'Form submitted successfully!',
      result,
      imageURL: imageLink
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while submitting the form.' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
