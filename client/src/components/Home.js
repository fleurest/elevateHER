import React, { useState, useEffect } from 'react';
import HamburgerMenu from './HamburgerMenu';
import App from '../App';

function HomePage({ handleLogout }) {
  const [homePageData, setHomePageData] = useState(null);

  // starter home page data
  useEffect(() => {
    setHomePageData({
      welcomeMessage: 'Welcome to the ElevateHER App',
      featuredArticle: 'Lookup your favourite players',
      upcomingEvent: 'Next Match',
    });
  }, []);

  return (
    <div className="App-home-page">
      <HamburgerMenu handleLogout={handleLogout} />
      <div className="App-top-panel">
        {/* TODO: Add Logo or Header */}
        <h1>ElevateHER</h1>
      </div>

      <div className="App-main-content">
        <div className="App-left-panel">
          <h2>Home</h2>
          {homePageData ? (
            <div>
              <p><strong>{homePageData.welcomeMessage}</strong></p>
              <p><strong>Search for:</strong> {homePageData.featuredArticle}</p>
              <p><strong>Upcoming Event:</strong> {homePageData.upcomingEvent}</p>
            </div>
          ) : (
            <p>Loading home page data...</p>
          )}
        </div>

        <div className="App-center-panel">
          <h2>Latest News</h2>
          <ul>
            <li>New player data available now</li>
            <li>Join our new community</li>
            <li>ElevateHER's latest partnerships announced.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
