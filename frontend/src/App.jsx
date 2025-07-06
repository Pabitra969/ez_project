import { useState, useRef, useEffect } from 'react';

function App() {
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! How can I help you with your PDF?' },
    { sender: 'user', text: 'Show me a summary.' },
    { sender: 'ai', text: 'Here is a short summary of your document...' },
  ]);
  const [chatStarted, setChatStarted] = useState(false);
  const [summaryGenerated, setSummaryGenerated] = useState(false);
  const chatEndRef = useRef(null);
  // Store the full PDF text after upload
  const [pdfText, setPdfText] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [mode, setMode] = useState(''); // 'askAnything', 'challenge', or ''
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [summaryStreaming, setSummaryStreaming] = useState(false);
  // Challenge mode states
  const [challengeQuestions, setChallengeQuestions] = useState([]); // [{question, answer, userAnswer, evaluation}]
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  // Add documentId and chatId to state
  const [documentId, setDocumentId] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [documents, setDocuments] = useState([]);

  // Static chat list for now
  const chats = [
    'Chat name 1',
    'Chat name 2',
    'Chat name 3',
  ];

  // Helper function to get full document text from database
  const getFullDocumentText = async (docId) => {
    if (!docId) return '';
    
    try {
      const res = await fetch(`http://localhost:3001/documents/${docId}`);
      const doc = await res.json();
      return doc.fullText || '';
    } catch (err) {
      console.error('Error fetching document text:', err);
      return '';
    }
  };

  // Fetch all documents on app load
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        console.log('Fetching documents from backend...');
        const res = await fetch('http://localhost:3001/documents');
        if (res.ok) {
          const docs = await res.json();
          console.log('Successfully fetched documents:', docs.length, 'documents');
          setDocuments(docs);
        } else {
          console.error('Failed to fetch documents. Status:', res.status);
        }
      } catch (err) {
        console.error('Error fetching documents:', err);
      }
    };
    fetchDocuments();
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setPreview('');
    setPdfText('');
    setDocumentId(null);
    setChatId(null);
    setMessages([]);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:3001/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      console.log('Response from server:', data);
      setPreview(data.preview || 'No preview available.'); // Only show preview
      setPdfText(data.text || ''); // Store the full text for summarization
      
      // Console log the full file text
      console.log('Full File Text:', data.text || '');
      setDocumentId(data.documentId || null);

      // Refresh the documents list to show the new document in sidebar
      const docsRes = await fetch('http://localhost:3001/documents');
      const docs = await docsRes.json();
      setDocuments(docs);

      // Fetch or create chat for this document
      if (data.documentId) {
        // Try to fetch existing chat
        const chatRes = await fetch(`http://localhost:3001/chats/${data.documentId}`);
        if (chatRes.ok) {
          const chatData = await chatRes.json();
          setChatId(chatData._id);
          // Load chat messages
          if (chatData.messages && chatData.messages.length > 0) {
            setMessages(chatData.messages);
          } else {
            setMessages([
              { sender: 'ai', text: 'Hello! How can I help you with your document?' },
            ]);
          }
        } else {
          // No chat exists, create one
          console.log('Creating new chat for uploaded document:', data.documentId);
          const createRes = await fetch('http://localhost:3001/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentId: data.documentId, mode: '' }),
          });
          
          console.log('Upload chat creation response status:', createRes.status);
          
          if (createRes.ok) {
            const newChat = await createRes.json();
            console.log('Successfully created chat for upload:', newChat);
            setChatId(newChat._id);
            setMessages([
              { sender: 'ai', text: 'Hello! How can I help you with your document?' },
            ]);
          } else {
            console.error('Failed to create chat for upload. Status:', createRes.status);
            const errorData = await createRes.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Upload chat creation error:', errorData);
            // Fallback to default messages without chat persistence
            setMessages([
              { sender: 'ai', text: 'Hello! How can I help you with your document?' },
            ]);
          }
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
      setPreview('Failed to extract file text.');
      setPdfText('');
    } finally {
      setLoading(false);
    }
  };

  // handleSend can accept a custom prompt (for summary)
  const handleSend = async (customPrompt) => {
    let userMessage = customPrompt || message;
    if (!userMessage.trim()) return;

    // Always include the full PDF context from database
    let fullContext = '';
    if (documentId) {
      // Get the latest document text from database to ensure we have the full context
      const latestDocText = await getFullDocumentText(documentId);
      if (latestDocText) {
        fullContext = `Document Context: ${latestDocText}\n\nUser Question: ${userMessage}`;
      } else {
        fullContext = userMessage;
      }
    } else {
      fullContext = userMessage;
    }

    const newMessages = [...messages, { sender: 'user', text: message }];
    // Add a placeholder for the streaming AI answer
    newMessages.push({ sender: 'ai', text: "" });
    setMessages(newMessages);
    setMessage('');

    // Add user message to backend chat
    if (chatId) {
      await fetch(`http://localhost:3001/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'user', text: message }),
      });
    }

    // Stream the answer into the last message
    let aiText = "";
    console.log('Sending message with chat history:', messages.length, 'messages');
    console.log('Current messages:', messages);
    
    await streamModelResponse(
      fullContext,
      async chunk => {
        aiText += chunk;
        setMessages(msgs => {
          const updated = [...msgs];
          updated[updated.length - 1] = { sender: 'ai', text: aiText };
          return updated;
        });
      },
      async () => {
        // Add AI message to backend chat
        if (chatId) {
          await fetch(`http://localhost:3001/chats/${chatId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender: 'ai', text: aiText }),
          });
        }
      },
      messages // Pass the current chat history
    );
  };

  // Auto-scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const summaryText = "Here is a short summary of your document...";

  const streamModelResponse = async (prompt, onChunk, onDone, chatHistory = []) => {
    // Convert chat history to the format expected by the model
    const messages = [];
    
    console.log('streamModelResponse called with chatHistory length:', chatHistory.length);
    
    // Add chat history if provided (limit to last 10 messages to avoid token limits)
    if (chatHistory && chatHistory.length > 0) {
      const recentHistory = chatHistory.slice(-10); // Get last 10 messages
      console.log('Adding recent history:', recentHistory.length, 'messages');
      recentHistory.forEach(msg => {
        if (msg.sender === 'user') {
          messages.push({ role: 'user', content: msg.text });
        } else if (msg.sender === 'ai') {
          messages.push({ role: 'assistant', content: msg.text });
        }
      });
    }
    
    // Add the current prompt
    messages.push({ role: 'user', content: prompt });
    
    console.log('Final messages array for model:', messages.length, 'messages');
    console.log('Messages being sent to model:', messages);
    
    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'my_model',
        stream: true,
        messages: messages
      }),
    });

    if (!res.body) {
      onChunk("Error: No stream received.");
      onDone && onDone();
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let buffer = "";

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        let lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.message && json.message.content) {
              onChunk(json.message.content);
            }
            if (json.done) {
              done = true;
              onDone && onDone();
              break;
            }
          } catch (e) {}
        }
      }
      if (doneReading) break;
    }
  };

  const summaryLoading = summaryGenerated && summaryStreaming;

  // Function to generate challenge questions and answers
  const generateChallengeQuestions = async () => {
    setChallengeLoading(true);
    setChallengeQuestions([]);

    try {
      let qaText = "";
      
      // Get the full document text from database to ensure we have complete context
      const fullDocText = await getFullDocumentText(documentId);
      const fullContext = `Based on this document: ${fullDocText}\n\nGenerate exactly 3 challenging questions to test understanding, and provide the correct answer for each. Format the response as:\n1. Q: [Question 1]\nA: [Answer 1]\n2. Q: [Question 2]\nA: [Answer 2]\n3. Q: [Question 3]\nA: [Answer 3]\nReturn only the questions and answers in this format.`;
      
      console.log('Generating challenge questions with document text length:', fullDocText.length);
      
      await streamModelResponse(
        fullContext,
        chunk => {
          qaText += chunk;
        },
        () => {
          // Parse the questions and answers from the response
          const qaPairs = [];
          const regex = /\d+\. Q:([\s\S]*?)A:([\s\S]*?)(?=\d+\. Q:|$)/g;
          let match;
          while ((match = regex.exec(qaText)) !== null) {
            qaPairs.push({
              question: match[1].trim(),
              answer: match[2].trim(),
              userAnswer: '',
              evaluation: null,
              evaluationLoading: false,
              streamedFeedback: '',
            });
          }
          setChallengeQuestions(qaPairs.slice(0, 3));
          setChallengeLoading(false);
        },
        messages // Pass the current chat history
      );
    } catch (error) {
      console.error('Error generating questions:', error);
      setChallengeLoading(false);
    }
  };

  const handleSendAnswer = async (index) => {
    setChallengeQuestions(qs => qs.map((q, i) => i === index ? { ...q, evaluationLoading: true, streamedFeedback: '' } : q));
    const qObj = challengeQuestions[index];
    if (!qObj.userAnswer.trim()) return;

    try {
      // Get the full document text from database to ensure we have complete context
      const fullDocText = await getFullDocumentText(documentId);
      
      // Compose the evaluation prompt with full document context
      const evalPrompt = `Document Context: ${fullDocText}\n\nQuestion: ${qObj.question}\nCorrect Answer: ${qObj.answer}\nUser's Answer: ${qObj.userAnswer}\n\nEvaluate the user's answer based on the document context. Respond in this format:\nScore: [0-10]\nCorrect Answer: [The correct answer] \nFeedback: [What is correct, what is missing, and how to improve]`;

      console.log('Evaluating answer with document text length:', fullDocText.length);

      let evalText = "";
      await streamModelResponse(
        evalPrompt,
        chunk => {
          evalText += chunk;
          setChallengeQuestions(qs => qs.map((q, i) => i === index ? { ...q, streamedFeedback: evalText } : q));
        },
        () => {
          // Parse the model's response
          const scoreMatch = evalText.match(/Score:\s*(\d+)/);
          const correctAnsMatch = evalText.match(/Correct Answer:\s*([\s\S]*?)\nFeedback:/);
          const feedbackMatch = evalText.match(/Feedback:\s*([\s\S]*)/);
          const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
          const correctAnswer = correctAnsMatch ? correctAnsMatch[1].trim() : '';
          const feedback = feedbackMatch ? feedbackMatch[1].trim() : '';
          setChallengeQuestions(qs => qs.map((q, i) => i === index ? {
            ...q,
            evaluation: { score, correctAnswer, feedback },
            evaluationLoading: false,
            streamedFeedback: ''
          } : q));
        },
        messages // Pass the current chat history
      );
    } catch (error) {
      console.error('Error evaluating answer:', error);
      setChallengeQuestions(qs => qs.map((q, i) => i === index ? { ...q, evaluationLoading: false } : q));
    }
  };

  // Function to start a new chat (clear current document)
  const handleNewChat = () => {
    setDocumentId(null);
    setChatId(null);
    setPreview('');
    setPdfText('');
    setMessages([]);
    setSummaryGenerated(false);
    setChatStarted(false);
    setMode('');
    setShowChallenge(false);
    setChallengeQuestions([]);
    setAiSummary('');
  };

  // Function to delete a document and its chat
  const handleDeleteDocument = async (docId, e) => {
    e.stopPropagation(); // Prevent triggering the document selection
    
    if (!confirm('Are you sure you want to delete this document and its chat? This action cannot be undone.')) {
      return;
    }
    
    console.log('Attempting to delete document:', docId);
    
    try {
      const res = await fetch(`http://localhost:3001/documents/${docId}`, {
        method: 'DELETE',
      });
      
      console.log('Delete response status:', res.status);
      console.log('Delete response ok:', res.ok);
      
      if (res.ok) {
        const result = await res.json();
        console.log('Delete response:', result);
        console.log('Document deleted successfully');
        
        // If the deleted document was currently selected, clear the current state
        if (documentId === docId) {
          setDocumentId(null);
          setChatId(null);
          setPreview('');
          setPdfText('');
          setMessages([]);
          setSummaryGenerated(false);
          setChatStarted(false);
          setMode('');
          setShowChallenge(false);
          setChallengeQuestions([]);
          setAiSummary('');
        }
        
        // Refresh the documents list
        const docsRes = await fetch('http://localhost:3001/documents');
        const docs = await docsRes.json();
        setDocuments(docs);
      } else {
        // Handle error response more safely
        let errorMessage = 'Unknown error';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || 'Unknown error';
        } catch (parseError) {
          // If JSON parsing fails, use status text
          errorMessage = res.statusText || `HTTP ${res.status}`;
        }
        console.error('Failed to delete document. Status:', res.status, 'Error:', errorMessage);
        alert(`Failed to delete document: ${errorMessage}`);
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Error deleting document. Please try again.');
    }
  };

  // Add a function to load a document and its chat
  const handleSelectDocument = async (docId) => {
    setLoading(true);
    setDocumentId(docId);
    setChatId(null);
    setPreview('');
    setPdfText('');
    setMessages([]);
    try {
      // Fetch document details
      const docRes = await fetch(`http://localhost:3001/documents/${docId}`);
      const doc = await docRes.json();
      setPreview(doc.preview || 'No preview available.');
      setPdfText(doc.fullText || '');
      
      // Fetch or create chat for this document
      const chatRes = await fetch(`http://localhost:3001/chats/${docId}`);
      console.log('Chat response status:', chatRes.status);
      
      if (chatRes.ok) {
        const chatData = await chatRes.json();
        console.log('Loaded chat data:', chatData);
        setChatId(chatData._id);
        
        if (chatData.messages && chatData.messages.length > 0) {
          console.log('Loading existing messages:', chatData.messages.length, 'messages');
          setMessages(chatData.messages);
        } else {
          console.log('No existing messages, setting default welcome message');
          setMessages([
            { sender: 'ai', text: 'Hello! How can I help you with your document?' },
          ]);
        }
      } else {
        console.log('No existing chat found, creating new one');
        // No chat exists, create one
        const createRes = await fetch('http://localhost:3001/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: docId, mode: '' }),
        });
        
        console.log('Chat creation response status:', createRes.status);
        
        if (createRes.ok) {
          const newChat = await createRes.json();
          console.log('Created new chat:', newChat);
          setChatId(newChat._id);
          setMessages([
            { sender: 'ai', text: 'Hello! How can I help you with your document?' },
          ]);
        } else {
          console.error('Failed to create chat. Status:', createRes.status);
          const errorData = await createRes.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Chat creation error:', errorData);
          // Fallback to default messages without chat persistence
          setMessages([
            { sender: 'ai', text: 'Hello! How can I help you with your document?' },
          ]);
        }
      }
    } catch (err) {
      console.error('Error loading document:', err);
      setPreview('Failed to load document.');
      setPdfText('');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Root container: holds sidebar and main content
    <div className="h-screen w-screen flex bg-[#343541] text-[#ececf1] overflow-hidden">
      {/* Sidebar: chat navigation and new chat button (fixed, toggleable) */}
      <aside className={`w-72 h-screen bg-[#202123] border-r border-[#343541] flex flex-col p-4 shadow-lg z-20 fixed left-0 top-0 overflow-y-auto transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-2 mb-6">
          {/* New chat button */}
          <button 
            className="flex items-center gap-2 px-3 py-2 border border-[#444654] rounded hover:bg-[#343541] transition text-[#ececf1] bg-[#202123] font-semibold shadow-sm"
            onClick={handleNewChat}
          >
            <span className="text-xl">📝</span>
            <span>New chat</span>
          </button>
          {/* Sidebar toggle button */}
          <button
            className="ml-auto px-2 py-2 rounded hover:bg-[#343541] transition text-[#ececf1]"
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            onClick={() => setSidebarOpen(v => !v)}
          >
            {sidebarOpen ? <span>&#10005;</span> : <span>&#9776;</span>}
          </button>
        </div>
        {/* Document chat list */}
        <div className="mb-2 font-bold text-[#ececf1]">Your Documents</div>
        <div className="flex flex-col gap-2 overflow-y-auto">
          {documents.length === 0 && (
            <div className="text-[#8e8ea0] text-sm">No documents yet.</div>
          )}
          {documents.map((doc) => (
            <div
              key={doc._id}
              className={`px-3 py-2 border-b border-[#343541] cursor-pointer hover:bg-[#343541] rounded text-[#ececf1] transition ${documentId === doc._id ? 'bg-[#10a37f] text-white font-bold' : ''}`}
              onClick={() => handleSelectDocument(doc._id)}
              title={doc.filename}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="truncate flex items-center gap-2">
                    {documentId === doc._id && <span className="text-xs">●</span>}
                    {doc.filename}
                  </div>
                  <div className={`text-xs ${documentId === doc._id ? 'text-white' : 'text-[#8e8ea0]'}`}>
                    {new Date(doc.uploadDate).toLocaleString()}
                  </div>
                </div>
                <button
                  className="ml-2 px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                  onClick={(e) => handleDeleteDocument(doc._id, e)}
                  title="Delete document and chat"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>
      {/* Main content: PDF preview, chat area, and message input */}
      <main className={`flex-1 h-screen flex flex-col items-center bg-[#343541] relative transition-all duration-300 ${sidebarOpen ? 'ml-72' : 'ml-0'}`}>
        {/* Show summary and options when generated but chat not started */}
        {summaryGenerated && !chatStarted && (
          <div className="w-full max-w-3xl mt-8 overflow-y-auto max-h-[calc(100vh-100px)] scrollbar-none px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div className="p-4 bg-[#444654] rounded-lg text-[#ececf1] text-start mb-10">
              {aiSummary || "Generating summary please wait..."}
            </div>
            
            {/* Challenge Questions Section */}
            {showChallenge && mode === 'challenge' && (
              <div className="mb-6">
                <h3 className="text-xl font-bold text-[#ececf1] mb-4 text-center">Challenge Questions</h3>
                {challengeLoading ? (
                  <div className="text-center text-[#ececf1]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                    Generating challenging questions...
                  </div>
                ) : challengeQuestions.length > 0 ? (
                  <div className="space-y-4">
                    {challengeQuestions.map((question, index) => (
                      <div key={index} className="p-4 bg-[#444654] rounded-lg border border-[#343541]">
                        <div className="flex items-start gap-3">
                          <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-[#ececf1] font-medium mb-3">{question.question}</p>
                            <div className="flex gap-2 items-end">
                              <textarea
                                className="w-full p-3 bg-[#343541] border border-[#444654] rounded-lg text-[#ececf1] placeholder-[#8e8ea0] resize-none"
                                placeholder="Type your answer here..."
                                rows="3"
                                value={question.userAnswer}
                                onChange={e => {
                                  setChallengeQuestions(qs => qs.map((q, i) => i === index ? { ...q, userAnswer: e.target.value } : q));
                                }}
                              />
                              <button
                                className="ml-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                                onClick={() => handleSendAnswer(index)}
                                disabled={!question.userAnswer.trim() || question.evaluation || question.evaluationLoading}
                              >
                                {question.evaluationLoading ? 'Evaluating...' : 'Send'}
                              </button>
                            </div>
                            {/* Evaluation result will be shown here later */}
                            {question.evaluationLoading && (
                              <div className="mt-3 p-3 bg-[#22232a] rounded-lg border border-[#343541] text-[#ececf1] flex items-center gap-2">
                                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></span>
                                <span>{question.streamedFeedback || 'Evaluating...'}</span>
                              </div>
                            )}
                            {question.evaluation && (
                              <div className="mt-3 p-3 bg-[#22232a] rounded-lg border border-[#343541] text-[#ececf1]">
                                <div className="mb-1"><span className="font-semibold">Score:</span> <span className="text-green-400 font-bold">{question.evaluation.score ?? '-'}/10</span></div>
                                <div className="mb-1"><span className="font-semibold">Correct Answer:</span> <span className="text-[#10a37f]">{question.evaluation.correctAnswer}</span></div>
                                <div><span className="font-semibold">Feedback:</span> <span>{question.evaluation.feedback}</span></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-center mt-6 gap-4">
                      <button
                        className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold"
                        onClick={() => {
                          setShowChallenge(false);
                          setMode('');
                          setChallengeQuestions([]);
                        }}
                      >
                        Back to Options
                      </button>
                      <button
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                        onClick={() => {
                          // TODO: Implement answer submission and grading
                          alert('Answer submission and grading feature coming soon!');
                        }}
                      >
                        Submit Answers
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-[#ececf1]">
                    Failed to generate questions. Please try again.
                  </div>
                )}
              </div>
            )}
            
            {/* Ask me anything & Challenge me options, directly below summary */}
            {preview && !showChallenge && (
              <div className="flex gap-4 justify-center mb-6 mt-4">
                <button
                  className={`px-4 py-2 rounded bg-blue-600 text-white transition ${summaryLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                  onClick={async () => {
                    if (summaryLoading) return;
                    setChatStarted(true);
                    setMode('askAnything');
                    
                    // Load existing chat from backend if available
                    if (documentId) {
                      try {
                        const chatRes = await fetch(`http://localhost:3001/chats/${documentId}`);
                        if (chatRes.ok) {
                          const chatData = await chatRes.json();
                          console.log('Loading existing chat for Ask Me Anything:', chatData);
                          
                          if (chatData.messages && chatData.messages.length > 0) {
                            // Load existing chat messages
                            setMessages(chatData.messages);
                            setChatId(chatData._id);
                          } else {
                            // No existing messages, start fresh with welcome
                            setMessages([
                              { sender: 'ai', text: aiSummary || summaryText },
                              { sender: 'ai', text: 'Ask me any question you have.' }
                            ]);
                          }
                        } else {
                          // No chat exists, create one
                          console.log('Creating new chat for document:', documentId);
                          const createRes = await fetch('http://localhost:3001/chats', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ documentId: documentId, mode: 'askAnything' }),
                          });
                          
                          console.log('Chat creation response status:', createRes.status);
                          
                          if (createRes.ok) {
                            const newChat = await createRes.json();
                            console.log('Successfully created new chat:', newChat);
                            setChatId(newChat._id);
                            setMessages([
                              { sender: 'ai', text: aiSummary || summaryText },
                              { sender: 'ai', text: 'Ask me any question you have.' }
                            ]);
                          } else {
                            console.error('Failed to create chat. Status:', createRes.status);
                            const errorData = await createRes.json().catch(() => ({ error: 'Unknown error' }));
                            console.error('Chat creation error:', errorData);
                            // Fallback to default messages without chat persistence
                            setMessages([
                              { sender: 'ai', text: aiSummary || summaryText },
                              { sender: 'ai', text: 'Ask me any question you have.' }
                            ]);
                          }
                        }
                      } catch (err) {
                        console.error('Error loading chat for Ask Me Anything:', err);
                        // Fallback to default messages
                        setMessages([
                          { sender: 'ai', text: aiSummary || summaryText },
                          { sender: 'ai', text: 'Ask me any question you have.' }
                        ]);
                      }
                    } else {
                      // No document selected, just start with welcome
                      setMessages([
                        { sender: 'ai', text: aiSummary || summaryText },
                        { sender: 'ai', text: 'Ask me any question you have.' }
                      ]);
                    }
                  }}
                  disabled={summaryLoading}
                >
                  Ask me anything
                </button>
                <button
                  className={`px-4 py-2 rounded bg-purple-600 text-white transition ${summaryLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'}`}
                  onClick={() => {
                    if (summaryLoading) return;
                    setMode('challenge');
                    setShowChallenge(true);
                    generateChallengeQuestions();
                  }}
                  disabled={summaryLoading}
                >
                  Challenge me
                </button>
              </div>
            )}
          </div>
        )}

        {/* Show chat interface when chat is started */}
        {chatStarted && (
          <div className="w-full max-w-3xl mt-8">
            {/* Summary at the top of chat */}
            {aiSummary && (
              <div className="p-4 bg-[#444654] rounded-lg text-[#ececf1] text-start mb-6">
                <h3 className="font-bold mb-2">Document Summary:</h3>
                {aiSummary}
              </div>
            )}
            
            {/* Back to Options button for Ask Me Anything mode */}
            {mode === 'askAnything' && (
              <div className="flex justify-center mb-6">
                <button
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold"
                  onClick={() => {
                    setChatStarted(false);
                    setMode('');
                    setMessages([]);
                    setChatId(null);
                  }}
                >
                  Back to Options
                </button>
              </div>
            )}
          </div>
        )}

        {/* PDF Preview (collapsible) - only show if summary not generated */}
        {!summaryGenerated && (
          <div className="w-full max-w-3xl mt-8">
            <button
              className="mb-2 text-[#ececf1] hover:underline flex items-center gap-2"
              onClick={() => setShowPreview((v) => !v)}
            >
              <span>{showPreview ? '▼' : '►'}</span>
              <span className="font-semibold">PDF Preview</span>
            </button>
            {showPreview && (
              // PDF preview box
              <div className="w-full bg-[#202123] border border-[#444654] rounded-lg p-4 text-[#ececf1] mb-4 text-center min-h-[60px] shadow-sm">
                {loading ? 'Extracting preview...' : preview}
                <div className="flex flex-col items-center gap-2 mt-4">
                  {preview ? (
                    <div className="flex gap-4">
                      <button
                        className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 transition"
                        onClick={() => setPreview('')}
                        type="button"
                      >
                        Cancel
                      </button>
                      <button
                        className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition"
                        onClick={async () => {
                          setAiSummary("");
                          setSummaryGenerated(true);
                          setSummaryStreaming(true);
                          
                          try {
                            // Get the full document text from database to ensure we have complete context
                            const fullDocText = await getFullDocumentText(documentId);
                            const summaryPrompt = `Document Context: ${fullDocText}\n\nPlease provide a comprehensive summary of this document in exactly 150 words or less. Focus on the key points, main ideas, and important details.`;
                            
                            console.log('Generating summary with document text length:', fullDocText.length);
                            
                            streamModelResponse(
                              summaryPrompt,
                              chunk => setAiSummary(prev => prev + chunk),
                              () => setSummaryStreaming(false),
                              [] // No chat history for summary generation
                            );
                          } catch (error) {
                            console.error('Error generating summary:', error);
                            setAiSummary('Error generating summary. Please try again.');
                            setSummaryStreaming(false);
                          }
                        }}
                        type="button"
                      >
                        Generate
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2">
                      <input
                        type="file"
                        accept="application/pdf,text/plain"
                        className="ml-20 text-sm text-[#ececf1] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#444654] file:text-[#ececf1] hover:file:bg-[#10a37f] hover:file:text-white"
                        onChange={handleUpload}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chat area and message input */}
        {preview && chatStarted && (
          <>
            {/* Chat area: message history (scrollable) */}
            <div className="w-full max-w-3xl flex flex-col flex-1 mt-8">
              <div className="flex-1 overflow-y-auto scrollbar-none px-2 bg-[#343541] rounded-lg shadow-inner border-none mb-4" style={{ maxHeight: 'calc(100vh - 320px)', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`my-2 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`px-5 py-3 rounded-2xl max-w-[90%] text-base shadow transition-all duration-200 ${
                        msg.sender === 'user'
                          ? 'bg-[#10a37f] text-white text-center rounded-br-md'
                          : 'bg-[#444654] text-[#ececf1] text-left rounded-bl-md'
                      }`}
                      style={{
                        borderBottomRightRadius: msg.sender === 'user' ? '0.5rem' : '1rem',
                        borderBottomLeftRadius: msg.sender === 'ai' ? '0.5rem' : '1rem',
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>
            {/* Message input: sticky at the bottom */}
            <form
              className="w-full max-w-3xl flex items-center gap-2 p-4 bg-[#202123] fixed bottom-10 shadow-lg rounded-2xl"
              style={{ zIndex: 10 }}
              onSubmit={e => { e.preventDefault(); handleSend(); }}
            >
              <input
                type="text"
                className="flex-1 py-3 px-4 rounded-2xl bg-[#343541] text-[#ececf1] border border-[#444654] focus:outline-none focus:ring-2 focus:ring-[#10a37f] transition"
                placeholder="Type your message..."
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
              <button
                type="submit"
                className="py-3 px-7 rounded-2xl bg-[#10a37f] text-white font-semibold hover:bg-[#13c296] hover:text-white transition shadow"
              >
                Send
              </button>
            </form>
          </>
        )}
      </main>
      {/* Sidebar show button when hidden */}
      {!sidebarOpen && (
        <button
          className="fixed top-4 left-4 z-30 px-3 py-2 rounded bg-[#202123] border border-[#343541] text-[#ececf1] shadow hover:bg-[#343541] transition"
          onClick={() => setSidebarOpen(true)}
          title="Show sidebar"
        >
          &#9776;
        </button>
      )}
      </div>
  );
}

export default App;
