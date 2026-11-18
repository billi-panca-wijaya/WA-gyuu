export type SessionConnectionState =
  | 'created'
  | 'starting'
  | 'pairing'
  | 'ready'
  | 'reconnecting'
  | 'stopped'
  | 'logged_out'
  | 'action_required'
  | 'failed';

export interface SessionCallbacks {
  onQr?: (qrDataUrl: string) => void;
  onReady?: (phoneE164: string) => void;
  onStateChange?: (state: SessionConnectionState) => void;
  onError?: (error: any) => void;
}

export interface IWhatsAppEngineAdapter {
  startSession(sessionId: string, callbacks: SessionCallbacks): Promise<void>;
  stopSession(sessionId: string): Promise<void>;
  logoutSession(sessionId: string): Promise<void>;
  sendTextMessage(
    sessionId: string,
    toPhoneE164: string,
    message: string,
  ): Promise<{ deliveryId: string; status: string }>;
  getSessionState(sessionId: string): SessionConnectionState;
}
