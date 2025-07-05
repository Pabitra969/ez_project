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
  const [mode, setMode] = useState(''); // 'askAnything' or ''
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [summaryStreaming, setSummaryStreaming] = useState(false);

  // Static chat list for now
  const chats = [
    'Chat name 1',
    'Chat name 2',
    'Chat name 3',
  ];

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setPreview('');
    setPdfText('');
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const res = await fetch('http://localhost:3001/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setPreview(data.preview || 'No preview available.'); // Only show preview
      setPdfText(data.text || ''); // Store the full text for summarization
    } catch (err) {
      setPreview('Failed to extract PDF text.');
      setPdfText('');
    } finally {
      setLoading(false);
    }
  };

  // handleSend can accept a custom prompt (for summary)
  const handleSend = async (customPrompt) => {
    let userMessage = customPrompt || message;
    if (!userMessage.trim()) return;

    // If in Ask Me Anything mode, wrap the prompt
    if (mode === 'askAnything' && !customPrompt) {
      userMessage = `Context : ${pdfText} . Answer the question from the above context. Question : ${message}`;
    }

    const newMessages = [...messages, { sender: 'user', text: message }];
    // Add a placeholder for the streaming AI answer
    newMessages.push({ sender: 'ai', text: "" });
    setMessages(newMessages);
    setMessage('');

    // Stream the answer into the last message
    let aiText = "";
    await streamModelResponse(
      userMessage,
      chunk => {
        aiText += chunk;
        setMessages(msgs => {
          const updated = [...msgs];
          updated[updated.length - 1] = { sender: 'ai', text: aiText };
          return updated;
        });
      }
    );
  };

  // Auto-scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const summaryText = "Here is a short summary of your document...";

  const streamModelResponse = async (prompt, onChunk, onDone) => {
    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'my_model',
        stream: true,
        messages: [
          { role: 'user', content: prompt }
        ]
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

  return (
    // Root container: holds sidebar and main content
    <div className="h-screen w-screen flex bg-[#343541] text-[#ececf1] overflow-hidden">
      {/* Sidebar: chat navigation and new chat button (fixed, toggleable) */}
      <aside className={`w-72 h-screen bg-[#202123] border-r border-[#343541] flex flex-col p-4 shadow-lg z-20 fixed left-0 top-0 overflow-y-auto transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-2 mb-6">
          {/* New chat button */}
          <button className="flex items-center gap-2 px-3 py-2 border border-[#444654] rounded hover:bg-[#343541] transition text-[#ececf1] bg-[#202123] font-semibold shadow-sm">
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
        {/* Chat list */}
        <div className="mb-2 font-bold text-[#ececf1]">Chats</div>
        <div className="flex flex-col gap-2 overflow-y-auto">
          {chats.map((chat, idx) => (
            <div key={idx} className="px-3 py-2 border-b border-[#343541] cursor-pointer hover:bg-[#343541] rounded text-[#ececf1] transition">
              {chat}
            </div>
          ))}
        </div>
      </aside>
      {/* Main content: PDF preview, chat area, and message input */}
      <main className={`flex-1 h-screen flex flex-col items-center justify-between bg-[#343541] relative transition-all duration-300 ${sidebarOpen ? 'ml-72' : 'ml-0'}`}>
        {/* Show summary at the top if generated */}
        {summaryGenerated && !chatStarted && (
          <div className="w-full max-w-3xl mt-8">
            <div className="p-4 bg-[#444654] rounded-lg text-[#ececf1] text-start mb-10">
              {aiSummary || "Generating summary please wait..."}
            </div>
            {/* Ask me anything & Challenge me options, directly below summary */}
            {preview && (
              <div className="flex gap-4 justify-center mb-6 mt-4">
                <button
                  className={`px-4 py-2 rounded bg-blue-600 text-white transition ${summaryLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                  onClick={() => {
                    if (summaryLoading) return;
                    setChatStarted(true);
                    setMode('askAnything');
                    setMessages([
                      { sender: 'ai', text: aiSummary || summaryText },
                      { sender: 'ai', text: 'Ask me any question you have.' }
                    ]);
                  }}
                  disabled={summaryLoading}
                >
                  Ask me anything
                </button>
                <button
                  className={`px-4 py-2 rounded bg-purple-600 text-white transition ${summaryLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'}`}
                  onClick={() => {
                    if (summaryLoading) return;
                    setChatStarted(true);
                    setMessages([
                      { sender: 'ai', text: aiSummary || summaryText },
                      { sender: 'ai', text: 'Ask me any question you have.' }
                    ]);
                  }}
                  disabled={summaryLoading}
                >
                  Challenge me
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
                        onClick={() => {
                          setAiSummary("");
                          setSummaryGenerated(true);
                          setSummaryStreaming(true);
                          streamModelResponse(
                            `Summarize the text within 150 to 170 words. ${pdfText}`,
                            chunk => setAiSummary(prev => prev + chunk),
                            () => setSummaryStreaming(false)
                          );
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
            <div className="flex-1 w-full max-w-3xl flex flex-col justify-end pb-32 border-none">
              <div className="flex-1 overflow-y-auto scrollbar-none px-2 bg-[#343541] rounded-lg shadow-inner border-none mt-4 mb-4" style={{ maxHeight: 'calc(100vh - 220px)', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
