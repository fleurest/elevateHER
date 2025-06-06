import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Split from 'react-split';
import cytoscape from 'cytoscape';
import logo from '../assets/logo-default-profile.png';
import EditProfileForm from './EditProfileForm';
import '../style.css';
import Search from './Search';

import coseBilkent from 'cytoscape-cose-bilkent';

cytoscape.use(coseBilkent);

const BASE_URL = process.env.BASE_URL;
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
    (src.includes('afl.com.au') ||
      src.includes('wikipedia.org') ||
      src.includes('wikimedia.org'))
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

  // activeView: 'profile' | 'players' | 'friends' | 'verify' | 'explore' | 'spotlightPlayer' | 'viewingLikedPlayers'
  const [activeView, setActiveView] = useState('profile');

  // If editing profile, show EditProfileForm in right column
  const [editProfile, setEditProfile] = useState(false);

  // Top friends for the icon bar
  const [topFriends, setTopFriends] = useState([]);
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState([]);

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
  const [likedPlayerNames, setLikedPlayerNames] = useState([]);
  const [friendUsernames, setFriendUsernames] = useState([]);

  // Friend search functionality
  const [showAddFriendPanel, setShowAddFriendPanel] = useState(false);
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [friendResults, setFriendResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friendStatus, setFriendStatus] = useState(null);

  // Right panel view state: 'default' | 'nodeDetails' | 'personDetails' | 'friendSearch' | 'userProfile'
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

  const fetchTopFriends = async () => {
    if (!user?.username) return;
    try {
      const res = await fetch(`${API_BASE}/api/users/friends/${user.username}`, { credentials: 'include' });
      const data = await res.json();
      setTopFriends(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading top friends:', err);
    }
  };

  // Fetch top friends for icon bar
  useEffect(() => {
    fetchTopFriends();
  }, [user?.username]);

  useEffect(() => {
    if (!user?.username) return;

    fetch(`${API_BASE}/api/users/likes/${user.username}`)
      .then(res => res.json())
      .then(data => setLikedPlayerNames(Array.isArray(data) ? data.map(p => p.name) : []))
      .catch(err => console.error('Error loading liked players:', err));

    fetch(`${API_BASE}/api/users/pending-incoming/${user.username}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setIncomingRequests(Array.isArray(data?.incoming) ? data.incoming : []);
      })
      .catch(err => console.error('Error loading incoming requests:', err));
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
      uuid: athlete.uuid,
      isAthlete: true
    });
    setRightPanelView('personDetails');
    setEditProfile(false);
    setCenterGraphData(null);
    setFilterType(null);
    setSelectedNode(null);
  };

  // When a top friend is clicked, show their profile in the right panel
  const handleTopFriendClick = (friend) => {
    if (!friend) return;
    setSelectedPerson({
      name: friend.name || friend.username,
      username: friend.username,
      email: friend.email,
      profileImage: friend.profileImage,
      location: friend.location,
    });
    setRightPanelView('userProfile');
    setEditProfile(false);
    setFriendStatus(null);
    fetch(`${API_BASE}/api/users/friend-status/${user.username}/${friend.username}`)
      .then(res => res.json())
      .then(data => setFriendStatus(data.status))
      .catch(err => {
        console.error('Error fetching friend status:', err);
        setFriendStatus('unknown');
      });
  };


  const handleDashboardClick = () => {
    const baseUrl = process.env.BASE_URL;
    if (baseUrl) {
      const fullUrl = `${BASE_URL}/dashboard`;
      window.location.href = fullUrl;
    } else {
      console.error("BASE_URL is not defined in the environment.");
    }
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

        setLikedPlayerNames(prev => Array.from(new Set([...prev, username])));

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

  const handleUnlikePlayer = async (username) => {
    try {
      const res = await fetch(`${API_BASE}/api/users/likes`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteName: username })
      });
      if (res.ok) {
        setLikedPlayerNames(prev => prev.filter(n => n !== username));
        setLikeMessage('Player Unliked!');
        setTimeout(() => setLikeMessage(''), 2000);
      } else {
        const data = await res.json();
        setLikeMessage(data.error || 'Could not unlike player.');
        setTimeout(() => setLikeMessage(''), 2000);
      }
    } catch (err) {
      setLikeMessage('Error unliking player.');
      setTimeout(() => setLikeMessage(''), 2000);
    }
  };

  const handleSearch = async () => {
    try {
      // Check authentication first
      if (!user || !user.username) {
        alert('Please log in to search for users');
        navigate('/login');
        return;
      }

      const res = await fetch(`${API_BASE}/api/users/search?query=${encodeURIComponent(searchQuery)}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (res.status === 401) {
        alert('Your session has expired. Please log in again.');
        navigate('/login');
        return;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Search error:', res.status, errorText);
        throw new Error(`Search failed: ${res.status}`);
      }

      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Search error:', err);
      alert('Search failed. Please try again.');
      setSearchResults([]);
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

  const handleAcceptRequest = async (fromUsername) => {
    try {
      const res = await fetch(`${API_BASE}/api/users/accept`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUsername, toUsername: user.username })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setIncomingRequests(prev => prev.filter(u => u !== fromUsername));
      fetchTopFriends();
    } catch (err) {
      console.error('Error accepting friend request:', err);
    }
  };

  const handleRejectRequest = async (fromUsername) => {
    try {
      const res = await fetch(`${API_BASE}/api/users/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUsername, toUsername: user.username })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setIncomingRequests(prev => prev.filter(u => u !== fromUsername));
    } catch (err) {
      console.error('Error rejecting friend request:', err);
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

  const checkSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/session`, { credentials: 'include' });
      if (!res.ok) {
        console.log('Session invalid, redirecting to login');
        navigate('/login');
        return false;
      }
      return true;
    } catch (err) {
      console.error('Session check failed:', err);
      navigate('/login');
      return false;
    }
  };

  // Add friend search functionality for Friends explore
  const handleFriendDiscoverySearch = async (query) => {
    setLoading(true);
    try {
      console.log('🔍 Searching for friends:', query);

      if (!user || !user.username) {
        console.error('User not authenticated');
        alert('Please log in again to search for friends');
        navigate('/login');
        return;
      }

      if (!query || query.trim().length === 0) {
        alert('Please enter a username to search');
        return;
      }

      const res = await fetch(`${API_BASE}/api/users/search?query=${encodeURIComponent(query.trim())}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (res.status === 401) {
        console.error('Authentication failed - redirecting to login');
        const sessionValid = await checkSession();
        if (!sessionValid) return;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Search API Error:', res.status, errorText);

        if (res.status === 404) {
          console.log('Search endpoint not found, falling back to suggested friends');
          handleExplore('Friends');
          alert('Search feature is not available. Showing suggested friends instead.');
          return;
        }

        throw new Error(`Search failed: ${res.status} - ${errorText}`);
      }

      const searchResults = await res.json();
      console.log('Friend search results:', searchResults);

      // Handle empty results
      if (!Array.isArray(searchResults) || searchResults.length === 0) {
        console.log('No search results found');
        setCenterGraphData({
          nodes: [{
            data: {
              id: 'no-results',
              label: 'No Results',
              name: `No users found for "${query}"`,
              type: 'placeholder'
            }
          }],
          edges: []
        });
        return;
      }

      // Transform search results to cytoscape format
      const nodes = searchResults.map((searchResult, index) => ({
        data: {
          id: searchResult.uuid || searchResult.username || searchResult.email || `search-${index}`,
          label: 'Person',
          name: searchResult.name || searchResult.username,
          username: searchResult.username,
          email: searchResult.email,
          profileImage: searchResult.profileImage,
          location: searchResult.location,
          type: 'user',
          roles: ['user'],
          ...searchResult
        }
      }));

      setCenterGraphData({
        nodes: nodes,
        edges: []
      });

      console.log(`Friend search: ${nodes.length} users found`);
    } catch (err) {
      console.error('Friend search error:', err);

      if (err.message.includes('401')) {
        alert('Authentication failed. Please log in again.');
        navigate('/login');
      } else if (err.message.includes('404')) {
        alert('Search service is not available. Showing suggested friends instead.');
        handleExplore('Friends');
      } else {
        alert('Search failed. Please check your connection and try again.');
      }

      // Show error state in graph
      setCenterGraphData({
        nodes: [{
          data: {
            id: 'search-error',
            label: 'Search Error',
            name: 'Search temporarily unavailable',
            type: 'placeholder'
          }
        }],
        edges: []
      });
    } finally {
      setLoading(false);
    }
  };

  // Add function to explore connections around a specific athlete
  const handleExploreAthleteConnections = async (athlete) => {
    try {
      console.log('🔍 Exploring connections for:', athlete.name);
      setLoading(true);

      // Get 2-hop connections from the general graph and filter around the athlete
      const res = await fetch(`${API_BASE}/api/graph?limit=150`, {
        credentials: 'include'
      });

      if (!res.ok) throw new Error(`Failed: ${res.status}`);

      const data = await res.json();
      console.log('📊 Graph data received, looking for athlete:', athlete.name);

      // Find the athlete in the graph
      const athleteNode = data.nodes.find(node => {
        const nodeData = node.data || node;
        return nodeData.name === athlete.name ||
          nodeData.id === athlete.uuid ||
          nodeData.label === athlete.name ||
          (nodeData.name && athlete.name &&
            nodeData.name.toLowerCase() === athlete.name.toLowerCase());
      });

      if (athleteNode) {
        // Get all nodes connected to this athlete (1-hop)
        const athleteId = (athleteNode.data || athleteNode).id;
        const connectedEdges = data.edges.filter(edge => {
          const edgeData = edge.data || edge;
          return edgeData.source === athleteId || edgeData.target === athleteId;
        });

        // Get all connected node IDs (1-hop)
        const connectedNodeIds = new Set([athleteId]);
        connectedEdges.forEach(edge => {
          const edgeData = edge.data || edge;
          connectedNodeIds.add(edgeData.source);
          connectedNodeIds.add(edgeData.target);
        });

        // Now get 2-hop: find nodes connected to the 1-hop nodes
        const twoHopEdges = data.edges.filter(edge => {
          const edgeData = edge.data || edge;
          return connectedNodeIds.has(edgeData.source) || connectedNodeIds.has(edgeData.target);
        });

        // Collect all relevant node IDs (1-hop + 2-hop)
        const allRelevantNodeIds = new Set(connectedNodeIds);
        twoHopEdges.forEach(edge => {
          const edgeData = edge.data || edge;
          allRelevantNodeIds.add(edgeData.source);
          allRelevantNodeIds.add(edgeData.target);
        });

        // Filter nodes to include
        const relevantNodes = data.nodes.filter(node => {
          const nodeData = node.data || node;
          return allRelevantNodeIds.has(nodeData.id);
        });

        setCenterGraphData({
          nodes: relevantNodes,
          edges: twoHopEdges
        });

        console.log(`Player network: ${relevantNodes.length} nodes, ${twoHopEdges.length} edges`);
      } else {
        console.log('Athlete not found in graph, showing original athlete only');
        setCenterGraphData({
          nodes: [{
            data: {
              id: athlete.uuid || 'selected-athlete',
              label: athlete.name,
              name: athlete.name,
              sport: athlete.sport,
              nationality: athlete.nationality,
              type: 'athlete',
              profileImage: athlete.profileImage,
              roles: ['athlete']
            }
          }],
          edges: []
        });
      }

    } catch (error) {
      console.error('Error exploring athlete connections:', error);
      alert('Could not load athlete connections');
    } finally {
      setLoading(false);
    }
  };

  const handleExploreSponsorRelationships = (sponsor) => {
    if (!graphData) return;

    const sponsorId = sponsor.id;
    const sponsorEdges = graphData.edges.filter((edge) => {
      const e = edge.data || edge;
      return (
        e.label === 'sponsored by' &&
        (e.source === sponsorId || e.target === sponsorId)
      );
    });

    const nodeIds = new Set([sponsorId]);
    sponsorEdges.forEach((edge) => {
      const e = edge.data || edge;
      nodeIds.add(e.source);
      nodeIds.add(e.target);
    });

    const nodes = graphData.nodes.filter((n) => {
      const d = n.data || n;
      return nodeIds.has(d.id);
    });

    setCenterGraphData({ nodes, edges: sponsorEdges });
  };

  const handleNewRandomPlayerForExplore = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/athletes?random=true&athleteCount=1`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setSpotlightAthlete(data[0]);

        setTimeout(() => handleExplore('Player'), 300);
      }
    } catch (err) {
      console.error('Error getting new random athlete:', err);
    }
  };

  const handleViewLikedPlayers = async (email) => {
    try {
      console.log('👀 Loading liked players for:', email);

      if (!email) {
        console.error('No user identifier provided');
        alert('Cannot load liked players - missing identifier');
        return;
      }

      const res = await fetch(
        `${API_BASE}/api/graph/liked/${encodeURIComponent(email)}`,
        { credentials: 'include' }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', res.status, errorText);
        throw new Error(`Error ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      console.log('Liked players response:', data);

      setActiveView('viewingLikedPlayers');
      setCenterGraphData(data);


      setRightPanelView('default');
      setFriendStatus(null);

    } catch (err) {
      console.error('Error fetching liked players:', err);
      alert('Could not load their liked players');
    }
  };

  // ─── Left‐Menu Handlers ───────────────────────────────────────────────────────

  const handleMyProfile = () => {
    setActiveView('profile');
    setEditProfile(false);
    setCenterGraphData(null);
    setFilterType(null);
    setRightPanelView('default');
    setFriendStatus(null);
    setSelectedNode(null);
    setSelectedPerson(null);
  };

  const handleMyPlayers = async () => {
    setActiveView('players');
    setEditProfile(false);
    setFilterType(null);
    setRightPanelView('default');
    setFriendStatus(null);
    setSelectedNode(null);
    setSelectedPerson(null);

    try {
      // Use email if available, fallback to username
      if (!user.email) {
        throw new Error('No email available for current user');
      }
      const encodedEmail = encodeURIComponent(user.email);
      console.log('Using email:', user.email);
      console.log('Encoded email:', encodedEmail);
      console.log('Full URL:', `${API_BASE}/api/graph/liked/${encodedEmail}`);

      const res = await fetch(
        `${API_BASE}/api/graph/liked/${encodedEmail}`,
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
      if (data.nodes) {
        const likedNames = data.nodes
          .filter(n => n.data?.type === 'athlete' || n.type === 'athlete')
          .map(n => (n.data?.name || n.name));
        setLikedPlayerNames(likedNames);
      }
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
    setFriendStatus(null);
    setSelectedNode(null);
    setSelectedPerson(null);

    try {
      if (!user.email) {
        throw new Error('No email available for current user');
      }

      const encodedEmail = encodeURIComponent(user.email); const res = await fetch(
        `${API_BASE}/api/graph/friends/${encodedEmail}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setCenterGraphData(data);
      if (data.nodes) {
        const friends = data.nodes
          .filter(n => n.data?.username)
          .map(n => n.data?.username || n.username);
        setFriendUsernames(friends);
      }
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
    setFriendStatus(null);
    setSelectedNode(null);
    setSelectedPerson(null);
  };

  const handleExplore = async (category) => {
    setActiveView('explore');
    setEditProfile(false);
    setFilterType(category);
    setRightPanelView('default');
    setFriendStatus(null);
    setSelectedNode(null);
    setSelectedPerson(null);

    if (category !== 'Friends') {
      setSearchQuery('');
    }

    console.log(`🔍 Exploring: ${category}`);

    if (category === 'Player') {
      try {
        console.log('🏃‍♂️ Loading Player explore with 15 athletes...');

        // Fetch 15 random athletes as starting point
        const res = await fetch(`${API_BASE}/api/athletes?random=true&athleteCount=15`, {
          credentials: 'include'
        });

        if (!res.ok) throw new Error(`Failed: ${res.status}`);

        const athletesData = await res.json();
        console.log('📊 Athletes data received:', athletesData);

        if (Array.isArray(athletesData) && athletesData.length > 0) {
          // Transform athletes to cytoscape format
          const athleteNodes = athletesData.map((athlete, index) => ({
            data: {
              id: athlete.uuid || `athlete-${index}`,
              label: athlete.name,
              name: athlete.name,
              sport: athlete.sport,
              nationality: athlete.nationality,
              type: 'athlete',
              profileImage: athlete.profileImage,
              roles: ['athlete'],
              username: athlete.username,
              email: athlete.email,
              description: athlete.description,
              gender: athlete.gender,
              alternateName: athlete.alternateName,
              ...athlete
            }
          }));

          // Show athletes as individual nodes (no connections initially)
          setCenterGraphData({
            nodes: athleteNodes,
            edges: []
          });

          console.log(`Player explore: ${athleteNodes.length} athletes loaded`);
        } else {
          console.log('No athletes returned from API');
          setCenterGraphData({
            nodes: [{
              data: {
                id: 'no-athletes',
                label: 'No Athletes Found',
                name: 'No athletes available',
                type: 'placeholder'
              }
            }],
            edges: []
          });
        }

      } catch (error) {
        console.error('Player error:', error);
        // Fallback: use spotlight athlete if API fails
        if (spotlightAthlete) {
          console.log('Using fallback spotlight athlete');
          setCenterGraphData({
            nodes: [{
              data: {
                id: spotlightAthlete.uuid || 'spotlight-athlete',
                label: spotlightAthlete.name,
                name: spotlightAthlete.name,
                sport: spotlightAthlete.sport,
                nationality: spotlightAthlete.nationality,
                type: 'athlete',
                profileImage: spotlightAthlete.profileImage,
                roles: ['athlete']
              }
            }],
            edges: []
          });
        } else {
          setCenterGraphData(null);
        }
      }

    } else if (category === 'Friends') {
      try {
        console.log('🤝 Loading Friend Suggestions...');

        const res = await fetch(`${API_BASE}/api/users/top?limit=15`, {          credentials: 'include'
        });

        if (!res.ok) {
          console.log('Suggested friends API failed, using fallback');
          const generalRes = await fetch(`${API_BASE}/api/graph?limit=100`, {
            credentials: 'include'
          });

          if (!generalRes.ok) throw new Error(`Failed: ${generalRes.status}`);

          const generalData = await generalRes.json();

          // Filter for Person nodes with roles = user (potential friends)
          const userNodes = generalData.nodes.filter(node => {
            const nodeData = node.data || node;
            const roles = nodeData.roles || [];
            const label = nodeData.label || '';
            return label === 'Person' && roles.includes('user');
          });

          // No edges for friend suggestions - just show the users
          setCenterGraphData({
            nodes: userNodes,
            edges: []
          });

          console.log(`Friend suggestions (fallback): ${userNodes.length} user nodes`);
        } else {
          const suggestedUsers = await res.json();
          console.log('Suggested friends response:', suggestedUsers);

          // Transform suggested users to cytoscape format
          const nodes = suggestedUsers.map((suggestedUser, index) => ({
            data: {
              id: suggestedUser.uuid || suggestedUser.username || suggestedUser.email || `suggested-${index}`,
              label: 'Person',
              name: suggestedUser.name || suggestedUser.username,
              username: suggestedUser.username,
              email: suggestedUser.email,
              profileImage: suggestedUser.profileImage,
              location: suggestedUser.location,
              type: 'user',
              roles: ['user'],
              ...suggestedUser
            }
          }));

          setCenterGraphData({
            nodes: nodes,
            edges: []
          });

          console.log(`Friend suggestions loaded: ${nodes.length} suggested users`);
        }

      } catch (error) {
        console.error('Friends suggestion error:', error);
        setCenterGraphData(null);
      }

    } else if (category === 'Sponsor') {
      try {
        console.log('Loading Sponsors...');

        const res = await fetch(`${API_BASE}/api/organisations/search?roles=sponsor`, {
          credentials: 'include'
        });

        if (!res.ok) throw new Error(`Failed: ${res.status}`);

        const orgs = await res.json();
        console.log(`📊 Received ${orgs.length} sponsor organisations`);

        if (Array.isArray(orgs) && orgs.length > 0) {
          const sponsorNodes = orgs.map((o, index) => {
            const wikiImage = getWikipediaImageUrl(o.name);
            const profileImage = o.image || o.profileImage || wikiImage;
            const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(
              (o.name || '').replace(/ /g, '_')
            )}`;

            return {
              data: {
                id: o.uuid || `sponsor-${index}`,
                label: o.name,
                name: o.name,
                location: o.location,
                type: 'organisation',
                roles: o.roles || [],
                profileImage,
                logo: o.logo || logo,
                wikiUrl
              }
            };
          });

          setCenterGraphData({
            nodes: sponsorNodes,
            edges: []
          });

          console.log(`Sponsors: ${sponsorNodes.length} nodes`);
        } else {

          setCenterGraphData({
            nodes: [{
              data: {
                id: 'no-sponsors',
                label: 'No Sponsors Found',
                name: 'No sponsor organizations available',
                type: 'placeholder'
              }
            }],
            edges: []
          });
        }

      } catch (error) {
        console.error('Sponsors error:', error);
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
      activeView !== 'explore' &&
      activeView !== 'viewingLikedPlayers'
    ) {
      if (cyInstanceRef.current) {
        cyInstanceRef.current.destroy();
        cyInstanceRef.current = null;
      }
      return;
    }

    let dataToRender = null;

    if (activeView === 'players' || activeView === 'friends' || activeView === 'viewingLikedPlayers') {
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
        const nodeLabelField = activeView === 'explore' && (filterType === 'Friends')
          ? 'data(name)'
          : 'data(label)';
        const nodeFontSize = (activeView === 'explore' && filterType === 'Friends')
          ? 8
          : 10;
        if (cyInstanceRef.current) {
          cyInstanceRef.current.destroy();
          cyInstanceRef.current = null;
        }

        const cy = cytoscape({
          container: cyContainerRef.current,
          elements: [
            ...dataToRender.nodes.map((n) => {
              console.log('🔍 Processing node:', n.data.label, 'type:', n.data.type, 'logo:', n.data.logo);

              let img = n.data.profileImage || n.data.image || n.data.logo;

              if (!img) {
                if (n.data.type === 'user' || (n.data.label && n.data.label.includes('@'))) {
                  img = logo;
                } else if (
                  n.data.roles?.includes('sponsor') ||
                  n.data.type === 'organisation' ||
                  n.data.type === 'Sponsor'
                ) {
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
              } else if (
                img.includes('afl.com.au') ||
                img.includes('wikipedia.org') ||
                img.includes('wikimedia.org')
              ) {
                img = `${API_BASE}/api/image-proxy?url=${encodeURIComponent(img)}`;
              }

              if (!img) {
                console.warn('Image is null for node:', n.data.label, 'using fallback');
                img = logo;
              }

              if (n.data.type === 'event' && n.data.name) {
                n.data.label = n.data.name;
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
                'background-fit': 'contain',
                'background-position': 'center',
                'background-width': '70%',
                'background-height': '70%',
                'border-width': 3,
                'border-color': 'var(--purple)',
                label: nodeLabelField,
                fontSize: nodeFontSize,
                width: 50,
                height: 50
              }
            },
            {
              selector: 'node[type="event"]',
              style: {
                label: 'data(name)',
                fontSize: 8
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

          if (nodeData.label === "Person" || nodeData.type === "user") {
            if (activeView === 'explore' && filterType === 'Friends') {
              // Show User Profile card for Friends explore
              console.log('Setting selectedPerson for Friends explore:', nodeData);
              setSelectedPerson({
                name: nodeData.name || nodeData.label,
                description: nodeData.description,
                profileImage: nodeData.profileImage || nodeData.image,
                username: nodeData.username,
                email: nodeData.email,
                location: nodeData.location,
                id: nodeData.id,
                isUser: true
              });
              setRightPanelView('userProfile');
            } else {
              // Regular person details
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
            }
            setSelectedNode(null);
          } else if (nodeData.type === "athlete" || nodeData.roles?.includes('athlete')) {
            setSelectedNode({
              ...nodeData,
              isAthlete: true
            });
            setRightPanelView('nodeDetails');
            setSelectedPerson(null);
          } else if (nodeData.roles?.includes('sponsor')) {
            setSelectedNode(nodeData);
            setRightPanelView('nodeDetails');
            setSelectedPerson(null);
            handleExploreSponsorRelationships(nodeData);
          } else {
            setSelectedNode(nodeData);
            setRightPanelView('nodeDetails');
            setSelectedPerson(null);
          }
        });

        cy.on('tap', (evt) => {
          if (evt.target === cy) {
            cy.elements().removeClass('faded');
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

  // ─── "Suggested Friends" (for right sidebar) ───────────────────────────────
  const fetchSuggestedFriends = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users/top?limit=15`, { credentials: 'include' });      const text = await res.text();
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = JSON.parse(text);
      setSuggestedFriends(data);
    } catch (err) {
      console.error('Could not fetch suggested friends:', err);
    }
  };

  const openFriendSearchPanel = () => {
    setRightPanelView('friendSearch');
    setSearchQuery('');
    setSearchResults([]);
    fetchFriends();
  };

  const closeFriendSearchPanel = () => {
    setRightPanelView('default');
    setFriendStatus(null);
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
              {!user?.roles?.includes('admin') && (
                <li
                  className={`menu-item ${activeView === 'explore' && filterType === 'Friends' ? 'active-menu-item' : ''}`}
                  onClick={() => handleExplore('Friends')}
                >
                  Friends
                </li>
              )}
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

          {/* ── Dashboard Section ───────────────────────────────────────────────────── */}
          <div className="mb-4">
            <h5 className="text-navy">Dashboard</h5>
            <ul className="list-unstyled">
              <li className="menu-item" onClick={handleDashboardClick}>
                My Dashboard
              </li>            </ul>
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
          sizes={editProfile ? [60, 40] : [75, 25]}
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
                  <Link to="/home" title="Home" className="icon-link my-icon home-icon" />
                  <Link to="/dashboard" title="Dashboard" className="icon-link my-icon players-icon" />
                  <Link to="/events" title="Events" className="icon-link my-icon events-icon" />
                  <Link to="/search" title="Search" className="icon-link my-icon pages-icon" />
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
                    <button
                      key={`${friend.username || friend.uuid || friend.email}-${index}`}
                      onClick={() => handleTopFriendClick(friend)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        width: "64px",
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        cursor: "pointer"
                      }}
                    >
                      <img
                        src={getAvatarSrc(friend.profileImage)}
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
                    </button>
                  ))
                )}
              </div>
              {incomingRequests.length > 0 && (
                <div style={{ marginTop: "10px" }}>
                  <h6 className="text-navy" style={{ textAlign: "center" }}>Pending Requests</h6>
                  <ul className="list-unstyled d-flex justify-content-center" style={{ gap: "8px" }}>
                    {incomingRequests.map((req) => (
                      <li key={req} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ fontSize: "12px" }}>{req}</span>
                        <button className="btn btn-sm btn-success" onClick={() => handleAcceptRequest(req)}>✓</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleRejectRequest(req)}>✕</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* ── Center Content ────────────────────────────────────────────────── */}
            {/* Profile view */}
            {activeView === 'profile' && (
              <div className="card mb-4">
                <div className="card-body">
                  <h5 className="card-title text-navy">Profile Info</h5>
                  <div className="d-flex align-items-center mb-3">
                    <img
                      src={user?.profileImage || logo}
                      alt="Profile"
                      className="rounded-circle me-3"
                      style={{
                        width: '60px',
                        height: '60px',
                        border: '2px solid var(--purple)',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.target.src = logo;
                        console.log('Profile image failed to load:', user?.profileImage);
                      }}
                    />
                    <div>
                      <p className="mb-1">
                        <strong>Username:</strong> {user.username}
                      </p>
                      <p className="mb-1">
                        <strong>Email:</strong> {user.email || 'Not provided'}
                      </p>
                      {user.location && (
                        <p className="mb-1">
                          <strong>Location:</strong> {user.location}
                        </p>
                      )}
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
                <h5 className="text-navy">
                  Explore: {filterType}
                  {filterType === 'Player' && selectedPerson && selectedPerson.isAthlete && (
                    <span className="text-muted small"> - {selectedPerson.name} Network</span>
                  )}
                  {filterType === 'Player' && (!selectedPerson || !selectedPerson.isAthlete) && (
                    <span className="text-muted small"> - 15 Random Athletes</span>
                  )}
                </h5>

                {/* Friend Search for Friends explore */}
                {filterType === 'Friends' && (
                  <div className="mb-3">
                    <div className="input-group">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search for friends by username..."
                        className="form-control"
                        disabled={loading}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && searchQuery.trim()) {
                            handleFriendDiscoverySearch(searchQuery.trim());
                          }
                        }}
                      />
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => {
                          if (searchQuery.trim()) {
                            handleFriendDiscoverySearch(searchQuery.trim());
                          } else {
                            alert('Please enter a username to search');
                          }
                        }}
                        disabled={loading || !searchQuery.trim()}
                      >
                        {loading ? '⏳' : '🔍'} Search
                      </button>
                    </div>
                    <small className="text-muted">
                      Enter a username to find friends, or refresh to see suggestions
                    </small>
                  </div>
                )}

                {/* Debug info */}
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                  marginBottom: '10px',
                  padding: '5px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '3px'
                }}>
                  {centerGraphData ?
                    `${centerGraphData.nodes?.length || 0} nodes, ${centerGraphData.edges?.length || 0} edges` :
                    'No data loaded'
                  }
                  {filterType === 'Friends' && centerGraphData && centerGraphData.nodes?.length > 0 && (
                    <span> - {searchQuery ? 'Search results' : 'Suggested friends'}</span>
                  )}
                  {filterType === 'Player' && centerGraphData && (
                    <span> - {centerGraphData.edges?.length > 0 ? 'Connection network' : 'Individual athletes'}</span>
                  )}
                </div>

                <div
                  className="border rounded mb-4"
                  style={{ height: '400px', overflow: 'hidden', borderColor: 'var(--purple)' }}
                >
                  {filterType === 'Friends' && (!centerGraphData || centerGraphData.nodes?.length === 0) ? (
                    <div className="d-flex align-items-center justify-content-center h-100 text-center">
                      <div>
                        <p className="text-navy mb-2">
                          <strong>Find Friends!</strong>
                        </p>
                        <p className="text-muted small">
                          {searchQuery ? 'No users found for your search.' : 'Search for friends by username above, or refresh to see suggested friends.'}
                        </p>
                      </div>
                    </div>
                  ) : filterType === 'Player' && (!centerGraphData || centerGraphData.nodes?.length === 0) ? (
                    <div className="d-flex align-items-center justify-content-center h-100 text-center">
                      <div>
                        <p className="text-navy mb-2">
                          <strong>Loading Athletes...</strong>
                        </p>
                        <p className="text-muted small">
                          Click "New 15 Athletes" to load a fresh set of players to explore.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div ref={cyContainerRef} style={{ height: '100%', width: '100%' }} />
                  )}
                </div>

                <div className="mt-3">
                  {filterType === 'Friends' ? (
                    <>
                      <button
                        className="btn btn-outline-primary me-2"
                        onClick={() => {
                          setSearchQuery('');
                          handleExplore('Friends');
                        }}
                      >
                        🔄 Refresh Suggestions
                      </button>
                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          setSearchQuery('');
                          setCenterGraphData(null);
                        }}
                      >
                        🗑️ Clear Search
                      </button>
                    </>
                  ) : filterType === 'Player' ? (
                    <>
                      <button
                        className="btn btn-outline-primary me-2 new-athletes-btn"
                        onClick={() => handleExplore('Player')}
                      >
                        🔄 New 15 Athletes
                      </button>
                      <button
                        className="btn btn-outline-secondary"
                        onClick={handleNewRandomPlayerForExplore}
                      >
                        🎲 Update Spotlight
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-outline-primary me-2"
                      onClick={() => handleExplore(filterType)}
                    >
                      🔄 Refresh {filterType}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Viewing Liked Players */}
            {activeView === 'viewingLikedPlayers' && (
              <>
                <h5 className="text-navy">
                  Viewing Liked Players
                  {selectedPerson && <span className="text-muted small"> - {selectedPerson.name}</span>}
                </h5>

                <div
                  className="border rounded mb-4"
                  style={{ height: '400px', overflow: 'hidden', borderColor: 'var(--purple)' }}
                >
                  <div ref={cyContainerRef} style={{ height: '100%', width: '100%' }} />
                </div>

                <div className="mt-3">
                  <button
                    className="btn btn-outline-secondary me-2"
                    onClick={() => {
                      setActiveView('explore');
                      setFilterType('Friends');
                      handleExplore('Friends');
                    }}
                  >
                    ← Back to Friends
                  </button>
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
                      src={getAvatarSrc(selectedPerson.profileImage)}
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
              ) : rightPanelView === 'userProfile' && selectedPerson ? (
                // ───── Show User Profile card (like Athlete of the Day) ───
                <div className="card text-center mb-4" style={{ backgroundColor: 'var(--purple)', color: 'var(--grey)' }}>
                  <div className="card-body">
                    <img
                      src={selectedPerson.profileImage || logo}
                      alt={selectedPerson.name}
                      className="rounded-circle mb-2"
                      style={{ width: '60px', height: '60px', border: '2px solid var(--pink)' }}
                    />
                    <p className="mb-1">User Profile</p>
                    <p style={{ fontSize: '14px' }}>{selectedPerson.name || selectedPerson.username}</p>
                    {selectedPerson.username && (
                      <p style={{ fontSize: '13px', marginBottom: '8px' }}>
                        @{selectedPerson.username}
                      </p>
                    )}
                    {selectedPerson.location && (
                      <p style={{ fontSize: '12px', marginBottom: '8px', fontStyle: 'italic' }}>
                        {selectedPerson.location}
                      </p>
                    )}

                    {/* Debug info */}
                    <div style={{ fontSize: '10px', color: '#ccc', marginBottom: '8px' }}>
                      {selectedPerson.email || 'none'},  {selectedPerson.username || 'none'}, status={friendStatus || 'none'}                    </div>

                    <div className="mt-2">
                      <button
                        className="btn btn-light btn-sm me-2"
                        onClick={() => handleSendFriendRequest(selectedPerson.username || selectedPerson.name)}
                      >
                        Send Friend Request
                      </button>
                      {selectedPerson.email && (
                        <button
                          className="btn btn-outline-light btn-sm me-2"
                          onClick={() =>
                            handleViewLikedPlayers(
                              selectedPerson.email
                            )
                          }                        >
                          See Their Liked Players
                        </button>
                      )}
                      <button
                        className="btn btn-outline-light btn-sm"
                        onClick={() => { setRightPanelView('default'); setFriendStatus(null); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : rightPanelView === 'nodeDetails' && selectedNode ? (
                // ───── Show selected node details ───
                <div className="card">
                  <div className="card-header bg-purple text-grey">
                    <h6 className="mb-0">
                      {selectedNode.isAthlete ? 'Player Details' : 'Node Details'}
                    </h6>
                    <button
                      className="btn btn-sm btn-outline-light float-end"
                      onClick={() => { setRightPanelView('default'); setFriendStatus(null); }}
                    >
                      ×
                    </button>
                  </div>
                  <div className="card-body" style={{ backgroundColor: 'var(--grey)' }}>
                    {selectedNode.isAthlete ? (
                      // Show filtered athlete details
                      <>
                        {selectedNode.name && (
                          <p className="text-navy mb-2">
                            <strong>Name:</strong> {selectedNode.name}
                          </p>
                        )}
                        {selectedNode.alternateName && (
                          <p className="text-navy mb-2">
                            <strong>Alternate Name:</strong> {selectedNode.alternateName}
                          </p>
                        )}
                        {selectedNode.sport && (
                          <p className="text-navy mb-2">
                            <strong>Sport:</strong> {selectedNode.sport}
                          </p>
                        )}
                        {selectedNode.nationality && (
                          <p className="text-navy mb-2">
                            <strong>Nationality:</strong> {selectedNode.nationality}
                          </p>
                        )}
                        {selectedNode.description && (
                          <p className="text-navy mb-2">
                            <strong>Description:</strong> {selectedNode.description}
                          </p>
                        )}
                        <div className="mt-3">
                          {likedPlayerNames.includes(selectedNode.username || selectedNode.name) ? (
                            <button
                              className="btn btn-outline-secondary btn-sm me-2"
                              onClick={() => handleUnlikePlayer(selectedNode.username || selectedNode.name)}
                            >
                              Unlike Player
                            </button>
                          ) : !friendUsernames.includes(selectedNode.username) && (
                            <button
                              className="btn btn-outline-primary btn-sm me-2"
                              onClick={() => handleLikePlayer(selectedNode.username || selectedNode.name)}
                            >
                              Like Player
                            </button>
                          )}
                        </div>
                      </>
                    ) : selectedNode.roles?.includes('sponsor') ? (
                      <>
                        {selectedNode.name && (
                          <p className="text-navy mb-2">
                            <strong>Name:</strong> {selectedNode.name}
                          </p>
                        )}
                        {selectedNode.location && (
                          <p className="text-navy mb-2">
                            <strong>Location:</strong> {selectedNode.location}
                          </p>
                        )}
                      </>
                    ) : (
                      // Show all node details for non-athletes
                      Object.entries(selectedNode).map(([key, value], index) => (
                        <p key={`node-detail-${key}-${index}`} className="text-navy mb-2">
                          <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              ) : rightPanelView === 'personDetails' && selectedPerson ? (
                // ───── Show selected person details ───
                <div className="card">
                  <div className="card-header bg-purple text-grey">
                    <h6 className="mb-0">
                      {selectedPerson.isAthlete ? 'Athlete Details' : 'Person Details'}
                    </h6>
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
                    {selectedPerson.sport && (
                      <p className="text-navy small"><strong>Sport:</strong> {selectedPerson.sport}</p>
                    )}
                    {selectedPerson.nationality && (
                      <p className="text-navy small"><strong>Nationality:</strong> {selectedPerson.nationality}</p>
                    )}
                    {selectedPerson.gender && (
                      <p className="text-navy small"><strong>Gender:</strong> {selectedPerson.gender}</p>
                    )}

                    <div className="mt-3">
                      {selectedPerson.isAthlete ? (
                        <>
                          {likedPlayerNames.includes(selectedPerson.username || selectedPerson.name) ? (
                            <button
                              className="btn btn-outline-secondary btn-sm me-2"
                              onClick={() => handleUnlikePlayer(selectedPerson.username || selectedPerson.name)}
                            >
                              Unlike Player
                            </button>
                          ) : !friendUsernames.includes(selectedPerson.username) && (
                            <button
                              className="btn btn-outline-primary btn-sm me-2"
                              onClick={() => handleLikePlayer(selectedPerson.username || selectedPerson.name)}
                            >
                              Like Player
                            </button>
                          )}
                          {activeView === 'explore' && filterType === 'Player' && selectedPerson.athleteData && (
                            <button
                              className="btn btn-outline-success btn-sm me-2"
                              onClick={() => handleExploreAthleteConnections(selectedPerson.athleteData)}
                              disabled={loading}
                            >
                              {loading ? '🔄' : '🔗'} Explore Connections
                            </button>
                          )}
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={handleFeelingSporty}
                          >
                            Scout's Choice
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => handleSendFriendRequest(selectedPerson.username || selectedPerson.name)}
                        >
                          Send Friend Request
                        </button>
                      )}
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
                            src={getAvatarSrc(spotlightAthlete.profileImage)}
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
                            <li key={event.id || event.title || `past-${index}`} className="mb-2">
                            <strong className="text-navy">{event.title || 'Unnamed Event'}</strong><br />
                            {event.date && (
                              <small className="text-navy">{event.date}</small>
                            )}
                            { !event.date && event.year && (
                              <small className="text-navy">{event.year}</small>
                            )}
                            {event.location && (
                              <><br /><small className="text-navy">{event.location}</small></>
                            )}
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