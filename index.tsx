
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// وظيفة لإخفاء شاشة التحميل
const hideLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
    }, 500);
  }
};

// الرندرة مع التأكد من إخفاء اللودر بعدها
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// إخفاء اللودر بعد وقت قصير لضمان اكتمال التحميل البصري
setTimeout(hideLoader, 500);
