const express = require('express');
const fileUpload = require('express-fileupload');
const pdfParse = require('pdf-parse');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.json());
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  abortOnLimit: true,
  responseOnLimit: 'File size limit has been reached',
  debug: true, // Enable debug logging
}));

// Connect to local MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/ezpdf');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Document schema
const documentSchema = new mongoose.Schema({
  filename: String,
  fullText: String,
  preview: String,
  uploadDate: { type: Date, default: Date.now },
});
const Document = mongoose.model('Document', documentSchema);

// Chat schema
const chatSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  messages: [
    {
      sender: String, // 'user' or 'ai'
      text: String,
      timestamp: { type: Date, default: Date.now },
    }
  ],
  mode: String, // 'askAnything' or 'challenge'
  challengeQuestions: [
    {
      question: String,
      answer: String,
      userAnswer: String,
      evaluation: mongoose.Schema.Types.Mixed,
    }
  ],
  createdAt: { type: Date, default: Date.now },
});
const Chat = mongoose.model('Chat', chatSchema);

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
  console.log('File size:', uploadedFile.size, 'bytes');

  try {
    let text = '';
    let preview = '';

    if (fileExtension === 'pdf') {
      // Handle PDF files
      console.log('Processing PDF file...');
      if (!uploadedFile.data || uploadedFile.data.length === 0) {
        console.error('PDF file data is empty or undefined');
        return res.status(400).json({ error: 'PDF file is empty or corrupted' });
      }
      
      const data = await pdfParse(uploadedFile.data);
      console.log('PDF parsed successfully');
      console.log('PDF pages:', data.numpages);
      text = data.text;
      
      if (!text || text.trim().length === 0) {
        console.error('No text extracted from PDF');
        return res.status(400).json({ error: 'No text could be extracted from the PDF. The PDF might be image-based or corrupted.' });
      }
    } else if (fileExtension === 'txt') {
      // Handle TXT files
      console.log('Processing TXT file...');
      text = uploadedFile.data.toString('utf8');
      
      if (!text || text.trim().length === 0) {
        console.error('TXT file is empty');
        return res.status(400).json({ error: 'TXT file is empty' });
      }
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload a PDF or TXT file.' });
    }

    // Get the first 100 words as a preview
    const words = text.split(/\s+/).filter(Boolean).slice(0, 100);
    preview = words.join(' ') + (words.length === 100 ? '...' : '');
    
    console.log('Text length:', text.length);
    console.log('Preview length:', preview.length);
    console.log('Preview:', preview.substring(0, 100));

    // Save document to MongoDB
    const doc = new Document({
      filename: uploadedFile.name,
      fullText: text,
      preview,
    });
    await doc.save();
    console.log('Document saved with ID:', doc._id);

    // Return preview, text, and document ID
    res.json({ preview, text, documentId: doc._id });
  } catch (err) {
    console.error('Error processing file:', err);
    console.error('Error stack:', err.stack);
    
    // Provide more specific error messages
    if (err.message.includes('Invalid PDF')) {
      res.status(400).json({ error: 'Invalid PDF file. Please check if the file is corrupted or password-protected.' });
    } else if (err.message.includes('password')) {
      res.status(400).json({ error: 'PDF is password-protected. Please remove the password and try again.' });
    } else {
      res.status(500).json({ error: 'Failed to extract text from file. Please try again or contact support.' });
    }
  }
});

// List all documents
app.get('/documents', async (req, res) => {
  try {
    const docs = await Document.find({}, 'filename preview uploadDate');
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get a document by ID
app.get('/documents/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Create a new chat for a document
app.post('/chats', async (req, res) => {
  try {
    console.log('Received body:', req.body); // <--- Add this line
    let { documentId, mode } = req.body;
    if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: 'Invalid or missing documentId' });
    }
    documentId = new mongoose.Types.ObjectId(documentId);
    const chat = new Chat({ documentId, mode, messages: [], challengeQuestions: [] });
    await chat.save();
    res.json(chat);
  } catch (err) {
    console.error('Failed to create chat:', err);
    res.status(500).json({ error: 'Failed to create chat', details: err.message });
  }
});

// Get chat for a document
app.get('/chats/:documentId', async (req, res) => {
  try {
    const chat = await Chat.findOne({ documentId: req.params.documentId });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
});

// Add a message to a chat
app.post('/chats/:chatId/messages', async (req, res) => {
  try {
    const { sender, text } = req.body;
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    chat.messages.push({ sender, text });
    await chat.save();
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Delete a document and its associated chat
app.delete('/documents/:id', async (req, res) => {
  try {
    const documentId = req.params.id;
    console.log('Delete request received for document:', documentId);
    
    // Delete the document
    const doc = await Document.findByIdAndDelete(documentId);
    if (!doc) {
      console.log('Document not found:', documentId);
      return res.status(404).json({ error: 'Document not found' });
    }
    
    console.log('Document deleted:', doc.filename);
    
    // Delete the associated chat
    const chat = await Chat.findOneAndDelete({ documentId: documentId });
    if (chat) {
      console.log('Associated chat deleted');
    } else {
      console.log('No associated chat found to delete');
    }
    
    console.log(`Deleted document ${documentId} and its associated chat`);
    res.json({ message: 'Document and chat deleted successfully' });
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
