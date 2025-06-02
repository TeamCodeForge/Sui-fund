import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { isAuthenticated } from './auth';

const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  const AuthenticatedComponent = (props: P) => {
    const router = useRouter();
    
    useEffect(() => {
      if (!isAuthenticated()) {
        router.replace('/');
      }
    }, [router]);
    
    return isAuthenticated() ? <Component {...props} /> : null;
  };
  
  return AuthenticatedComponent;
};

export default withAuth;
