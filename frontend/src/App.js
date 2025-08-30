import { useState } from 'react';
import './App.css';

function App() {
  const [userInput, setUserInput] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleGenerate = () => {
    // Mock AI response for now; later integrate DeepSeek
    setGeneratedContent(`Generated tweet idea: "${userInput}" is awesome! #SereneAI`);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = (e) => {
    setGeneratedContent(e.target.value);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-100 to-green-100 flex flex-col">
      <header className="bg-blue-500 text-white p-4 text-center">
        <h1 className="text-3xl font-bold">Serene</h1>
        <p className="text-lg">AI-Powered Social Media Content Generator</p>
      </header>
      <main className="flex-grow p-4">
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl mb-4">Chat with AI for X Content Ideas</h2>
          <textarea
            className="w-full p-2 border border-gray-300 rounded mb-4"
            placeholder="Enter your idea (e.g., 'Fun tweet about coffee')"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
          <button 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={handleGenerate}
          >
            Generate Content
          </button>
          {generatedContent && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              {isEditing ? (
                <textarea
                  className="w-full p-2 border border-gray-300 rounded mb-2"
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                />
              ) : (
                <p>{generatedContent}</p>
              )}
              {isEditing ? (
                <button 
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mt-2"
                  onClick={handleSaveEdit}
                >
                  Save
                </button>
              ) : (
                <button 
                  className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 mt-2"
                  onClick={handleEdit}
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>
      </main>
      <footer className="bg-blue-500 text-white p-4 text-center">
        <p>&copy; 2025 Serene</p>
      </footer>
    </div>
  );
}

export default App;