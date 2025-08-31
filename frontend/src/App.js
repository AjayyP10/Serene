import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/messages/')
      .then(response => setMessages(response.data))
      .catch(() => setMessages([]));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { content, user_id: parseInt(userId) };
    axios.post('http://127.0.0.1:8000/api/messages/', data)
      .then(response => {
        setMessages([...messages, response.data]);
        setContent('');
        setUserId('');
      })
      .catch(() => {});
  };

  return (
    <div className="App">
      <h1>Messages</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter message content"
          required
        />
        <input
          type="number"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Enter user ID"
          required
        />
        <button type="submit">Send Message</button>
      </form>
    </div>
  );
}

export default App;