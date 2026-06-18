/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

declare module "*.module.scss" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "*.scss" {
  const content: string;
  export default content;
}

declare global {
  interface Document {
    startViewTransition?: (updateCallback: () => void) => {
      finished: Promise<void>;
      ready: Promise<void>;
      updateCallbackDone: Promise<void>;
      skipTransition: () => void;
    };
  }

  interface CodeProxyDesktopBridge {
    isDesktop: boolean;
    frameless?: boolean;
    platform: NodeJS.Platform;
    versions: {
      chrome: string;
      electron: string;
      node: string;
    };
    getBackendBase: () => Promise<string>;
    minimizeWindow?: () => Promise<void>;
    toggleWindowMaximize?: () => Promise<boolean>;
    closeWindow?: () => Promise<void>;
    isWindowMaximized?: () => Promise<boolean>;
    onWindowMaximizeChanged?: (listener: (maximized: boolean) => void) => () => void;
  }

  interface Window {
    codeProxyDesktop?: CodeProxyDesktopBridge;
  }
}

export {};
