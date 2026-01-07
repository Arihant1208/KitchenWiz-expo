/**
 * OAuth Service for Google and Microsoft Sign-In
 * 
 * To enable OAuth, install the required packages:
 * 
 * For Google:
 * npm install @react-native-google-signin/google-signin
 * 
 * For Microsoft:
 * npm install @azure/msal-react-native
 * 
 * Then configure your OAuth credentials in the respective developer consoles
 * and update this file with the actual SDK implementations.
 */

/**
 * Google Sign-In Configuration
 * 
 * Follow these steps to enable Google Sign-In:
 * 
 * 1. Install the package:
 *    npm install @react-native-google-signin/google-signin
 * 
 * 2. Configure OAuth in Google Cloud Console:
 *    - Go to https://console.cloud.google.com/
 *    - Create/select a project
 *    - Enable Google+ API
 *    - Create OAuth 2.0 credentials (iOS and Android)
 *    - Download google-services.json (Android) and GoogleService-Info.plist (iOS)
 * 
 * 3. Add to app.json:
 *    {
 *      "expo": {
 *        "android": {
 *          "googleServicesFile": "./google-services.json"
 *        },
 *        "ios": {
 *          "googleServicesFile": "./GoogleService-Info.plist"
 *        }
 *      }
 *    }
 * 
 * 4. Uncomment the implementation below and update with your Web Client ID
 */

interface GoogleSignInResult {
  idToken: string;
  user: {
    email: string;
    name: string;
    photo?: string;
  };
}

export const googleSignIn = async (): Promise<GoogleSignInResult> => {
  // TODO: Uncomment and configure when package is installed
  /*
  import { GoogleSignin } from '@react-native-google-signin/google-signin';
  
  // Configure Google Sign-In
  GoogleSignin.configure({
    webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // From Google Cloud Console
    offlineAccess: true,
  });

  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const tokens = await GoogleSignin.getTokens();
    
    return {
      idToken: tokens.idToken,
      user: {
        email: userInfo.user.email,
        name: userInfo.user.name || '',
        photo: userInfo.user.photo || undefined,
      },
    };
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw new Error('Google sign-in failed');
  }
  */

  throw new Error('Google Sign-In not configured. See oauth.ts for setup instructions.');
};

/**
 * Microsoft Sign-In Configuration
 * 
 * Follow these steps to enable Microsoft Sign-In:
 * 
 * 1. Install the package:
 *    npm install @azure/msal-react-native
 * 
 * 2. Register your app in Azure Portal:
 *    - Go to https://portal.azure.com/
 *    - Navigate to Azure Active Directory > App registrations
 *    - Register a new application
 *    - Add Mobile platform with redirect URI
 *    - Note your Application (client) ID
 * 
 * 3. Configure scopes and permissions in Azure
 * 
 * 4. Uncomment the implementation below and update with your Client ID
 */

interface MicrosoftSignInResult {
  idToken: string;
  user: {
    email: string;
    name: string;
  };
}

export const microsoftSignIn = async (): Promise<MicrosoftSignInResult> => {
  // TODO: Uncomment and configure when package is installed
  /*
  import { MSALClient } from '@azure/msal-react-native';
  
  const msalClient = new MSALClient({
    auth: {
      clientId: 'YOUR_MICROSOFT_CLIENT_ID', // From Azure Portal
      authority: 'https://login.microsoftonline.com/common',
    },
  });

  try {
    const result = await msalClient.acquireToken({
      scopes: ['openid', 'profile', 'email'],
    });
    
    return {
      idToken: result.idToken,
      user: {
        email: result.account.username,
        name: result.account.name || '',
      },
    };
  } catch (error) {
    console.error('Microsoft Sign-In Error:', error);
    throw new Error('Microsoft sign-in failed');
  }
  */

  throw new Error('Microsoft Sign-In not configured. See oauth.ts for setup instructions.');
};

/**
 * Check if OAuth providers are configured
 */
export const isGoogleSignInAvailable = (): boolean => {
  // TODO: Return true when Google Sign-In is properly configured
  return false;
};

export const isMicrosoftSignInAvailable = (): boolean => {
  // TODO: Return true when Microsoft Sign-In is properly configured
  return false;
};
