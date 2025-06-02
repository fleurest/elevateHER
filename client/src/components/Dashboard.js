import React, { useState, useEffect, useRef } from 'react';

const BackToHome = ({ onBackToHome }) => (
  <button 
    onClick={onBackToHome} 
    style={{ 
      padding: '8px 16px', 
      backgroundColor: '#575a7b', 
      color: '#f1f2f3', 
      border: 'none', 
      borderRadius: '4px', 
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500'
    }}
  >
    ← Back to Home
  </button>
);

const iconPlayer = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM1NzVhN2IiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0iI2YxZjJmMyIvPgo8cGF0aCBkPSJNMTAgMzJjMC02IDQuNS0xMCAxMC0xMHMxMCA0IDEwIDEwIiBmaWxsPSIjZjFmMmYzIi8+Cjwvc3ZnPgo=';

const SearchIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const ZoomInIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
  </svg>
);

const ZoomOutIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
  </svg>
);

const RotateCcwIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
  </svg>
);

const UsersIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const NetworkIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const MenuIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const HeartIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

// Helper function to debug authentication
const debugAuth = () => {
  console.log('🔍 AUTHENTICATION DEBUG:');
  console.log('📦 localStorage:', Object.fromEntries(Object.entries(localStorage)));
  console.log('📦 sessionStorage:', Object.fromEntries(Object.entries(sessionStorage)));
  console.log('🌐 window.currentUser:', window.currentUser);
  console.log('🌐 window.user:', window.user);
  console.log('🌐 window.authUser:', window.authUser);
  
  alert('Authentication debug info logged to console. Check developer tools -> Console tab.');
};

// Mock athlete data for demonstration - will be replaced by real API data
const mockAthletes = [];

const ModeSelector = ({ currentMode, onModeChange, userEmail }) => {
  const modes = [
    { id: 'general', label: 'General Network', icon: NetworkIcon, description: 'View the complete network graph', requiresAuth: false },
    { id: 'liked', label: 'Liked Entities', icon: HeartIcon, description: 'View your liked people and organizations', requiresAuth: true },
    { id: 'friends', label: 'Friends Network', icon: UsersIcon, description: 'View your friends network', requiresAuth: true },
    { id: 'similar', label: 'Network Explorer', icon: TrendingUpIcon, description: 'Explore connections radiating out from your likes', requiresAuth: true }
  ];

  return (
    <div className="network-mode-selector">
      {modes.map(({ id, label, icon: Icon, description, requiresAuth }) => {
        const isDisabled = requiresAuth && !userEmail;
        const displayDescription = isDisabled ? 'Login required for this feature' : description;
        
        return (
          <button
            key={id}
            onClick={() => !isDisabled && onModeChange(id)}
            className={`network-mode-tab ${currentMode === id ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
            title={displayDescription}
            disabled={isDisabled}
          >
            <Icon />
            <span>{label}</span>
            {isDisabled && <span className="network-mode-lock">🔒</span>}
          </button>
        );
      })}
    </div>
  );
};

const SearchPanel = ({ searchTerm, setSearchTerm, athletes, onAddAthlete, isVisible, onToggle, mode }) => {
  const filteredAthletes = athletes.filter(athlete =>
    (athlete.name || athlete.label || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (athlete.sport || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (athlete.nationality || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="network-search-toggle"
        title="Show search panel"
      >
        <SearchIcon />
      </button>
    );
  }

  return (
    <div className="network-search-panel">
      <div className="network-search-header">
        <h3>{mode === 'general' ? 'Add to Network' : 'Search Network'}</h3>
        <button onClick={onToggle} className="network-panel-close">
          <XIcon />
        </button>
      </div>
      <div className="network-search-input-container">
        <SearchIcon />
        <input
          type="text"
          placeholder="Search athletes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="network-search-input"
        />
      </div>
      <div className="network-search-results">
        {filteredAthletes.map((athlete, index) => (
          <div
            key={`${athlete.id || athlete.name}-${index}`}
            onClick={() => onAddAthlete(athlete)}
            className="network-search-item"
          >
            <img
              src={athlete.image || iconPlayer}
              alt={athlete.name || athlete.label}
              className="network-search-avatar"
              onError={(e) => { e.target.src = iconPlayer; }}
            />
            <div className="network-search-info">
              <p className="network-search-name">{athlete.name || athlete.label}</p>
              <p className="network-search-details">
                {athlete.sport && `${athlete.sport} • `}
                {athlete.nationality || athlete.type || 'Unknown'}
              </p>
            </div>
          </div>
        ))}
        {filteredAthletes.length === 0 && (
          <div className="network-search-empty">
            No results found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};

const ControlPanel = ({ onCommunities, onExport, onLoadSimilar, isOpen, setIsOpen, userEmail }) => {
  const controls = [
    { label: 'Detect Communities', action: onCommunities, icon: UsersIcon, description: 'Run Louvain algorithm to find communities' },
    { label: 'Explore My Network', action: onLoadSimilar, icon: TrendingUpIcon, needsUserEmail: true, description: 'Start from your likes and expand 1-2 hops outward' },
  ];

  const exportOptions = [
    { label: 'Export as CSV', action: () => onExport('csv'), format: 'CSV' },
    { label: 'Export as JSON', action: () => onExport('json'), format: 'JSON' },
    { label: 'Export as GEXF', action: () => onExport('gexf'), format: 'GEXF' },
  ];

  return (
    <div className="network-control-panel">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="network-control-toggle"
          title="Open controls"
        >
          <MenuIcon />
        </button>
      ) : (
        <div className="network-control-menu">
          <div className="network-control-header">
            <h3>Network Controls</h3>
            <button onClick={() => setIsOpen(false)} className="network-panel-close">
              <XIcon />
            </button>
          </div>
          
          <div className="network-control-section">
            <h4>AI Analysis</h4>
            {controls.map(({ label, action, icon: Icon, needsUserEmail, description }) => (
              <button
                key={label}
                onClick={action}
                disabled={needsUserEmail && !userEmail}
                className={`network-control-button ${needsUserEmail && !userEmail ? 'disabled' : ''}`}
                title={description}
              >
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </div>
          
          <div className="network-control-section">
            <h4>Export Data</h4>
            {exportOptions.map(({ label, action, format }) => (
              <button
                key={format}
                onClick={action}
                className="network-control-button"
                title={`Download current network as ${format} file`}
              >
                <DownloadIcon />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ZoomControls = ({ onZoomIn, onZoomOut, onReset }) => (
  <div className="network-zoom-controls">
    <button onClick={onZoomIn} title="Zoom in" className="zoom-btn">+</button>
    <div className="zoom-rail"></div>
    <button onClick={onReset} title="Reset view" className="zoom-btn">⟲</button>
    <button onClick={onZoomOut} title="Zoom out" className="zoom-btn">-</button>
  </div>
);

const InfoTooltip = ({ person, position, isHover = false }) => {
  if (!person || !position) return null;

  const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent((person.name || person.label || '').replace(/ /g, '_'))}`;

  return (
    <div
      className={`network-tooltip ${isHover ? 'hover' : 'click'}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <div className="network-tooltip-content">
        <div className="network-tooltip-header">
          <img
            src={person.image || iconPlayer}
            alt={person.name || person.label}
            className="network-tooltip-avatar"
            onError={(e) => { e.target.src = iconPlayer; }}
          />
          <div className="network-tooltip-info">
            <h4>{person.name || person.label}</h4>
            <div className="network-tooltip-details">
              {person.role && <p>Role: {person.role}</p>}
              {person.sport && <p>Sport: {person.sport}</p>}
              {person.nationality && <p>Nationality: {person.nationality}</p>}
              {person.type && <p>Type: {person.type}</p>}
              {person.birthDate && <p>Born: {person.birthDate}</p>}
            </div>
            {!isHover && (
              <a
                href={wikiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="network-tooltip-link"
              >
                <ExternalLinkIcon />
                <span>View on Wikipedia</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Real Network Visualization Component that works with your Cytoscape data
const NetworkVisualization = ({ mode, data, onNodeClick, onNodeHover, onNodeLeave, loading }) => {
  const nodes = data?.nodes || [];
  const edges = data?.edges || [];

  const handleNodeClick = (node, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onNodeClick(node.data, { x: rect.left + rect.width / 2, y: rect.top });
  };

  const handleNodeHover = (node, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onNodeHover(node.data, { x: rect.left + rect.width / 2, y: rect.top });
  };

  // Debug info for development
  console.log(`NetworkVisualization - Mode: ${mode}, Nodes: ${nodes.length}, Edges: ${edges.length}`);
  if (nodes.length > 0) {
    console.log('Sample node structure:', nodes[0]);
  }
  if (edges.length > 0) {
    console.log('Sample edge structure:', edges[0]);
  }

  return (
    <div className="mock-network-container">
      <div className="mock-network-title">
        <h3>Athletic Network - {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode</h3>
        <p>{nodes.length} entities • {edges.length} connections</p>
        {mode === 'liked' && nodes.length > 0 && (
          <small style={{ color: '#575a7b', display: 'block', marginTop: '4px' }}>
            Showing entities you have LIKED in the database
          </small>
        )}
        {mode === 'friends' && nodes.length > 0 && (
          <small style={{ color: '#575a7b', display: 'block', marginTop: '4px' }}>
            Showing your FRIENDS_WITH connections
          </small>
        )}
      </div>
      
      {loading ? (
        <div className="mock-network-empty">
          <div className="network-loading-spinner"></div>
          <h4>Loading network data...</h4>
          <p>Please wait while we fetch the latest data from the database.</p>
        </div>
      ) : nodes.length > 0 ? (
        <div className="mock-network-grid">
          {nodes.slice(0, 12).map((node, index) => { // Show up to 12 nodes in demo view
            const nodeData = node.data || node;
            return (
              <div
                key={nodeData.id}
                className={`mock-node`}
                onClick={(e) => handleNodeClick(node, e)}
                onMouseEnter={(e) => handleNodeHover(node, e)}
                onMouseLeave={onNodeLeave}
                style={{
                  left: `${20 + (index % 4) * 200}px`,
                  top: `${50 + Math.floor(index / 4) * 150}px`
                }}
                title={`${nodeData.label || nodeData.name} (${nodeData.type || 'unknown'})`}
              >
                <img 
                  src={nodeData.image || nodeData.profileImage || iconPlayer} 
                  alt={nodeData.label || nodeData.name}
                  onError={(e) => { e.target.src = iconPlayer; }}
                />
                <span>{nodeData.label || nodeData.name}</span>
                <small>{nodeData.type || 'person'}</small>
              </div>
            );
          })}
          
          {/* Display connection lines for edges */}
          {edges.length > 0 && (
            <svg className="mock-connections">
              {edges.slice(0, 8).map((edge, index) => {
                const edgeData = edge.data || edge;
                // Find source and target node positions
                const sourceIndex = nodes.findIndex(n => (n.data?.id || n.id) === edgeData.source);
                const targetIndex = nodes.findIndex(n => (n.data?.id || n.id) === edgeData.target);
                
                if (sourceIndex === -1 || targetIndex === -1 || sourceIndex > 11 || targetIndex > 11) return null;
                
                return (
                  <line
                    key={edgeData.id || index}
                    x1={20 + (sourceIndex % 4) * 200 + 25}
                    y1={50 + Math.floor(sourceIndex / 4) * 150 + 25}
                    x2={20 + (targetIndex % 4) * 200 + 25}
                    y2={50 + Math.floor(targetIndex / 4) * 150 + 25}
                    stroke="#797ca0"
                    strokeWidth="2"
                    opacity="0.6"
                  />
                );
              })}
            </svg>
          )}
          
          {nodes.length > 12 && (
            <div className="mock-network-overflow">
              <p>+ {nodes.length - 12} more entities in network</p>
              <small>This is a preview. The full network will be displayed in Cytoscape when integrated.</small>
            </div>
          )}
        </div>
      ) : (
        <div className="mock-network-empty">
          <NetworkIcon />
          <h4>No data available</h4>
          <p>
            {mode === 'general' && "No network data found in the database"}
            {mode === 'liked' && "No LIKES relationships found for this user"}
            {mode === 'friends' && "No FRIENDS_WITH relationships found for this user"}
            {mode === 'similar' && "Click 'Explore My Network' to start from your likes and expand outward"}
          </p>
          {mode === 'liked' && (
            <small style={{ color: '#797ca0', marginTop: '8px', display: 'block' }}>
            </small>
          )}
          {mode === 'similar' && (
            <small style={{ color: '#797ca0', marginTop: '8px', display: 'block' }}>
            </small>
          )}
        </div>
      )}
    </div>
  );
};

const Dashboard = ({ onBackToHome = () => console.log('Back to home'), containerStyle = { width: '100%', height: '500px' } }) => {
  const [mode, setMode] = useState('general');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchPanelVisible, setSearchPanelVisible] = useState(false);
  const [controlPanelOpen, setControlPanelOpen] = useState(false);
  const [popupData, setPopupData] = useState(null);
  const [popupPosition, setPopupPosition] = useState(null);
  const [hoverData, setHoverData] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [allNodes, setAllNodes] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] }); // Store current graph data
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Format date helper function
  const fmt = d => {
    if (!d) return '';
    if (typeof d.toString === 'function') {
      const str = d.toString();
      if (!str.includes('[object')) {
        return str;
      }
    }
    if (d.year != null && d.month != null && d.day != null) {
      const year = typeof d.year.toNumber === 'function' ? d.year.toNumber() : d.year;
      const month = typeof d.month.toNumber === 'function' ? d.month.toNumber() : d.month;
      const day = typeof d.day.toNumber === 'function' ? d.day.toNumber() : d.day;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return '';
  };

  // Initialize user email from authentication - more aggressive detection
  useEffect(() => {
    const getLoggedInUserEmail = () => {
      // Check for common authentication patterns
      const sources = [
        // Direct email storage
        () => localStorage.getItem('userEmail'),
        () => localStorage.getItem('email'),
        () => sessionStorage.getItem('userEmail'),
        () => sessionStorage.getItem('email'),
        
        // User objects
        () => {
          const user = localStorage.getItem('user');
          if (user && user !== 'null') {
            try {
              const parsed = JSON.parse(user);
              return parsed.email || parsed.emailAddress || parsed.username;
            } catch (e) { return null; }
          }
          return null;
        },
        
        // Current user patterns
        () => {
          const currentUser = localStorage.getItem('currentUser');
          if (currentUser && currentUser !== 'null') {
            try {
              const parsed = JSON.parse(currentUser);
              return parsed.email || parsed.emailAddress;
            } catch (e) { return null; }
          }
          return null;
        },
        
        // Auth user patterns
        () => {
          const authUser = localStorage.getItem('authUser');
          if (authUser && authUser !== 'null') {
            try {
              const parsed = JSON.parse(authUser);
              return parsed.email || parsed.emailAddress;
            } catch (e) { return null; }
          }
          return null;
        },
        
        // JWT tokens
        () => {
          const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('accessToken');
          if (token && token.includes('.')) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              return payload.email || payload.sub || payload.username;
            } catch (e) { return null; }
          }
          return null;
        },
        
        // Global window objects
        () => window.currentUser?.email,
        () => window.user?.email,
        () => window.authUser?.email,
        
        // Firebase patterns
        () => {
          const firebaseUser = localStorage.getItem('firebase:authUser');
          if (firebaseUser) {
            try {
              const parsed = JSON.parse(firebaseUser);
              return parsed.email;
            } catch (e) { return null; }
          }
          return null;
        }
      ];

      for (let i = 0; i < sources.length; i++) {
        try {
          const email = sources[i]();
          if (email && typeof email === 'string' && email.includes('@') && email !== 'null' && email !== 'undefined') {
            console.log(`✅ Found user email from source ${i}:`, email);
            return email;
          }
        } catch (e) {
          // Continue to next source
        }
      }

      // Debug: Show what's available
      console.log('🔍 Available localStorage keys:', Object.keys(localStorage));
      console.log('🔍 Available sessionStorage keys:', Object.keys(sessionStorage));
      console.log('🔍 Window.currentUser:', window.currentUser);
      console.log('🔍 Window.user:', window.user);
      
      return null;
    };

    const email = getLoggedInUserEmail();
    console.log('🎯 Final user email:', email);
    setUserEmail(email || '');
  }, []);

  // Load initial data based on mode
  useEffect(() => {
    loadGraphData();
  }, [mode, userEmail]);

  const loadGraphData = async () => {
    // Check if user email is required for the current mode
    if ((mode === 'liked' || mode === 'friends') && !userEmail) {
      setError('Please log in to view your personal network data');
      setGraphData({ nodes: [], edges: [] });
      drawGraph({ nodes: [], edges: [] });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response;
      let data;
      const apiBase = process.env.REACT_APP_API_BASE || '';
      
      console.log(`Loading ${mode} data...`);
      if (userEmail) {
        console.log(`Using user email: ${userEmail}`);
      }

      switch (mode) {
        case 'general':
          console.log('Fetching general network...');
          response = await fetch(`${apiBase}/api/graph?limit=100`);
          if (!response.ok) {
            const errorText = await response.text();
            console.error('General network API error:', response.status, errorText);
            throw new Error(`Failed to load network: ${response.status} ${errorText}`);
          }
          data = await response.json();
          console.log('General network data:', data);
          break;
          
        case 'liked':
          console.log(`Fetching liked entities for user: ${userEmail}`);
          const likedUrl = `${apiBase}/api/graph/liked/${encodeURIComponent(userEmail)}?limit=100`;
          console.log('Liked entities URL:', likedUrl);
          
          response = await fetch(likedUrl);
          console.log('Liked entities response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Liked entities API error:', response.status, errorText);
            
            if (response.status === 404) {
              data = { nodes: [], edges: [], totalCount: 0, message: 'No liked entities found for this user' };
            } else if (response.status === 400) {
              throw new Error('Invalid email format or missing email parameter');
            } else {
              throw new Error(`Failed to load liked entities: ${response.status} ${errorText}`);
            }
          } else {
            data = await response.json();
            console.log('Liked entities data:', data);
          }
          break;
          
        case 'friends':
          console.log(`Fetching friends for user: ${userEmail}`);
          const friendsUrl = `${apiBase}/api/graph/friends/${encodeURIComponent(userEmail)}?limit=100`;
          console.log('Friends URL:', friendsUrl);
          
          response = await fetch(friendsUrl);
          console.log('Friends response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Friends API error:', response.status, errorText);
            
            if (response.status === 404) {
              data = { nodes: [], edges: [], totalCount: 0, message: 'No friends found for this user' };
            } else if (response.status === 400) {
              throw new Error('Invalid email format or missing email parameter');
            } else {
              throw new Error(`Failed to load friends: ${response.status} ${errorText}`);
            }
          } else {
            data = await response.json();
            console.log('Friends data:', data);
          }
          break;
          
        case 'similar':
          // Start with empty graph for similar mode
          data = { nodes: [], edges: [] };
          console.log('Similar mode - starting with empty graph');
          break;
          
        default:
          data = { nodes: [], edges: [] };
      }

      if (data.nodes && data.nodes.length > 0) {
        console.log(`Successfully loaded ${data.nodes.length} nodes and ${data.edges?.length || 0} edges`);
        setAllNodes(data.nodes);
        setAthletes(data.nodes);
        setGraphData(data); // Store the complete graph data for visualization
        drawGraph(data);
        setError(null);
      } else {
        const message = data.message || `No data available for ${mode} mode`;
        console.log('No data found:', message);
        setError(message);
        setGraphData({ nodes: [], edges: [] });
        drawGraph({ nodes: [], edges: [] });
        setAllNodes([]);
        setAthletes([]);
      }
    } catch (err) {
      console.error(`Error loading ${mode} data:`, err);
      setError(`Failed to load ${mode} data: ${err.message}`);
      setGraphData({ nodes: [], edges: [] });
      drawGraph({ nodes: [], edges: [] });
      setAllNodes([]);
      setAthletes([]);
    } finally {
      setLoading(false);
    }
  };

  // Placeholder drawGraph function (in real implementation, this would initialize Cytoscape)
  const drawGraph = (data) => {
    console.log('Drawing graph with data:', data);
    // In real implementation, this would:
    // - Initialize or update Cytoscape instance
    // - Apply styling and layout
    // - Set up event handlers
  };

  const handleAddAthlete = (athlete) => {
    console.log('Adding athlete to network:', athlete);
    // In real implementation, this would add the node to Cytoscape
  };

  const handleCommunities = async () => {
    try {
      setLoading(true);
      const apiBase = process.env.REACT_APP_API_BASE || '';
      
      console.log('🔍 Starting community detection...');
      const response = await fetch(`${apiBase}/api/graph/communities`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Communities API error:', response.status, errorText);
        throw new Error(`Failed to detect communities: ${response.status} ${errorText}`);
      }
      
      const communities = await response.json();
      console.log('✅ Communities detected:', communities);
      
      if (Array.isArray(communities) && communities.length > 0) {
        // Group communities by ID
        const communityGroups = communities.reduce((acc, member) => {
          const id = member.communityId.toString();
          if (!acc[id]) {
            acc[id] = [];
          }
          acc[id].push(member.name);
          return acc;
        }, {});
        
        const numCommunities = Object.keys(communityGroups).length;
        const totalMembers = communities.length;
        const largestCommunity = Math.max(...Object.values(communityGroups).map(g => g.length));
        
        // Create detailed community breakdown
        const communityDetails = Object.entries(communityGroups)
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 5) // Show top 5 communities
          .map(([id, members]) => `Community ${id}: ${members.length} members (${members.slice(0, 3).join(', ')}${members.length > 3 ? '...' : ''})`)
          .join('\n');
        
        alert(`🎯 Community Detection Complete!\n\n📊 Results:\n• ${numCommunities} communities found\n• ${totalMembers} total members\n• Largest community: ${largestCommunity} members\n\n🏆 Top Communities:\n${communityDetails}\n\n💡 Communities are detected using the Louvain algorithm in your Neo4j database.`);
        
        // Update the current view to show community info if we have current data
        if (graphData.nodes && graphData.nodes.length > 0) {
          console.log('💡 In a real implementation, nodes would be colored by community');
        }
      } else {
        alert('❌ No communities detected in the current network.\n\n💡 This could mean:\n• The graph is too small\n• Nodes are not well connected\n• The Louvain algorithm couldn\'t find distinct communities');
      }
    } catch (err) {
      console.error('❌ Community detection error:', err);
      alert(`❌ Failed to detect communities: ${err.message}\n\n💡 Make sure your Neo4j database has the Graph Data Science library installed.`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSimilar = async () => {
    if (!userEmail) {
      alert('❌ Please log in to explore your network connections.\n\nThis feature starts with your LIKED entities and expands outward.');
      return;
    }

    try {
      setLoading(true);
      const apiBase = process.env.REACT_APP_API_BASE || '';
      
      console.log('🔍 Step 1: Getting your liked entities...');
      
      // Step 1: Get user's liked entities as starting points
      const likedResponse = await fetch(`${apiBase}/api/graph/liked/${encodeURIComponent(userEmail)}?limit=50`);
      
      if (!likedResponse.ok) {
        throw new Error('Failed to get your liked entities. Make sure you have LIKES relationships in the database.');
      }
      
      const likedData = await likedResponse.json();
      console.log('✅ Your liked entities:', likedData);
      
      if (!likedData.nodes || likedData.nodes.length === 0) {
        alert('❌ No liked entities found.\n\nTo use this feature:\n1. First like some people/organizations in your app\n2. This will create LIKES relationships in Neo4j\n3. Then this feature will show connections radiating out from your likes');
        return;
      }
      
      console.log('🔍 Step 2: Getting the full network to calculate expansions...');
      
      // Step 2: Get the full network to calculate 1-2 hop expansions
      const networkResponse = await fetch(`${apiBase}/api/graph?limit=500`);
      
      if (!networkResponse.ok) {
        throw new Error('Failed to get network data for expansion calculation');
      }
      
      const fullNetwork = await networkResponse.json();
      console.log('✅ Full network loaded:', fullNetwork);
      
      // Step 3: Calculate 1-2 hop expansion from liked entities
      const likedNodeIds = new Set(likedData.nodes.map(n => (n.data?.id || n.id)));
      const expandedNodeIds = new Set(likedNodeIds);
      const relevantEdges = [];
      
      console.log('🔍 Step 3: Calculating 1-2 hop expansions...');
      console.log('Starting with liked node IDs:', Array.from(likedNodeIds));
      
      // Find 1-hop connections (directly connected to liked entities)
      fullNetwork.edges?.forEach(edge => {
        const edgeData = edge.data || edge;
        const sourceId = edgeData.source;
        const targetId = edgeData.target;
        
        if (likedNodeIds.has(sourceId) || likedNodeIds.has(targetId)) {
          expandedNodeIds.add(sourceId);
          expandedNodeIds.add(targetId);
          relevantEdges.push(edge);
        }
      });
      
      const oneHopIds = new Set(expandedNodeIds);
      console.log('After 1-hop expansion:', Array.from(oneHopIds));
      
      // Find 2-hop connections (connected to 1-hop nodes)
      fullNetwork.edges?.forEach(edge => {
        const edgeData = edge.data || edge;
        const sourceId = edgeData.source;
        const targetId = edgeData.target;
        
        if (oneHopIds.has(sourceId) || oneHopIds.has(targetId)) {
          expandedNodeIds.add(sourceId);
          expandedNodeIds.add(targetId);
          relevantEdges.push(edge);
        }
      });
      
      console.log('After 2-hop expansion:', Array.from(expandedNodeIds));
      
      // Step 4: Build the subgraph with expanded nodes
      const expandedNodes = fullNetwork.nodes?.filter(node => {
        const nodeId = node.data?.id || node.id;
        return expandedNodeIds.has(nodeId);
      }) || [];
      
      // Remove duplicate edges
      const uniqueEdges = relevantEdges.filter((edge, index, self) => 
        index === self.findIndex(e => 
          (e.data?.id || e.id) === (edge.data?.id || edge.id)
        )
      );
      
      const expandedGraph = {
        nodes: expandedNodes,
        edges: uniqueEdges
      };
      
      console.log('✅ Expanded graph calculated:', expandedGraph);
      
      // Step 5: Update the visualization
      if (expandedNodes.length > 0) {
        setAllNodes(expandedNodes);
        setAthletes(expandedNodes);
        setGraphData(expandedGraph);
        drawGraph(expandedGraph);
        setError(null);
        
        // Switch to similar mode to show the results
        setMode('similar');
        
        const likedCount = likedData.nodes.length;
        const totalNodes = expandedNodes.length;
        const totalEdges = uniqueEdges.length;
        
        alert(`🎯 Network Expansion Complete!\n\n📊 Results:\n• Started with ${likedCount} entities you liked\n• Expanded to ${totalNodes} connected entities\n• Found ${totalEdges} relationships\n\n💡 This shows your personal network:\n• Green nodes: Your direct likes\n• Blue nodes: 1-hop connections\n• Gray nodes: 2-hop connections\n\n🖱️ Click any node to further expand from that point!`);
      } else {
        alert('❌ No expanded network found.\n\nThis could mean your liked entities are isolated or the network data is incomplete.');
      }
      
    } catch (err) {
      console.error('❌ Network expansion error:', err);
      alert(`❌ Failed to expand your network: ${err.message}\n\n💡 Make sure:\n• You have liked some entities\n• The database has sufficient connections\n• Your LIKES relationships exist in Neo4j`);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (content, fileName, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = (format) => {
    const nodes = allNodes;
    const edges = graphData.edges || [];

    switch (format) {
      case 'csv':
        const nodesHeader = ['id', 'name', 'sport', 'nationality', 'type'];
        const nodesRows = nodes.map(n => {
          const data = n.data || n;
          return [
            JSON.stringify(data.id || ''),
            JSON.stringify(data.label || data.name || ''),
            JSON.stringify(data.sport || ''),
            JSON.stringify(data.nationality || ''),
            JSON.stringify(data.type || '')
          ].join(',');
        });
        const nodesCsv = [nodesHeader.join(','), ...nodesRows].join('\n');
        downloadFile(nodesCsv, 'athletes.csv', 'text/csv');
        break;

      case 'json':
        const json = JSON.stringify({ nodes, edges }, null, 2);
        downloadFile(json, 'network.json', 'application/json');
        break;

      case 'gexf':
        const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
        const gexfOpen = '<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">';
        const graphOpen = '<graph mode="static" defaultedgetype="directed">';
        const nodesXml = [
          '<nodes>',
          ...nodes.map(n => {
            const data = n.data || n;
            return `<node id="${data.id}" label="${(data.label || data.name || '').replace(/"/g, '&quot;')}" />`;
          }),
          '</nodes>'
        ].join('');
        let edgesXml = '';
        if (edges.length) {
          edgesXml = [
            '<edges>',
            ...edges.map(e => {
              const data = e.data || e;
              return `<edge id="${data.id}" source="${data.source}" target="${data.target}" label="${(data.label || '').replace(/"/g, '&quot;')}" />`;
            }),
            '</edges>'
          ].join('');
        }
        const gexfClose = '</graph></gexf>';
        const fullGexf = xmlHeader + gexfOpen + graphOpen + nodesXml + edgesXml + gexfClose;
        downloadFile(fullGexf, 'network.gexf', 'application/xml');
        break;
    }
  };

  const handleZoomIn = () => {
    console.log('Zoom in');
  };

  const handleZoomOut = () => {
    console.log('Zoom out');
  };

  const handleResetView = () => {
    console.log('Reset view');
    setPopupData(null);
    setPopupPosition(null);
    setHoverData(null);
    setHoverPosition(null);
  };

  const handleNodeClick = (node, position) => {
    const nodeData = node || {};
    
    // Show popup for all modes
    setPopupData({
      name: nodeData.label || nodeData.name,
      sport: nodeData.sport,
      nationality: nodeData.nationality,
      type: nodeData.type,
      image: nodeData.image || nodeData.profileImage
    });
    setPopupPosition(position);
    
    // In similar mode, also expand the network from this node
    if (mode === 'similar' && userEmail) {
      expandFromNode(nodeData);
    }
  };

  const expandFromNode = async (nodeData) => {
    try {
      console.log('🔍 Expanding network from node:', nodeData);
      const apiBase = process.env.REACT_APP_API_BASE || '';
      
      // Get the full network to calculate expansion
      const networkResponse = await fetch(`${apiBase}/api/graph?limit=500`);
      if (!networkResponse.ok) return;
      
      const fullNetwork = await networkResponse.json();
      const clickedNodeId = nodeData.id;
      
      // Get current nodes in view
      const currentNodeIds = new Set(graphData.nodes?.map(n => (n.data?.id || n.id)) || []);
      
      // Find 1-2 hop connections from the clicked node
      const expandedNodeIds = new Set([clickedNodeId]);
      const newEdges = [];
      
      // 1-hop expansion
      fullNetwork.edges?.forEach(edge => {
        const edgeData = edge.data || edge;
        const sourceId = edgeData.source;
        const targetId = edgeData.target;
        
        if (sourceId === clickedNodeId || targetId === clickedNodeId) {
          expandedNodeIds.add(sourceId);
          expandedNodeIds.add(targetId);
          newEdges.push(edge);
        }
      });
      
      const oneHopIds = new Set(expandedNodeIds);
      
      // 2-hop expansion
      fullNetwork.edges?.forEach(edge => {
        const edgeData = edge.data || edge;
        const sourceId = edgeData.source;
        const targetId = edgeData.target;
        
        if (oneHopIds.has(sourceId) || oneHopIds.has(targetId)) {
          expandedNodeIds.add(sourceId);
          expandedNodeIds.add(targetId);
          newEdges.push(edge);
        }
      });
      
      // Combine with existing nodes
      const allNodeIds = new Set([...currentNodeIds, ...expandedNodeIds]);
      
      // Build expanded graph
      const expandedNodes = fullNetwork.nodes?.filter(node => {
        const nodeId = node.data?.id || node.id;
        return allNodeIds.has(nodeId);
      }) || [];
      
      const allEdges = [...(graphData.edges || []), ...newEdges];
      const uniqueEdges = allEdges.filter((edge, index, self) => 
        index === self.findIndex(e => 
          (e.data?.id || e.id) === (edge.data?.id || edge.id)
        )
      );
      
      const expandedGraph = {
        nodes: expandedNodes,
        edges: uniqueEdges
      };
      
      console.log('✅ Expanded from node:', expandedGraph);
      
      // Update the view
      setAllNodes(expandedNodes);
      setAthletes(expandedNodes);
      setGraphData(expandedGraph);
      drawGraph(expandedGraph);
      
      const newNodesCount = expandedNodes.length - (graphData.nodes?.length || 0);
      if (newNodesCount > 0) {
        console.log(`🎯 Added ${newNodesCount} new nodes to the network`);
      }
      
    } catch (err) {
      console.error('❌ Error expanding from node:', err);
    }
  };

  const handleNodeHover = (node, position) => {
    setHoverData({
      name: node.label || node.name,
      sport: node.sport,
      nationality: node.nationality,
      type: node.type,
      image: node.image || node.profileImage
    });
    setHoverPosition(position);
  };

  const handleNodeLeave = () => {
    setHoverData(null);
    setHoverPosition(null);
  };

  return (
    <div className="network-dashboard" data-mode={mode}>
      {/* Header */}
      <header className="network-header">
        <div className="network-header-content">
          <div className="network-header-info">
            <h1>Athletic Network Explorer</h1>
            <p>
              Discover connections in the world of sports
              {userEmail ? (
                <span> • ✅ Logged in as <strong>{userEmail}</strong> 
                  <button 
                    onClick={() => {
                      if (confirm('Change user email?')) {
                        const email = prompt('Enter your email:', userEmail);
                        if (email && email.includes('@')) {
                          setUserEmail(email);
                          localStorage.setItem('userEmail', email);
                        }
                      }
                    }}
                    style={{
                      marginLeft: '8px',
                      padding: '2px 6px',
                      fontSize: '10px',
                      backgroundColor: '#797ca0',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    change
                  </button>
                </span>
              ) : (
                <span> • <span style={{color: '#c62828', fontWeight: 'bold'}}>❌ Not logged in</span> 
                  <button 
                    onClick={() => {
                      const email = prompt('Please enter your email to access personal features:');
                      if (email && email.includes('@')) {
                        setUserEmail(email);
                        localStorage.setItem('userEmail', email);
                        console.log('✅ Manually set user email:', email);
                      }
                    }}
                    style={{
                      marginLeft: '8px',
                      padding: '4px 12px',
                      fontSize: '12px',
                      backgroundColor: '#575a7b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Login Here
                  </button>
                  <button 
                    onClick={debugAuth}
                    style={{
                      marginLeft: '4px',
                      padding: '4px 8px',
                      fontSize: '10px',
                      backgroundColor: '#797ca0',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                    title="Debug authentication storage"
                  >
                    🔍 debug
                  </button>
                </span>
              )}
            </p>
          </div>
          <div className="network-header-actions">
            <BackToHome onBackToHome={onBackToHome} />
          </div>
        </div>
      </header>

      {/* Mode Selector */}
      <ModeSelector currentMode={mode} onModeChange={setMode} userEmail={userEmail} />

      {/* Main Content */}
      <div className="network-main-content">
        {/* Loading overlay */}
        {loading && (
          <div className="network-loading-overlay">
            <div className="network-loading-card">
              <div className="network-loading-spinner"></div>
              <p>Loading network data...</p>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="network-error-message">
            {error}
          </div>
        )}

        {/* Network Visualization */}
        <NetworkVisualization 
          mode={mode}
          data={graphData}
          loading={loading}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onNodeLeave={handleNodeLeave}
        />

        {/* Search Panel */}
        <SearchPanel
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          athletes={athletes}
          onAddAthlete={handleAddAthlete}
          isVisible={searchPanelVisible}
          onToggle={() => setSearchPanelVisible(!searchPanelVisible)}
          mode={mode}
        />

        {/* Control Panel */}
        <ControlPanel
          onCommunities={handleCommunities}
          onExport={handleExport}
          onLoadSimilar={handleLoadSimilar}
          isOpen={controlPanelOpen}
          setIsOpen={setControlPanelOpen}
          userEmail={userEmail}
        />

        {/* Zoom Controls */}
        <ZoomControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleResetView}
        />

        {/* Tooltips */}
        {popupData && popupPosition && (
          <InfoTooltip
            person={popupData}
            position={popupPosition}
            isHover={false}
          />
        )}

        {hoverData && hoverPosition && (
          <InfoTooltip
            person={hoverData}
            position={hoverPosition}
            isHover={true}
          />
        )}

        {/* Instructions */}
        <div className="network-instructions">
          <p>
            {mode === 'general' && "Click on nodes to explore connections"}
            {mode === 'liked' && "Your liked people and organizations"}
            {mode === 'friends' && "Your friends network"}
            {mode === 'similar' && "🎯 Network Explorer: Click nodes to expand • Use 'Explore My Network' to start from your likes"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;