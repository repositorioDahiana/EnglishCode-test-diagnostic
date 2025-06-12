import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/layouts/Header';
import Home from './components/pages/Home';
import About from './components/pages/test';
import FeedbackEnd from "./components/pages/FeedbackEnd";

export default function App() {
  return (
    <div>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/test" element={<About />} />
        <Route path="/feedback-end" element={<FeedbackEnd />} />
      </Routes>
    </div>
  );
}
