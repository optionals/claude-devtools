
import React from 'react';
import { render } from 'ink';
import App from './App';

// Handle unhandled rejections to prevent crashing without logging
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

render(<App />);
