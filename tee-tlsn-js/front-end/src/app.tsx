import React, { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

import './app.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import { Notarization } from './components/notarize';
import { VerifyAttributeAttestation } from './components/verify';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(<App />);

function App(): ReactElement {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<VerifyAttributeAttestation />} />
          <Route path="/notarize" element={<Notarization />} />
          <Route path="/verify" element={<VerifyAttributeAttestation />} />
        </Routes>
      </div>
    </Router>
  );
}
