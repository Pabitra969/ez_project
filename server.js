const express = require('express');
const fileUpload = require('express-fileupload');
const pdfParse = require('pdf-parse');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(fileUpload());

app.post('/upload', async (req, res) => {
  console.log('Upload request received');
  console.log('Files:', req.files);
  
  if (!req.files || !req.files.file) {
    console.log('No file found in request');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const uploadedFile = req.files.file;
  const fileExtension = uploadedFile.name.split('.').pop().toLowerCase();
  console.log('File extension:', fileExtension);
  console.log('File name:', uploadedFile.name);

  try {
    let text = '';
    let preview = '';

    if (fileExtension === 'pdf') {
      // Handle PDF files
      const data = await pdfParse(uploadedFile.data);
      text = data.text;
    } else if (fileExtension === 'txt') {
      // Handle TXT files
      text = uploadedFile.data.toString('utf8');
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload a PDF or TXT file.' });
    }

    // Get the first 100 words as a preview
    const words = text.split(/\s+/).filter(Boolean).slice(0, 100);
    preview = words.join(' ') + (words.length === 100 ? '...' : '');
    
    console.log('Text length:', text.length);
    console.log('Preview length:', preview.length);
    console.log('Preview:', preview.substring(0, 100));

    // Return both preview and full text
    res.json({ preview, text });
  } catch (err) {
    console.error('Error processing file:', err);
    res.status(500).json({ error: 'Failed to extract text from file' });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
