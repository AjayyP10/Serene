import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  
  // Mastodon posting state
  const [mastodonContent, setMastodonContent] = useState('');
  const [mastodonVisibility, setMastodonVisibility] = useState('public');
  const [mastodonPosts, setMastodonPosts] = useState([]);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    if (token) {
      fetchMastodonPosts();
    }
  }, [token]);

  // Function to fetch Mastodon posts
  const fetchMastodonPosts = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/mastodon/posts/', {
        headers: {
          'Authorization': `Token ${token}`
        }
      });
      
      if (response.data.success) {
        setMastodonPosts(response.data.posts);
      }
    } catch (error) {
      console.error('Error fetching Mastodon posts:', error);
    }
  };

  // Function to create and post to Mastodon
  const handleMastodonPost = async (e) => {
    e.preventDefault();
    
    if (!mastodonContent.trim()) {
      alert('Please enter some content to post');
      return;
    }
    
    setIsPosting(true);
    
    try {
      const response = await axios.post('http://localhost:8000/api/mastodon/post/', {
        content: mastodonContent,
        visibility: mastodonVisibility
      }, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        alert('Post published to Mastodon successfully!');
        setMastodonContent('');
        fetchMastodonPosts(); // Refresh the posts list
      }
    } catch (error) {
      console.error('Error posting to Mastodon:', error);
      alert('Failed to post to Mastodon. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        setFormData({ username: '', email: '', password: '' });
      } else {
        setError(data.non_field_errors?.[0] || 'Login failed');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/auth/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (response.ok) {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        setFormData({ username: '', email: '', password: '' });
      } else {
        setError(Object.values(data).flat().join(', '));
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setMastodonPosts([]);
    setFormData({ username: '', email: '', password: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Serene</h1>
          <p className="text-gray-600">Your peaceful content creation space</p>
        </header>

        {!token ? (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <div className="flex mb-4">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 px-4 rounded-l-lg ${isLogin ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 px-4 rounded-r-lg ${!isLogin ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                Register
              </button>
            </div>

            <form onSubmit={isLogin ? handleLogin : handleRegister}>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              {!isLogin && (
                <div className="mb-4">
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}
              
              <div className="mb-6">
                <input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
              </button>
            </form>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-800">Welcome back!</h2>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                >
                  Logout
                </button>
              </div>
            </div>

            {/* Mastodon Posting Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Post to Mastodon</h3>
              <form onSubmit={handleMastodonPost}>
                <div className="mb-4">
                  <textarea
                    value={mastodonContent}
                    onChange={(e) => setMastodonContent(e.target.value)}
                    placeholder="What's on your mind?"
                    maxLength={500}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visibility:
                    <select 
                      value={mastodonVisibility} 
                      onChange={(e) => setMastodonVisibility(e.target.value)}
                      className="ml-2 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="public">Public</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="private">Followers only</option>
                      <option value="direct">Direct</option>
                    </select>
                  </label>
                </div>
                <button 
                  type="submit" 
                  disabled={isPosting || !mastodonContent.trim()}
                  className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPosting ? 'Posting...' : 'Post to Mastodon'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Mastodon Posts</h3>
              {mastodonPosts.length > 0 ? (
                <div className="space-y-4">
                  {mastodonPosts.map(post => (
                    <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-800 mb-2">{post.content}</p>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>Posted: {new Date(post.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No Mastodon posts yet. Create your first post!</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;