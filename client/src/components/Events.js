import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../style.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

function Events() {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        
        // Fetch upcoming events
        const upcomingRes = await fetch(`${API_BASE}/api/events/calendar-events`, { 
          credentials: 'include' 
        });
        const upcomingData = await upcomingRes.json();
        setUpcomingEvents(Array.isArray(upcomingData) ? upcomingData : []);

        // Fetch past events
        const pastRes = await fetch(`${API_BASE}/api/events/past-events`);
        const pastData = await pastRes.json();
        setPastEvents(Array.isArray(pastData) ? pastData : []);

      } catch (err) {
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const parseEventDate = (event) => {
    const dateValue = event.start?.dateTime || event.start || event.date;
    
    if (!dateValue) {
      return null;
    }
    
    const eventDate = new Date(dateValue);
    
    // Check if the date is valid
    if (isNaN(eventDate.getTime())) {
      return null;
    }
    
    return eventDate;
  };

  const renderEventList = (events) => {
    if (events.length === 0) {
      return (
        <div className="events-empty">
          No events found
        </div>
      );
    }

    return (
      <div className="row">
        {events.map((event, index) => {
          const eventDate = parseEventDate(event);
          
          let day, month, year, time;
          if (eventDate) {
            day = eventDate.getDate();
            month = eventDate.toLocaleString('default', { month: 'short' });
            year = eventDate.getFullYear();
            time = eventDate.toLocaleTimeString('default', { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
          }

          return (
            <div key={index} className="col-md-6 col-lg-4 mb-4">
              <div className="card event-card h-100">
                <div className="card-body event-card-body">
                  <div className="d-flex align-items-start mb-3">
                    {eventDate ? (
                      <div className="event-date-box me-3">
                        <div className="event-date-day">{day}</div>
                        <div className="event-date-month">
                          {month} {year}
                        </div>
                      </div>
                    ) : (
                      <div className="event-date-box me-3">
                        <div className="event-date-day">-</div>
                        <div className="event-date-month">
                          No Date
                        </div>
                      </div>
                    )}
                    <div className="flex-grow-1">
                      <h5 className="event-title">
                        {event.summary || event.title}
                      </h5>
                      {event.location && (
                        <p className="event-meta">
                          📍 {event.location}
                        </p>
                      )}
                      {eventDate && (
                        <p className="event-meta">
                          🕒 {time}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {event.description && (
                    <p className="event-description">
                      {event.description.length > 100 
                        ? `${event.description.substring(0, 100)}...` 
                        : event.description}
                    </p>
                  )}
                  
                  <Link 
                    to={`/events/${event.id || index}`}
                    className="event-details-btn"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container-fluid events-page">
        <div className="text-center">
          <div className="spinner-border events-loading" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid events-page">
      <div className="row mb-4">
        <div className="col">
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="events-header">Events</h1>
            <Link to="/home" className="events-back-btn">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col">
          <ul className="nav nav-tabs events-tabs">
            <li className="nav-item">
              <button
                className={`nav-link events-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
                onClick={() => setActiveTab('upcoming')}
              >
                Upcoming ({upcomingEvents.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link events-tab ${activeTab === 'past' ? 'active' : ''}`}
                onClick={() => setActiveTab('past')}
              >
                Past Events ({pastEvents.length})
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="row">
        <div className="col">
          {activeTab === 'upcoming' 
            ? renderEventList(upcomingEvents)
            : renderEventList(pastEvents)
          }
        </div>
      </div>
    </div>
  );
}

export default Events;