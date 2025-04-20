import React, { useState } from 'react';
import '../style.css';
import HamburgerMenu from './HamburgerMenu';


function Search(user) {
    const [query, setQuery] = useState('');
    const [sport, setSport] = useState('');

    // results & suggestions
    const [results, setResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);

    // editing an existing person id
    const [editPersonId, setEditPersonId] = useState(null);

    // form state for the complete set of person data
    const [personForm, setPersonForm] = useState({
        name: '',
        nationality: '',
        gender: '',
        profileImage: '',
        birthDate: '',
        roles: '',
        primaryRole: '',
        sport: ''
    });

    // event handlers

    async function handleSearch(e) {
        e.preventDefault();
        setError('');
        setResults([]);
        setSuggestions([]);
        setEditPersonId(null);
        setShowForm(false);

        try {
            // creating the  query string, e.g. /api/search?query=Serena&sport=Tennis
            const params = new URLSearchParams({ query });
            if (sport) params.append('sport', sport);

            const res = await fetch(`/api/search?${params.toString()}`, {
                credentials: 'include',
            });
            let data;
            try {
                data = await res.json();
            } catch (parseError) {
                throw new Error(`Invalid JSON response (status ${res.status}).`);
            }
            setResults(data.players || []);
            setSuggestions(data.suggestions || []);
        } catch (err) {
            setError(err.message);
        }
    }

    function handleFormChange(e) {
        const { name, value } = e.target;
        setPersonForm(prev => ({ ...prev, [name]: value }));
    }

    function startEditing(player) {
        setEditPersonId(player.id);

        // to handle DB role array, join them with commas
        const rolesString = (player.roles || []).join(', ');

        setPersonForm({
            name: player.name || '',
            nationality: player.nationality || '',
            gender: player.gender || '',
            profileImage: player.profileImage || '',
            birthDate: player.birthDate || '',
            roles: rolesString,
            primaryRole: player.primaryRole || '',
            sport: player.sport || ''
        });

        setShowForm(true);
    }

    function startCreating() {
        setEditPersonId(null);
        setPersonForm({
            name: query || '',
            nationality: '',
            gender: '',
            profileImage: '',
            birthDate: '',
            roles: '',
            primaryRole: '',
            sport: sport || ''
        });
        setShowForm(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();

        // convert roles from comma-separated string into array
        const rolesArr = personForm.roles
            ? personForm.roles.split(',').map(r => r.trim()).filter(Boolean)
            : [];

        const payload = {
            ...personForm,
            roles: rolesArr
        };

        try {
            let method = 'POST';
            let url = '/api/person';
            if (editPersonId) {
                method = 'PUT';
                url = `/api/person/${editPersonId}`;
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save');

            alert(data.message || 'Success!');
            setShowForm(false);
            setEditPersonId(null);
            setPersonForm({
                name: '',
                nationality: '',
                gender: '',
                profileImage: '',
                birthDate: '',
                roles: '',
                primaryRole: '',
                sport: ''
            });

            if (method === 'PUT') {
                handleSearch(new Event('submit'));
            }
            if (rolesArr.includes('athlete') && data.person) {
                try {
                    const likeResponse = await fetch('/api/user-likes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: user.username,
                            playerName: data.person.name
                        })
                    });
                    const likeData = await likeResponse.json();
                    if (!likeResponse.ok) {
                        console.error('Failed to create LIKED relationship:', likeData.error);
                    } else {
                        console.log(likeData.message);
                    }
                } catch (likeError) {
                    console.error('Error creating LIKED relationship:', likeError);
                }
            }
    
    
        } catch (err) {
            alert(err.message);
        }
    }

    // search form
    return (
        <div className="App-center-panel">
            <h2 style={{ marginTop: 0 }}>Search People</h2>

            <form onSubmit={handleSearch} style={{ marginBottom: '1rem' }}>
                <input
                    className="auth-input"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name"
                />
                <select
                    className="auth-input"
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    style={{ marginLeft: '10px' }}
                >
                    <option value="">All Sports</option>
                    <option value="Figure Skating">Figure Skating</option>
                    <option value="Soccer">Soccer</option>
                    <option value="Tennis">Tennis</option>
                    <option value="Basketball">Basketball</option>
                </select>

                <button className="auth-button" type="submit" style={{ marginLeft: '10px' }}>
                    Search
                </button>
            </form>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            {results.length > 0 && (
                <>
                    <h3>Results</h3>
                    <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                        {results.map((player) => (
                            <li key={player.id} style={{ marginBottom: '1rem' }}>
                                <strong>{player.name}</strong> – {player.sport || 'N/A'}
                                <button
                                    className="auth-button"
                                    onClick={() => startEditing(player)}
                                    style={{ marginLeft: '10px', width: 'auto' }}
                                >
                                    Edit
                                </button>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            {results.length === 0 && suggestions.length > 0 && (
                <>
                    <h3>No exact match. Did you mean:</h3>
                    <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                        {suggestions.map((player) => (
                            <li key={player.id}>
                                <strong>{player.name}</strong> – {player.sport || 'Unknown sport'}
                            </li>
                        ))}
                    </ul>
                </>
            )}

            {results.length === 0 && suggestions.length === 0 && query && !showForm && (
                <>
                    <p>No matches found for "{query}".</p>
                    <button
                        className="auth-button-alt"
                        onClick={startCreating}
                        style={{ width: 'auto' }}
                    >
                        Add "{query}" as a new person
                    </button>
                </>
            )}

            {showForm && (
                <div style={{ marginTop: '2rem' }}>
                    <h3>{editPersonId ? 'Update Person' : 'Create New Person'}</h3>
                    <form onSubmit={handleSubmit}>
                        <label>Name</label>
                        <input
                            className="auth-input"
                            type="text"
                            name="name"
                            value={personForm.name}
                            onChange={handleFormChange}
                            required
                        />

                        <label>Nationality</label>
                        <input
                            className="auth-input"
                            type="text"
                            name="nationality"
                            value={personForm.nationality}
                            onChange={handleFormChange}
                        />

                        <label>Gender</label>
                        <select
                            className="auth-input"
                            name="gender"
                            value={personForm.gender}
                            onChange={handleFormChange}
                        >
                            <option value="">Select Gender</option>
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Other">Other</option>
                        </select>

                        <label>Profile Image URL</label>
                        <input
                            className="auth-input"
                            type="text"
                            name="profileImage"
                            value={personForm.profileImage}
                            onChange={handleFormChange}
                        />

                        <label>Birth Date</label>
                        <input
                            className="auth-input"
                            type="date"
                            name="birthDate"
                            value={personForm.birthDate}
                            onChange={handleFormChange}
                        />

                        <label>Roles (comma-separated)</label>
                        <input
                            className="auth-input"
                            type="text"
                            name="roles"
                            placeholder="Coach, Player, etc."
                            value={personForm.roles}
                            onChange={handleFormChange}
                        />

                        <label>Primary Role</label>
                        <input
                            className="auth-input"
                            type="text"
                            name="primaryRole"
                            placeholder="e.g. Player"
                            value={personForm.primaryRole}
                            onChange={handleFormChange}
                        />

                        <label>Sport</label>
                        <input
                            className="auth-input"
                            type="text"
                            name="sport"
                            value={personForm.sport}
                            onChange={handleFormChange}
                        />

                        <button className="auth-button" type="submit" style={{ marginTop: '10px', width: 'auto' }}>
                            {editPersonId ? 'Update' : 'Create'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default Search;
