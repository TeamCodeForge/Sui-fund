'use client';
import "@/styles/globals.css";
import '@mysten/dapp-kit/dist/index.css'
import type { AppProps } from "next/app";
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer, toast } from 'react-toastify';


const queryClient = new QueryClient();
const networks = {
  devnet: { url: getFullnodeUrl('devnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
};


export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="devnet">
        <WalletProvider>
          <Component {...pageProps} />
          <ToastContainer />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
