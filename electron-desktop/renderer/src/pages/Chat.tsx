import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState('gpt-oss:20b');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await window.ollama.chat.send({
        model,
        messages: [...messages, userMessage].map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      if (response.ok) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${response.error}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      background: '#0A0A0A',
      color: '#FAFAFA'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '20px', 
        borderBottom: '1px solid #333', 
        background: '#1A1A1A',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Chat</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#B8B8B8' }}>
            Chat with Ollama model at 10.0.4.52:11434
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={{
              background: '#2A2A2A',
              color: '#FAFAFA',
              border: '1px solid #444',
              borderRadius: '4px',
              padding: '8px 12px',
              fontSize: '14px'
            }}
          >
            <option value="gpt-oss:20b">gpt-oss:20b</option>
            <option value="llama2">llama2</option>
            <option value="codellama">codellama</option>
            <option value="mistral">mistral</option>
          </select>
          <button
            onClick={clearChat}
            style={{
              background: '#3A3A3A',
              color: '#FAFAFA',
              border: '1px solid #555',
              borderRadius: '4px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {messages.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#888', 
            marginTop: '40px',
            fontSize: '16px'
          }}>
            Start a conversation with the Ollama model
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div
                style={{
                  background: message.role === 'user' ? '#3C362A' : '#2A2A2A',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #444',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}
              >
                {message.content}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#888', 
                marginTop: '4px',
                marginLeft: message.role === 'user' ? '0' : '16px',
                marginRight: message.role === 'user' ? '16px' : '0'
              }}>
                {message.role === 'user' ? 'You' : 'Assistant'} • {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start',
            maxWidth: '80%'
          }}>
            <div
              style={{
                background: '#2A2A2A',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #444',
                fontSize: '14px',
                color: '#888'
              }}
            >
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ 
        padding: '20px', 
        borderTop: '1px solid #333', 
        background: '#1A1A1A'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            style={{
              flex: 1,
              background: '#2A2A2A',
              color: '#FAFAFA',
              border: '1px solid #444',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              resize: 'none',
              minHeight: '44px',
              maxHeight: '120px',
              fontFamily: 'inherit'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            style={{
              background: isLoading ? '#444' : '#3C362A',
              color: '#FAFAFA',
              border: '1px solid #555',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: (!input.trim() || isLoading) ? 0.5 : 1
            }}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
