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

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'clothing_gallery',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    categorization: 'google_tagging',
    auto_tagging: 0.6
  },
});

const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// נתיב חדש: מושך את כל התמונות והתגיות ישירות מ-Cloudinary
app.get('/images', async (req, res) => {
  try {
    // אנחנו מבקשים מ-Cloudinary את כל הקבצים בתיקייה כולל תגיות ה-AI
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'clothing_gallery/', 
      max_results: 500,
      context: true,
      tags: true
    });

    // מעבדים את הנתונים לפורמט שהאתר שלנו מכיר
    const images = result.resources.map(resource => ({
      id: resource.public_id,
      title: (resource.context && resource.context.custom && resource.context.custom.caption) || "Untitled",
      filename: resource.secure_url,
      // ב-Cloudinary API התגיות של גוגל נמצאות במיקום שונה מעט
      tags: resource.tags || []
    }));

    res.json(images);
  } catch (error) {
    console.error("Cloudinary fetch error:", error);
    res.status(500).json({ error: "Failed to fetch images from cloud" });
  }
});

app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    // הוספת הכותרת ל-Metadata של התמונה ב-Cloudinary כדי שתישמר לתמיד
    if (req.body.title) {
        await cloudinary.uploader.add_context(`caption=${req.body.title}`, [req.file.filename]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Upload failed" });
  }
});

app.delete('/images/:id', async (req, res) => {
  try {
    const publicId = req.params.id;
    await cloudinary.uploader.destroy(publicId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Delete failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
