const express = require('express');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

cloudinary.config({
  cloud_name: process.env.YOUR_CLOUD_NAME,
  api_key: process.env.YOUR_API_KEY,
  api_secret: process.env.YOUR_API_SECRET
});

// הגדרת אחסון חכמה שקולטת תגיות בזמן אמת
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // שליפת הנתונים שנשלחו ב-FormData מהדפדפן
    const tags = req.body.tags ? req.body.tags.split(',') : [];
    const title = req.body.title && req.body.title.trim() !== "" ? req.body.title : "Untitled";

    return {
      folder: 'clothing_gallery',
      allowed_formats: ['jpg', 'png', 'jpeg'],
      tags: tags, // התגיות מוצמדות כאן
      context: { caption: title } // הכותרת מוצמדת כאן
    };
  },
});

const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/images', async (req, res) => {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'clothing_gallery/', 
      max_results: 500,
      context: true,
      tags: true
    });

    const images = result.resources.map(resource => ({
      id: resource.public_id,
      title: (resource.context && resource.context.custom && resource.context.custom.caption) || "Untitled",
      filename: resource.secure_url,
      tags: resource.tags || []
    }));

    res.json(images);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

// הנתיב עכשיו הרבה יותר נקי כי ה-storage עושה את העבודה
app.post('/upload', upload.single('image'), (req, res) => {
  res.json({ success: true });
});

app.delete('/images/:id', async (req, res) => {
  try {
    await cloudinary.uploader.destroy(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Delete failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
