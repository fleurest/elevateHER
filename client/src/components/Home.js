import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Split from 'react-split';
import cytoscape from 'cytoscape';
import logo from '../assets/logo-default-profile.png';
import EditProfileForm from './EditProfileForm';
import '../style.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const API_BASE = process.env.API_BASE;

function getPlaceholderIcon(nodeType) {
  const iconUrl = 'https://img.icons8.com/color/150/';

  const icons = {
    'Event': `${iconUrl}calendar.png`,
    'Organisation': `${iconUrl}office-building.png`,
    'Sport': `${iconUrl}soccer-ball.png`,
    'Sponsor': `${iconUrl}briefcase.png`,
    'Friends': `${iconUrl}people.png`,
    'Player': `${iconUrl}running.png`,
    'default': `${iconUrl}question-mark.png`
  };

  return icons[nodeType] || icons['default'];
}

function HomePage({ handleLogout, user, setUser }) {

  const cyContainerRef = useRef(null);
  const cyInstanceRef = useRef(null);

  const [graphData, setGraphData] = useState(null);
  const [centerGraphData, setCenterGraphData] = useState(null);

  // activeView: 'profile' | 'players' | 'friends' | 'verify' | 'explore'
  const [activeView, setActiveView] = useState('profile');

  // If editing profile, show EditProfileForm in right column
  const [editProfile, setEditProfile] = useState(false);

  // Top friends for the icon bar
  const [topFriends, setTopFriends] = useState([]);
  const [showAllFriends, setShowAllFriends] = useState(false);

  // "Get Explore" → filterType determines which label to filter by
  const [filterType, setFilterType] = useState(null);

  // For suggestion, "Suggested Friends" etc.
  const [suggestedFriends, setSuggestedFriends] = useState([]);

  // Upcoming/past events for right pane
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);

  // Selected node details (shows in right panel when node is clicked)
  const [selectedNode, setSelectedNode] = useState(null);

  // Selected person details (shows when person node is clicked)
  const [selectedPerson, setSelectedPerson] = useState(null);

  // Friend search functionality
  const [showAddFriendPanel, setShowAddFriendPanel] = useState(false);
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [friendResults, setFriendResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Right panel view state: 'default' | 'nodeDetails' | 'personDetails' | 'friendSearch'
  const [rightPanelView, setRightPanelView] = useState('default');

  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.username) {
      fetch(`${API_BASE}/auth/session`, { credentials: 'include' })
        .then((res) => {
          if (!res.ok) throw new Error('Not authenticated');
          return res.json();
        })
        .then(({ user: sessionUser }) => {
          setUser(sessionUser);
        })
        .catch(() => navigate('/login'));
    }
  }, [user, setUser, navigate]);

  useEffect(() => {
    fetch(`${API_BASE}/api/events/past-events`)
      .then((res) => res.json())
      .then((data) => setPastEvents(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error fetching past events:', err));

    fetch(`${API_BASE}/api/events/calendar-events`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setUpcomingEvents(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error fetching calendar events:', err));
  }, []);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  // Fetch the full graph once
  useEffect(() => {
    async function fetchFullGraph() {
      try {
        const res = await fetch(`${API_BASE}/api/graph`, { credentials: 'include' });
        if (!res.ok) throw new Error(`Graph fetch failed: ${res.status}`);
        const data = await res.json();
        setGraphData(data);
      } catch (err) {
        console.error('Error fetching full graph:', err);
      }
    }
    fetchFullGraph();
  }, []);

  // Fetch top friends for icon bar
  useEffect(() => {
    if (!user?.username) return;
    fetch(`${API_BASE}/api/users/friends/${user.username}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setTopFriends(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error loading top friends:', err));
  }, [user?.username]);

  const handleSearch = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users/search?query=${encodeURIComponent(searchQuery)}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const handleFriendSearch = async (query) => {
    try {
      const res = await fetch(`${API_BASE}/api/users/friends/search?query=${encodeURIComponent(query)}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      setFriendResults(data);
    } catch (err) {
      console.error('Friend search failed:', err);
      setFriendResults([]);
    }
  };

  const handleSendFriendRequest = async (username) => {
    try {
      const res = await fetch(`${API_BASE}/api/users/sendfriendrequest/${user.username}/${username}`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      console.log('Friend request sent:', data);
    } catch (err) {
      console.error('Error sending friend request:', err);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users/friends/${user.username}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setFriendResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Could not fetch friends:', err);
    }
  };

  // ─── Left‐Menu Handlers ───────────────────────────────────────────────────────

  const handleMyProfile = () => {
    setActiveView('profile');
    setEditProfile(false);
    setCenterGraphData(null);
    setFilterType(null);
    setRightPanelView('default');
    setSelectedNode(null);
    setSelectedPerson(null);
  };

  const handleMyPlayers = async () => {
    setActiveView('players');
    setEditProfile(false);
    setFilterType(null);
    setRightPanelView('default');
    setSelectedNode(null);
    setSelectedPerson(null);

    try {
      const encodedIdentifier = encodeURIComponent(user.username);
      console.log('Original user.username:', user.username);
      console.log('Encoded identifier:', encodedIdentifier);
      console.log('Full URL:', `${API_BASE}/api/graph/liked/${encodedIdentifier}`);

      const res = await fetch(
        `${API_BASE}/api/graph/liked/${encodedIdentifier}`,
        { credentials: 'include' }
      );

      console.log('Response status:', res.status);
      console.log('Response ok:', res.ok);

      if (!res.ok) {
        const errorText = await res.text();
        console.log('Error response:', errorText);
        throw new Error(`Error ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      setCenterGraphData(data);
    } catch (err) {
      console.error('Error fetching liked athletes graph:', err);
      setCenterGraphData(null);
    }
  };

  const handleMyFriends = async () => {
    setActiveView('friends');
    setEditProfile(false);
    setFilterType(null);
    setRightPanelView('default');
    setSelectedNode(null);
    setSelectedPerson(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/graph/friends/${user.username}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setCenterGraphData(data);
    } catch (err) {
      console.error('Error fetching accepted friends graph:', err);
      setCenterGraphData(null);
    }
  };

  const handleGetVerified = () => {
    setActiveView('verify');
    setEditProfile(false);
    setCenterGraphData(null);
    setFilterType(null);
    setRightPanelView('default');
    setSelectedNode(null);
    setSelectedPerson(null);
  };

  const handleExplore = (category) => {
    setActiveView('explore');
    setEditProfile(false);
    setFilterType(category);
    setCenterGraphData(null);
    setRightPanelView('default');
    setSelectedNode(null);
    setSelectedPerson(null);
  };

  // ─── Cytoscape Hook ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (
      activeView !== 'players' &&
      activeView !== 'friends' &&
      activeView !== 'explore'
    ) {
      if (cyInstanceRef.current) {
        cyInstanceRef.current.destroy();
        cyInstanceRef.current = null;
      }
      return;
    }

    let dataToRender = null;

    if (activeView === 'players' || activeView === 'friends') {
      if (!centerGraphData) return;
      dataToRender = {
        nodes: centerGraphData.nodes || [],
        edges: centerGraphData.edges || []
      };
    } else if (activeView === 'explore') {
      // Use full graphData, filter by filterType
      if (!graphData || !filterType) return;
      const nodes = (graphData.nodes || []).filter(
        (n) => n.data.label === filterType
      );
      const nodeIds = new Set(nodes.map((n) => n.data.id));
      const edges = (graphData.edges || []).filter(
        (e) => nodeIds.has(e.data.source) && nodeIds.has(e.data.target)
      );
      dataToRender = { nodes, edges };
    }

    if (!dataToRender) return;

    const timeout = setTimeout(() => {
      try {
        if (cyInstanceRef.current) {
          cyInstanceRef.current.destroy();
          cyInstanceRef.current = null;
        }

        const cy = cytoscape({
          container: cyContainerRef.current,
          elements: [
            ...dataToRender.nodes.map((n) => {
              console.log('🔍 Processing node:', n.data.label, 'type:', n.data.type, 'profileImage:', n.data.profileImage);

              let img = n.data.profileImage || n.data.image;

              if (!img) {
                if (n.data.type === 'user' || (n.data.label && n.data.label.includes('@'))) {
                  // Use app logo for user nodes
                  img = logo;
                } else if (n.data.roles && n.data.roles.includes('athlete')) {
                  // For athletes with names, look at Wikipedia first
                  const wikiName = (n.data.label || 'default').replace(/ /g, '_');
                  const wikiUrl = `https://en.wikipedia.org/wiki/Special:FilePath/${wikiName}.jpg`;
                  img = `${API_BASE}/api/image-proxy?url=${encodeURIComponent(wikiUrl)}`;
                } else {
                  const nodeType = n.data.type || n.data.label || 'default';
                  img = getPlaceholderIcon(nodeType);
                }
              } else if (img.includes('afl.com.au') || img.includes('wikipedia.org')) {
                // Proxy external images for CORS issues
                img = `${API_BASE}/api/image-proxy?url=${encodeURIComponent(img)}`;
              }

              if (!img) {
                console.warn('Image is null for node:', n.data.label, 'using fallback');
                img = logo;
              }

              console.log('🔍 Final image URL for', n.data.label, ':', img);
              n.data.image = img;
              return n;
            }),
            ...dataToRender.edges
          ],
          style: [
            {
              selector: 'node',
              style: {
                'background-color': '#fff',
                'background-image': 'data(image)',
                'background-fit': 'cover',
                'background-position': 'center',
                'border-width': 3,
                'border-color': 'var(--purple)',
                label: 'data(label)',
                fontSize: 10,
                width: 50,
                height: 50
              }
            },
            {
              selector: 'edge',
              style: {
                width: 2,
                'line-color': '#ccc',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier'
              }
            },
            {
              selector: '.faded',
              style: {
                opacity: 0.3
              }
            }
          ],
          layout: { name: 'cose-bilkent', animate: true }
        });

        // pin top 5 for friends
        if (activeView === 'friends') {
          const topFive = cy
            .nodes()
            .sort((a, b) => b.degree() - a.degree())
            .slice(0, 5);
          topFive.forEach((n) => n.lock());
        }

        // ========== NEW: Enhanced click handlers for right panel ==========
        cy.on('tap', 'node', (evt) => {
          const nodeData = evt.target.data();

          // Visual effects
          cy.elements().addClass('faded');
          evt.target.removeClass('faded');
          evt.target.connectedEdges().removeClass('faded');
          evt.target.connectedEdges().connectedNodes().removeClass('faded');
          cy.center(evt.target);
          cy.zoom({ level: 2, position: evt.target.position() });

          // Update right panel based on node type
          if (nodeData.label === "Person" || nodeData.type === "user") {
            setSelectedPerson({
              name: nodeData.name || nodeData.label,
              description: nodeData.description,
              profileImage: nodeData.profileImage || nodeData.image,
              username: nodeData.username,
              id: nodeData.id
            });
            setRightPanelView('personDetails');
            setSelectedNode(null);
          } else {
            // For non-person nodes, show general node details
            setSelectedNode(nodeData);
            setRightPanelView('nodeDetails');
            setSelectedPerson(null);
          }
        });

        cy.on('tap', (evt) => {
          if (evt.target === cy) {
            cy.elements().removeClass('faded');
            // Don't clear the right panel when clicking empty space
          }
        });

        cyInstanceRef.current = cy;
      } catch (err) {
        console.error('Cytoscape init error:', err);
      }
    }, 100);

    return () => {
      clearTimeout(timeout);
      if (cyInstanceRef.current) {
        cyInstanceRef.current.destroy();
        cyInstanceRef.current = null;
      }
    };
  }, [activeView, centerGraphData, graphData, filterType]);

  // ─── "Suggested Friends" (for Explore Friends) ───────────────────────────────
  const fetchSuggestedFriends = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users/top`, { credentials: 'include' });
      const text = await res.text();
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = JSON.parse(text);
      setSuggestedFriends(data);
    } catch (err) {
      console.error('Could not fetch suggested friends:', err);
    }
  };

  useEffect(() => {
    if (activeView === 'explore' && filterType === 'Friends') {
      fetchSuggestedFriends();
    }
  }, [activeView, filterType]);

  // ========== NEW: Functions to open friend search panel ==========
  const openFriendSearchPanel = () => {
    setRightPanelView('friendSearch');
    setSearchQuery('');
    setSearchResults([]);
    fetchFriends();
  };

  const closeFriendSearchPanel = () => {
    setRightPanelView('default');
    setSearchQuery('');
    setSearchResults([]);
  };

  if (!user) return null;

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      {/* ── Outer Split: Left (20%) vs. (Center+Right) (80%) ───────────────────── */}
      <Split
        sizes={[20, 80]}
        minSize={150}
        gutterSize={8}
        gutterAlign="center"
        direction="horizontal"
        snapOffset={30}
        style={{ display: 'flex', height: '100%' }}
      >
        {/* ===== Left Sidebar (20%) ===== */}
        <div className="bg-pink h-100 overflow-auto" style={{ padding: '1rem' }}>
          {/* Logo */}
          <div className="text-center mb-4">
            <img
              src={logo}
              alt="Logo"
              className="rounded-circle"
              style={{ width: '80px', height: '80px', border: '2px solid var(--purple)' }}
            />
          </div>

          {/* ── Favourites Section ───────────────────────────────────────────── */}
          <div className="mb-4">
            <h5 className="text-navy">Favourites</h5>
            <ul className="list-unstyled">
              <li
                className={`menu-item ${activeView === 'profile' || activeView === 'verify' ? 'active-menu-item' : ''}`}
                onClick={handleMyProfile}
              >
                My Profile
              </li>
              <li
                className={`menu-item ${activeView === 'players' ? 'active-menu-item' : ''}`}
                onClick={handleMyPlayers}
              >
                My Players
              </li>
              <li
                className={`menu-item ${activeView === 'friends' ? 'active-menu-item' : ''}`}
                onClick={handleMyFriends}
              >
                My Friends
              </li>
              <li
                className={`menu-item ${activeView === 'verify' ? 'active-menu-item' : ''}`}
                onClick={handleGetVerified}
              >
                Get Verified
              </li>
            </ul>
          </div>

          {/* ── Explore Section ───────────────────────────────────────────────── */}
          <div className="mb-4">
            <h5 className="text-navy">Explore</h5>
            <ul className="list-unstyled">
              <li
                className={`menu-item ${activeView === 'explore' && filterType === 'Friends' ? 'active-menu-item' : ''}`}
                onClick={() => handleExplore('Friends')}
              >
                Friends
              </li>
              <li
                className={`menu-item ${activeView === 'explore' && filterType === 'Player' ? 'active-menu-item' : ''}`}
                onClick={() => handleExplore('Player')}
              >
                Players
              </li>
              <li
                className={`menu-item ${activeView === 'explore' && filterType === 'Sport' ? 'active-menu-item' : ''}`}
                onClick={() => handleExplore('Sport')}
              >
                Sports
              </li>
              <li
                className={`menu-item ${activeView === 'explore' && filterType === 'Event' ? 'active-menu-item' : ''}`}
                onClick={() => handleExplore('Event')}
              >
                Events
              </li>
              <li
                className={`menu-item ${activeView === 'explore' && filterType === 'Organisation' ? 'active-menu-item' : ''}`}
                onClick={() => handleExplore('Organisation')}
              >
                Organisations
              </li>
              <li
                className={`menu-item ${activeView === 'explore' && filterType === 'Sponsor' ? 'active-menu-item' : ''}`}
                onClick={() => handleExplore('Sponsor')}
              >
                Sponsors
              </li>
            </ul>
          </div>

          {/* ── News Section ───────────────────────────────────────────────────── */}
          <div className="mb-4">
            <h5 className="text-navy">News</h5>
            <ul className="list-unstyled">
              <li className="menu-item">My News</li>
            </ul>
            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <button
                onClick={handleLogout}
                type="button"
                className="btn btn-outline-danger btn-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <Split
          sizes={[75, 25]}
          minSize={200}
          gutterSize={8}
          gutterAlign="center"
          direction="horizontal"
          style={{ display: 'flex', height: '100%' }}
        >
          {/* ===== Center Column ===== */}
          <div className="bg-grey h-100 overflow-auto" style={{ padding: '1rem' }}>
            {/* First icon‐bar*/}
            <div className="home-page-column home-page-center mb-3">
              <div className="icon-bar-wrapper">
                <div className="center-top-icons">
                  <Link to="/home" className="icon-link my-icon home-icon" />
                  <Link to="/dashboard" className="icon-link my-icon players-icon" />
                  <Link to="/events" className="icon-link my-icon events-icon" />
                  <Link to="/search" className="icon-link my-icon pages-icon" />
                </div>
              </div>
            </div>

            {/* Second icon‐bar user + top friends */}
            <div className="home-page-column home-page-center mb-4">
              <div className="icon-bar-wrapper">
                <div className="center-top-icons">
                  {user && (
                    <Link to={`/profile/${user.username}`} className="flex flex-col items-center mx-1 w-12">
                      <img
                        src={user.profileImage || logo}
                        alt={user.username}
                        className="small-logo w-7 h-7 rounded-full object-cover"
                      />
                      <span className="text-[10px] mt-1 text-center truncate w-full">{user.username}</span>
                    </Link>
                  )}
                  {topFriends.slice(0, 5).map((friend) => {
                    // Use username if available, otherwise use email (and encodeURIComponent for safety)
                    const friendId = friend.username || encodeURIComponent(friend.email || '');
                    return (
                      <Link
                        key={friendId}
                        to={`/profile/${friendId}`}
                        className="flex flex-col items-center mx-1 w-12"
                      >
                        <img
                          src={friend.profileImage || logo}
                          alt={friend.username || friend.email}
                          className="small-logo w-7 h-7 rounded-full object-cover"
                        />
                        <span className="text-[10px] mt-1 text-center truncate w-full">
                          {friend.username || friend.email}
                        </span>
                      </Link>
                    );
                  })}

                  {topFriends.length > 2 && (
                    <button
                      className="text-[10px] text-navy mt-1 ml-2"
                      style={{ textDecoration: 'underline', background: 'none', border: 'none', padding: 0 }}
                      onClick={() => setShowAllFriends((prev) => !prev)}
                    >
                      {showAllFriends ? '<' : '>'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Center Content ────────────────────────────────────────────────── */}
            {/* Profile view */}
            {activeView === 'profile' && (
              <div className="card mb-4">
                <div className="card-body">
                  <h5 className="card-title text-navy">Profile Info</h5>
                  <div className="d-flex align-items-center mb-3">
                    <img
                      src={logo}
                      alt="Profile"
                      className="rounded-circle me-3"
                      style={{ width: '60px', height: '60px', border: '2px solid var(--purple)' }}
                    />
                    <div>
                      <p className="mb-1">
                        <strong>Username:</strong> {user.username}
                      </p>
                      <p className="mb-1">
                        <strong>Email:</strong> {user.email || 'Not provided'}
                      </p>
                    </div>
                  </div>
                  <button className="btn btn-outline-primary me-2" onClick={handleMyProfile}>
                    Refresh Profile
                  </button>
                  <button className="btn btn-link" onClick={() => setEditProfile(true)} disabled={!activeView}>
                    Edit Profile
                  </button>
                </div>
              </div>
            )}

            {/* Verify view */}
            {activeView === 'verify' && (
              <div className="card mb-4">
                <div className="card-body">
                  <h5 className="card-title text-navy">Profile & Verify</h5>
                  <div className="d-flex align-items-center mb-3">
                    <img
                      src={logo}
                      alt="Profile"
                      className="rounded-circle me-3"
                      style={{ width: '60px', height: '60px', border: '2px solid var(--purple)' }}
                    />
                    <div>
                      <p className="mb-1">
                        <strong>Username:</strong> {user.username}
                      </p>
                      <p className="mb-1">
                        <strong>Email:</strong> {user.email || 'Not provided'}
                      </p>
                    </div>
                  </div>
                  <button className="btn btn-success">Get Verified</button>
                </div>
              </div>
            )}

            {/* My Players or My Friends graph */}
            {(activeView === 'players' || activeView === 'friends') && (
              <>
                <h5 className="text-navy">
                  {activeView === 'players' ? 'Liked Athletes Graph' : 'Friends Graph'}
                </h5>
                <div
                  className="border rounded mb-4"
                  style={{ height: '400px', overflow: 'hidden', borderColor: 'var(--purple)' }}
                >
                  <div ref={cyContainerRef} style={{ height: '100%', width: '100%' }} />
                </div>
                <p className="text-muted small">Click on nodes to see details in the right panel →</p>
              </>
            )}

            {/* Explore graph */}
            {activeView === 'explore' && filterType && (
              <>
                <h5 className="text-navy">{`Explore: ${filterType}`}</h5>
                <div
                  className="border rounded mb-4"
                  style={{ height: '400px', overflow: 'hidden', borderColor: 'var(--purple)' }}
                >
                  <div ref={cyContainerRef} style={{ height: '100%', width: '100%' }} />
                </div>
                <p className="text-muted small">Click on nodes to see details in the right panel →</p>
                {filterType === 'Friends' && (
                  <div className="mt-3">
                    <button
                      className="btn btn-outline-primary me-2"
                      onClick={openFriendSearchPanel}
                    >
                      Search Friends
                    </button>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={fetchSuggestedFriends}
                    >
                      Get Suggestions
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ===== Right Sidebar ===== */}
          <div className="bg-light-purple h-100 overflow-auto" style={{ padding: '1rem', color: 'var(--grey)' }}>
            <div className="container-fluid p-0">
              {editProfile ? (
                // ───── If editing profile, show EditProfileForm in right column ───
                <EditProfileForm
                  user={user}
                  setUser={setUser}
                  onCancel={() => setEditProfile(false)}
                  onSave={(updatedUser) => {
                    setUser(updatedUser);
                    setEditProfile(false);
                  }}
                />
              ) : rightPanelView === 'nodeDetails' && selectedNode ? (
                // ───── Show selected node details ───
                <div className="card">
                  <div className="card-header bg-purple text-grey">
                    <h6 className="mb-0">Node Details</h6>
                    <button
                      className="btn btn-sm btn-outline-light float-end"
                      onClick={() => setRightPanelView('default')}
                    >
                      ×
                    </button>
                  </div>
                  <div className="card-body" style={{ backgroundColor: 'var(--grey)' }}>
                    {Object.entries(selectedNode).map(([key, value]) => (
                      <p key={key} className="text-navy mb-2">
                        <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </p>
                    ))}
                  </div>
                </div>
              ) : rightPanelView === 'personDetails' && selectedPerson ? (
                // ───── Show selected person details ───
                <div className="card">
                  <div className="card-header bg-purple text-grey">
                    <h6 className="mb-0">Person Details</h6>
                    <button
                      className="btn btn-sm btn-outline-light float-end"
                      onClick={() => setRightPanelView('default')}
                    >
                      ×
                    </button>
                  </div>
                  <div className="card-body text-center" style={{ backgroundColor: 'var(--grey)' }}>
                    <img
                      src={selectedPerson.profileImage || logo}
                      alt={selectedPerson.name}
                      className="rounded-circle mb-3"
                      style={{ width: '80px', height: '80px', border: '2px solid var(--purple)' }}
                    />
                    <h6 className="text-navy">{selectedPerson.name}</h6>
                    {selectedPerson.description && (
                      <p className="text-navy small">{selectedPerson.description}</p>
                    )}
                    {selectedPerson.username && (
                      <p className="text-navy small">@{selectedPerson.username}</p>
                    )}
                    <div className="mt-3">
                      <button
                        className="btn btn-outline-primary btn-sm me-2"
                        onClick={() => handleSendFriendRequest(selectedPerson.username || selectedPerson.name)}
                      >
                        Add Friend
                      </button>
                      <Link
                        to={`/profile/${selectedPerson.username || selectedPerson.name}`}
                        className="btn btn-outline-secondary btn-sm"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                </div>
              ) : rightPanelView === 'friendSearch' ? (
                // ───── Show friend search panel ───
                <div className="card">
                  <div className="card-header bg-purple text-grey">
                    <h6 className="mb-0">Find Friends</h6>
                    <button
                      className="btn btn-sm btn-outline-light float-end"
                      onClick={closeFriendSearchPanel}
                    >
                      ×
                    </button>
                  </div>
                  <div className="card-body" style={{ backgroundColor: 'var(--grey)' }}>
                    <div className="mb-3">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search users..."
                        className="form-control form-control-sm"
                      />
                      <button
                        onClick={handleSearch}
                        className="btn btn-primary btn-sm mt-2 w-100"
                      >
                        Search
                      </button>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="mb-3">
                        <h6 className="text-navy">Search Results:</h6>
                        <ul className="list-group list-group-flush">
                          {searchResults.map(result => (
                            <li key={result.id} className="list-group-item d-flex justify-content-between align-items-center bg-light">
                              <span className="text-navy">{result.name || result.username}</span>
                              <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => handleSendFriendRequest(result.username)}
                              >
                                Add
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {friendResults.length > 0 && (
                      <div>
                        <h6 className="text-navy">Your Friends:</h6>
                        <ul className="list-group list-group-flush">
                          {friendResults.map(friend => (
                            <li key={friend.id} className="list-group-item bg-light">
                              <div className="d-flex align-items-center">
                                <img
                                  src={friend.profileImage || logo}
                                  alt={friend.username}
                                  className="rounded-circle me-2"
                                  style={{ width: '30px', height: '30px' }}
                                />
                                <span className="text-navy">{friend.username}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // ───── Default right panel content ───
                <>
                  {/* Membership card */}
                  <div className="card text-center mb-4" style={{ backgroundColor: 'var(--purple)', color: 'var(--grey)' }}>
                    <div className="card-body">
                      <img
                        src={user.profileImage || logo}
                        alt="Profile"
                        className="rounded-circle mb-2"
                        style={{ width: '60px', height: '60px', border: '2px solid var(--pink)' }}
                      />
                      <p className="mb-1">Athlete Spotlight</p>
                      <p style={{ fontSize: '14px' }}>
                        Player of the Day
                      </p>
                      <button className="btn btn-light btn-sm">See Player Profile</button>
                    </div>
                  </div>

                  {/* Events card */}
                  <section className="right-section-card">
                    <header className="d-flex justify-content-between align-items-center mb-3">
                      <h3 className="mb-0">Events</h3>
                      <Link
                        to="/events"
                        className="events-see-all-link"
                      >
                        See all
                      </Link>
                    </header>

                    {upcomingEvents.length > 0 ? (
                      <ul className="events-list">
                        {upcomingEvents.slice(0, 2).map((event, index) => {
                          const eventDate = new Date(event.start.dateTime || event.start);
                          const day = eventDate.getDate();
                          const month = eventDate.toLocaleString('default', { month: 'short' });

                          return (
                            <li key={index} className="events-list-item">
                              <div className="event-date-mini">
                                {day}<br />
                                <small>{month}</small>
                              </div>
                              <div className="event-info">
                                <strong className="event-name">
                                  {event.summary}
                                </strong><br />
                                <small className="event-location">
                                  {event.location || 'Online event'}
                                </small><br />
                                <Link
                                  to={`/events/${event.id || index}`}
                                  className="event-details-link"
                                >
                                  Details
                                </Link>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="events-empty-mini">
                        No upcoming events
                      </div>
                    )}
                  </section>

                  {/* Past Events */}
                  {pastEvents.length > 0 && (
                    <div className="card mb-4">
                      <div className="card-header bg-purple text-grey">
                        <h6 className="mb-0">Past Events</h6>
                      </div>
                      <div className="card-body" style={{ backgroundColor: 'var(--grey)' }}>
                        <ul className="list-unstyled">
                          {pastEvents.slice(0, 3).map((event, index) => (
                            <li key={index} className="mb-2">
                              <strong className="text-navy">{event.eventName || 'Unnamed Event'}</strong><br />
                              <small className="text-navy">
                                {event.year ? Number(event.year.low ?? event.year) : 'Unknown Year'}
                              </small><br />
                              {event.location && <small className="text-navy">{event.location}</small>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Calendar Embed */}
                  <div className="card mb-4">
                    <div className="card-header bg-purple text-grey">
                      <h6 className="mb-0">Calendar</h6>
                    </div>
                    <div className="card-body p-0">
                      <iframe
                        src="https://calendar.google.com/calendar/embed?src=c_e0a01a47aff1ecc1da77e5822cd3d63bc054f441ae359c05fae0552aee58c3cc%40group.calendar.google.com&ctz=America%2FNew_York"
                        style={{ border: 0 }}
                        width="100%"
                        height="300"
                        frameBorder="0"
                        scrolling="no"
                        title="Google Calendar"
                      />
                    </div>
                  </div>

                  {/* Suggested Friends */}
                  <div className="card">
                    <div className="card-header d-flex justify-content-between align-items-center bg-purple text-grey">
                      <span>Suggested Friends</span>
                      <button
                        className="btn btn-sm btn-outline-light"
                        onClick={openFriendSearchPanel}
                      >
                        Search
                      </button>
                    </div>
                    <ul className="list-group list-group-flush">
                      {suggestedFriends.length > 0 ? (
                        suggestedFriends.slice(0, 3).map((person) => (
                          <li
                            key={person.username}
                            className="list-group-item d-flex align-items-center justify-content-between"
                            style={{ backgroundColor: 'var(--grey)' }}
                          >
                            <div className="d-flex align-items-center">
                              <img
                                src={person.profileImage || 'https://i.pravatar.cc/150?img=5'}
                                alt={person.username}
                                className="rounded-circle me-2"
                                style={{ width: '40px', height: '40px', border: '2px solid var(--purple)' }}
                              />
                              <div>
                                <div className="text-navy"><strong>{person.username}</strong></div>
                                <div className="text-navy small">Suggested for you</div>
                              </div>
                            </div>
                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => handleSendFriendRequest(person.username)}
                            >
                              Add
                            </button>
                          </li>
                        ))
                      ) : (
                        <li className="list-group-item text-center" style={{ backgroundColor: 'var(--grey)' }}>
                          <span className="text-navy">No suggestions.</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </Split>
      </Split>
    </div>
  );
}

export default HomePage;