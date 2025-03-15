'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isTyping?: boolean;
  isThinking?: boolean;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi, I\'m Evan. Feel free to ask me anything!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState('connected'); // default to connected to avoid UI issues
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingSpeed = 10; // ms per character
  const [showResumePopup, setShowResumePopup] = useState(false); // State for resume popup

  // animation keyframes
  const slideInRight = `
    @keyframes slideInRight {
      from {
        transform: translateX(20px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    .animate-slideInRight {
      animation: slideInRight 0.3s ease-out forwards;
    }
  `;

  // Add popup animation
  const popupAnimation = `
    @keyframes popIn {
      0% {
        transform: scale(0.8);
        opacity: 0;
      }
      70% {
        transform: scale(1.05);
        opacity: 1;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    .animate-popIn {
      animation: popIn 0.8s ease-out forwards;
    }
  `;

  // Custom colors
  const navyBlue = 'rgb(29, 53, 87)'; // navy blue
  const navyBlueHover = 'rgb(40, 67, 107)'; // lighter navy blue when hovering
  const navyBlueDisabled = 'rgb(141, 153, 174)'; // when disabled
  const lightBlue = 'rgb(69, 123, 157)'; // Light blue for accents
  const paleBlue = 'rgb(230, 235, 245)'; // Very light blue for backgrounds

  // to scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Typing effect for assistant messages
  const simulateTyping = (fullText: string) => {
    // Add a placeholder message with empty content and isTyping flag
    setMessages(prev => [...prev, { role: 'assistant', content: '', isTyping: true }]);
    
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < fullText.length) {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          // Update the last message's content character by character
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: fullText.substring(0, i + 1)
          };
          return newMessages;
        });
        i++;
      } else {
        // Typing complete, remove the typing flag
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            isTyping: false
          };
          return newMessages;
        });
        clearInterval(typingInterval);
      }
      scrollToBottom();
    }, typingSpeed);
  };

  // Check if API is available on component mount
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch('http://localhost:8000/health', { 
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          setApiStatus('connected');
        } else {
          setApiStatus('error');
          setMessages(prev => [...prev, {
            role: 'system',
            content: 'Error: API is not responding correctly. Please check if the backend is running.'
          }]);
        }
      } catch (err) {
        setApiStatus('error');
        setMessages(prev => [...prev, {
          role: 'system',
          content: 'Error: Cannot connect to API. Make sure the backend is running.'
        }]);
        console.error('API connection error:', err);
      }
    };
    
    checkApiStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    // Add thinking indicator
    setMessages(prev => [...prev, { role: 'assistant', content: 'Thinking...', isThinking: true }]);
    
    try {
      const response = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          question: userMessage,
          chat_history: messages
            .filter(msg => !msg.isThinking) // Filter out thinking messages
            .slice(-10) // Get last 10 messages for context
            .map(msg => ({
              role: msg.role === 'assistant' ? 'assistant' : 'user',
              content: msg.content
            }))
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // Remove thinking indicator
      setMessages(prev => prev.filter(msg => !msg.isThinking));
      
      // Use typing effect for assistant response
      simulateTyping(data.answer);
    } catch (err) {
      // Remove thinking indicator
      setMessages(prev => prev.filter(msg => !msg.isThinking));
      
      // Add error message to chat
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Error: ${err instanceof Error ? err.message : String(err)}`
      }]);
      console.error('Query error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleIngest = async () => {
    setLoading(true);
    setMessages(prev => [...prev, {
      role: 'system',
      content: 'Ingesting documents from ./documents folder...'
    }]);
    
    try {
      const response = await fetch('http://localhost:8000/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ directory_path: './documents' }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      setMessages(prev => [...prev, {
        role: 'system',
        content: `${data.message}`
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Failed to ingest documents: ${err instanceof Error ? err.message : String(err)}`
      }]);
      console.error('Ingest error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !loading && apiStatus === 'connected') {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  return (
    <main className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans">
      <style jsx global>{`
        ${slideInRight}
        ${popupAnimation}
        
        /* Ensure Inter font is applied consistently */
        html, body, input, button, textarea, select {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
      `}</style>
      {/* Resume Popup */}
      {showResumePopup && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-black bg-opacity-10"
          onClick={() => setShowResumePopup(false)}
        >
          <div 
            className="animate-popIn bg-white rounded-lg shadow-xl p-6 max-w-md mx-4 relative border-t-4"
            style={{ borderColor: navyBlue }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowResumePopup(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke={navyBlue}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold" style={{ color: navyBlue }}>My Resume</h3>
            </div>
            
            <p className="text-gray-700 mb-6">Hello! Please email <a href="mailto:etakahashi@scu.edu" className="font-medium underline" style={{ color: lightBlue }}>etakahashi@scu.edu</a> for my resume.</p>
            
            <div className="flex justify-end">
              <button
                className="px-4 py-2 text-white rounded-md shadow-sm transition-colors duration-200 flex items-center"
                style={{ backgroundColor: navyBlue }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = navyBlueHover;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = navyBlue;
                }}
                onClick={() => {
                  navigator.clipboard.writeText('etakahashi@scu.edu');
                  // Show a temporary confirmation message
                  const button = document.activeElement as HTMLButtonElement;
                  const originalText = button.innerHTML;
                  button.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  `;
                  setTimeout(() => {
                    button.innerHTML = originalText;
                  }, 2000);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy
              </button>
              {/* <button
                className="ml-2 px-4 py-2 text-gray-700 bg-gray-200 rounded-md shadow-sm hover:bg-gray-300 transition-colors duration-200"
                onClick={() => setShowResumePopup(false)}
              >
                Close
              </button> */}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold text-white flex items-center">
            <span className="p-1 rounded mr-2 shadow-sm" style={{ backgroundColor: "#1f2937", color: 'white' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </span>
            Evan Takahashi
          </h1>
          <div className="flex items-center space-x-2">
            <a 
              href="https://www.linkedin.com/in/evan-takahashi-321474237" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-3 py-1 text-sm text-white rounded-full transition-colors duration-200 shadow-sm hover:shadow-md flex items-center"
              style={{ 
                backgroundColor: "#1f2937",
                border: "1px solid #4b5563"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#374151";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#1f2937";
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              linkedin
            </a>
            <button 
              className="ml-2 px-3 py-1 text-sm text-white rounded-full transition-colors duration-200 shadow-sm hover:shadow-md flex items-center"
              style={{ 
                backgroundColor: "#1f2937",
                border: "1px solid #4b5563"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#374151";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#1f2937";
              }}
              onClick={() => setShowResumePopup(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              resume
            </button>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-white bg-opacity-60 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex items-start ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role !== 'user' && (
                <div className="flex-shrink-0 mr-2 self-center">
                  <img 
                    src="/evan.jpg" 
                    alt="Evan" 
                    className="w-9 h-9 rounded-full object-cover border border-blue-200"
                    onError={(e) => {
                      // Fallback to default icon if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 text-blue-600' viewBox='0 0 20 20' fill='%233B82F6'%3E%3Cpath fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' /%3E%3C/svg%3E";
                    }}
                  />
                </div>
              )}
              <div 
                className={`max-w-[80%] rounded-3xl p-5 shadow-md ${
                  message.role === 'user' 
                    ? 'text-white hover:bg-opacity-90 animate-slideInRight' 
                    : message.role === 'system'
                      ? 'bg-gray-100 text-gray-800 shadow-gray-200'
                      : message.isThinking
                        ? 'bg-gray-50 text-gray-500 shadow-gray-100'
                        : 'bg-blue-50 text-gray-800 shadow-blue-100'
                } transition-all duration-200 hover:shadow-lg`}
                style={message.role === 'user' ? { 
                  backgroundColor: navyBlue,
                  boxShadow: '0 4px 6px -1px rgba(29, 53, 87, 0.1), 0 2px 4px -1px rgba(29, 53, 87, 0.06)',
                  transition: 'all 0.2s ease'
                } : {}}
                onMouseOver={(e) => {
                  if (message.role === 'user') {
                    e.currentTarget.style.backgroundColor = navyBlueHover;
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(29, 53, 87, 0.2), 0 4px 6px -2px rgba(29, 53, 87, 0.1)';
                  }
                }}
                onMouseOut={(e) => {
                  if (message.role === 'user') {
                    e.currentTarget.style.backgroundColor = navyBlue;
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(29, 53, 87, 0.1), 0 2px 4px -1px rgba(29, 53, 87, 0.06)';
                  }
                }}
              >
                {message.role === 'user' && (
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-blue-100">You</span>
                  </div>
                )}
                {message.role === 'assistant' && !message.isThinking && (
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-blue-600">Evan</span>
                  </div>
                )}
                {message.isThinking ? (
                  <div className="flex items-center">
                    <span>Thinking</span>
                    <span className="flex ml-2">
                      <span className="animate-bounce mx-0.5 h-1 w-1 bg-gray-500 rounded-full"></span>
                      <span className="animate-bounce mx-0.5 h-1 w-1 bg-gray-500 rounded-full" style={{ animationDelay: '0.2s' }}></span>
                      <span className="animate-bounce mx-0.5 h-1 w-1 bg-gray-500 rounded-full" style={{ animationDelay: '0.4s' }}></span>
                    </span>
                  </div>
                ) : (
                  message.content.split('\n').map((line, i) => (
                    <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                  ))
                )}
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0 ml-2 self-center">
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <div className="bg-white p-6 shadow-md" style={{ borderTop: "none" }}>
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="type here..."
              className="w-full p-5 pr-24 rounded-full focus:outline-none focus:ring-2 shadow-md hover:shadow-lg transition-all duration-200"
              style={{ 
                "--tw-ring-color": "#d1d5db",
                "--tw-ring-opacity": "1",
                border: "none",
                backgroundColor: "#f9fafb"
              } as React.CSSProperties}
              disabled={loading || apiStatus !== 'connected'}
            />
            <div className="absolute right-3 top-3 flex">
              <button
                type="submit"
                disabled={loading || !input.trim() || apiStatus !== 'connected'}
                className="flex items-center justify-center w-10 h-10 text-white rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
                style={{ 
                  backgroundColor: loading || !input.trim() || apiStatus !== 'connected' ? navyBlueDisabled : navyBlue,
                  cursor: loading || !input.trim() || apiStatus !== 'connected' ? 'not-allowed' : 'pointer'
                }}
                onMouseOver={(e) => {
                  if (!loading && input.trim() && apiStatus === 'connected') {
                    e.currentTarget.style.backgroundColor = navyBlueHover;
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading && input.trim() && apiStatus === 'connected') {
                    e.currentTarget.style.backgroundColor = navyBlue;
                  }
                }}
              >
                {loading ? 
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                }
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear the chat history?')) {
                    localStorage.removeItem('chatHistory');
                    setMessages([{ role: 'assistant', content: 'Hi, I\'m Evan. Feel free to ask me anything!' }]);
                  }
                }}
                className="flex items-center justify-center w-10 h-10 text-white rounded-full transition-all duration-200 shadow-sm hover:shadow-md ml-2"
                style={{ 
                  backgroundColor: '#8B0000', // Dark red
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#A52A2A'; // Slightly lighter red on hover
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#8B0000';
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>

      <footer className="text-center text-gray-500 text-xs p-2 bg-white shadow-inner" style={{ borderTop: "none" }}>
        made by evan takahashi
      </footer>
    </main>
  );
}
