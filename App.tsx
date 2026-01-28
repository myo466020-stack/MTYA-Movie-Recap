
// FIX: Imported useState, useCallback, and useEffect from React.
import React, { useState, useCallback, useEffect } from 'react';
import { generateRecapScript, generateAudio, transcribeMedia } from './services/geminiService';
import { createWavUrl } from './utils/audio';
import { FilmIcon, SparklesIcon, CopyIcon, DownloadIcon, LoaderIcon, LightBulbIcon, TrashIcon, HistoryIcon, UploadIcon, MicrophoneIcon } from './components/icons';


// Define the structure for a history item
interface HistoryItem {
  id: number;
  title: string;
  script: string;
  audioBase64: string; // Store base64 to recreate audio URL later
  timestamp: string;
}

const App: React.FC = () => {
  const [transcript, setTranscript] = useState<string>('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('Burmese');
  const [selectedVoice, setSelectedVoice] = useState<string>('Puck');
  const [recapScript, setRecapScript] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);


  // Load history from localStorage on initial render
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('movieRecapHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('movieRecapHistory', JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history to localStorage", e);
    }
  }, [history]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setMediaFile(file);
    }
  };

  const handleTranscribe = async () => {
    if (!mediaFile) return;

    setIsTranscribing(true);
    setError(null);
    setTranscript('');

    try {
      const transcribedText = await transcribeMedia(mediaFile);
      setTranscript(transcribedText);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An error occurred during transcription.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!transcript.trim()) {
      setError('Please provide a transcript to generate a recap.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRecapScript('');
    setTitle('');
    setAudioUrl(null);
    setCopied({});

    try {
      const { script, title } = await generateRecapScript(transcript, selectedLanguage);
      setRecapScript(script);
      setTitle(title);

      const audioBase64 = await generateAudio(script, selectedVoice);
      const url = createWavUrl(audioBase64);
      setAudioUrl(url);

      // Save to history
      const newHistoryItem: HistoryItem = {
        id: Date.now(),
        title,
        script,
        audioBase64,
        timestamp: new Date().toISOString(),
      };
      setHistory(prevHistory => [newHistoryItem, ...prevHistory]);

    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An error occurred while generating the recap. Please check your API key and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [transcript, selectedVoice, selectedLanguage]);
  
  const handleCopy = (text: string, key: string) => {
    if (text) {
        navigator.clipboard.writeText(text);
        setCopied(prev => ({ ...prev, [key]: true }));
        setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000);
    }
  };

  const handleClearCurrent = () => {
    setRecapScript('');
    setTitle('');
    setAudioUrl(null);
    setError(null);
    setCopied({});
  };

  const handleLoadHistory = (item: HistoryItem) => {
    setTitle(item.title);
    setRecapScript(item.script);
    const url = createWavUrl(item.audioBase64);
    setAudioUrl(url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleDeleteHistory = (id: number) => {
    setHistory(prevHistory => prevHistory.filter(item => item.id !== id));
  };
  
  const handleClearAllHistory = () => {
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            Movie Recap Generator
          </h1>
          <p className="mt-2 text-lg text-gray-400">Transform movie transcripts into engaging audio recaps in multiple languages.</p>
        </header>

        <main className="space-y-8">
          <div className="bg-white/5 p-6 rounded-2xl shadow-lg backdrop-blur-sm border border-white/10">
            <h2 className="text-2xl font-bold mb-4 flex items-center"><FilmIcon className="w-6 h-6 mr-2" /> Input</h2>
            
            <div className="space-y-6">
              
              <div>
                <label htmlFor="media-upload" className="block text-sm font-medium text-gray-300 mb-2">Transcribe from Media File</label>
                <div className="mt-2 flex items-center space-x-4">
                  <div className="flex-grow">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-purple-400 hover:text-purple-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 focus-within:ring-purple-500 px-4 py-2 w-full text-center inline-block">
                      <div className="flex items-center justify-center">
                        <UploadIcon className="w-5 h-5 mr-2" />
                        <span>{mediaFile ? 'Change File' : 'Select Audio/Video File'}</span>
                      </div>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="audio/*,video/*" disabled={isLoading || isTranscribing} />
                    </label>
                    {mediaFile && <p className="text-xs text-gray-500 mt-2 text-center truncate" title={mediaFile.name}>{mediaFile.name}</p>}
                  </div>
                  {mediaFile && (
                    <button
                      onClick={handleTranscribe}
                      disabled={isTranscribing || isLoading}
                      className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
                    >
                      {isTranscribing ? (
                        <>
                          <LoaderIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                          Transcribing...
                        </>
                      ) : (
                        <>
                          <MicrophoneIcon className="-ml-1 mr-2 h-5 w-5" />
                          Transcribe
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Upload a file to generate a transcript automatically.</p>
              </div>

              <hr className="border-gray-700" />

              <div>
                <label htmlFor="transcript" className="block text-sm font-medium text-gray-300 mb-2">Movie Transcript</label>
                <textarea
                  id="transcript"
                  rows={8}
                  className="w-full bg-gray-800/50 rounded-lg p-4 border border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 placeholder-gray-500"
                  placeholder={
                    isTranscribing ? "Transcription in progress..." : 
                    "Paste the transcript here, or generate one from a source above."
                  }
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  disabled={isLoading || isTranscribing}
                />
              </div>
              
               <div>
                 <label htmlFor="language-select" className="block text-sm font-medium text-gray-300 mb-2">
                  Select Output Language
                </label>
                <select
                  id="language-select"
                  className="w-full bg-gray-800/50 rounded-lg p-3 border border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  disabled={isLoading || isTranscribing}
                >
                  <option value="Burmese">Burmese (Myanmar)</option>
                  <option value="Thai">Thai</option>
                  <option value="Vietnamese">Vietnamese</option>
                  <option value="Indonesian">Indonesian</option>
                  <option value="Japanese">Japanese</option>
                </select>
               </div>

               <div>
                <label htmlFor="voice-select" className="block text-sm font-medium text-gray-300 mb-2">
                  Select Character Voice Performance
                </label>
                <select
                  id="voice-select"
                  className="w-full bg-gray-800/50 rounded-lg p-3 border border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  disabled={isLoading || isTranscribing}
                >
                  <optgroup label="Female Voices">
                    <option value="Kore">Youthful Protagonist (Female)</option>
                  </optgroup>
                  <optgroup label="Male Voices">
                    <option value="Puck">Standard Narrator (Male)</option>
                    <option value="Charon">Wise Mentor (Male)</option>
                    <option value="Fenrir">Action Hero (Male)</option>
                    <option value="Zephyr">Friendly Sidekick (Male)</option>
                  </optgroup>
                </select>
                <p className="text-xs text-gray-500 mt-2">Choose a voice that best fits the selected language and characters.</p>
              </div>

            </div>

            <div className="mt-8 text-center">
              <button
                onClick={handleGenerate}
                disabled={isLoading || isTranscribing || !transcript}
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500"
              >
                {isLoading ? (
                  <>
                    <LoaderIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="-ml-1 mr-2 h-5 w-5" />
                    Generate Recap
                  </>
                )}
              </button>
            </div>
            {error && <p className="mt-4 text-center text-red-400">{error}</p>}
          </div>

          {(recapScript || isLoading) && (
            <div className="bg-white/5 p-6 rounded-2xl shadow-lg backdrop-blur-sm border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Generated Recap</h2>
                {recapScript && !isLoading && (
                  <button
                    onClick={handleClearCurrent}
                    className="inline-flex items-center px-3 py-1.5 border border-red-500/50 text-sm font-medium rounded-md text-red-400 hover:bg-red-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500"
                    aria-label="Clear current result"
                  >
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Clear
                  </button>
                )}
              </div>
              {isLoading && !recapScript && (
                 <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                </div>
              )}
              {recapScript && (
                <div className="space-y-8">
                    {title && (
                        <div>
                            <h3 className="text-lg font-semibold mb-2 flex items-center text-purple-300"><LightBulbIcon className="w-5 h-5 mr-2"/>Recommended Title</h3>
                             <div className="relative">
                                <p className="whitespace-pre-wrap bg-gray-800/50 rounded-lg p-4 font-sans text-base leading-relaxed">{title}</p>
                                <button onClick={() => handleCopy(title, 'title')} className="absolute top-2 right-2 p-2 bg-gray-700/50 rounded-lg hover:bg-gray-600 transition-colors">
                                    {copied['title'] ? <span className="text-xs text-green-400">Copied!</span> : <CopyIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    )}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Recap Script</h3>
                        <div className="relative">
                            <p className="whitespace-pre-wrap bg-gray-800/50 rounded-lg p-4 font-mono text-sm leading-relaxed max-h-96 overflow-y-auto">{recapScript}</p>
                             <button onClick={() => handleCopy(recapScript, 'script')} className="absolute top-2 right-2 p-2 bg-gray-700/50 rounded-lg hover:bg-gray-600 transition-colors">
                               {copied['script'] ? <span className="text-xs text-green-400">Copied!</span> : <CopyIcon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                  
                  {audioUrl && (
                    <div className="pt-4">
                        <h3 className="text-lg font-semibold mb-2">Listen to the Recap</h3>
                        <audio controls src={audioUrl} className="w-full">
                            Your browser does not not support the audio element.
                        </audio>
                        <a 
                            href={audioUrl} 
                            download="movie_recap.wav" 
                            className="inline-flex items-center mt-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-purple-300 bg-purple-800/50 hover:bg-purple-800 transition-colors"
                        >
                            <DownloadIcon className="w-4 h-4 mr-2"/>
                            Download Audio (.wav)
                        </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {history.length > 0 && (
            <div className="bg-white/5 p-6 rounded-2xl shadow-lg backdrop-blur-sm border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Generation History</h2>
                <button
                    onClick={handleClearAllHistory}
                    className="inline-flex items-center px-3 py-1.5 border border-red-500/50 text-sm font-medium rounded-md text-red-400 hover:bg-red-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500"
                    aria-label="Clear all history"
                  >
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Clear All
                  </button>
              </div>
              <ul className="space-y-4">
                {history.map((item) => (
                  <li key={item.id} className="bg-gray-800/50 p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-gray-400">
                        Generated on: {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleLoadHistory(item)}
                        className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-600 transition-colors"
                        aria-label="Load this item"
                      >
                        <HistoryIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteHistory(item.id)}
                        className="p-2 bg-red-900/50 rounded-lg hover:bg-red-800/50 transition-colors"
                        aria-label="Delete this item"
                      >
                        <TrashIcon className="w-5 h-5 text-red-400" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
