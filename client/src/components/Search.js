import React, { useState } from 'react';

function Search() {
    const [query, setQuery] = useState('');
    const [sport, setSport] = useState('');
    const [results, setResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newPlayerSport, setNewPlayerSport] = useState('');
    const [editPlayerId, setEditPlayerId] = useState(null);
    const [editData, setEditData] = useState({ name: '', sport: '', description: '' });

    const startEditing = (player) => {
        setEditPlayerId(player.id);
        setEditData({
            name: player.name,
            sport: player.sport || '',
            description: player.description || ''
        });
    };

    const savePlayerEdit = async () => {
        try {
            const res = await fetch(`/api/player/${editPlayerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update player');

            alert('Player updated successfully!');
            setEditPlayerId(null);
            handleSearch(new Event('submit')); // refresh results
        } catch (err) {
            alert(err.message);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setError('');
        setResults([]);
        setSuggestions([]);
        setShowAddForm(false);

        const params = new URLSearchParams({ query });
        if (sport) params.append('sport', sport);

        try {
            const res = await fetch(`/api/search?${params.toString()}`, {
                credentials: 'include',
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Search failed');

            setResults(data.players || []);
            setSuggestions(data.suggestions || []);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleAddPlayer = async () => {
        try {
            const res = await fetch('/api/add-player', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: query, sport: newPlayerSport }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to add player');

            alert(data.message);
            setShowAddForm(false);
            setQuery('');
            setNewPlayerSport('');
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div style={{ padding: '1rem' }}>
            <h2>Search Players</h2>
            <form onSubmit={handleSearch} style={{ marginBottom: '1rem' }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name"
                    style={{ padding: '0.5rem', width: '40%' }}
                />
                <select
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    style={{ marginLeft: '1rem', padding: '0.5rem' }}
                >
                    <option value="">All Sports</option>
                    <option value="Figure Skating">Figure Skating</option>
                    <option value="Soccer">Soccer</option>
                    <option value="Tennis">Tennis</option>
                    <option value="Basketball">Basketball</option>
                </select>
                <button type="submit" style={{ marginLeft: '1rem' }}>Search</button>
            </form>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            {results.length > 0 && (
                <>
                    <h3>Results</h3>
                    <ul>
                        {results.map(player => (
                            <li key={player.id} style={{ marginBottom: '1rem' }}>
                                {editPlayerId === player.id ? (
                                    <div>
                                        <input
                                            value={editData.name}
                                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                            placeholder="Name"
                                        />
                                        <input
                                            value={editData.sport}
                                            onChange={(e) => setEditData({ ...editData, sport: e.target.value })}
                                            placeholder="Sport"
                                        />
                                        <textarea
                                            value={editData.description}
                                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                            placeholder="Description"
                                        />
                                        <button onClick={savePlayerEdit}>Save</button>
                                        <button onClick={() => setEditPlayerId(null)}>Cancel</button>
                                    </div>
                                ) : (
                                    <>
                                        <strong>{player.name}</strong> – {player.sport}
                                        {player.description && <p>{player.description}</p>}
                                        <button onClick={() => startEditing(player)} style={{ marginTop: '5px' }}>
                                            Edit
                                        </button>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                </>
            )}
            {results.length === 0 && suggestions.length > 0 && (
                <>
                    <h3>No exact match. Did you mean:</h3>
                    <ul>
                        {suggestions.map(player => (
                            <li key={player.id}>
                                <strong>{player.name}</strong> – {player.sport || 'Unknown sport'}
                            </li>
                        ))}
                    </ul>
                </>
            )}

            {results.length === 0 && suggestions.length === 0 && query && (
                <>
                    <p>No players found.</p>
                    {!showAddForm ? (
                        <button onClick={() => setShowAddForm(true)}>
                            Add "{query}" as a new player
                        </button>
                    ) : (
                        <div style={{ marginTop: '1rem' }}>
                            <h4>Add New Player</h4>
                            <label>
                                Sport:
                                <select
                                    value={newPlayerSport}
                                    onChange={(e) => setNewPlayerSport(e.target.value)}
                                    style={{ marginLeft: '0.5rem' }}
                                >
                                    <option value="">Select sport</option>
                                    <option value="Figure Skating">Figure Skating</option>
                                    <option value="Soccer">Soccer</option>
                                    <option value="Tennis">Tennis</option>
                                    <option value="Basketball">Basketball</option>
                                </select>
                            </label>
                            <button
                                onClick={handleAddPlayer}
                                style={{ marginLeft: '1rem' }}
                                disabled={!newPlayerSport}
                            >
                                Confirm Add
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default Search;
