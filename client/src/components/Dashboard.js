import React, { useState, useEffect, useRef } from 'react';

const BackToHome = ({ onBackToHome }) => (
    <button
        onClick={() => window.location.href = '/home'}
        className="network-back-btn bg-purple text-grey"
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

const StarIcon = () => (
    <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.966a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.286 3.966c.3.921-.755 1.688-1.538 1.118l-3.385-2.46a1 1 0 00-1.176 0l-3.385 2.46c-.783.57-1.838-.197-1.538-1.118l1.286-3.966a1 1 0 00-.364-1.118L2.044 9.394c-.783-.57-.381-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.966z" />
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

const PlusIcon = () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const ModeSelector = ({ currentMode, onModeChange, user }) => {
    const modes = [
        {
            id: 'general',
            label: 'General Network',
            icon: NetworkIcon,
            description: 'View the complete network graph',
            requiresAuth: false
        },
        {
            id: 'dynamic',
            label: 'Dynamic Mode',
            icon: PlusIcon,
            description: 'Add individuals and view their connections',
            requiresAuth: false
        },
        {
            id: 'liked',
            label: 'Liked Entities',
            icon: HeartIcon,
            description: 'View your liked people and organisations',
            requiresAuth: false
        },
        {
            id: 'friends',
            label: 'Friends Network',
            icon: UsersIcon,
            description: 'View your friends network',
            requiresAuth: false
        },
        {
            id: 'similar',
            label: 'Network Explorer',
            icon: TrendingUpIcon,
            description: 'Explore connections radiating out from your likes',
            requiresAuth: false
        },
        {
            id: 'pagerank',
            label: 'PageRank Graph',
            icon: StarIcon,
            description: 'View top influencers by PageRank',
            requiresAuth: false
        }
    ];

    return (
        <div className="network-mode-selector bg-grey">
            {modes.map(({ id, label, icon: Icon, description, requiresAuth }) => {
                const isDisabled = requiresAuth && !user;
                const displayDescription = isDisabled ? 'Login required for this feature' : description;

                return (
                    <button
                        key={id}
                        onClick={() => !isDisabled && onModeChange(id)}
                        className={`network-mode-tab ${currentMode === id ? 'active bg-purple text-grey' : 'bg-light-purple text-navy'} ${isDisabled ? 'disabled' : ''}`}
                        title={displayDescription}
                        disabled={isDisabled}
                        style={{
                            borderRadius: '6px',
                            margin: '0 6px',
                            padding: '10px 18px',
                            border: currentMode === id ? '2px solid var(--purple)' : '2px solid transparent',
                            boxShadow: currentMode === id ? '0 2px 8px rgba(87,90,123,0.08)' : 'none',
                            fontWeight: 600,
                            fontSize: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            opacity: isDisabled ? 0.5 : 1,
                            transition: 'all 0.2s',
                        }}
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

const SearchPanel = ({ searchTerm, setSearchTerm, athletes, onAddAthlete, isVisible, onToggle, mode, onSearch }) => {
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        if (!searchTerm.trim()) return;

        setIsSearching(true);
        try {
            if (onSearch) {
                const results = await onSearch(searchTerm);
                setSearchResults(results || []);
            } else {
                const filtered = athletes.filter(athlete =>
                    (athlete.name || athlete.label || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (athlete.sport || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (athlete.nationality || '').toLowerCase().includes(searchTerm.toLowerCase())
                );
                setSearchResults(filtered);
            }
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const displayItems = searchResults.length > 0
        ? searchResults
        : (searchTerm
            ? athletes.filter(athlete =>
                (athlete.name || athlete.label || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (athlete.sport || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (athlete.nationality || '').toLowerCase().includes(searchTerm.toLowerCase())
            )
            : []);

    if (!isVisible) {
        return (
            <button
                onClick={onToggle}
                className="network-search-toggle bg-purple text-grey"
                title="Show search panel"
                style={{ borderRadius: '50%', padding: '10px', boxShadow: '0 2px 8px rgba(87,90,123,0.08)' }}
            >
                <SearchIcon />
            </button>
        );
    }

    return (
        <div className="network-search-panel bg-grey" style={{ borderRadius: '12px', boxShadow: '0 2px 12px rgba(53,55,75,0.08)', padding: '18px', maxWidth: '340px', position: 'absolute', left: '24px', top: '90px', zIndex: 10 }}>
            <div className="network-search-header">
                <h3 className="text-purple" style={{ fontWeight: 700, fontSize: '18px' }}>
                    {mode === 'dynamic' ? 'Add to Network' :
                        mode === 'general' ? 'Search Network' :
                            'Search & Filter'}
                </h3>
                <button onClick={onToggle} className="network-panel-close bg-light-purple text-navy" style={{ borderRadius: '50%', padding: '6px' }}>
                    <XIcon />
                </button>
            </div>
            <div className="network-search-input-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <SearchIcon />
                <input
                    type="text"
                    placeholder={
                        mode === 'dynamic' ? 'Search athletes to add...' :
                            mode === 'similar' ? 'Search for similar athletes...' :
                                'Search athletes...'
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="network-search-input bg-grey text-navy"
                    disabled={isSearching}
                    style={{ border: '1px solid var(--light-purple)', borderRadius: '6px', padding: '8px', flex: 1 }}
                />
                <button
                    onClick={handleSearch}
                    className="network-search-btn bg-purple text-grey"
                    disabled={isSearching || !searchTerm.trim()}
                    style={{ borderRadius: '6px', padding: '8px 14px', fontWeight: 600 }}
                >
                    {isSearching ? '⏳' : 'Search'}
                </button>
            </div>
            <div className="network-search-results">
                {isSearching ? (
                    <div className="network-search-loading text-purple">Searching...</div>
                ) : displayItems.length > 0 ? (
                    displayItems.map((athlete, index) => (
                        <div
                            key={`${athlete.id || athlete.name}-${index}`}
                            onClick={() => onAddAthlete(athlete)}
                            className="network-search-item bg-light-purple text-navy"
                            style={{ borderRadius: '8px', marginBottom: '8px', padding: '8px', display: 'flex', alignItems: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(87,90,123,0.06)' }}
                        >
                            <img
                                src={athlete.image || athlete.profileImage || iconPlayer}
                                alt={athlete.name || athlete.label}
                                className="network-search-avatar"
                                style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '12px', background: 'var(--grey)' }}
                                onError={(e) => { e.target.src = iconPlayer; }}
                            />
                            <div className="network-search-info" style={{ flex: 1 }}>
                                <p className="network-search-name" style={{ fontWeight: 600, margin: 0 }}>{athlete.name || athlete.label}</p>
                                <p className="network-search-details" style={{ fontSize: '13px', margin: 0 }}>
                                    {athlete.sport && `${athlete.sport} • `}
                                    {athlete.nationality || athlete.type || 'Unknown'}
                                </p>
                            </div>
                            {mode === 'dynamic' && (
                                <button className="network-search-add-btn bg-purple text-grey" style={{ borderRadius: '50%', padding: '6px', marginLeft: '8px' }}>
                                    <PlusIcon />
                                </button>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="network-search-empty text-purple">
                        {searchTerm ? 'No results found matching your search.' : 'Enter a search term to find athletes.'}
                    </div>
                )}
            </div>
        </div>
    );
};

const ControlPanel = ({ onCommunities, onExport, onLoadSimilar, onPageRank, isOpen, setIsOpen, user }) => {
    const controls = [
        {
            label: 'PageRank Analysis',
            action: onPageRank,
            icon: TrendingUpIcon,
            description: 'Calculate PageRank to find most influential nodes'
        },
        {
            label: 'Detect Communities',
            action: onCommunities,
            icon: UsersIcon,
            description: 'Run Louvain algorithm to find communities'
        },
        {
            label: 'Explore My Network',
            action: onLoadSimilar,
            icon: TrendingUpIcon,
            needsUser: true,
            description: 'Start from your likes and expand 1-2 hops outward'
        },
    ];

    const exportOptions = [
        { label: 'Export as CSV', action: () => onExport('csv'), format: 'CSV' },
        { label: 'Export as JSON', action: () => onExport('json'), format: 'JSON' },
        { label: 'Export as GEXF', action: () => onExport('gexf'), format: 'GEXF' },
    ];

    return (
        <div className="network-control-panel" style={{ position: 'absolute', right: '24px', top: '90px', zIndex: 10 }}>
            {!isOpen ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="network-control-toggle bg-purple text-grey"
                    title="Open controls"
                    style={{ borderRadius: '50%', padding: '10px', boxShadow: '0 2px 8px rgba(87,90,123,0.08)' }}
                >
                    <MenuIcon />
                </button>
            ) : (
                <div className="network-control-menu bg-grey" style={{ borderRadius: '12px', boxShadow: '0 2px 12px rgba(53,55,75,0.08)', padding: '18px', minWidth: '260px' }}>
                    <div className="network-control-header">
                        <h3 className="text-purple" style={{ fontWeight: 700, fontSize: '18px' }}>Network Controls</h3>
                        <button onClick={() => setIsOpen(false)} className="network-panel-close bg-light-purple text-navy" style={{ borderRadius: '50%', padding: '6px' }}>
                            <XIcon />
                        </button>
                    </div>

                    <div className="network-control-section">
                        <h4 className="text-navy" style={{ fontWeight: 600, fontSize: '15px' }}>AI Analysis</h4>
                        {controls.map(({ label, action, icon: Icon, needsUser, description }) => (
                            <button
                                key={label}
                                onClick={action}
                                disabled={needsUser && !user}
                                className={`network-control-button ${needsUser && !user ? 'disabled' : 'bg-purple text-grey'}`}
                                title={description}
                                style={{ borderRadius: '6px', margin: '6px 0', padding: '10px 14px', fontWeight: 600, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', opacity: needsUser && !user ? 0.5 : 1, cursor: needsUser && !user ? 'not-allowed' : 'pointer' }}
                            >
                                <Icon />
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="network-control-section">
                        <h4 className="text-navy" style={{ fontWeight: 600, fontSize: '15px' }}>Export Data</h4>
                        {exportOptions.map(({ label, action, format }) => (
                            <button
                                key={format}
                                onClick={action}
                                className="network-control-button bg-light-purple text-navy"
                                title={`Download current network as ${format} file`}
                                style={{ borderRadius: '6px', margin: '6px 0', padding: '10px 14px', fontWeight: 600, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}
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
    <div className="network-zoom-controls" style={{ position: 'absolute', right: '24px', bottom: '24px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button onClick={onZoomIn} title="Zoom in" className="zoom-btn bg-purple text-grey" style={{ borderRadius: '50%', padding: '10px', fontWeight: 700, fontSize: '18px' }}>+</button>
        <div className="zoom-rail"></div>
        <button onClick={onReset} title="Reset view" className="zoom-btn bg-light-purple text-navy" style={{ borderRadius: '50%', padding: '10px', fontWeight: 700, fontSize: '18px' }}>⟲</button>
        <button onClick={onZoomOut} title="Zoom out" className="zoom-btn bg-purple text-grey" style={{ borderRadius: '50%', padding: '10px', fontWeight: 700, fontSize: '18px' }}>-</button>
    </div>
);

const InfoTooltip = ({ person, position, isHover = false }) => {
    if (!person || !position) return null;

    const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent((person.name || person.label || '').replace(/ /g, '_'))}`;

    return (
        <div
            className={`network-tooltip ${isHover ? 'hover' : 'click'} bg-grey text-navy`}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: 'translate(-50%, -100%)',
                borderRadius: '10px',
                boxShadow: '0 2px 12px rgba(53,55,75,0.12)',
                padding: '14px',
                minWidth: '220px',
                zIndex: 20
            }}
        >
            <div className="network-tooltip-content">
                <div className="network-tooltip-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                        src={person.image || person.profileImage || iconPlayer}
                        alt={person.name || person.label}
                        className="network-tooltip-avatar"
                        style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--grey)' }}
                        onError={(e) => { e.target.src = iconPlayer; }}
                    />
                    <div className="network-tooltip-info">
                        <h4 style={{ margin: 0, fontWeight: 700 }}>{person.name || person.label}</h4>
                        <div className="network-tooltip-details" style={{ fontSize: '14px', marginTop: '4px' }}>
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
                                className="network-tooltip-link text-purple"
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontWeight: 600 }}
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

const NetworkVisualization = ({ mode, data, onNodeClick, onNodeHover, onNodeLeave, loading, addedNodes = [] }) => {
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

    console.log(`NetworkVisualization - Mode: ${mode}, Nodes: ${nodes.length}, Edges: ${edges.length}`);

    return (
        <div className="mock-network-container bg-grey" style={{ borderRadius: '16px', boxShadow: '0 2px 16px rgba(53,55,75,0.10)', padding: '24px', margin: '32px auto', maxWidth: '900px', minHeight: '420px', position: 'relative' }}>
            <div className="mock-network-title">
                <h3 className="text-purple" style={{ fontWeight: 700, fontSize: '22px' }}>Athlete Network - {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode</h3>
                <p className="text-navy" style={{ fontSize: '15px', marginBottom: '6px' }}>{nodes.length} entities • {edges.length} connections</p>
                {mode === 'dynamic' && addedNodes.length > 0 && (
                    <small className="text-purple" style={{ display: 'block', marginTop: '4px' }}>
                        Added {addedNodes.length} athletes to dynamic network
                    </small>
                )}
                {mode === 'liked' && nodes.length > 0 && (
                    <small className="text-purple" style={{ display: 'block', marginTop: '4px' }}>
                        Showing athletes and organisations you have LIKED
                    </small>
                )}
                {mode === 'friends' && nodes.length > 0 && (
                    <small className="text-purple" style={{ display: 'block', marginTop: '4px' }}>
                        Showing your FRIENDS_WITH connections
                    </small>
                )}
            </div>

            {loading ? (
                <div className="mock-network-empty bg-light-purple text-navy" style={{ borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                    <div className="network-loading-spinner"></div>
                    <h4 style={{ fontWeight: 700 }}>Loading network data...</h4>
                    <p>Please wait while we fetch the latest data from the database.</p>
                </div>
            ) : nodes.length > 0 ? (
                <div className="mock-network-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px', marginTop: '24px' }}>
                    {nodes.slice(0, 16).map((node, index) => {
                        const nodeData = node.data || node;
                        return (
                            <div
                                key={nodeData.id}
                                className={`mock-node bg-light-purple text-navy ${mode === 'dynamic' && addedNodes.includes(nodeData.id) ? 'added-node' : ''}`}
                                onClick={(e) => handleNodeClick(node, e)}
                                onMouseEnter={(e) => handleNodeHover(node, e)}
                                onMouseLeave={onNodeLeave}
                                style={{
                                    borderRadius: '10px',
                                    boxShadow: '0 1px 6px rgba(87,90,123,0.10)',
                                    padding: '18px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    position: 'absolute',
                                    left: `${20 + (index % 4) * 200}px`,
                                    top: `${50 + Math.floor(index / 4) * 150}px`,
                                    width: '140px',
                                    minHeight: '120px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    border: mode === 'dynamic' && addedNodes.includes(nodeData.id) ? '2px solid var(--purple)' : '2px solid transparent',
                                    zIndex: 2
                                }}
                                title={`${nodeData.label || nodeData.name} (${nodeData.type || 'unknown'})`}
                            >
                                <img
                                    src={nodeData.image || nodeData.profileImage || iconPlayer}
                                    alt={nodeData.label || nodeData.name}
                                    style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--grey)', marginBottom: '8px' }}
                                    onError={(e) => { e.target.src = iconPlayer; }}
                                />
                                <span style={{ fontWeight: 600 }}>{nodeData.label || nodeData.name}</span>
                                <small style={{ fontSize: '13px' }}>{nodeData.type || 'person'}</small>
                            </div>
                        );
                    })}

                    {/* Display connection lines for edges */}
                    {edges.length > 0 && (
                        <svg className="mock-connections">
                            {edges.slice(0, 12).map((edge, index) => {
                                const edgeData = edge.data || edge;
                                const sourceIndex = nodes.findIndex(n => (n.data?.id || n.id) === edgeData.source);
                                const targetIndex = nodes.findIndex(n => (n.data?.id || n.id) === edgeData.target);

                                if (sourceIndex === -1 || targetIndex === -1 || sourceIndex > 15 || targetIndex > 15) return null;

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

                    {nodes.length > 16 && (
                        <div className="mock-network-overflow">
                            <p>+ {nodes.length - 16} more entities in network</p>
                            <small>This is a preview. The full network will be displayed in Cytoscape when integrated.</small>
                        </div>
                    )}
                </div>
            ) : (
                <div className="mock-network-empty bg-light-purple text-navy" style={{ borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                    <NetworkIcon />
                    <h4 style={{ fontWeight: 700 }}>
                        {mode === 'dynamic' ? 'Dynamic Network' :
                            mode === 'general' ? 'No data available' :
                                mode === 'liked' ? 'No liked entities' :
                                    mode === 'friends' ? 'No friends' : 'No data available'}
                    </h4>
                    <p>
                        {mode === 'dynamic' && "Use the search panel to add athletes to your dynamic network"}
                        {mode === 'general' && "No network data found in the database"}
                        {mode === 'liked' && "No LIKES relationships found for this user"}
                        {mode === 'friends' && "No FRIENDS_WITH relationships found for this user"}
                        {mode === 'similar' && "Click 'Explore My Network' to start from your likes and expand outward"}
                    </p>
                </div>
            )}
        </div>
    );
};

const Dashboard = ({ onBackToHome = () => console.log('Back to home'), user = null, containerStyle = { width: '100%', height: '500px' } }) => {
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
    const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
    const [addedNodes, setAddedNodes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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

    // Extract a "best of" subgraph from the general network
    // showing an organisation with several athletes or a sport
    // with multiple athletes attached. Falls back to the full
    // data if no such grouping is found.
    const getBestOfNetwork = (data) => {
        if (!data || !Array.isArray(data.nodes)) return data;

        const nodes = data.nodes;
        const edges = data.edges || [];
        const nodeMap = new Map(nodes.map(n => [(n.data || n).id, n]));

        const orgInfo = {};
        const sportInfo = {};

        edges.forEach(e => {
            const eData = e.data || e;
            const src = nodeMap.get(eData.source);
            const tgt = nodeMap.get(eData.target);
            if (!src || !tgt) return;

            const srcType = ((src.data || src).type || (src.data || src).label || '').toLowerCase();
            const tgtType = ((tgt.data || tgt).type || (tgt.data || tgt).label || '').toLowerCase();

            // Person connected to Organisation
            if ((srcType === 'person' && (tgtType === 'organisation' || tgtType === 'organization')) ||
                ((srcType === 'organisation' || srcType === 'organization') && tgtType === 'person')) {
                const orgNode = (srcType === 'organisation' || srcType === 'organization') ? src : tgt;
                const athleteNode = srcType === 'person' ? src : tgt;
                const orgId = (orgNode.data || orgNode).id;
                if (!orgInfo[orgId]) {
                    orgInfo[orgId] = { node: orgNode, athletes: new Set() };
                }
                orgInfo[orgId].athletes.add((athleteNode.data || athleteNode).id);
            }

            // Person connected to Sport
            if ((srcType === 'person' && tgtType === 'sport') ||
                (srcType === 'sport' && tgtType === 'person')) {
                const sportNode = srcType === 'sport' ? src : tgt;
                const athleteNode = srcType === 'person' ? src : tgt;
                const sportId = (sportNode.data || sportNode).id;
                if (!sportInfo[sportId]) {
                    sportInfo[sportId] = { node: sportNode, athletes: new Set() };
                }
                sportInfo[sportId].athletes.add((athleteNode.data || athleteNode).id);
            }
        });

        const topOrg = Object.values(orgInfo).reduce((acc, info) => {
            if (info.athletes.size >= 2 && (!acc || info.athletes.size > acc.athletes.size)) {
                return info;
            }
            return acc;
        }, null);

        const topSport = Object.values(sportInfo).reduce((acc, info) => {
            if (info.athletes.size >= 2 && (!acc || info.athletes.size > acc.athletes.size)) {
                return info;
            }
            return acc;
        }, null);

        let selectedIds = null;
        if (topOrg && (!topSport || topOrg.athletes.size >= topSport.athletes.size)) {
            selectedIds = new Set([(topOrg.node.data || topOrg.node).id, ...topOrg.athletes]);
        } else if (topSport) {
            selectedIds = new Set([(topSport.node.data || topSport.node).id, ...topSport.athletes]);
        }

        if (selectedIds) {
            const filteredNodes = nodes.filter(n => selectedIds.has((n.data || n).id));
            const filteredEdges = edges.filter(e =>
                selectedIds.has((e.data || e).source) && selectedIds.has((e.data || e).target)
            );
            return { nodes: filteredNodes, edges: filteredEdges };
        }

        return data;
    };

    useEffect(() => {
        loadGraphData();
    }, [mode, user]);

    // Load athletes for search
    useEffect(() => {
        const loadAthletes = async () => {
            try {
                const apiBase = process.env.REACT_APP_API_BASE || '';

                // First try to get athletes from the general graph
                const graphResponse = await fetch(`${apiBase}/api/graph?limit=200`);
                if (graphResponse.ok) {
                    const graphData = await graphResponse.json();

                    // Filter for Person nodes (athletes)
                    const athleteNodes = (graphData.nodes || []).filter(node => {
                        const nodeData = node.data || node;
                        return nodeData.label === 'Person' && nodeData.name &&
                            (nodeData.sport || nodeData.roles?.includes('athlete'));
                    }).map(node => {
                        const nodeData = node.data || node;
                        return {
                            id: nodeData.id,
                            name: nodeData.name,
                            label: nodeData.name,
                            sport: nodeData.sport,
                            nationality: nodeData.nationality,
                            type: 'athlete',
                            image: nodeData.image || nodeData.profileImage,
                            ...nodeData
                        };
                    });

                    console.log('Loaded athletes from graph:', athleteNodes.length);
                    setAthletes(athleteNodes);
                    return;
                }

                // Fallback to athletes API
                const response = await fetch(`${apiBase}/api/athletes`);
                if (response.ok) {
                    const data = await response.json();
                    const formattedAthletes = (Array.isArray(data) ? data : []).map(athlete => ({
                        id: athlete.id || athlete.uuid,
                        name: athlete.name,
                        label: athlete.name,
                        sport: athlete.sport,
                        nationality: athlete.nationality,
                        type: 'athlete',
                        image: athlete.image || athlete.profileImage,
                        ...athlete
                    }));
                    setAthletes(formattedAthletes);
                }
            } catch (err) {
                console.error('Error loading athletes:', err);
                setAthletes([]);
            }
        };
        loadAthletes();
    }, []);

    const loadGraphData = async () => {
        // Dynamic mode starts empty
        if (mode === 'dynamic') {
            setGraphData({ nodes: [], edges: [] });
            setAddedNodes([]);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let response;
            let data;
            const apiBase = process.env.REACT_APP_API_BASE || '';

            console.log(`Loading ${mode} data...`);
            if (user) {
                console.log(`Using user:`, user.username, user.email);
            }

            switch (mode) {
                case 'general':
                    console.log('Fetching general network...');
                    response = await fetch(`${apiBase}/api/graph?limit=100`);
                    if (!response.ok) {
                        throw new Error(`Failed to load network: ${response.status}`);
                    }
                    data = await response.json();
                    data = getBestOfNetwork(data);
                    break;

                case 'liked':
                    console.log('Fetching liked entities');
                    response = await fetch(`${apiBase}/api/graph/liked`, {
                    });
                    if (!response.ok) {
                        if (response.status === 404) {
                            data = { nodes: [], edges: [], totalCount: 0, message: 'No liked entities found' };
                        } else {
                            throw new Error(`Failed to load liked entities: ${response.status}`);
                        }
                    } else {
                        data = await response.json();
                    }
                    break;

                case 'friends':
                    if (!user || (!user.email && !user.username)) {
                        setError('Please log in to view your friends network');
                        setGraphData({ nodes: [], edges: [] });
                        return;
                    }
                    const friendIdentifier = encodeURIComponent(user.email || user.username);
                    console.log(`Fetching friends for identifier: ${friendIdentifier}`);

                    response = await fetch(`${apiBase}/api/graph/friends/${friendIdentifier}`, {
                        credentials: 'include'
                    });
                    if (!response.ok) {
                        if (response.status === 404) {
                            data = { nodes: [], edges: [], totalCount: 0, message: 'No friends found for this user' };
                        } else {
                            throw new Error(`Failed to load friends: ${response.status}`);
                        }
                    } else {
                        data = await response.json();
                    }
                    break;

                case 'similar':
                    if (!user) {
                        setError('Please log in to explore your network connections');
                        setGraphData({ nodes: [], edges: [] });
                        return;
                    }
                    // Start with empty graph for similar mode
                    data = { nodes: [], edges: [] };
                    console.log('Similar mode - starting with empty graph');
                    break;
                case 'pagerank':
                    console.log('Fetching PageRank scores...');
                    response = await fetch(`${apiBase}/api/graph/pagerank?limit=50`);
                    if (!response.ok) {
                        if (response.status === 404 || response.status === 500) {
                            console.log('No PageRank scores found or retrieval failed, calculating new ones...');
                            const calcRes = await fetch(`${apiBase}/api/graph/pagerank`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ maxIterations: 20, dampingFactor: 0.85, writeProperty: 'pagerank' })
                            });
                            if (!calcRes.ok) {
                                const errText = await calcRes.text();
                                throw new Error(`Failed to calculate PageRank: ${calcRes.status} ${errText}`);
                            }
                            await calcRes.json();
                            response = await fetch(`${apiBase}/api/graph/pagerank?limit=50`);
                            if (!response.ok) {
                                throw new Error(`Failed to fetch PageRank scores after calculation: ${response.status}`);
                            }
                        } else {
                            throw new Error(`Failed to get PageRank: ${response.status}`);
                        }
                    }

                    const prData = await response.json();

                    if (Array.isArray(prData) && prData.length) {
                        const prNodes = prData.map((person, index) => ({
                            data: {
                                id: person.id || `pagerank-${index}`,
                                label: person.name,
                                name: person.name,
                                sport: person.sport,
                                nationality: person.nationality,
                                type: 'person',
                                image: person.profileImage || person.image,
                                profileImage: person.profileImage || person.image,
                                pagerank: person.score,
                                ...person
                            }
                        }));

                        const prGraph = { nodes: prNodes.slice(0, 20), edges: [] };
                        const topPersons = prData.slice(0, 5).map(p => `${p.name} (${p.score.toFixed(4)})`).join('\n');

                        alert(`🎯 PageRank Analysis Complete!\n\n📊 Results:\n• Analyzed ${prData.length} people\n• Found most influential individuals\n• Scores range from ${prData[prData.length - 1]?.score.toFixed(4)} to ${prData[0]?.score.toFixed(4)}\n\n🏆 Top 5 Most Influential:\n${topPersons}`);

                        data = prGraph;
                    } else {
                        alert('No PageRank data found.');
                        data = { nodes: [], edges: [], message: 'No PageRank scores found' };
                    }
                    break;

                default:
                    data = { nodes: [], edges: [] };
            }

            if (data.nodes && data.nodes.length > 0) {
                console.log(`Successfully loaded ${data.nodes.length} nodes and ${data.edges?.length || 0} edges`);
                setAllNodes(data.nodes);
                setGraphData(data);
                setError(null);
            } else {
                const message = data.message || `No data available for ${mode} mode`;
                console.log('No data found:', message);
                setError(message);
                setGraphData({ nodes: [], edges: [] });
                setAllNodes([]);
            }
        } catch (err) {
            console.error(`Error loading ${mode} data:`, err);
            setError(`Failed to load ${mode} data: ${err.message}`);
            setGraphData({ nodes: [], edges: [] });
            setAllNodes([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (searchTerm) => {
        try {
            const apiBase = process.env.REACT_APP_API_BASE || '';
            const response = await fetch(`${apiBase}/api/athletes/search?query=${encodeURIComponent(searchTerm)}`);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) return data;
                if (Array.isArray(data.players)) return data.players;
                return [];
            }
            return [];
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    };

    const handleAddAthlete = async (athlete) => {
        console.log('Adding athlete to network:', athlete);

        if (mode === 'dynamic') {
            const newNode = {
                data: {
                    id: athlete.id || athlete.name || `athlete-${Date.now()}`,
                    label: athlete.name,
                    name: athlete.name,
                    sport: athlete.sport,
                    nationality: athlete.nationality,
                    type: 'athlete',
                    image: athlete.image || athlete.profileImage,
                    roles: ['athlete'],
                    ...athlete
                }
            };

            const nodeId = newNode.data.id;
            if (graphData.nodes.some(n => (n.data?.id || n.id) === nodeId)) {
                console.log('Athlete already in network');
                alert(`${athlete.name} is already in the network!`);
                return;
            }

            let updatedNodes = [...graphData.nodes, newNode];
            let updatedEdges = [...graphData.edges];

            try {
                const apiBase = process.env.REACT_APP_API_BASE || '';
                const res = await fetch(`${apiBase}/api/athletes/${encodeURIComponent(nodeId)}/network`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.nodes && data.edges) {
                        data.nodes.forEach(n => {
                            const id = n.data?.id || n.id;
                            if (!updatedNodes.some(ex => (ex.data?.id || ex.id) === id)) {
                                updatedNodes.push(n);
                            }
                        });
                        data.edges.forEach(e => {
                            const id = e.data?.id || e.id;
                            if (!updatedEdges.some(ex => (ex.data?.id || ex.id) === id)) {
                                updatedEdges.push(e);
                            }
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to fetch athlete network:', err);
            }

            const updatedGraphData = { nodes: updatedNodes, edges: updatedEdges };

            setGraphData(updatedGraphData);
            setAddedNodes([...addedNodes, nodeId]);
            setAllNodes(updatedGraphData.nodes);

            console.log(`Added ${athlete.name} to dynamic network`);

            alert(`Added ${athlete.name} (${athlete.sport || 'Unknown sport'}) to your network!`);
        } else {
            alert(`ℹ${athlete.name} selected. In dynamic mode, this would add them to your network.`);
        }
    };

    const handlePageRank = () => {
        setMode('pagerank');

    };

    const handleCommunities = async () => {
        try {
            setLoading(true);
            const apiBase = process.env.REACT_APP_API_BASE || '';

            const response = await fetch(`${apiBase}/api/graph/org-community`);

            if (!response.ok) {
                throw new Error(`Failed to load community: ${response.status}`);
            }
            const data = await response.json();


            if (!data.nodes || data.nodes.length === 0) {
                alert('No community data found.');
                return;
            }
            setGraphData({ nodes: data.nodes, edges: data.edges || [] });
            setAllNodes(data.nodes);


            setError(null);

            const org = data.nodes.find(n => {
                const t = (n.data || n).type || '';
                return t === 'organisation' || t === 'organization';
            });
            const playerCount = data.nodes.filter(n => (n.data || n).type === 'person').length;

            alert(`Community Detected\n\n🏢 Organisation: ${(org?.data || org)?.name || 'Unknown'}\n👥 Players: ${playerCount}`);


        } catch (err) {
            console.error('Community detection error:', err);
            alert(`Failed to detect communities: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadSimilar = async () => {
        if (!user) {
            alert('Please log in to explore your network connections.\n\nThis feature starts with your LIKED entities and expands outward.');
            return;
        }

        try {
            setLoading(true);
            const apiBase = process.env.REACT_APP_API_BASE || '';

            console.log('🔍 Step 1: Getting your liked entities...');

            if (!user.email) {
                throw new Error('No email available for current user');
            }

            const likedEmail = encodeURIComponent(user.email);
            const likedResponse = await fetch(`${apiBase}/api/graph/liked/${likedEmail}`, {
                credentials: 'include'
            });

            if (!likedResponse.ok) {
                throw new Error('Failed to get your liked entities. Make sure you have LIKES relationships in the database.');
            }

            const likedData = await likedResponse.json();

            if (!likedData.nodes || likedData.nodes.length === 0) {
                alert('No liked entities found.\n\nTo use this feature:\n1. First like some people/organisations in your app\n2. This will create LIKES relationships in Neo4j\n3. Then this feature will show connections radiating out from your likes');
                return;
            }

            setGraphData(likedData);
            setAllNodes(likedData.nodes);
            setMode('similar');

            alert(`🎯 Network Exploration Started!\n\n📊 Results:\n• Found ${likedData.nodes.length} entities you liked\n• Showing your personal network\n\n🖱️ Click any node to explore connections!`);

        } catch (err) {
            console.error('Network expansion error:', err);
            alert(`Failed to expand your network: ${err.message}`);
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
        if (document.body.contains(a)) {
            document.body.removeChild(a);
        }
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

        setPopupData({
            name: nodeData.label || nodeData.name,
            sport: nodeData.sport,
            nationality: nodeData.nationality,
            type: nodeData.type,
            image: nodeData.image || nodeData.profileImage
        });
        setPopupPosition(position);
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

    useEffect(() => {
        if (mode === 'dynamic') {
            setSearchPanelVisible(true);
        }
    }, [mode]);

    return (
        <div className="network-dashboard bg-grey" data-mode={mode} style={{ minHeight: '100vh', fontFamily: 'Inter, Arial, sans-serif' }}>
            {/* Header */}
            <header className="network-header bg-purple text-grey" style={{ padding: '24px 0', boxShadow: '0 2px 8px rgba(87,90,123,0.08)' }}>
                <div className="network-header-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1100px', margin: '0 auto' }}>
                    <div className="network-header-info">
                        <h1 style={{ fontWeight: 800, fontSize: '32px', margin: 0 }}>Athlete Explorer</h1>
                        <p style={{ fontSize: '16px', margin: '6px 0 0 0' }}>
                            Discover connections in the world of sports
                        </p>
                    </div>
                    <div className="network-header-actions">
                        <BackToHome onBackToHome={onBackToHome} />
                    </div>
                </div>
            </header>

            {/* Mode Selector */}
            <ModeSelector currentMode={mode} onModeChange={setMode} user={user} />

            {/* Main Content */}
            <div className="network-main-content" style={{ position: 'relative', maxWidth: '1100px', margin: '0 auto', padding: '32px 0' }}>
                {/* Loading overlay */}
                {loading && (
                    <div className="network-loading-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(53,55,75,0.08)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="network-loading-card bg-light-purple text-navy" style={{ borderRadius: '12px', padding: '32px', boxShadow: '0 2px 12px rgba(53,55,75,0.12)', textAlign: 'center' }}>
                            <div className="network-loading-spinner"></div>
                            <p style={{ fontWeight: 600, fontSize: '18px' }}>Loading network data...</p>
                        </div>
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div className="network-error-message bg-pink text-navy" style={{ borderRadius: '8px', padding: '14px', marginBottom: '18px', fontWeight: 600, boxShadow: '0 1px 6px rgba(219,189,197,0.10)' }}>
                        {error}
                    </div>
                )}

                {/* Network Visualization */}
                <NetworkVisualization
                    mode={mode}
                    data={graphData}
                    loading={loading}
                    addedNodes={addedNodes}
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
                    onSearch={handleSearch}
                    isVisible={searchPanelVisible}
                    onToggle={() => setSearchPanelVisible(!searchPanelVisible)}
                    mode={mode}
                />

                {/* Control Panel */}
                <ControlPanel
                    onPageRank={handlePageRank}
                    onCommunities={handleCommunities}
                    onExport={handleExport}
                    onLoadSimilar={handleLoadSimilar}
                    isOpen={controlPanelOpen}
                    setIsOpen={setControlPanelOpen}
                    user={user}
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
                <div className="network-instructions bg-light-purple text-navy" style={{ borderRadius: '8px', padding: '12px', marginTop: '24px', fontWeight: 500, fontSize: '15px', boxShadow: '0 1px 6px rgba(121,124,160,0.08)' }}>
                    <p style={{ margin: 0 }}>
                        {mode === 'dynamic' && "🔍 Use the search panel to add athletes and view their connections"}
                        {mode === 'general' && "Click on nodes to explore connections"}
                        {mode === 'liked' && "Your liked people and organisations"}
                        {mode === 'friends' && "Your friends network"}
                        {mode === 'similar' && "🎯 Network Explorer: Click nodes to expand • Use 'Explore My Network' to start from your likes"}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;