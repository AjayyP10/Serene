import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/messages/')
      .then(response => setMessages(response.data))
      .catch(error => console.error('Error fetching messages:', error));
  }, []);

  return (
    <div className="App">
      <h1>Messages</h1>
      <ul>
        {messages.map(message => (
          <li key={message.id}>
            {message.content} (User ID: {message.user_id}, Time: {new Date(message.created_at).toLocaleString()})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;