import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, Grid, List, 
  Trash2, Edit2, ExternalLink, Star, Tag, 
  Folder, X, Save, Upload, Download, Loader2,
  MoreVertical, Globe, Layout, Filter, Check,
  Github, Heart, Briefcase, User, Monitor, 
  Coffee, BookOpen, Film, ChevronDown, AlertCircle
} from 'lucide-react';

/**
 * LinkVault - Modern Bookmark Manager
 * * Features:
 * - LocalStorage Persistence
 * - Metadata fetching (via Microlink API)
 * - Tags, Categories, Notes
 * - Search, Filter, Sort
 * - Dark Theme Exclusive
 * - Import/Export
 * - Duplicate Detection
 * - Rich Category Selection
 */

// --- Constants ---

const CATEGORY_ICONS = {
  'Work': Briefcase,
  'Personal': User,
  'Dev': Monitor,
  'Design': Layout,
  'News': Globe,
  'Entertainment': Film,
  'Learning': BookOpen,
  'Social': Coffee,
  'Uncategorized': Folder
};

const CATEGORY_COLORS = {
  'Work': 'text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  'Personal': 'text-green-500 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  'Dev': 'text-slate-500 bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800',
  'Design': 'text-pink-500 bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
  'News': 'text-orange-500 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  'Entertainment': 'text-purple-500 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  'Learning': 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  'Social': 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
  'Uncategorized': 'text-zinc-500 bg-zinc-50 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-800'
};

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, ...props }) => {
  const baseStyle = "flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 shadow-md hover:shadow-lg hover:shadow-indigo-500/20",
    secondary: "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:ring-zinc-400",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 focus:ring-red-500",
    ghost: "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800",
    icon: "p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
  };

  return (
    <button 
      onClick={onClick} 
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={18} className={children ? "mr-2" : ""} />}
      {children}
    </button>
  );
};

const Input = ({ label, error, ...props }) => (
  <div className="flex flex-col gap-1.5 mb-4">
    {label && <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{label}</label>}
    <input 
      className={`px-3 py-2.5 rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${error ? 'border-red-500 focus:ring-red-500' : 'border-zinc-200 dark:border-zinc-700'}`}
      {...props}
    />
    {error && <span className="text-xs text-red-500 flex items-center gap-1 mt-1"><AlertCircle size={12}/>{error}</span>}
  </div>
);

// --- Main App Component ---

export default function App() {
  // --- State ---
  const [bookmarks, setBookmarks] = useState(() => {
    const saved = localStorage.getItem('linkvault_data');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Theme is strictly dark now, no state needed for toggle

  const [viewMode, setViewMode] = useState('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortOption, setSortOption] = useState('date-desc');

  // Form State
  const [formData, setFormData] = useState({
    url: '', title: '', description: '', category: 'Uncategorized', tags: '', notes: ''
  });
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [urlError, setUrlError] = useState('');

  // --- Effects ---

  useEffect(() => {
    localStorage.setItem('linkvault_data', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    // Force Dark Theme Exclusively
    const root = document.documentElement;
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
    // Clean up potentially stale localStorage theme if we ever want to revert or just to keep it clean
    localStorage.setItem('linkvault_theme', 'dark');
  }, []);

  // --- Computed Data ---

  const categories = useMemo(() => {
    const cats = new Set(bookmarks.map(b => b.category));
    // Ensure all predefined categories are available in the filter list if used
    Object.keys(CATEGORY_ICONS).forEach(c => cats.add(c));
    return ['All', 'Favorites', ...Array.from(cats).sort()];
  }, [bookmarks]);

  const filteredBookmarks = useMemo(() => {
    let result = [...bookmarks];

    if (activeCategory === 'Favorites') {
      result = result.filter(b => b.isFavorite);
    } else if (activeCategory !== 'All') {
      result = result.filter(b => b.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.title.toLowerCase().includes(q) || 
        b.url.toLowerCase().includes(q) || 
        b.tags.some(t => t.toLowerCase().includes(q)) ||
        (b.description && b.description.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortOption === 'date-desc') return b.createdAt - a.createdAt;
      if (sortOption === 'date-asc') return a.createdAt - b.createdAt;
      if (sortOption === 'alpha') return a.title.localeCompare(b.title);
      return 0;
    });

    return result;
  }, [bookmarks, activeCategory, searchQuery, sortOption]);

  // --- Actions ---

  const fetchMetadata = async (url) => {
    if (!url) return;
    setIsFetchingMeta(true);
    setFetchError('');
    setUrlError(''); // Clear URL errors on new fetch attempt
    
    // Check for duplicates immediately
    const duplicate = bookmarks.find(b => b.url === url && b.id !== editingId);
    if (duplicate) {
      setUrlError('This URL is already saved.');
      setIsFetchingMeta(false);
      return;
    }

    let validUrl = url;
    if (!/^https?:\/\//i.test(url)) {
      validUrl = 'https://' + url;
    }

    try {
      const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(validUrl)}`);
      const data = await response.json();

      if (data.status === 'success') {
        const { title, description, image, logo } = data.data;
        setFormData(prev => ({
          ...prev,
          url: validUrl, // Update to valid URL
          title: title || prev.title || new URL(validUrl).hostname,
          description: description || prev.description,
          image: image?.url || null,
          favicon: logo?.url || `https://www.google.com/s2/favicons?domain=${validUrl}&sz=64`
        }));
      } else {
        throw new Error('Failed to fetch');
      }
    } catch (err) {
      console.error("Metadata fetch failed", err);
      try {
        const hostname = new URL(validUrl).hostname;
        setFormData(prev => ({
          ...prev,
          url: validUrl,
          title: prev.title || hostname,
          favicon: `https://www.google.com/s2/favicons?domain=${validUrl}&sz=64`
        }));
      } catch (e) {
        setFetchError('Invalid URL format');
      }
    } finally {
      setIsFetchingMeta(false);
    }
  };

  const handleSave = () => {
    if (!formData.url) return;
    
    // Duplicate Check
    const duplicate = bookmarks.find(b => b.url === formData.url && b.id !== editingId);
    if (duplicate) {
      setUrlError('This URL is already saved.');
      return;
    }

    const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    
    const newBookmark = {
      id: editingId || Date.now().toString(),
      createdAt: editingId ? bookmarks.find(b => b.id === editingId).createdAt : Date.now(),
      ...formData,
      tags: tagsArray,
      isFavorite: editingId ? bookmarks.find(b => b.id === editingId).isFavorite : false,
    };

    if (editingId) {
      setBookmarks(prev => prev.map(b => b.id === editingId ? newBookmark : b));
    } else {
      setBookmarks(prev => [newBookmark, ...prev]);
    }
    
    closeModal();
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this bookmark?')) {
      setBookmarks(prev => prev.filter(b => b.id !== id));
    }
  };

  const toggleFavorite = (id, e) => {
    e.stopPropagation();
    setBookmarks(prev => prev.map(b => 
      b.id === id ? { ...b, isFavorite: !b.isFavorite } : b
    ));
  };

  const openModal = (bookmark = null) => {
    setUrlError('');
    setFetchError('');
    setIsCategoryDropdownOpen(false);

    if (bookmark) {
      setEditingId(bookmark.id);
      setFormData({
        url: bookmark.url,
        title: bookmark.title,
        description: bookmark.description || '',
        category: bookmark.category || 'Uncategorized',
        tags: bookmark.tags.join(', '),
        notes: bookmark.notes || '',
        image: bookmark.image || null,
        favicon: bookmark.favicon || null
      });
    } else {
      setEditingId(null);
      setFormData({
        url: '', title: '', description: '', category: 'Uncategorized', tags: '', notes: '', image: null, favicon: null
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFetchError('');
    setUrlError('');
  };

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bookmarks));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "linkvault_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importData = (event) => {
    const fileReader = new FileReader();
    fileReader.readAsText(event.target.files[0], "UTF-8");
    fileReader.onload = e => {
      try {
        const json = JSON.parse(e.target.result);
        if (Array.isArray(json)) {
          setBookmarks(json);
          alert('Import successful!');
        } else {
          alert('Invalid file format.');
        }
      } catch (err) {
        alert('Error parsing JSON.');
      }
    };
  };

  const CategoryIcon = ({ category, size = 16, className = "" }) => {
    const Icon = CATEGORY_ICONS[category] || Folder;
    return <Icon size={size} className={className} />;
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-900 text-zinc-100 transition-colors duration-200">
      
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Layout size={20} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">LinkVault</h1>
          </div>

          <div className="flex-1 max-w-xl mx-8 hidden md:block">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Search bookmarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-800 border-transparent focus:bg-zinc-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={() => openModal()} icon={Plus} className="hidden sm:flex">Add Link</Button>
            <Button variant="icon" onClick={() => openModal()} className="sm:hidden"><Plus size={20}/></Button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full">
        
        {/* Sidebar */}
        <aside className="w-64 hidden lg:flex flex-col border-r border-zinc-800 p-4 overflow-y-auto bg-zinc-900/50 backdrop-blur-sm">
          <div className="space-y-6 flex-1">
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">Library</h3>
              <nav className="space-y-1">
                {['All', 'Favorites'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeCategory === cat 
                      ? 'bg-indigo-900/30 text-indigo-300' 
                      : 'text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {cat === 'All' ? <Globe size={16} /> : <Star size={16} className={activeCategory === 'Favorites' ? 'fill-current' : ''} />}
                      {cat}
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-md ${activeCategory === cat ? 'bg-indigo-800/50 text-indigo-300' : 'bg-zinc-800 text-zinc-500'}`}>
                      {cat === 'All' ? bookmarks.length : bookmarks.filter(b => b.isFavorite).length}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">Categories</h3>
              <nav className="space-y-1">
                {Object.keys(CATEGORY_ICONS).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeCategory === cat 
                      ? 'bg-indigo-900/30 text-indigo-300' 
                      : 'text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CategoryIcon category={cat} size={16} />
                      {cat}
                    </div>
                    {bookmarks.some(b => b.category === cat) && (
                      <span className="text-xs text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded-md">
                        {bookmarks.filter(b => b.category === cat).length}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            <div className="pt-4 border-t border-zinc-800">
               <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">Data</h3>
               <div className="space-y-2">
                 <button onClick={exportData} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 rounded-lg">
                   <Download size={16} /> Export JSON
                 </button>
                 <label className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 rounded-lg cursor-pointer">
                   <Upload size={16} /> Import JSON
                   <input type="file" accept=".json" onChange={importData} className="hidden" />
                 </label>
               </div>
            </div>
          </div>
          
          <div className="pt-4 mt-auto border-t border-zinc-800">
             <a 
               href="https://github.com/ranjan-builds" 
               target="_blank" 
               rel="noopener noreferrer"
               className="flex items-center justify-center gap-2 text-xs font-medium text-zinc-500 hover:text-indigo-400 transition-colors"
             >
               <Github size={14} />
               <span>Built by ranjan-builds</span>
             </a>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto scroll-smooth flex flex-col">
          <div className="p-4 sm:p-6 flex-1">
            
            {/* Toolbar */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
              
              {/* Mobile Search */}
              <div className="sm:hidden w-full relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                 {/* Mobile Category Chips */}
                 <div className="lg:hidden flex gap-2">
                   {['All', 'Favorites'].map(cat => (
                     <button
                       key={cat}
                       onClick={() => setActiveCategory(cat)}
                       className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border ${
                         activeCategory === cat
                         ? 'bg-indigo-600 text-white border-indigo-600'
                         : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                       }`}
                     >
                       {cat}
                     </button>
                   ))}
                 </div>
                 <div className="hidden lg:flex items-baseline gap-3">
                    <h2 className="text-2xl font-bold text-white">
                      {activeCategory}
                    </h2>
                    <span className="text-zinc-400 text-sm font-medium">
                      {filteredBookmarks.length} {filteredBookmarks.length === 1 ? 'link' : 'links'}
                    </span>
                 </div>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <select 
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="alpha">A-Z</option>
                </select>

                <div className="bg-zinc-800 p-1 rounded-lg flex gap-1 border border-zinc-700">
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-zinc-700 shadow-sm text-indigo-400' : 'text-zinc-400 hover:text-zinc-600'}`}>
                    <Grid size={18} />
                  </button>
                  <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-zinc-700 shadow-sm text-indigo-400' : 'text-zinc-400 hover:text-zinc-600'}`}>
                    <List size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Bookmarks Grid/List */}
            {filteredBookmarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                  <Search size={40} className="text-zinc-600" />
                </div>
                <h3 className="text-lg font-semibold text-white">No bookmarks found</h3>
                <p className="text-zinc-500 max-w-xs mt-2">Try adjusting your search or add a new bookmark to get started.</p>
                <Button onClick={() => openModal()} variant="primary" className="mt-6" icon={Plus}>Add First Bookmark</Button>
              </div>
            ) : (
              <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                {filteredBookmarks.map(bookmark => (
                  <div 
                    key={bookmark.id}
                    className={`group relative bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-900 transition-all duration-300 flex ${viewMode === 'list' ? 'flex-row items-center p-2 gap-3 h-auto min-h-[5rem]' : 'flex-col h-full'}`}
                  >
                    
                    {/* Card Image */}
                    <div className={`relative overflow-hidden bg-zinc-900 flex-shrink-0 ${viewMode === 'list' ? 'w-16 h-16 rounded-lg' : 'w-full h-40'}`}>
                      <div className="absolute inset-0 flex items-center justify-center text-zinc-700 bg-zinc-900">
                        <Globe size={viewMode === 'list' ? 24 : 48} />
                      </div>
                      {bookmark.image && (
                        <img 
                          src={bookmark.image} 
                          alt="" 
                          className="absolute inset-0 w-full h-full object-cover z-10 group-hover:scale-105 transition-transform duration-500" 
                          onError={(e) => { e.target.style.display = 'none'; }} 
                        />
                      )}
                      
                      {/* Floating Actions (Grid Only) */}
                      {viewMode === 'grid' && (
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                           <button onClick={(e) => toggleFavorite(bookmark.id, e)} className="p-2 rounded-full bg-zinc-900/90 hover:text-yellow-500 shadow-sm backdrop-blur-sm transition-colors">
                             <Star size={16} className={bookmark.isFavorite ? "fill-yellow-500 text-yellow-500" : "text-zinc-500"} />
                           </button>
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className={`flex-1 min-w-0 ${viewMode === 'list' ? 'grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center' : 'p-4 flex flex-col justify-between flex-1'}`}>
                      
                      {/* Main Text Section */}
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            {bookmark.favicon && <img src={bookmark.favicon} alt="" className="w-4 h-4 rounded-sm flex-shrink-0" />}
                            <h3 className="font-semibold text-zinc-100 truncate hover:text-indigo-600 transition-colors" title={bookmark.title}>
                              <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="focus:outline-none focus:underline">{bookmark.title}</a>
                            </h3>
                          </div>
                        </div>
                        
                        {viewMode === 'grid' && bookmark.description && (
                          <p className="text-xs text-zinc-400 line-clamp-2 mb-3 leading-relaxed">
                            {bookmark.description}
                          </p>
                        )}

                        <div className={`flex items-center ${viewMode === 'list' ? 'gap-2 mt-1' : 'justify-between mt-2'}`}>
                           <div className="flex flex-wrap gap-1 items-center">
                             {viewMode === 'list' && (
                                <span className="text-xs text-zinc-500 font-mono truncate max-w-[120px] mr-2">
                                  {new URL(bookmark.url).hostname.replace('www.', '')}
                                </span>
                             )}
                             <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium border ${CATEGORY_COLORS[bookmark.category] || CATEGORY_COLORS['Uncategorized']}`}>
                               {bookmark.category}
                             </span>
                             {bookmark.tags.slice(0, 2).map(tag => (
                               <span key={tag} className="px-2 py-0.5 text-[10px] rounded-full bg-zinc-700 text-zinc-300 font-medium">
                                 #{tag}
                               </span>
                             ))}
                           </div>
                        </div>
                      </div>

                      {/* Actions Section */}
                      <div className={`flex items-center gap-1 ${viewMode === 'list' ? 'justify-end' : 'mt-3 pt-3 border-t border-zinc-700 justify-between'}`}>
                        {viewMode === 'grid' && (
                          <span className="text-xs text-zinc-400 font-mono truncate max-w-[120px]">
                            {new URL(bookmark.url).hostname.replace('www.', '')}
                          </span>
                        )}
                        
                        <div className="flex items-center gap-1">
                           {viewMode === 'list' && (
                            <button onClick={(e) => toggleFavorite(bookmark.id, e)} className="p-1.5 rounded-md hover:bg-zinc-700 transition-colors">
                              <Star size={16} className={bookmark.isFavorite ? "fill-yellow-500 text-yellow-500" : "text-zinc-500"} />
                            </button>
                           )}
                           <button onClick={() => openModal(bookmark)} className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-900/30 rounded-md transition-colors">
                             <Edit2 size={14} />
                           </button>
                           <button onClick={() => handleDelete(bookmark.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-900/30 rounded-md transition-colors">
                             <Trash2 size={14} />
                           </button>
                           <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-900/30 rounded-md transition-colors">
                             <ExternalLink size={14} />
                           </a>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Mobile Footer */}
          <div className="lg:hidden py-6 mt-4 text-center border-t border-zinc-800">
             <a 
               href="https://github.com/ranjan-builds" 
               target="_blank" 
               rel="noopener noreferrer"
               className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-indigo-400 transition-colors"
             >
               <Github size={14} />
               <span>Built by ranjan-builds</span>
             </a>
          </div>
        </main>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-700 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/50">
              <h2 className="text-lg font-bold text-white">
                {editingId ? 'Edit Bookmark' : 'Add New Bookmark'}
              </h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-200">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* URL Input */}
              <div className="relative">
                <Input 
                  label="URL" 
                  placeholder="https://example.com" 
                  value={formData.url}
                  onChange={(e) => {
                    setFormData({...formData, url: e.target.value});
                    setUrlError(''); 
                  }}
                  onBlur={() => !editingId && fetchMetadata(formData.url)}
                  disabled={isFetchingMeta}
                  error={urlError}
                />
                {isFetchingMeta && (
                  <div className="absolute right-3 top-[38px] animate-spin text-indigo-600">
                    <Loader2 size={18} />
                  </div>
                )}
              </div>
              
              {fetchError && <p className="text-sm text-red-500 -mt-2 mb-2 flex items-center gap-1"><AlertCircle size={14}/>{fetchError}</p>}

              <Input 
                label="Title" 
                placeholder="Page Title" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 
                 {/* Custom Category Dropdown */}
                 <div className="flex flex-col gap-1.5 relative">
                    <label className="text-sm font-semibold text-zinc-300">Category</label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                      className="w-full px-3 py-2.5 rounded-lg border bg-zinc-900 text-left flex items-center justify-between border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <span className="flex items-center gap-2 text-white">
                        <CategoryIcon category={formData.category} />
                        {formData.category}
                      </span>
                      <ChevronDown size={16} className="text-zinc-400" />
                    </button>
                    
                    {isCategoryDropdownOpen && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                        {Object.keys(CATEGORY_ICONS).map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setFormData({...formData, category: cat});
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-zinc-700 transition-colors ${formData.category === cat ? 'bg-indigo-900/20 text-indigo-400' : 'text-zinc-300'}`}
                          >
                            <CategoryIcon category={cat} />
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                 </div>
                 
                 <Input 
                  label="Tags" 
                  placeholder="react, dev, news..." 
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                 />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-zinc-300">Description</label>
                <textarea 
                  rows="3"
                  className="px-3 py-2.5 rounded-lg border bg-zinc-900 text-white border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-zinc-800/50 border-t border-zinc-800 flex justify-end gap-3 mt-auto">
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button variant="primary" onClick={handleSave} disabled={!formData.url || isFetchingMeta || !!urlError}>
                {editingId ? 'Save Changes' : 'Add Bookmark'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}