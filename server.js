const express = require('express');
const fileUpload = require('express-fileupload');
const pdfParse = require('pdf-parse');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(fileUpload());

app.post('/upload', async (req, res) => {
  if (!req.files || !req.files.pdf) {
    return res.status(400).json({ error: 'No PDF uploaded' });
  }
  try {
    const pdfBuffer = req.files.pdf.data;
    const data = await pdfParse(pdfBuffer);
    // Get the first 100 words as a preview
    const words = data.text.split(/\s+/).filter(Boolean).slice(0, 100);
    const preview = words.join(' ') + (words.length === 100 ? '...' : '');
    res.json({ preview });
  } catch (err) {
    res.status(500).json({ error: 'Failed to extract PDF text' });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
