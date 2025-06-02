// Type definitions
interface DateFormatOptions {
    day: 'numeric';
    month: 'short' | 'long';
    year: 'numeric';
    hour?: 'numeric';
    minute?: '2-digit';
    hour12?: boolean;
  }
  
  interface ApiResponse<T = any> {
    type: ResponseType;
    payload?: T;
    message?: string;
    link?: string;
  }
  
  interface ErrorResponse {
    message?: string;
    detail?: string;
    code?: string;
  }
  
  interface TokenData {
    access: string;
    refresh: string;
  }
  
  interface RequestOptions extends RequestInit {
    headers?: Record<string, string>;
  }
  
  // Enums for better type safety
  enum ResponseType {
    REDIRECT = "redirect",
    SUCCESS = "success",
    KNOWN_ERROR = "known_error",
    EXPIRED = "expired",
  }
  
  enum ApiEndpoint {
    REFRESH = "/auth/refreshToken/",
    SIGNIN = "/auth/signin/",
    CONFIRM = "/auth/confirm/",
  }


  export {ResponseType};
  
  // Date formatting functions
  export function formatLongDate(date: Date): string {
    const options: DateFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    
    return date.toLocaleString('en-US', options)
      .replace(/(\d+) (\w+), (\d+) (\d+):(\d+) (\w+)/, '$1 $2, $3 at $4:$5 $6');
  }
  
  export function formatDate(date: Date): string {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return formatter.format(date).replace(/,/g, '');
  }
  
  export function calculateRelativeTime(datetimeStr: string): string {
    const datetime = new Date(datetimeStr);
    const now = new Date();
  
    // Calculate the difference in milliseconds
    const diff = now.getTime() - datetime.getTime();
  
    // Calculate the difference in seconds, minutes, hours, days, months, and years
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(months / 12);
  
    // Determine the appropriate time unit to display
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''} ago`;
    } else if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
    }
  }
  
  // Main request function
  export default async function makeRequest<T = any>(
    url: string, 
    options: RequestOptions = {}, 
    signed: boolean = false
  ): Promise<ApiResponse<T>> {
    const accessToken = localStorage.getItem("token");
  
    // Configure headers
    const requestOptions: RequestOptions = {
      ...options,
      headers: {
        ...options.headers,
        ...(signed && accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    };
  
    // Early return if no token for signed request
    if (signed && !accessToken) {
      return { type: ResponseType.REDIRECT, link: ApiEndpoint.SIGNIN };
    }
  
    try {
      const response = await fetch(url, requestOptions);
      return await handleResponse<T>(response, url, requestOptions);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Network error: ${errorMessage}`);
    }
  }
  
  // Handle API responses
  async function handleResponse<T>(
    response: Response, 
    url: string, 
    options: RequestOptions
  ): Promise<ApiResponse<T>> {
    const { status } = response;
  
    switch (status) {
      case 200:
        return {
          type: ResponseType.SUCCESS,
          payload: await response.json() as T,
        };
  
      case 201:
        return {
          type: ResponseType.SUCCESS,
          payload: await response.json() as T,
        };
  
      case 204:
        return {
          type: ResponseType.SUCCESS,
          payload: { message: 'Deleted' } as T,
        };
  
      case 401:
        return await handleUnauthorized<T>(response, url, options);
  
      case 403:
        return {
          type: ResponseType.REDIRECT,
          link: ApiEndpoint.CONFIRM,
        };
  
      case 406:
        const error: ErrorResponse = await response.json();
        return {
          type: ResponseType.KNOWN_ERROR,
          message: error.message,
        };
  
      default:
        throw new Error(`Server Error: ${status}`);
    }
  }
  
  // Handle unauthorized responses
  async function handleUnauthorized<T>(
    response: Response, 
    url: string, 
    options: RequestOptions
  ): Promise<ApiResponse<T>> {
    const data: ErrorResponse = await response.json();
  
    if (data.code === "user_not_found") {
      return { type: ResponseType.REDIRECT, link: ApiEndpoint.SIGNIN };
    }
  
    const refreshed = await refresh();
    if (refreshed) {
      return await makeRequest<T>(url, options, true);
    }
  
    console.log('user session has expired!');
    window.localStorage.clear();
  
    return { type: ResponseType.EXPIRED, link: ApiEndpoint.SIGNIN };
  }
  
  // Refresh token function
  export async function refresh(): Promise<boolean> {
    const refreshToken = localStorage.getItem("refresh");
  
    if (!refreshToken) return false;
  
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}${ApiEndpoint.REFRESH}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh: refreshToken }),
        }
      );
  
      if (response.ok) {
        const data: TokenData = await response.json();
        localStorage.setItem("token", data.access);
        localStorage.setItem("refresh", data.refresh);
        return true;
      }
  
      return false;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
  }