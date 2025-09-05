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
  
  // Media upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [altTexts, setAltTexts] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [filePreviews, setFilePreviews] = useState([]);
  
  // Enhanced error handling state
  const [uploadErrors, setUploadErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (token) {
      fetchMastodonPosts();
    }
  }, [token]);

  // Clear messages after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (uploadErrors.length > 0) {
      const timer = setTimeout(() => setUploadErrors([]), 8000);
      return () => clearTimeout(timer);
    }
  }, [uploadErrors]);

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
      setUploadErrors(['Failed to load your posts. Please refresh the page.']);
    }
  };

  // Enhanced file validation function
  const validateFile = (file) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const videoTypes = ['video/mp4', 'video/mov', 'video/webm', 'video/m4v'];
    const supportedTypes = [...imageTypes, ...videoTypes];

    const errors = [];

    if (!supportedTypes.includes(file.type)) {
      errors.push(`"${file.name}": Unsupported file type (${file.type}). Supported: JPEG, PNG, GIF, WebP, MP4, MOV, WebM`);
    }

    if (file.size > maxSize) {
      errors.push(`"${file.name}": File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum size: 50MB`);
    }

    if (file.size === 0) {
      errors.push(`"${file.name}": File is empty`);
    }

    return errors;
  };

  // Handle file selection with enhanced error handling
  const handleFileSelect = (files) => {
    const fileArray = Array.from(files);
    const newErrors = [];
    
    // Clear previous errors
    setUploadErrors([]);
    
    // Validate total file count
    if (selectedFiles.length + fileArray.length > 4) {
      setUploadErrors(['Maximum 4 files allowed per post. Please remove some files first.']);
      return;
    }

    // Validate each file
    const validFiles = [];
    const newPreviews = [];
    const newAltTexts = [...altTexts];

    for (const file of fileArray) {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        newErrors.push(...fileErrors);
        continue;
      }
      validFiles.push(file);
    }

    // Check for mixed media types
    const allFiles = [...selectedFiles, ...validFiles];
    const hasImages = allFiles.some(file => file.type.startsWith('image/'));
    const hasVideos = allFiles.some(file => file.type.startsWith('video/'));
    
    if (hasImages && hasVideos) {
      newErrors.push('Cannot mix images and videos in the same post. Please choose either images OR videos.');
    }

    if (hasVideos && allFiles.length > 1) {
      newErrors.push('Only one video file allowed per post. Please select just one video.');
    }

    // Show errors if any
    if (newErrors.length > 0) {
      setUploadErrors(newErrors);
      return;
    }

    // Process valid files
    for (const file of validFiles) {
      newAltTexts.push('');

      // Create preview
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreviews(prev => [...prev, {
            type: 'image',
            url: e.target.result,
            name: file.name,
            size: file.size
          }]);
        };
        reader.onerror = () => {
          setUploadErrors(prev => [...prev, `Failed to read image file: ${file.name}`]);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        try {
          const url = URL.createObjectURL(file);
          setFilePreviews(prev => [...prev, {
            type: 'video',
            url: url,
            name: file.name,
            size: file.size
          }]);
        } catch (error) {
          setUploadErrors(prev => [...prev, `Failed to process video file: ${file.name}`]);
        }
      }
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    setAltTexts(newAltTexts);
    
    if (validFiles.length > 0) {
      setSuccessMessage(`Successfully added ${validFiles.length} file(s)`);
    }
  };

  // Handle drag and drop with error handling
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    try {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files);
      }
    } catch (error) {
      setUploadErrors(['Failed to process dropped files. Please try selecting files instead.']);
    }
  };

  // Remove file with cleanup
  const removeFile = (index) => {
    try {
      const newFiles = selectedFiles.filter((_, i) => i !== index);
      const newAltTexts = altTexts.filter((_, i) => i !== index);
      const removedPreview = filePreviews[index];
      const newPreviews = filePreviews.filter((_, i) => i !== index);
      
      // Clean up object URL for videos
      if (removedPreview && removedPreview.type === 'video' && removedPreview.url.startsWith('blob:')) {
        URL.revokeObjectURL(removedPreview.url);
      }
      
      setSelectedFiles(newFiles);
      setAltTexts(newAltTexts);
      setFilePreviews(newPreviews);
      setUploadErrors([]); // Clear errors when removing files
      setSuccessMessage('File removed successfully');
    } catch (error) {
      setUploadErrors(['Failed to remove file. Please try again.']);
    }
  };

  // Update alt text
  const updateAltText = (index, text) => {
    const newAltTexts = [...altTexts];
    newAltTexts[index] = text;
    setAltTexts(newAltTexts);
  };

  // Enhanced Mastodon post function with detailed error handling
  const handleMastodonPost = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setUploadErrors([]);
    setSuccessMessage('');
    
    if (!mastodonContent.trim() && selectedFiles.length === 0) {
      setUploadErrors(['Please enter some content or select media files to post']);
      return;
    }
    
    setIsPosting(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('content', mastodonContent);
      formData.append('visibility', mastodonVisibility);
      
      // Add media files
      selectedFiles.forEach((file) => {
        formData.append('media_files', file);
      });
      
      // Add alt texts
      altTexts.forEach((altText) => {
        formData.append('alt_texts', altText);
      });
      
      setUploadProgress(25);
      
      const response = await axios.post('http://localhost:8000/api/mastodon/post/', formData, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(Math.min(progress, 90)); // Cap at 90% until response
        }
      });
      
      setUploadProgress(100);
      
      if (response.data.success) {
        const mediaCount = response.data.post.media_count || 0;
        const message = mediaCount > 0 
          ? `🎉 Post with ${mediaCount} media file(s) published to Mastodon successfully!`
          : '🎉 Post published to Mastodon successfully!';
        setSuccessMessage(message);
        
        // Reset form
        setMastodonContent('');
        setSelectedFiles([]);
        setAltTexts([]);
        
        // Clean up previews
        filePreviews.forEach(preview => {
          if (preview.type === 'video' && preview.url.startsWith('blob:')) {
            URL.revokeObjectURL(preview.url);
          }
        });
        setFilePreviews([]);
        
        fetchMastodonPosts(); // Refresh the posts list
      } else {
        setUploadErrors([response.data.error || 'Failed to post to Mastodon']);
      }
    } catch (error) {
      console.error('Error posting to Mastodon:', error);
      
      let errorMessages = [];
      
      if (error.response) {
        // Server responded with error
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 413) {
          errorMessages.push('Files too large. Please reduce file sizes and try again.');
        } else if (status === 400) {
          errorMessages.push(data.error || 'Invalid request. Please check your files and try again.');
        } else if (status === 401) {
          errorMessages.push('Authentication failed. Please log in again.');
        } else if (status === 500) {
          errorMessages.push('Server error. Please try again in a few moments.');
        } else {
          errorMessages.push(data.error || `Server error (${status}). Please try again.`);
        }
      } else if (error.request) {
        // Network error
        errorMessages.push('Network error. Please check your internet connection and try again.');
      } else {
        // Other error
        errorMessages.push('An unexpected error occurred. Please try again.');
      }
      
      setUploadErrors(errorMessages);
    } finally {
      setIsPosting(false);
      setUploadProgress(0);
    }
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    // Reset media state
    selectedFiles.forEach((_, index) => removeFile(index));
    setUploadErrors([]);
    setSuccessMessage('');
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

            {/* Enhanced Mastodon Posting Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">📸 Post to Mastodon</h3>
              
              {/* Success Message */}
              {successMessage && (
                <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {successMessage}
                </div>
              )}
              
              {/* Error Messages */}
              {uploadErrors.length > 0 && (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold mb-1">Upload Error{uploadErrors.length > 1 ? 's' : ''}:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {uploadErrors.map((error, index) => (
                          <li key={index} className="text-sm">{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleMastodonPost}>
                {/* Text Content */}
                <div className="mb-4">
                  <textarea
                    value={mastodonContent}
                    onChange={(e) => setMastodonContent(e.target.value)}
                    placeholder="What's on your mind?"
                    maxLength={500}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                  />
                  <div className="text-right text-sm text-gray-500 mt-1">
                    {mastodonContent.length}/500
                  </div>
                </div>

                {/* File Upload Area */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📎 Media Files (Images/Videos)
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={(e) => handleFileSelect(e.target.files)}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="text-gray-600">
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="text-lg font-medium">Drop files here or click to browse</p>
                        <p className="text-sm text-gray-500 mt-2">
                          Supports: JPEG, PNG, GIF, WebP, MP4, MOV, WebM<br/>
                          Max 4 images or 1 video • Max 50MB per file
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* File Previews with Enhanced Info */}
                {filePreviews.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Files ({filePreviews.length}/4):</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {filePreviews.map((preview, index) => (
                        <div key={index} className="relative group border border-gray-200 rounded-lg overflow-hidden">
                          <div className="aspect-square bg-gray-100">
                            {preview.type === 'image' ? (
                              <img 
                                src={preview.url} 
                                alt={preview.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <video 
                                src={preview.url} 
                                className="w-full h-full object-cover"
                                muted
                              />
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove file"
                          >
                            ×
                          </button>
                          <div className="p-2">
                            <input
                              type="text"
                              placeholder="Alt text (optional)"
                              value={altTexts[index] || ''}
                              onChange={(e) => updateAltText(index, e.target.value)}
                              className="w-full text-xs p-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 mb-1"
                            />
                            <p className="text-xs text-gray-500 truncate" title={preview.name}>
                              {preview.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatFileSize(preview.size)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Progress */}
                {isPosting && uploadProgress > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Visibility Setting */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🌍 Visibility:
                    <select 
                      value={mastodonVisibility} 
                      onChange={(e) => setMastodonVisibility(e.target.value)}
                      className="ml-2 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="public">🌍 Public</option>
                      <option value="unlisted">🔗 Unlisted</option>
                      <option value="private">👥 Followers only</option>
                      <option value="direct">📩 Direct</option>
                    </select>
                  </label>
                </div>

                {/* Submit Button */}
                <button 
                  type="submit" 
                  disabled={isPosting || (!mastodonContent.trim() && selectedFiles.length === 0)}
                  className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isPosting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Posting...
                    </>
                  ) : (
                    <>
                      🚀 Post to Mastodon
                      {selectedFiles.length > 0 && (
                        <span className="bg-purple-600 text-xs px-2 py-1 rounded-full">
                          +{selectedFiles.length}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Posts History */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">📋 Your Mastodon Posts</h3>
              {mastodonPosts.length > 0 ? (
                <div className="space-y-4">
                  {mastodonPosts.map(post => (
                    <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-800 mb-2">{post.content}</p>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>📅 Posted: {new Date(post.created_at).toLocaleString()}</span>
                        {post.media_count > 0 && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                            📎 {post.media_count} media file{post.media_count > 1 ? 's' : ''}
                          </span>
                        )}
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