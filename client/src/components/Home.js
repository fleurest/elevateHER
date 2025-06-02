import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Split from 'react-split';
import cytoscape from 'cytoscape';
import logo from '../assets/logo-default-profile.png';
import EditProfileForm from './EditProfileForm';
import '../style.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import coseBilkent from 'cytoscape-cose-bilkent';

cytoscape.use(coseBilkent);

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

function getWikipediaImageUrl(name) {
  if (!name) return null;
  const safeName = name.replace(/ /g, '_');
  const wikiUrl = `https://en.wikipedia.org/wiki/Special:FilePath/${safeName}.jpg`;
  return `${API_BASE}/api/image-proxy?url=${encodeURIComponent(wikiUrl)}`;
}

function getAvatarSrc(src) {
  if (
    src &&
    (src.includes('afl.com.au') || src.includes('wikipedia.org'))
  ) {
    return `${API_BASE}/api/image-proxy?url=${encodeURIComponent(src)}`;
  }
  return src || logo;
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
  const [spotlightAthlete, setSpotlightAthlete] = useState(null);
  const [likeMessage, setLikeMessage] = useState('');
  const [loading, setLoading] = useState(false);

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
    fetch(`${API_BASE}/api/athletes?random=true&athleteCount=1`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setSpotlightAthlete(data[0]);
        else setSpotlightAthlete(null);
      })
      .catch(() => setSpotlightAthlete(null));
  }, []);

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

  const handleSpotlightProfile = (athleteObj) => {
    const athlete = athleteObj || spotlightAthlete;
    if (!athlete) return;
    setActiveView('spotlightPlayer');
    setSelectedPerson({
      name: athlete.name,
      description: athlete.description,
      profileImage: athlete.profileImage,
      username: athlete.username,
      email: athlete.email,
      location: athlete.nationality || athlete.location || '',
      sport: athlete.sport,
      gender: athlete.gender,
      uuid: athlete.uuid
    });
    setRightPanelView('personDetails');
    setEditProfile(false);
    setCenterGraphData(null);
    setFilterType(null);
    setSelectedNode(null);
  };

  const handleFeelingSporty = () => {
    fetch(`${API_BASE}/api/athletes?random=true&athleteCount=1`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSpotlightAthlete(data[0]);
          handleSpotlightProfile(data[0]);
        }
      });
  };


  const handleLikePlayer = async (username) => {
    try {
      const res = await fetch(`${API_BASE}/api/users/likes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          athleteName: username,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setLikeMessage('Player Liked!');
        setTimeout(() => setLikeMessage(''), 2000);

        if (activeView === 'players') {
          handleMyPlayers();
        }
      } else {
        setLikeMessage(data.error || 'Could not like player.');
        setTimeout(() => setLikeMessage(''), 2000);
      }
    } catch (err) {
      setLikeMessage('Error liking player.');
      setTimeout(() => setLikeMessage(''), 2000);
    }
  };



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
      const res = await fetch(`${API_BASE}/api/users/friend-request`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fromUsername: user.username,
          toUsername: username
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log('Friend request sent:', data);

      alert(`Friend request sent to ${username}!`);

    } catch (err) {
      console.error('Error sending friend request:', err);
      alert('Failed to send friend request. Please try again.');
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


  const handleExplore = async (category) => {
    setActiveView('explore');
    setEditProfile(false);
    setFilterType(category);
    setRightPanelView('default');
    setSelectedNode(null);
    setSelectedPerson(null);

    console.log(`🔍 Exploring: ${category}`);

    if (category === 'Player') {
      try {
        const res = await fetch(
          `${API_BASE}/api/athletes?random=true&athleteCount=1`,
          { credentials: 'include' }
        );

        if (!res.ok) throw new Error(`Failed: ${res.status}`);

        const athletes = await res.json();

        if (athletes && athletes.length > 0) {
          const athlete = athletes[0];
          console.log('🏃‍♂️ Found athlete:', athlete);

          const playerData = {
            nodes: [{
              data: {
                id: athlete.uuid || 'athlete-1',
                label: athlete.name || 'Unknown Athlete',
                name: athlete.name,
                sport: athlete.sport,
                nationality: athlete.nationality,
                type: 'athlete',
                profileImage: athlete.profileImage,
                roles: athlete.roles
              }
            }],
            edges: []
          };

          setCenterGraphData(playerData);

          setSelectedPerson({
            name: athlete.name,
            sport: athlete.sport,
            nationality: athlete.nationality,
            profileImage: athlete.profileImage
          });
          setRightPanelView('personDetails');

          console.log('✅ Player data set');
        }

      } catch (error) {
        console.error('Player error:', error);
        setCenterGraphData(null);
      }

    } else if (category === 'Friends') {
      try {
        // Friends explore
        console.log('🤝 Loading friends...');

        // Get general graph data
        const res = await fetch(`${API_BASE}/api/graph?limit=50`, {
          credentials: 'include'
        });

        if (!res.ok) throw new Error(`Failed: ${res.status}`);

        const data = await res.json();
        console.log('📊 Graph data received:', data);

        // Filter for person/user nodes
        const peopleNodes = (data.nodes || []).filter(node => {
          const nodeData = node.data || node;
          const label = nodeData.label || '';
          const type = nodeData.type || '';
          const roles = nodeData.roles || [];

          return (
            label === 'Person' ||
            type === 'user' ||
            type === 'person' ||
            roles.includes('user') ||
            label.includes('@')
          );
        });

        console.log(`👥 Found ${peopleNodes.length} people nodes`);

        if (peopleNodes.length > 0) {
          // Get connections between people
          const nodeIds = new Set(peopleNodes.map(n => (n.data || n).id));
          const peopleEdges = (data.edges || []).filter(edge => {
            const edgeData = edge.data || edge;
            return nodeIds.has(edgeData.source) && nodeIds.has(edgeData.target);
          });

          const friendsData = {
            nodes: peopleNodes,
            edges: peopleEdges
          };

          setCenterGraphData(friendsData);
          console.log(`Friends network: ${peopleNodes.length} nodes, ${peopleEdges.length} edges`);
        } else {
          // No people found, create placeholder
          console.log('No people nodes found, creating placeholder');
          setCenterGraphData({
            nodes: [{
              data: {
                id: 'placeholder-1',
                label: 'No Friends Found',
                name: 'Add some friends to see them here!',
                type: 'placeholder'
              }
            }],
            edges: []
          });
        }

      } catch (error) {
        console.error('Friends error:', error);
        setCenterGraphData(null);
      }

    } else {
      setCenterGraphData(null);
    }
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
      
      if (centerGraphData) {
        console.log('🎯 Using centerGraphData for explore:', centerGraphData);
        dataToRender = {
          nodes: centerGraphData.nodes || [],
          edges: centerGraphData.edges || []
        };
      } else if (graphData && filterType) {
        console.log(`Filtering graphData for: ${filterType}`);
        
        let nodes = [];
        
        if (filterType === 'Friends') {
          // Filter for user/person nodes
          nodes = (graphData.nodes || []).filter(n => {
            const nodeData = n.data || n;
            return (
              nodeData.type === 'user' ||
              nodeData.label === 'Person' ||
              (nodeData.roles && nodeData.roles.includes('user')) ||
              nodeData.label?.includes('@')
            );
          });
        } else if (filterType === 'Player') {
          // Filter for athlete nodes
          nodes = (graphData.nodes || []).filter(n => {
            const nodeData = n.data || n;
            return (
              nodeData.type === 'athlete' ||
              (nodeData.roles && nodeData.roles.includes('athlete')) ||
              nodeData.sport
            );
          });
        } else {
          nodes = (graphData.nodes || []).filter(n => {
            const nodeData = n.data || n;
            return nodeData.label === filterType || nodeData.type === filterType.toLowerCase();
          });
        }
        
        console.log(`📊 Filtered nodes: ${nodes.length} for ${filterType}`);
        
        if (nodes.length > 0) {
          const nodeIds = new Set(nodes.map(n => (n.data || n).id));
          const edges = (graphData.edges || []).filter(e => {
            const edgeData = e.data || e;
            return nodeIds.has(edgeData.source) && nodeIds.has(edgeData.target);
          });
          
          dataToRender = { nodes, edges };
          console.log(`Explore data: ${nodes.length} nodes, ${edges.length} edges`);
        } else {
          console.log(`No nodes found for filter: ${filterType}`);
          dataToRender = { nodes: [], edges: [] };
        }
      } else {
        console.log('No graphData or filterType available');
        return;
      }
    }
  
    if (!dataToRender || dataToRender.nodes.length === 0) {
      console.log('No data to render, dataToRender:', dataToRender);
      return;
    }
  
    console.log('Rendering Cytoscape with data:', dataToRender);
  
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
  
        cy.on('tap', 'node', (evt) => {
          const nodeData = evt.target.data();
  
          cy.elements().addClass('faded');
          evt.target.removeClass('faded');
          evt.target.connectedEdges().removeClass('faded');
          evt.target.connectedEdges().connectedNodes().removeClass('faded');
          cy.center(evt.target);
          cy.zoom({ level: 2, position: evt.target.position() });
  
          // Update right panel based on node type
          if (nodeData.label === "Person" || nodeData.type === "user" || nodeData.type === "athlete") {
            setSelectedPerson({
              name: nodeData.name || nodeData.label,
              description: nodeData.description,
              profileImage: nodeData.profileImage || nodeData.image,
              username: nodeData.username,
              sport: nodeData.sport,
              nationality: nodeData.nationality,
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
            <div className="profile-panel" style={{ marginTop: 0 }}>
              <h3 style={{ marginBottom: "16px", textAlign: "center", letterSpacing: "0.5px" }}>My Friends</h3>
              <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
                {topFriends.length === 0 ? (
                  <span className="text-navy" style={{ fontSize: "14px" }}>No friends yet!</span>
                ) : (
                  topFriends.slice(0, 5).map((friend, index) => (
                    <Link
                      key={friend.username || friend.uuid || friend.email || `top-friend-${index}`}
                      to={`/profile/${encodeURIComponent(friend.username || friend.email || friend.uuid)}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        width: "64px"
                      }}
                    >
                      <img
                        src={getAvatarSrc(friend.profileImage, API_BASE, logo)}
                        alt={friend.username || 'Friend'}
                        className="small-logo"
                        style={{
                          marginBottom: "6px",
                          border: "2px solid var(--purple)",
                          width: "64px",
                          height: "64px",
                          objectFit: "cover",
                          borderRadius: "50%"
                        }}
                      />
                      <span
                        style={{
                          fontSize: "11px",
                          textAlign: "center",
                          width: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: "var(--navy)"
                        }}
                      >
                        {friend.username || 'Unknown'}
                      </span>
                    </Link>
                  ))
                )}
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
                <h5 className="text-navy">Explore: {filterType}</h5>

                {/* Debug info */}
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                  marginBottom: '10px',
                  padding: '5px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '3px'
                }}>
                  Debug: {centerGraphData ?
                    `${centerGraphData.nodes?.length || 0} nodes, ${centerGraphData.edges?.length || 0} edges` :
                    'No data loaded'
                  }
                </div>

                <div
                  className="border rounded mb-4"
                  style={{ height: '400px', overflow: 'hidden', borderColor: 'var(--purple)' }}
                >
                  <div ref={cyContainerRef} style={{ height: '100%', width: '100%' }} />
                </div>

                <div className="mt-3">
                  <button
                    className="btn btn-outline-primary me-2"
                    onClick={() => handleExplore(filterType)}
                  >
                    🔄 Refresh {filterType}
                  </button>
                  {filterType === 'Player' && (
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => handleExplore('Player')}
                    >
                      🎲 New Random Player
                    </button>
                  )}
                </div>
              </>
            )}
            {activeView === 'spotlightPlayer' && selectedPerson && (
              <div className="card mb-4">
                <div className="card-body text-center">
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#fff",
                      border: "2px solid var(--purple)",
                      borderRadius: "12px",
                      overflow: "hidden"
                    }}
                  >
                    <img
                      src={
                        selectedPerson.profileImage
                          ? getAvatarSrc(selectedPerson.profileImage, API_BASE, logo)
                          : getWikipediaImageUrl(selectedPerson.name)
                      }
                      alt={selectedPerson.name}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                        borderRadius: 0
                      }}
                    />
                  </div>
                  <h5 className="text-navy">{selectedPerson.name}</h5>
                  <p className="mb-1"><strong>Sport:</strong> {selectedPerson.sport || 'N/A'}</p>
                  <p className="mb-1"><strong>Location:</strong> {selectedPerson.location || 'N/A'}</p>
                  <p className="mb-1"><strong>Gender:</strong> {selectedPerson.gender || 'N/A'}</p>
                  {selectedPerson.description && <p>{selectedPerson.description}</p>}
                  {selectedPerson.username && (
                    <Link
                      to={`/profile/${selectedPerson.username}`}
                      className="btn btn-outline-secondary btn-sm mt-2"
                    >
                      View Full Profile
                    </Link>
                  )}
                </div>
              </div>
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
                    {Object.entries(selectedNode).map(([key, value], index) => (
                      <p key={`node-detail-${key}-${index}`} className="text-navy mb-2">
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
                    {likeMessage && (
                      <div style={{
                        margin: "8px 0",
                        color: "green",
                        fontWeight: "bold",
                        fontSize: "13px"
                      }}>
                        {likeMessage}
                      </div>
                    )}

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
                        onClick={() => handleLikePlayer(selectedPerson.username || selectedPerson.name)}
                      >
                        Like Player
                      </button>

                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={handleFeelingSporty}
                      >
                        Scout's Choice
                      </button>
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
                          {searchResults.map((result, index) => (
                            <li
                              key={result.id || result.username || result.email || `search-${index}`}
                              className="list-group-item d-flex justify-content-between align-items-center bg-light"
                            >
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
                          {friendResults.map((friend, index) => (
                            <li
                              key={friend.id || friend.username || friend.email || `friend-result-${index}`}
                              className="list-group-item bg-light"
                            >
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
                  {/* Random Athlete card */}
                  <div className="card text-center mb-4" style={{ backgroundColor: 'var(--purple)', color: 'var(--grey)' }}>
                    <div className="card-body">
                      {spotlightAthlete ? (
                        <>
                          <img
                            src={getAvatarSrc(spotlightAthlete.profileImage, API_BASE, logo)}
                            alt={spotlightAthlete.name}
                            className="rounded-circle mb-2"
                            style={{ width: '60px', height: '60px', border: '2px solid var(--pink)' }}
                          />
                          <p className="mb-1">Athlete Spotlight</p>
                          <p style={{ fontSize: '14px' }}>Player of the Day</p>
                          <p style={{ fontSize: '13px', marginBottom: 0 }}>
                            <strong>{spotlightAthlete.name}</strong> <span style={{ fontStyle: 'italic' }}>{spotlightAthlete.sport || ''}</span>
                          </p>
                          <button
                            className="btn btn-light btn-sm mt-2"
                            onClick={handleSpotlightProfile}
                          >
                            See Player Profile
                          </button>

                        </>
                      ) : (
                        <>
                          <img
                            src={logo}
                            alt="Profile"
                            className="rounded-circle mb-2"
                            style={{ width: '60px', height: '60px', border: '2px solid var(--pink)' }}
                          />
                          <p className="mb-1">Athlete Spotlight</p>
                          <p style={{ fontSize: '14px' }}>Player of the Day</p>
                        </>
                      )}
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
                            <li key={event.id || event.summary || `upcoming-${index}`} className="events-list-item">
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
                            <li key={event.id || event.eventName || `past-${index}`} className="mb-2">
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
                        suggestedFriends.slice(0, 3).map((person, index) => (
                          <li
                            key={person.username || person.id || person.email || `suggested-${index}`}
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
                        <li key="no-suggestions" className="list-group-item text-center" style={{ backgroundColor: 'var(--grey)' }}>
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