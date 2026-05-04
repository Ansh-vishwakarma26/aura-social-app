const express = require('express');
const multer = require('multer');
const cloudinary = require('../cloudinary');

const router = express.Router();

// store file temporarily in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const stream = cloudinary.uploader.upload_stream(
      { folder: "aura_uploads" },
      (error, result) => {
        if (error) return res.status(500).json({ error });

        return res.json({
          url: result.secure_url
        });
      }
    );

    stream.end(file.buffer);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
