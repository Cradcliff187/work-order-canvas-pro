import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface BiometricOptions {
  challenge: Uint8Array;
  timeout: number;
  userVerification: 'required' | 'preferred' | 'discouraged';
}

export interface BiometricCredential {
  id: string;
  rawId: ArrayBuffer;
  type: 'public-key';
  response: AuthenticatorAssertionResponse;
}

export function useBiometric() {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { toast } = useToast();

  const checkSupport = useCallback(async () => {
    try {
      const supported = !!(window.PublicKeyCredential && 
                          navigator.credentials && 
                          navigator.credentials.create &&
                          navigator.credentials.get);
      
      setIsSupported(supported);
      
      if (supported) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsAvailable(available);
      }
      
      return supported;
    } catch (error) {
      console.error('Biometric support check failed:', error);
      setIsSupported(false);
      setIsAvailable(false);
      return false;
    }
  }, []);

  const enrollBiometric = useCallback(async (userId: string, userName: string) => {
    if (!isSupported || !isAvailable) {
      toast({
        title: "Biometric Not Available",
        description: "Your device doesn't support biometric authentication.",
        variant: "destructive"
      });
      return null;
    }

    setIsEnrolling(true);

    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const createOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "WorkOrderPro",
          id: window.location.hostname
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: userName,
          displayName: userName
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" }
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          requireResidentKey: false
        },
        timeout: 60000,
        attestation: "direct"
      };

      const credential = await navigator.credentials.create({
        publicKey: createOptions
      }) as PublicKeyCredential;

      if (credential) {
        // Store credential info in localStorage
        const credentialInfo = {
          id: credential.id,
          rawId: Array.from(new Uint8Array(credential.rawId)),
          userId,
          createdAt: Date.now()
        };
        
        localStorage.setItem('biometric_credential', JSON.stringify(credentialInfo));
        
        toast({
          title: "Biometric Enrolled",
          description: "You can now use biometric authentication to sign in."
        });
        
        return credential;
      }
      
      return null;
    } catch (error) {
      console.error('Biometric enrollment failed:', error);
      
      let message = "Biometric enrollment failed.";
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          message = "Biometric enrollment was cancelled or denied.";
        } else if (error.name === 'NotSupportedError') {
          message = "Biometric authentication is not supported on this device.";
        }
      }
      
      toast({
        title: "Enrollment Failed",
        description: message,
        variant: "destructive"
      });
      
      return null;
    } finally {
      setIsEnrolling(false);
    }
  }, [isSupported, isAvailable, toast]);

  const authenticateWithBiometric = useCallback(async (): Promise<string | null> => {
    if (!isSupported || !isAvailable) {
      return null;
    }

    const credentialInfo = localStorage.getItem('biometric_credential');
    if (!credentialInfo) {
      toast({
        title: "No Biometric Setup",
        description: "Please set up biometric authentication first.",
        variant: "destructive"
      });
      return null;
    }

    setIsAuthenticating(true);

    try {
      const stored = JSON.parse(credentialInfo);
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const getOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [{
          id: new Uint8Array(stored.rawId),
          type: "public-key",
          transports: ["internal"]
        }],
        userVerification: "required",
        timeout: 60000
      };

      const assertion = await navigator.credentials.get({
        publicKey: getOptions
      }) as PublicKeyCredential;

      if (assertion) {
        // In a real app, you'd verify the assertion with your server
        // For now, we'll just return the user ID
        return stored.userId;
      }
      
      return null;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      
      let message = "Biometric authentication failed.";
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          message = "Biometric authentication was cancelled.";
        } else if (error.name === 'InvalidStateError') {
          message = "Please try again.";
        }
      }
      
      toast({
        title: "Authentication Failed",
        description: message,
        variant: "destructive"
      });
      
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  }, [isSupported, isAvailable, toast]);

  const removeBiometric = useCallback(() => {
    localStorage.removeItem('biometric_credential');
    toast({
      title: "Biometric Removed",
      description: "Biometric authentication has been disabled."
    });
  }, [toast]);

  const hasBiometricCredential = useCallback(() => {
    return !!localStorage.getItem('biometric_credential');
  }, []);

  return {
    isSupported,
    isAvailable,
    isEnrolling,
    isAuthenticating,
    checkSupport,
    enrollBiometric,
    authenticateWithBiometric,
    removeBiometric,
    hasBiometricCredential
  };
}