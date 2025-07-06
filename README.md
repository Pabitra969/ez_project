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
- **Option 1:** Install MongoDB locally ([Download here](https://www.mongodb.com/try/download/community)), start the service, and the backend will connect to `mongodb://127.0.0.1:27017/ezpdf`.
- **Option 2:** Use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) for a free cloud database. Update the connection string in `server.js` to your Atlas URI.
- **Option 3 (macOS/Linux):** Install the MongoDB Atlas CLI and set up Atlas from the command line:
  ```bash
  brew install mongodb-atlas
  atlas setup
  ```
  _Note: Homebrew is required. For Windows, see below._

- **Option 3 (Windows):**  
  Download and install the MongoDB Atlas CLI from the [official releases page](https://www.mongodb.com/try/download/atlas-cli)  
  **OR** (if you have Chocolatey):
  ```powershell
  choco install mongodb-atlas-cli
  atlas setup
  ```

### 5. **Start the Backend**
```
```

Let me know if you want this added to your README!