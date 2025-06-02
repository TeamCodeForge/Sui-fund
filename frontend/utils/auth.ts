interface TokenResponse {
  access?: string;
  refresh?: string;
  token?: string; // Some APIs use "token" instead of "access"
}

/**
 * Stores authentication tokens in localStorage
 */
export const storeTokens = (data: TokenResponse): void => {
  if (data.token) {
    localStorage.setItem('token', data.token);
  }
  
  if (data.access) {
    localStorage.setItem('token', data.access);
  }
  
  if (data.refresh) {
    localStorage.setItem('refresh', data.refresh);
  }
};

/**
 * Retrieves the authentication token
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem('token') || localStorage.getItem('token');
};

/**
 * Retrieves the refresh token
 */
export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refresh');
};

/**
 * Clears all authentication tokens
 */
export const clearTokens = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('token');
  localStorage.removeItem('refresh');
};

/**
 * Refreshes the authentication token using the refresh token
 */
export const refreshAuthToken = async (): Promise<boolean> => {
  const refreshToken = getRefreshToken();
  
  if (!refreshToken) {
    return false;
  }
  
  try {
    const response = await fetch('/auth/refreshToken/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }
    
    const data = await response.json();
    storeTokens(data);
    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
};

/**
 * Checks if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};
