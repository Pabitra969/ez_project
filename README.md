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
# From the project root
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

### 7. **(Optional) Model API**
- If your app uses a local model API (like Ollama or similar), make sure it’s running on the expected port (e.g., `http://localhost:11434`).

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
```

---

## 📬 Contact

For questions or issues, please open an issue on GitHub or contact the maintainer. 
