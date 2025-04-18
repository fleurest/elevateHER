import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import cytoscape from 'cytoscape';
import HamburgerMenu from './HamburgerMenu';
import logo from '../assets/logo-default-profile.png';
import { Link } from 'react-router-dom';
import EditProfileForm from '../components/EditProfileForm';

import homeIcon from '../assets/icon_home.png';
import playersIcon from '../assets/icon_player.png';
import eventsIcon from '../assets/icon_events.png';
import pagesIcon from '../assets/icon_pages.png';

function HomePage({ handleLogout, user }) {
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterType, setFilterType] = useState(null);
  const cyContainerRef = useRef(null);
  const cyInstanceRef = useRef(null);
  const [showProfile, setShowProfile] = useState(false);
  const [prevFilter, setPrevFilter] = useState(null);
  const [editProfile, setEditProfile] = useState(false);

  const handleShowProfile = () => setShowProfile(true);
  const handleHideProfile = () => setShowProfile(false);

  const [showMyPlayers, setShowMyPlayers] = useState(false);
  const [allPeople, setAllPeople] = useState([]);
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [topFriends, setTopFriends] = useState([]);
  const [friends, setFriends] = useState([]);
  const [showFriendsPanel, setShowFriendsPanel] = useState(false);
  // search add friend
  const [showAddFriendPanel, setShowAddFriendPanel] = useState(false);
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [friendResults, setFriendResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [suggestedFriends, setSuggestedFriends] = useState([]);
  // show person on node click
  const [selectedPerson, setSelectedPerson] = useState(null);
  const navigate = useNavigate();
  const graphRef = useRef(null);
  const [editableUser, setEditableUser] = useState(user);

  const toggleProfile = () => {
    setShowProfile((prev) => {
      const next = !prev;

      if (next) {
        setPrevFilter(filterType);
        setFilterType(null);
      } else {
        setFilterType(prevFilter);
        setEditProfile(false);
      }

      return next;
    });
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/all-users`);
      const data = await res.json();
      setAllPeople(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  useEffect(() => {
    if (!showProfile) {
      setFilterType(null);
    }
  }, [showProfile]);

  const fetchFriends = async () => {
    try {
      const res = await fetch(`/api/user-friends/${user.username}`);
      const data = await res.json();
      setFriendResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Could not fetch friends:', err);
      setFriendResults([]);
    }
  };

  useEffect(() => {
    if (showFriendsPanel) {
      fetchFriends();
    }
  }, [showFriendsPanel]);

  const fetchSuggestedFriends = async () => {
    try {
      const res = await fetch('/api/top-users');
      const data = await res.json();
      setFriendResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Could not fetch friend suggestions:', err);
      setFriendResults([]);
    }
  };

  useEffect(() => {
    fetchSuggestedFriends();
  }, []);

  const filterGraphToFriends = async () => {
    const res = await fetch(`/api/user-friends/${user.username}`);
    const data = await res.json();
    setGraphElements(data);
  };

  useEffect(() => {
    const fetchTopFriends = async () => {
      try {
        const res = await fetch(`/api/top-friends/${user.username}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setTopFriends(data);
        } else {
          console.warn('Expected array for top friends, got:', data);
          setTopFriends([]);
        }
      } catch (err) {
        console.error('Failed to load top friends', err);
        setTopFriends([]);
      }
    };

    if (user?.username) fetchTopFriends();
  }, [user]);



  const filterGraphForFriends = async () => {
    try {
      const res = await fetch(`/api/user-friends/${user.username}`);
      const data = await res.json();
      if (graphRef.current) {
        graphRef.current.setElements(data);
      }
    } catch (err) {
      console.error('Failed to filter graph for friends:', err);
    }
  };

  // user search in the last panel
  const handleSearch = async () => {
    try {
      const res = await fetch(`/api/search-users?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const handleFriendSearch = async (query) => {
    try {
      const res = await fetch(`/api/search-friends?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setFriendResults(data);
    } catch (err) {
      console.error('Friend search failed:', err);
      setFriendResults([]);
    }
  };

  const handleSendFriendRequest = async (username) => {
    try {
      const res = await fetch(`/api/send-friend-request/${user.username}/${username}`, { method: 'POST' });
      const data = await res.json();
      console.log('Friend request sent:', data);
    } catch (err) {
      console.error('Error sending friend request:', err);
    }
  };
  useEffect(() => {
    if (user?.username) {
      fetchUsers();
      fetchFriends();
    }
  }, [user]);


  useEffect(() => {
    console.log('User:', user.username);
    console.log('Friends:', friends.map(f => f.username));
    console.log('All users:', allPeople.map(p => ({ username: p.username, roles: p.roles })));
  }, [allPeople, friends]);

  useEffect(() => {
    async function fetchGraph() {
      try {
        const res = await fetch('http://localhost:3001/api/graph');
        const data = await res.json();
        console.log('Graph Data:', data);
        setGraphData(data);
      } catch (err) {
        console.error('Error fetching graph:', err);
      }
    }
    fetchGraph();
  }, []);

  useEffect(() => {
    if (!cyInstanceRef.current) return;

    const cy = cyInstanceRef.current;
    const tapHandler = (event) => {
      const nodeData = event.target.data();
      if (nodeData.label === "Person") {
        setSelectedPerson({
          name: nodeData.name,
          description: nodeData.description,
          profileImage: nodeData.profileImage
        });
        setShowAddFriendPanel(true);
      }
    };

    cy.on('tap', 'node', tapHandler);

    return () => {
      cy.removeListener('tap', 'node', tapHandler);
    };
  }, [cyInstanceRef.current]);


  useEffect(() => {
    if (showProfile) return;
    if (!graphData || !cyContainerRef.current || !cyContainerRef.current.offsetParent) return;

    const timeout = setTimeout(() => {
      const initCytoscape = async () => {
        try {
          let nodes = graphData.nodes;
          let edges = graphData.edges;

          if (filterType === 'favourites') {
            try {
              const res = await fetch(`/api/user-likes/${user?.username}`);
              const liked = await res.json();

              if (!liked.length) {
                const goToPlayers = window.confirm(
                  "You haven’t liked any players yet. Want to browse the Players page?"
                );
                if (goToPlayers) {
                  navigate('/search');
                }
                return;
              }

              const likedNames = liked.map(p => p.name);
              nodes = nodes.filter(n => likedNames.includes(n.data.name));
            } catch (err) {
              console.error('Error filtering favourites:', err);
              return;
            }
          } else if (filterType) {
            nodes = nodes.filter(n => n.data.label === filterType);
          }

          const nodeIds = new Set(nodes.map(n => n.data.id));
          edges = edges.filter(e => nodeIds.has(e.data.source) && nodeIds.has(e.data.target));

          const elements = [
            ...nodes.map(n => ({ data: n.data })),
            ...edges.map(e => ({ data: e.data }))
          ];

          if (cyInstanceRef.current) {
            cyInstanceRef.current.destroy();
            cyInstanceRef.current = null;
          }

          if (elements.length === 0) {
            console.warn('No elements to display in Cytoscape.');
            return;
          }

          const cy = cytoscape({
            container: cyContainerRef.current,
            elements,
            style: [
              {
                selector: 'node',
                style: {
                  'background-color': '#35374b',
                  'label': 'data(name)',
                  'color': '#f1f2f3',
                  'text-valign': 'center',
                  'text-halign': 'center',
                  'font-size': 10,
                  'width': 40,
                  'height': 40
                }
              },
              {
                selector: 'edge',
                style: {
                  'width': 2,
                  'line-color': '#797ca0',
                  'target-arrow-color': '#797ca0',
                  'target-arrow-shape': 'triangle',
                  'curve-style': 'bezier',
                  'label': 'data(label)',
                  'font-size': 8,
                  'text-background-color': '#fff',
                  'text-background-opacity': 1,
                  'text-background-shape': 'roundrectangle',
                  'text-rotation': 'none',
                  'text-margin-y': -10,
                  'min-zoomed-font-size': 4
                }
              }
            ],
            layout: { name: 'breadthfirst', direction: 'TB', animate: true }
          });

          cy.on('tap', 'node', (evt) => {
            setSelectedNode(evt.target.data());
          });

          cyInstanceRef.current = cy;
        } catch (err) {
          console.error('Cytoscape init error:', err);
        }
      };

      initCytoscape();
    }, 150);

    return () => {
      clearTimeout(timeout);
      if (cyInstanceRef.current) {
        cyInstanceRef.current.destroy();
        cyInstanceRef.current = null;
        cyInstanceRef.current = null;
      }
    };
  }, [graphData, filterType, user?.username, showProfile]);

  useEffect(() => {
    fetch('/api/top-users')
      .then(res => res.json())
      .then(data => {
        console.log('Top Users Response:', data);
        setFriendResults(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error('Error loading users', err);
        setFriendResults([]);
      });
  }, []);

  return (
    <div className="home-page-layout">
      <div className="home-page-column home-page-left">
        <div className="logo-section">
          <img src={logo} alt="Logo" className="small-logo" />
        </div>

        <div className="favourites-section">
          <h2>Favourites</h2>
          <ul>
            <li className="cursor-pointer" onClick={toggleProfile}>
              My Profile {showProfile ? '▲' : '▼'}
              {showProfile}
            </li>

            <li
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                const newShowMyPlayers = !showMyPlayers;
                setShowMyPlayers(newShowMyPlayers);
                setShowProfile(false);
                if (newShowMyPlayers) {
                  setFilterType('Player');
                } else {
                  setFilterType(null);
                }

                setSelectedNode(null);
                setShowFriendsPanel(false);
              }}
            >
              My Players {showMyPlayers ? '▲' : '▼'}
            </li>
          </ul>
        </div>

        <div className="explore-section">
          <h2>Explore</h2>
          <ul>
            <li
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                const nextState = !showFriendsPanel;
                setShowFriendsPanel(nextState);
                setShowProfile(false);
                setShowMyPlayers(false);
                setSelectedNode(null);
                if (nextState) {
                  fetchSuggestedFriends();
                }
              }}
            >
              Friends {showAddFriendPanel ? '▲' : '▼'}
            </li>
            <li>Players <button onClick={() => setFilterType('Player')}>+</button></li>
            <li>Sports <button onClick={() => setFilterType('Sport')}>+</button></li>
            <li>Events <button onClick={() => setFilterType('Event')}>+</button></li>
            <li className="reset-filter" onClick={() => setFilterType(null)}>Reset Filter</li>
          </ul>
        </div>

        <div className="explore-section">
          <h2>News</h2>
          <ul>
            <li>My News </li>
          </ul>
          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <button
              onClick={handleLogout}
              type="button"
              style={{ padding: "10px 20px", fontSize: "16px" }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="home-page-column home-page-center">
        <div className="icon-bar-wrapper">
          <div className="center-top-icons">
            <Link to="/home" className="icon-link my-icon home-icon" ></Link>
            <Link to="/dashboard" className="icon-link my-icon players-icon"></Link>
            <Link to="/profile" className="icon-link my-icon events-icon" ></Link>
            <Link to="/search" className="icon-link my-icon pages-icon" ></Link>
          </div>
        </div>
        <div className="icon-bar-wrapper">
          <div className="center-top-icons">
            {user && (
              <Link
                to={`/profile/${user.username}`}
                className="flex flex-col items-center mx-1 w-12"
              >
                <img
                  src={user.profileImage || logo}
                  alt={user.username}
                  className="small-logo w-7 h-7 rounded-full object-cover"
                />
                <span className="text-[10px] mt-1 text-center truncate w-full">
                  {user.username}
                </span>
              </Link>
            )}

            {Array.isArray(topFriends) && topFriends
              .slice(0, showAllFriends ? 5 : 2)
              .map((friend) => (
                <Link
                  to={`/profile/${friend.username}`}
                  key={friend.username}
                  className="flex flex-col items-center mx-1 w-12"
                >
                  <img
                    src={friend.profileImage || logo}
                    alt={friend.username}
                    className="small-logo w-7 h-7 rounded-full object-cover"
                  />
                  <span className="text-[10px] mt-1 text-center truncate w-full">
                    {friend.username}
                  </span>
                </Link>
              ))}

          </div>
          {topFriends.length > 2 && (
            <button
              onClick={() => setShowAllFriends((prev) => !prev)}
              className="text-[10px] text-gray-500 mt-1 ml-2 underline"
            >
              {showAllFriends ? '<' : '>'}
            </button>
          )}

        </div>
        {showProfile ? (
          <div className="profile-panel">
            <h3>Profile Info</h3>
            <div className="profile-details">
              <img src={logo} alt="Profile" className="profile-pic" />
              <p><strong>Username:</strong> {user?.username || 'Unknown'}</p>
              <p><strong>Email:</strong> {user?.email || 'Not provided'}</p>
              <button className="auth-button-alt" onClick={toggleProfile}>
                Close Profile
              </button>
              <button
                className="mt-2 text-sm text-blue-600 underline"
                onClick={() => setEditProfile(true)}
                disabled={!showProfile}
              >
                Edit Profile
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2>Player Graph</h2>
            <div className="player-network-graph">
              <div ref={cyContainerRef} style={{ height: '500px', width: '100%' }} />
            </div>
          </>
        )}

        {showFriendSearch && friendResults.length > 0 && (
          <ul className="mt-2 ml-4 border rounded bg-white shadow">
            {friendResults.map(user => (
              <li key={user.id} className="p-2 border-b flex justify-between items-center">
                {user.name}
                <button
                  onClick={() => sendFriendRequest(user.username)}
                  className="text-sm text-purple-600 hover:underline"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}

        {showMyPlayers && (
          <div
            className="players-panel"
            style={{
              margin: '20px 0',
              padding: '20px',
              border: '1px solid #ccc',
              borderRadius: '8px',
              backgroundColor: '#fff'
            }}
          >
          </div>
        )}
        {showFriendsPanel && (
          <div className="mt-2 pl-4">
            <p className="text-sm mb-2">Search or view your friends here</p><ul>
              {friendResults.map((user) => (
                <li key={user.id} className="flex justify-between items-center mb-2">
                  <span>{user.username}</span>

                </li>
              ))}
            </ul>
          </div>
        )}

        {showAddFriendPanel && (
          <div className="bg-purple-50 p-4 border-l border-purple-200">
            <h2 className="text-xl font-semibold mb-2">Find Friends</h2>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search users"
              className="w-full p-2 border rounded mb-2"
            />
            <button
              onClick={handleSearch}
              className="bg-purple-600 text-white px-4 py-2 rounded"
            >
              Search
            </button>

            <ul className="mt-4">
              {Array.isArray(searchResults) && searchResults.length > 0 ? (
                searchResults.map(result => (
                  <li key={result.id} className="p-2 border-b">
                    {result.name}
                    {/* TODO: Add Friend button */}
                  </li>
                ))
              ) : (
                <li className="p-2 text-gray-500">No results found</li>
              )}
            </ul>
          </div>
        )}
        {fetchSuggestedFriends.length > 0 && (
          <div className="mt-4">
            <ul className="list-disc pl-5">
              {fetchSuggestedFriends.map((friend, index) => (
                <li key={index}>{friend.username}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <h3 className="text-md font-bold mb-2">Suggested Friends</h3>
          <ul className="list-disc pl-4 space-y-1">
            {suggestedFriends.map(person => (
              <li key={person.username} className="flex justify-between items-center">
                <span>{person.username}</span>
                <button
                  className="text-sm text-blue-600 underline"
                  onClick={() => handleSendFriendRequest(person.username)}
                >
                  Send Friend Request
                </button>
              </li>
            ))}
            <ul className="list-disc pl-5">
              {suggestedFriends.map((friend, index) => (
                <li key={index}>{friend.username}</li>
              ))}
            </ul>
          </ul>
        </div>
      </div>

      <div className="home-page-column home-page-right">
        {editProfile ? (
          <EditProfileForm
            user={editableUser}
            setUser={setEditableUser}
            onCancel={() => setEditProfile(false)}
            onSave={(updatedUser) => {
              setEditProfile(false);
              setEditableUser(updatedUser);
            }}
          />
        ) : selectedNode ? (
          <div>
            <h2>Details</h2>
            {Object.entries(selectedNode).map(([key, value]) => (
              <p key={key}><strong>{key}:</strong> {JSON.stringify(value)}</p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default HomePage;