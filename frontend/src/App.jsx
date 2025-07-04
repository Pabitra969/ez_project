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
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const res = await fetch('http://localhost:3001/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setPreview(data.preview || 'No preview available.');
    } catch (err) {
      setPreview('Failed to extract PDF text.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!message.trim()) return;
    const newMessages = [...messages, { sender: 'user', text: message }];
    setMessages([
      ...newMessages,
      { sender: 'ai', text: "This is a placeholder AI response." } // Replace with real AI logic later
    ]);
    setMessage('');
  };

  // Auto-scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const summaryText = "Here is a short summary of your document...";

  return (
    // Root container: holds sidebar and main content
    <div className="h-screen w-screen flex bg-[#343541] text-[#ececf1] overflow-hidden">
      {/* Sidebar: chat navigation and new chat button */}
      <aside className="w-72 h-full bg-[#202123] border-r border-[#343541] flex flex-col p-4 shadow-lg z-20">
        {/* New chat button */}
        <button className="flex items-center gap-2 mb-6 px-3 py-2 border border-[#444654] rounded hover:bg-[#343541] transition text-[#ececf1] bg-[#202123] font-semibold shadow-sm">
          <span className="text-xl">📝</span>
          <span>New chat</span>
        </button>
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
      <main className="flex-1 h-full flex flex-col items-center justify-between bg-[#343541] relative">
        {/* Show summary at the top if generated */}
        {summaryGenerated && !chatStarted && (
          <div className="w-full max-w-3xl mt-8">
            <div className="p-4 bg-[#444654] rounded-lg text-[#ececf1] text-center mb-6">
              {summaryText}
            </div>
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
                          // Your summary generation logic here
                          setSummaryGenerated(true);
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

        {/* Ask me anything & Challenge me options, with bottom margin */}
        {preview && summaryGenerated && !chatStarted && (
          <div className="flex flex-col items-center mb-16">
            <div className="flex gap-4 justify-center mt-4">
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                onClick={() => {
                  setChatStarted(true);
                  setMessages([
                    { sender: 'ai', text: summaryText },
                    { sender: 'ai', text: 'Ask me any question you have.' }
                  ]);
                }}
              >
                Ask me anything
              </button>
              <button
                className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 transition"
                onClick={() => {
                  setChatStarted(true);
                  setMessages([
                    { sender: 'ai', text: summaryText },
                    { sender: 'ai', text: 'Ask me any question you have.' }
                  ]);
                }}
              >
                Challenge me
              </button>
            </div>
          </div>
        )}

        {/* Chat area and message input */}
        {preview && chatStarted && (
          <>
            {/* Chat area: message history */}
            <div className="flex-1 w-full max-w-3xl flex flex-col justify-end pb-32 border-none">
              <div className="flex-1 overflow-y-auto px-2 bg-[#343541] rounded-lg shadow-inner border-none mt-4 mb-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`my-2 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`px-5 py-3 rounded-2xl max-w-[70%] text-base shadow transition-all duration-200 ${
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
    </div>
  );
}

export default App;
