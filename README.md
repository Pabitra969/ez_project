# Document Chat App

A full-stack application for uploading PDF/TXT documents, generating summaries, and chatting with your documents using AI.

---

## 🚀 Local Setup Instructions

### 1. **Clone the Repository**
```bash
git clone https://github.com/Pabitra969/ez_project.git
cd ez_project
```

### 2. **Install Backend Dependencies**
```bash
npm install
```

### 3. **Install Frontend Dependencies**
```bash
cd frontend
npm install
```

### 4. **Set Up MongoDB**
- **Option 1 (Local):** Install MongoDB locally ([Download here](https://www.mongodb.com/try/download/community)), start the service, and the backend will connect to `mongodb://127.0.0.1:27017/ezpdf`.
- **Option 2 (Atlas Web):** Use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) for a free cloud database. Update the connection string in `server.js` to your Atlas URI.
- **Option 3 (Atlas CLI):**
  - **macOS/Linux (with Homebrew):**
    ```bash
    brew install mongodb-atlas
    atlas setup
    ```
  - **Windows:**
    Download and install the MongoDB Atlas CLI from the [official releases page](https://www.mongodb.com/try/download/atlas-cli)
    **OR** (if you have Chocolatey):
    ```powershell
    choco install mongodb-atlas-cli
    atlas setup
    ```

### 5. **Start the Backend**
- **From the project root**
```bash
node server.js
```
- The backend will run on [http://localhost:3001](http://localhost:3001).

### 6. **Start the Frontend**
```bash
cd frontend
npm run dev
```
- The frontend will run on [http://localhost:5173](http://localhost:5173).

### 7. **Model Setup (Ollama + Hugging Face)**

Follow these steps to set up your custom AI model for use with this project:

1. **Download the Model from Hugging Face**
   ```bash
   git clone https://huggingface.co/Pabitra09/summarisation_ez_model
   ```
   - The model file `unsloth.Q4_K_M.gguf` will be in the `summarisation_ez_model` folder.

2. **Copy the Path of the Model File**
   - Locate `unsloth.Q4_K_M.gguf` inside the `summarisation_ez_model` folder.
   - Copy its full path for use in the next step.

3. **Edit the Modelfile**
   - Open the `Modelfile` in VSCode or any text editor.
   - Find the line:
     ```
     FROM /Pabitra09/summarisation_ez_model/unsloth.Q4_K_M.gguf
     ```
   - Replace it with:
     ```
     FROM <your-full-path-to-the-gguf-model-file>/unsloth.Q4_K_M.gguf
     ```
     > **Note:**If your path contains `/unsloth.Q4_K_M.gguf` at the end the Replane it with:
     ```
     FROM <your-full-path-to-the-gguf-model-file>
     ```

4. **Download and Install Ollama**
   - Download Ollama for your OS: [https://ollama.com/download](https://ollama.com/download)
   - Install and open the Ollama app, then leave it running in the background.

5. **Open Terminal or Command Prompt**

6. **Create the Model in Ollama**
   ```bash
   ollama create my_model -f Modelfile
   ```

7. **Run the Model**
   ```bash
   ollama run my_model
   ```

8. **Verify Setup**
   - If you see a conversation prompt in your terminal, your model setup is ready!

> **Note:** Model setup is a one-time process. Next time, you only need to start the Ollama app in the background before running the project.

**References:**
- [Your Hugging Face Model](https://huggingface.co/Pabitra09/summarisation_ez_model)
- [Ollama Download](https://ollama.com/download)

---

## 🛠️ Troubleshooting

- **MongoDB connection errors:** Make sure MongoDB is running and accessible.
- **Port conflicts:** Change the port in `server.js` or your frontend config if needed.
- **Model API errors:** Ensure your model server is running and accessible.

---

## 📄 Project Structure

```
your-repo-name/
├── server.js           # Node.js/Express backend
├── package.json        # Backend dependencies
├── frontend/           # React frontend (Vite)
│   ├── package.json
│   └── ...
├── postman/           # Postman dump
│   ├── ez_project.postman_collection.json
```

---

## 📬 Contact

For questions or issues, please open an issue on GitHub or contact the maintainer. 
