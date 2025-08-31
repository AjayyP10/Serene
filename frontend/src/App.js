import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const fetchMessages = async () => {
      if (token) {
        try {
          const response = await axios.get('http://127.0.0.1:8000/api/messages/', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setMessages(response.data);
        } catch {
          setMessages([]);
          setToken(''); // Clear invalid token
          localStorage.removeItem('token');
        }
      }
    };
    fetchMessages();
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/token/', {
        username,
        password,
      });
      setToken(response.data.access);
      localStorage.setItem('token', response.data.access);
      setLoginError('');
    } catch (error) {
      setLoginError('Invalid credentials. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setLoginError('Please log in first.');
      return;
    }
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/messages/', { content }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages([...messages, response.data]);
      setContent('');
    } catch {}
  };

  return (
    <div className="App">
      <h1>Messages</h1>
      {!token && (
        <form onSubmit={handleLogin}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          <button type="submit">Login</button>
          {loginError && <p style={{ color: 'red' }}>{loginError}</p>}
        </form>
      )}
      {token && (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter message content"
            required
          />
          <button type="submit">Send Message</button>
        </form>
      )}
      <ul>
        {messages.map(message => (
          <li key={message.id}>
            {message.content}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;