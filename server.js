const express = require('express');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// --- הגדרות Cloudinary (תעתיק מהאתר שלהם) ---
cloudinary.config({
  cloud_name: 'dafzhnkg8',
  api_key: '235962986363246',
  api_secret: 'G_94zHR-WCf3jrp79FP8k5GUCJk'
});

// הגדרת האחסון בענן
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gallery_uploads', // שם התיקייה שתיפתח לך בענן
    allowed_formats: ['jpg', 'png', 'jpeg']
  },
});

const upload = multer({ storage: storage });

// "מסד נתונים" זמני (במציאות עדיף להשתמש ב-Database אמיתי)
let dbImages = [];

// 1. קבלת כל התמונות (מתאים ל-loadGallery שלך)
app.get('/images', (req, res) => {
  res.json(dbImages);
});

// 2. העלאת תמונה חדשה (מתאים ל-uploadImage שלך)
app.post('/upload', upload.single('image'), (req, res) => {
  const newImage = {
    id: Date.now().toString(),
    title: req.body.title,
    // כאן הקסם: אנחנו שומרים את הכתובת של Cloudinary
    filename: req.file.path
  };
  dbImages.push(newImage);
  res.json(newImage);
});

// 3. מחיקת תמונה (מתאים ל-deleteImage שלך)
app.delete('/images/:id', (req, res) => {
  dbImages = dbImages.filter(img => img.id !== req.params.id);
  res.json({ success: true });
});

// חשוב מאוד עבור Render והעולם החיצון
const PORT = process.env.PORT || 3000;
// הגדרה שמאפשרת לשרת לגשת לקבצים שנמצאים בתיקייה שלו
app.use(express.static(__dirname));

// פונקציה שאומרת לשרת: כשמישהו נכנס לכתובת הראשית, תביא לו את ה-HTML
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
