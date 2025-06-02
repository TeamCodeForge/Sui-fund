import { jwtToAddress, computeZkLoginAddress } from '@mysten/sui/zklogin';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';

interface ZkLoginConfig {
  clientId: string;
  redirectUri: string;
  provider: 'google' | 'facebook' | 'twitch';
}

interface ZkLoginSession {
  jwt: string;
  ephemeralKeyPair: Ed25519Keypair;
  userSalt: bigint;
  address: string;
}

export class ZkLoginManager {
  private config: ZkLoginConfig;
  private ephemeralKeyPair: Ed25519Keypair | null = null;
  private userSalt: bigint | null = null;

  constructor(config: ZkLoginConfig) {
    this.config = config;
  }

  // Generate ephemeral keypair and initiate OAuth flow
  async initiateLogin(): Promise<void> {
    // Generate ephemeral keypair
    this.ephemeralKeyPair = Ed25519Keypair.generate();
    
    // Store ephemeral keypair in session storage
    sessionStorage.setItem('ephemeralKeyPair', JSON.stringify({
      secretKey: Array.from(this.ephemeralKeyPair.getSecretKey()),
      publicKey: this.ephemeralKeyPair.getPublicKey().toBase64()
    }));

    // Construct OAuth URL
    const oauthUrl = this.constructOAuthUrl();
    
    // Redirect to OAuth provider
    window.location.href = oauthUrl;
  }

  private constructOAuthUrl(): string {
    const baseUrl = this.getProviderBaseUrl();
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'id_token',
      scope: 'openid',
      nonce: this.generateNonce(),
    });

    return `${baseUrl}?${params.toString()}`;
  }

  private getProviderBaseUrl(): string {
    switch (this.config.provider) {
      case 'google':
        return 'https://accounts.google.com/oauth/v2/auth';
      case 'facebook':
        return 'https://www.facebook.com/v18.0/dialog/oauth';
      case 'twitch':
        return 'https://id.twitch.tv/oauth2/authorize';
      default:
        throw new Error('Unsupported provider');
    }
  }

  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Process the JWT token after OAuth callback
  async processCallback(jwt: string, userSalt: string): Promise<ZkLoginSession> {
    // Restore ephemeral keypair from session storage
    const storedKeyPair = sessionStorage.getItem('ephemeralKeyPair');
    if (!storedKeyPair) {
      throw new Error('Ephemeral keypair not found');
    }

    const keyPairData = JSON.parse(storedKeyPair);
    this.ephemeralKeyPair = Ed25519Keypair.fromSecretKey(new Uint8Array(keyPairData.secretKey));
    this.userSalt = BigInt(userSalt);

    // Compute zkLogin address
    const address = computeZkLoginAddress({
      claimName: 'sub',
      claimValue: this.extractSubFromJWT(jwt),
      iss: this.extractIssFromJWT(jwt),
      aud: this.config.clientId,
      userSalt: this.userSalt,
    });

    const session: ZkLoginSession = {
      jwt,
      ephemeralKeyPair: this.ephemeralKeyPair,
      userSalt: this.userSalt,
      address
    };

    // Store session
    this.storeSession(session);

    return session;
  }

  private extractSubFromJWT(jwt: string): string {
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    return payload.sub;
  }

  private extractIssFromJWT(jwt: string): string {
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    return payload.iss;
  }

  private storeSession(session: ZkLoginSession): void {
    localStorage.setItem('zkLoginSession', JSON.stringify({
      jwt: session.jwt,
      ephemeralKeyPair: {
        secretKey: Array.from(session.ephemeralKeyPair.getSecretKey()),
        publicKey: session.ephemeralKeyPair.getPublicKey().toBase64()
      },
      userSalt: session.userSalt.toString(),
      address: session.address
    }));
  }

  getStoredSession(): ZkLoginSession | null {
    const stored = localStorage.getItem('zkLoginSession');
    if (!stored) return null;

    try {
      const data = JSON.parse(stored);
      return {
        jwt: data.jwt,
        ephemeralKeyPair: Ed25519Keypair.fromSecretKey(new Uint8Array(data.ephemeralKeyPair.secretKey)),
        userSalt: BigInt(data.userSalt),
        address: data.address
      };
    } catch (error) {
      console.error('Error parsing stored session:', error);
      return null;
    }
  }

  clearSession(): void {
    localStorage.removeItem('zkLoginSession');
    sessionStorage.removeItem('ephemeralKeyPair');
  }

  isLoggedIn(): boolean {
    return this.getStoredSession() !== null;
  }
}

// Default configuration for Google OAuth
export const defaultZkLoginConfig: ZkLoginConfig = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '1001555477898-b2of27f1vdovqao3oc421apk4ulanjol.apps.googleusercontent.com',
  redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/auth/',
  provider: 'google'
};

export const zkLoginManager = new ZkLoginManager(defaultZkLoginConfig);
