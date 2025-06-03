'use client';
import "@/styles/globals.css";
import '@mysten/dapp-kit/dist/index.css'
import type { AppProps } from "next/app";
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import UserProvider from "@/providers/UserProvider";
import { ReactElement, ReactNode } from 'react';

const queryClient = new QueryClient();
const networks = {
  devnet: { url: getFullnodeUrl('devnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
};

// Add this type to extend the default Component type with getLayout
type AppPropsWithLayout = AppProps & {
  Component: AppProps['Component'] & {
    getLayout?: (page: ReactElement) => ReactNode;
  }
}

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout ?? ((page: ReactElement) => page);

  return (
    <UserProvider>
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networks} defaultNetwork="devnet">
          <WalletProvider>
            {getLayout(
              <>
                <Component {...pageProps} />
                <ToastContainer />
              </>
            )}
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </UserProvider>
  );
}