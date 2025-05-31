import React, { useEffect } from 'react';
import Reveal from 'reveal.js';
import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/white.css';

const App: React.FC = () => {
  useEffect(() => {
    const deck = new Reveal({
      controls: true,
      progress: true,
      center: true,
      hash: true,
    })
    deck.initialize();
  }, []);

  return (
    <div className="reveal">
      <div className="slides">
        {/* Title Slide */}
        <section>
          <h1>Your Research Title</h1>
          <h3>Your Name</h3>
          <p>Institution Name</p>
          <p>Date</p>
        </section>

        {/* Introduction */}
        <section>
          <h2>Introduction</h2>
          <ul>
            <li>Background</li>
            <li>Research Question</li>
            <li>Objectives</li>
          </ul>
        </section>

        {/* Methods */}
        <section>
          <h2>Methods</h2>
          <ul>
            <li>Study Design</li>
            <li>Data Collection</li>
            <li>Analysis Approach</li>
          </ul>
        </section>

        {/* Results */}
        <section>
          <h2>Results</h2>
          <ul>
            <li>Key Finding 1</li>
            <li>Key Finding 2</li>
            <li>Key Finding 3</li>
          </ul>
        </section>

        {/* Discussion */}
        <section>
          <h2>Discussion</h2>
          <ul>
            <li>Interpretation of Results</li>
            <li>Implications</li>
            <li>Future Directions</li>
          </ul>
        </section>

        {/* Conclusion */}
        <section>
          <h2>Conclusion</h2>
          <ul>
            <li>Summary of Findings</li>
            <li>Main Contributions</li>
            <li>Recommendations</li>
          </ul>
        </section>

        {/* Thank You Slide */}
        <section>
          <h2>Thank You</h2>
          <p>Questions & Discussion</p>
          <p>Contact: your.email@institution.edu</p>
        </section>
      </div>
    </div>
  );
};

export default App;