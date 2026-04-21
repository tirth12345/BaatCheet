import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { socket } from '../socket';
import './VideoChat.css';

interface VideoRoom {
  _id: string;
  name: string;
  description: string;
  maxParticipants: number;
  isActive: boolean;
}

interface CreateRoomForm {
  name: string;
  description: string;
  maxParticipants: number;
}

export default function VideoChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<VideoRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [formData, setFormData] = useState<CreateRoomForm>({
    name: '',
    description: '',
    maxParticipants: 4,
  });

  useEffect(() => {
    // Redirect if not logged in
    if (!user) {
      navigate('/');
      return;
    }

    fetchRooms();

    // Socket listeners for real-time updates
    if (!socket.connected) {
      socket.connect();
    }

    socket.on('rooms-updated', () => {
      console.log('Rooms updated event received, refreshing list...');
      fetchRooms();
    });

    return () => {
      socket.off('rooms-updated');
    };
  }, [user, navigate]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5001/api/video-chat/rooms');
      
      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }

      const data = await response.json();
      setRooms(data);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError('Failed to load video chat rooms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setCreateError('Room name is required');
      return;
    }

    try {
      setCreating(true);
      setCreateError('');

      const response = await fetch('http://localhost:5001/api/video-chat/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
          'x-user-name': user?.username || '',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          maxParticipants: formData.maxParticipants,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create room');
      }

      const newRoom = await response.json();
      
      // Add the new room to the list
      setRooms([...rooms, newRoom]);
      
      // Reset form and close modal
      setFormData({ name: '', description: '', maxParticipants: 4 });
      setShowCreateModal(false);
      
      // Navigate to the new room
      navigate(`/video-chat/${newRoom._id}`);
    } catch (err: any) {
      console.error('Error creating room:', err);
      setCreateError(err.message || 'Failed to create video chat room');
    } finally {
      setCreating(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'maxParticipants' ? parseInt(value) : value,
    }));
  };

  const handleJoinRoom = (roomId: string) => {
    navigate(`/video-chat/${roomId}`);
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="video-chat-container">
        <div className="loading">Loading video chat rooms...</div>
      </div>
    );
  }

  return (
    <div className="video-chat-container">
      <div className="video-chat-header">
        <h1>Live Video Chat</h1>
        <p>Join a room to connect with others in real-time</p>
        <button
          className="start-chat-button"
          onClick={() => setShowCreateModal(true)}
        >
          + Start New Video Chat
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="rooms-grid">
        {rooms.length === 0 ? (
          <div className="no-rooms">
            <p>No video chat rooms available at this time.</p>
            <p>Be the first to start one!</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div key={room._id} className="room-card">
              <div className="room-header">
                <h3>{room.name}</h3>
                <span className={`status ${room.isActive ? 'active' : 'inactive'}`}>
                  {room.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <p className="room-description">{room.description}</p>
              
              <div className="room-info">
                <span className="max-participants">
                  Max: {room.maxParticipants} people
                </span>
              </div>

              <button
                className="join-button"
                onClick={() => handleJoinRoom(room._id)}
                disabled={!room.isActive}
              >
                {room.isActive ? 'Join Room' : 'Room Closed'}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Start New Video Chat</h2>
              <button
                className="close-button"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="create-room-form">
              <div className="form-group">
                <label htmlFor="name">Room Name *</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Enter room name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={creating}
                  maxLength={50}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Enter room description (optional)"
                  value={formData.description}
                  onChange={handleInputChange}
                  disabled={creating}
                  maxLength={200}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxParticipants">Max Participants</label>
                <select
                  id="maxParticipants"
                  name="maxParticipants"
                  value={formData.maxParticipants}
                  onChange={handleInputChange as any}
                  disabled={creating}
                >
                  <option value={2}>2 people</option>
                  <option value={4}>4 people</option>
                  <option value={6}>6 people</option>
                  <option value={8}>8 people</option>
                  <option value={10}>10 people</option>
                </select>
              </div>

              {createError && (
                <div className="error-message">{createError}</div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="create-button"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create & Start Chat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
