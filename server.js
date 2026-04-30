const express = require('express');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // מאפשר להגיש קבצים סטטיים מהתיקייה הנוכחית

// הגדרות Cloudinary - וודא שהגדרת את אלו ב-Render Environment Variables
cloudinary.config({
  cloud_name: process.env.YOUR_CLOUD_NAME,
  api_key: process.env.YOUR_API_KEY,
  api_secret: process.env.YOUR_API_SECRET
});

// הגדרת אחסון עם AI Tagging
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'clothing_gallery',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    // הפעלת AI לזיהוי בגדים - דורש ש-Google Auto Tagging יהיה מופעל ב-Cloudinary Add-ons
    categorization: 'google_tagging',
    auto_tagging: 0.6
  },
});

const upload = multer({ storage: storage });

// "מסד נתונים" זמני בזיכרון
let dbImages = []; 

// נתיב ראשי להצגת האתר
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// קבלת כל התמונות
app.get('/images', (req, res) => {
  res.json(dbImages);
});

// העלאת תמונה
app.post('/upload', upload.single('image'), (req, res) => {
  try {
    // חילוץ תגיות ה-AI שחזרו מ-Cloudinary
    const tags = req.file.info && req.file.info.categorization ? 
                 req.file.info.categorization.google_tagging.data : [];

    const newImage = {
      id: Date.now().toString(), // משמש גם כחותמת זמן לתאריך
      title: req.body.title,
      filename: req.file.path,
      tags: tags
    };
    
    dbImages.push(newImage);
    res.json(newImage);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to process image tags" });
  }
});

// מחיקת תמונה
app.delete('/images/:id', (req, res) => {
  dbImages = dbImages.filter(img => img.id !== req.params.id);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
