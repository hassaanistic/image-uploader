import express from 'express';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import { v2 as cloudinary } from 'cloudinary';
import { PassThrough } from 'stream';
import fetch from 'node-fetch';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true,
}));

app.use(fileUpload({
  createParentPath: true
}));

app.use(express.json());

cloudinary.config({
  cloud_name: 'dhuoha7uv',      
  api_key: '541296591379674',            
  api_secret: 'N17jsCn6WzkOmMRK_D0CvQKPngY'       
});

// Function to upload image to Cloudinary
async function uploadToCloudinary(fileBuffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'image' },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );
    
    // Create a passthrough stream and pipe the buffer into it
    const passthroughStream = new PassThrough();
    passthroughStream.end(fileBuffer);
    passthroughStream.pipe(uploadStream);
  });
}

app.get('/', (req, res) => {
  res.send('Shopify Image Uploader with Cloudinary');
})

app.post('/submit-form', async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: 'No files were uploaded.' });
    }

    const imageFile = req.files.image;
    const imageLink = await uploadToCloudinary(imageFile.data);


    const { name, email } = req.body;

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

    res.json({
      message: 'Form submitted successfully!',
      result,
      imageURL: imageLink
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while submitting the form.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
