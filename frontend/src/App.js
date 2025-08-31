import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [idea, setIdea] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
  const fetchMessages = async () => {
    if (token) {
      console.log('Fetching messages with token:', token); // Debug log
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/messages/', {
          headers: { Authorization: `Token ${token}` },
        });
        setMessages(response.data);
      } catch (error) {
        console.error('Error fetching messages:', error.response ? error.response.data : error.message);
        setMessages([]);
        setToken('');
        localStorage.removeItem('token');
      }
    }
  };
  fetchMessages();
}, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/login/', {
        username,
        password,
      });
      setToken(response.data.token);
      localStorage.setItem('token', response.data.token);
      setLoginError('');
    } catch (error) {
      setLoginError('Invalid credentials. Please try again.');
      setTimeout(() => setLoginError(''), 3000); // Disappear after 3 seconds
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://127.0.0.1:8000/api/register/', {
        username,
        email,
        password,
      });
      setRegisterError('');
      setShowRegister(false); // Switch back to login after success
    } catch (error) {
      setRegisterError('Registration failed. Username may be taken or data invalid.');
      setTimeout(() => setRegisterError(''), 3000); // Disappear after 3 seconds
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
    setMessages([]);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!token) {
      setLoginError('Please log in first.');
      setTimeout(() => setLoginError(''), 3000); // Disappear after 3 seconds
      return;
    }
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/messages/', { content: idea }, {
        headers: { Authorization: `Token ${token}` }, // Updated to Token authentication
      });
      setMessages([...messages, response.data]);
      setIdea('');
    } catch (error) {
      console.error('Error generating message:', error);
    }
  };

  return (
    <div className="App">
      <h1>Messages</h1>
      {!token && (
        <div>
          {!showRegister ? (
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
              <p>
                Not registered? <button onClick={() => setShowRegister(true)}>Register</button>
              </p>
              {loginError && <p style={{ color: 'red' }}>{loginError}</p>}
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
              />
              <button type="submit">Register</button>
              <p>
                Already have an account? <button onClick={() => setShowRegister(false)}>Login</button>
              </p>
              {registerError && <p style={{ color: 'red' }}>{registerError}</p>}
            </form>
          )}
        </div>
      )}
      {token && (
        <div>
          <form onSubmit={handleGenerate}>
            <input
              type="text"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Enter your idea"
              required
            />
            <button type="submit">Generate Content</button>
          </form>
          <button onClick={handleLogout} style={{ marginTop: '10px' }}>Logout</button>
        </div>
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