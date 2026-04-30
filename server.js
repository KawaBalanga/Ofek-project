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

// הגדרות Cloudinary - החלף בפרטים שלך
cloudinary.config({
  cloud_name: process.env.YOUR_CLOUD_NAME || 'YOUR_NAME',
  api_key: process.env.YOUR_API_KEY || 'YOUR_KEY',
  api_secret: process.env.YOUR_API_SECRET || 'YOUR_SECRET'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // שליפת תגיות מה-body (נשלחו לפני הקובץ ב-FormData)
    const tags = req.body.tags ? req.body.tags.split(',') : [];
    const title = req.body.title || "Unnamed";
    return {
      folder: 'clothing_gallery',
      allowed_formats: ['jpg', 'png', 'jpeg'],
      tags: tags,
      context: { caption: title }
    };
  },
});

const upload = multer({ storage: storage });

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// שליפת תמונות
app.get('/images', async (req, res) => {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'clothing_gallery/', 
      max_results: 500,
      context: true,
      tags: true,
      timestamp: Date.now() // מניעת Cache
    });
    const images = result.resources.map(resource => ({
      id: resource.public_id,
      title: (resource.context && resource.context.custom && resource.context.custom.caption) || "Unnamed",
      filename: resource.secure_url,
      tags: resource.tags || []
    }));
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

app.post('/upload', upload.single('image'), (req, res) => res.json({ success: true }));

// עדכון תגיות - מתוקן לפי הלוגים של image_c89bd0.png
app.post('/update-tags', async (req, res) => {
  try {
    const { publicId, tags } = req.body;
    if (!publicId) return res.status(400).json({ error: "Missing ID" });

    console.log(`Updating tags for: ${publicId}`, tags);

    // התיקון: replace_tag מחליפה את כל התגיות הישנות בחדשות
    if (!tags || tags.length === 0) {
      await cloudinary.uploader.remove_all_tags([publicId]);
    } else {
      await cloudinary.uploader.replace_tag(tags, [publicId]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Failed to update tags" });
  }
});

app.delete('/delete-image', async (req, res) => {
  try {
    const { id } = req.query;
    await cloudinary.uploader.destroy(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Delete failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
