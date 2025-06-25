import React, { createContext } from 'react';

const hostname = window.location.hostname;
const baseUrl = `http://${hostname}:5000`;

export const BaseUrlContext = createContext(baseUrl);

export const BaseUrlProvider = ({ children }) => {
  return (
    <BaseUrlContext.Provider value={baseUrl}>
      {children}
    </BaseUrlContext.Provider>
  );
};
