import React, { useState, useEffect } from 'react';
import HamburgerMenu from './HamburgerMenu';
import { useNavigate } from 'react-router-dom';

function Profile({ username, handleLogout }) {
    // state for user details
    const [userProfile, setUserProfile] = useState({
        name: '',
        bio: '',
        age: '',
        location: '',
    });

    // preview of profile pic
    const [profilePic, setProfilePic] = useState(
        // placeholder url
        'https://via.placeholder.com/120'
    );

    const [topPlayers, setTopPlayers] = useState([]);
    const [seasonError, setSeasonError] = useState('');
    const [graphData, setGraphData] = useState({ nodes: [], edges: [] });

    const [likedPlays, setLikedPlays] = useState([]);

    // load the user’s top 5 liked plays
    useEffect(() => {
        async function fetchLikedPlays() {
            try {
                const response = await fetch(`/api/user-likes/${username}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch liked plays');
                }
                const playsData = await response.json();
                setLikedPlays(playsData);
            } catch (err) {
                console.error(err);
            }
        }

        if (username) {
            fetchLikedPlays();
        }
    }, [username]);

    // initial profile info
    useEffect(() => {
        setUserProfile({
            name: username || 'Unknown',
            bio: 'I like …',
            age: '35',
            location: 'New York, USA',
        });
    }, [username]);

    useEffect(() => {
        // placeholder for top players
        setTopPlayers(['Player 1', 'Player 2', 'Player 3']);
    }, []);

    // handlers for user form updates
    function handleChange(e) {
        const { name, value } = e.target;
        setUserProfile(prev => ({ ...prev, [name]: value }));
    }

    function handleProfilePicChange(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            setProfilePic(reader.result);
        };
        reader.readAsDataURL(file);
    }

    function handleSaveChanges(e) {
        e.preventDefault();
        console.log('Saving Profile:', userProfile, profilePic);
        alert('Profile changes saved (demo only).');
    }

    // render
    return (
        <div className="App-profile-page" style={styles.profilePage}>
            <div className="App-top-panel" style={styles.topPanel}>
                <HamburgerMenu />
            </div>

            <div className="App-main-content" style={styles.mainContent}>
                <div className="App-left-panel" style={styles.leftPanel}>
                    <h2>Edit Profile</h2>

                    <div style={styles.profileImageWrapper}>
                        <img
                            src={profilePic}
                            alt="Profile"
                            style={styles.profileImage}
                        />
                    </div>

                    <form onSubmit={handleSaveChanges} style={styles.profileForm}>
                        <label htmlFor="profilePic" style={styles.label}>
                            Profile Picture
                        </label>
                        <input
                            type="file"
                            id="profilePic"
                            accept="image/*"
                            onChange={handleProfilePicChange}
                            style={styles.input}
                        />

                        <label htmlFor="name" style={styles.label}>Name</label>
                        <input
                            type="text"
                            name="name"
                            value={userProfile.name}
                            onChange={handleChange}
                            style={styles.input}
                            required
                        />

                        <label htmlFor="age" style={styles.label}>Age</label>
                        <input
                            type="number"
                            name="age"
                            value={userProfile.age}
                            onChange={handleChange}
                            style={styles.input}
                        />

                        <label htmlFor="location" style={styles.label}>Location</label>
                        <input
                            type="text"
                            name="location"
                            value={userProfile.location}
                            onChange={handleChange}
                            style={styles.input}
                        />

                        <label htmlFor="bio" style={styles.label}>Bio</label>
                        <textarea
                            name="bio"
                            value={userProfile.bio}
                            onChange={handleChange}
                            style={{ ...styles.input, minHeight: '80px' }}
                        />

                        <button type="submit" style={styles.saveBtn}>Save Changes</button>
                    </form>
                </div>

                <div className="App-center-panel" style={styles.centerPanel}>
                    <h2>Top Ten Players</h2>
                    {seasonError && <p style={{ color: 'red' }}>{seasonError}</p>}
                    <ul>
                        {topPlayers.length > 0 ? (
                            topPlayers.map((player, index) => <li key={index}>{player}</li>)
                        ) : (
                            <p>No players found.</p>
                        )}
                    </ul>
                </div>
            </div>
            <div>
        <h2>My Top 5 Plays</h2>
        {likedPlays.length > 0 ? (
          <ul>
            {likedPlays.map((play) => (
              <li key={play.id}>
                <strong>{play.title}</strong>
                {play.description ? <p>{play.description}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p>No players liked yet.</p>
        )}
      </div>
        </div>
    );
}

const styles = {
    profilePage: {
        backgroundColor: '#f9f9f9',
        minHeight: '100vh'
    },
    topPanel: {
        backgroundColor: '#eee',
        padding: '1rem'
    },
    mainContent: {
        margin: '1rem'
    }
};

export default Profile;
