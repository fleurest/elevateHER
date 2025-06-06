import React, { useState, useEffect } from 'react';

const API_BASE = process.env.API_BASE || "http://localhost:3001";

const AVATAR_OPTIONS = [
  {
    id: 'default',
    name: 'Default',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/BJK_headshot_2011_5x7_300dpi.jpg/500px-BJK_headshot_2011_5x7_300dpi.jpg',
    description: 'Default Avatar'
  },
  {
    id: 'tennis',
    name: 'Tennis',
    url: 'https://img.icons8.com/color/150/tennis-ball.png',
    description: 'Tennis Player'
  },
  {
    id: 'baseball',
    name: 'Baseball',
    url: 'https://img.icons8.com/color/150/baseball.png',
    description: 'Baseball Player'
  },
  {
    id: 'cricket',
    name: 'Cricket',
    url: 'https://img.icons8.com/color/150/cricket.png',
    description: 'Cricket Player'
  }
];

const EditProfileForm = ({ user, setUser, onCancel, onSave }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    location: '',
    bio: '',
    profileImage: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('default');
  const [activeTab, setActiveTab] = useState('avatars');

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        location: user.location || '',
        bio: user.bio || '',
        profileImage: user.profileImage || '', 
      });
      
      const currentAvatar = AVATAR_OPTIONS.find(avatar => avatar.url === user.profileImage);
      if (currentAvatar) {
        setSelectedAvatar(currentAvatar.id);
        setActiveTab('avatars');
      } else if (user.profileImage && user.profileImage.trim() !== '') {
        setActiveTab('custom');
        setSelectedAvatar('default');
      } else {
        setActiveTab('avatars');
        setSelectedAvatar('default');
        setFormData(prev => ({ ...prev, profileImage: AVATAR_OPTIONS[0].url }));
      }
    }
  }, [user]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAvatarSelect = (avatarId) => {
    setSelectedAvatar(avatarId);
    const selectedAvatarData = AVATAR_OPTIONS.find(avatar => avatar.id === avatarId);
    setFormData(prev => ({
      ...prev,
      profileImage: selectedAvatarData.url
    }));
    setActiveTab('avatars');
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!API_BASE) {
      console.error('API_BASE is not set. Check your environment variables.');
      setErrorMessage('Configuration error: API_BASE is not defined.');
      return;
    }

    try {
      const updateUrl = `${API_BASE}/api/users/update`;

      const payload = {
        email: formData.email,
        location: formData.location,
        bio: formData.bio,
        profileImage: formData.profileImage,
      };
      if (!user?.username && formData.username) {
        payload.username = formData.username;
      }

      const res = await fetch(updateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errText = 'Unknown error';
        try {
          errText = await res.text();
        } catch (_) {}
        console.error('Failed to update:', errText);
        setErrorMessage('Failed to update profile. Please try again.');
        return;
      }

      // Check response for content before parsing JSON
      const contentType = res.headers.get('content-type');
      let updatedProps = null;
      
      if (contentType && contentType.includes('application/json')) {
        const responseText = await res.text();
        if (responseText.trim()) {
          try {
            updatedProps = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError);
            setErrorMessage('Invalid response from server.');
            return;
          }
        }
      }

      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);

      const finalUserData = updatedProps || { ...user, ...formData };
      if (setUser) setUser(finalUserData);
      if (onSave) onSave(finalUserData);
    } catch (err) {
      console.error('Error while updating profile:', err);
      setErrorMessage('An unexpected error occurred. Please try again later.');
    }
  };

  return (
    <div className="h-100">
      <div className="card h-100">
        <div className="card-header bg-purple text-grey">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Edit Profile</h5>
            <button
              type="button"
              className="btn btn-sm btn-outline-light"
              onClick={handleCancel}
            >
              ×
            </button>
          </div>
        </div>

        <div className="card-body bg-grey overflow-auto" style={{ padding: '1.5rem' }}>
          {/* Error message */}
          {errorMessage && (
            <div className="alert alert-danger alert-dismissible" role="alert">
              {errorMessage}
              <button
                type="button"
                className="btn-close"
                onClick={() => setErrorMessage('')}
              ></button>
            </div>
          )}

          {/* Success message */}
          {successMessage && (
            <div className="alert alert-success alert-dismissible" role="alert">
              {successMessage}
              <button
                type="button"
                className="btn-close"
                onClick={() => setSuccessMessage('')}
              ></button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Profile Image Section */}
            <div className="mb-4">
              <label className="form-label text-navy fw-bold">Profile Picture</label>
              
              <div className="btn-group w-100 mb-3" role="group">
                <button
                  type="button"
                  onClick={() => setActiveTab('avatars')}
                  className={`btn ${activeTab === 'avatars' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  style={{
                    backgroundColor: activeTab === 'avatars' ? 'var(--purple)' : 'transparent',
                    borderColor: 'var(--purple)',
                    color: activeTab === 'avatars' ? 'var(--grey)' : 'var(--purple)'
                  }}
                >
                  Preset Avatars
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('custom')}
                  className={`btn ${activeTab === 'custom' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  style={{
                    backgroundColor: activeTab === 'custom' ? 'var(--purple)' : 'transparent',
                    borderColor: 'var(--purple)',
                    color: activeTab === 'custom' ? 'var(--grey)' : 'var(--purple)'
                  }}
                >
                  Custom Image URL
                </button>
              </div>

              {activeTab === 'avatars' ? (
                <div className="row g-2 mb-3">
                  {AVATAR_OPTIONS.map((avatar) => (
                    <div key={avatar.id} className="col-6">
                      <div
                        onClick={() => handleAvatarSelect(avatar.id)}
                        className={`card text-center p-2 ${selectedAvatar === avatar.id ? 'border-primary' : ''}`}
                        style={{
                          cursor: 'pointer',
                          borderWidth: selectedAvatar === avatar.id ? '2px' : '1px',
                          borderColor: selectedAvatar === avatar.id ? 'var(--purple)' : '#dee2e6',
                          backgroundColor: selectedAvatar === avatar.id ? 'var(--pink)' : '#fff',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <img
                          src={avatar.url}
                          alt={avatar.name}
                          style={{
                            width: avatar.id === 'default' ? '40px' : '32px', // Slightly bigger for default
                            height: avatar.id === 'default' ? '40px' : '32px',
                            objectFit: 'cover',
                            borderRadius: avatar.id === 'default' ? '50%' : '0', // Round for default image
                            margin: '0 auto 6px auto'
                          }}
                        />
                        <div className="small text-navy fw-bold" style={{ fontSize: '11px' }}>
                          {avatar.name}
                        </div>
                        <div className="small text-muted" style={{ fontSize: '9px' }}>
                          {avatar.description}
                        </div>
                        {selectedAvatar === avatar.id && (
                          <div className="mt-2">
                            <span className="badge" style={{ 
                              backgroundColor: 'var(--purple)', 
                              color: 'white',
                              fontSize: '8px'
                            }}>
                              Selected
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Custom URL Input
                <div className="mb-3">
                  <input
                    type="url"
                    className="form-control"
                    value={formData.profileImage || ''}
                    onChange={(e) => handleChange('profileImage', e.target.value)}
                    placeholder="https://example.com/your-image.jpg"
                  />
                  <div className="form-text">
                    Enter a direct link to an image (JPG, PNG, GIF). The image should be publicly accessible.
                  </div>
                </div>
              )}
              
              {/* Profile Preview */}
              <div className="card p-3 mb-3" style={{ backgroundColor: 'var(--pink)' }}>
                <div className="text-center">
                  <label className="form-label text-navy fw-bold mb-2">Preview:</label>
                  <div className="d-flex align-items-center justify-content-center">
                    <img
                      src={formData.profileImage || 'https://via.placeholder.com/60'}
                      alt="Profile preview"
                      className="rounded-circle me-3"
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'cover',
                        border: '3px solid var(--purple)'
                      }}
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/60';
                        if (activeTab === 'custom') {
                          setErrorMessage('Invalid image URL. Please check the URL and try again.');
                        }
                      }}
                      onLoad={() => {
                        if (activeTab === 'custom') {
                          setErrorMessage('');
                        }
                      }}
                    />
                    <div className="text-start">
                      <div className="fw-bold text-navy">{formData.username || 'Username'}</div>
                      <div className="small text-navy">{formData.location || 'No location set'}</div>
                      {formData.bio && (
                        <div className="small text-muted" style={{ fontSize: '12px' }}>
                          {formData.bio.slice(0, 30)}{formData.bio.length > 30 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form fields */}
            <div className="mb-3">
              <label htmlFor="edit-username" className="form-label text-navy fw-bold">
                Username
              </label>
              <input
                type="text"
                className="form-control"
                id="edit-username"
                value={formData.username || ''}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="Enter your username"
                disabled={Boolean(user?.username)}
                style={{ backgroundColor: user?.username ? '#f8f9fa' : undefined }}
              />
{user?.username && (
                <div className="form-text">Username cannot be changed</div>
              )}            </div>

            <div className="mb-3">
              <label htmlFor="edit-email" className="form-label text-navy fw-bold">
                Email
              </label>
              <input
                type="email"
                className="form-control"
                id="edit-email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="Enter your email"
              />
            </div>

            <div className="mb-3">
              <label htmlFor="edit-location" className="form-label text-navy fw-bold">
                Location
              </label>
              <input
                type="text"
                className="form-control"
                id="edit-location"
                value={formData.location || ''}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="City, Country"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="edit-bio" className="form-label text-navy fw-bold">
                Bio
              </label>
              <textarea
                className="form-control"
                id="edit-bio"
                rows="3"
                maxLength="500"
                value={formData.bio || ''}
                onChange={(e) => handleChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
              />
              <div className="form-text">
                {formData.bio.length}/500 characters
              </div>
            </div>

            {/* Action buttons */}
            <div className="d-grid gap-2">
              <button
                type="submit"
                className="btn fw-bold"
                style={{
                  backgroundColor: 'var(--purple)',
                  borderColor: 'var(--purple)',
                  color: 'var(--grey)'
                }}
              >
                Save Changes
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfileForm;