/// <reference types="vite/client" />
/// <reference types="react" />

// Cho phép mọi thẻ HTML/3D trong JSX để không bao giờ bị báo lỗi thẻ lạ
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

// Khai báo module Google Gemini
declare module '@google/genai' {
  export class GoogleGenAI {
    constructor(config: { apiKey: string });
    models: {
      generateContent(config: { model: string; contents: string }): Promise<{ text: string }>;
    };
  }
}

// Khai báo module MediaPipe
declare module '@mediapipe/tasks-vision' {
  export class FilesetResolver {
    static forVisionTasks(url: string): Promise<any>;
  }
  export class HandLandmarker {
    static createFromOptions(vision: any, options: any): Promise<any>;
    detectForVideo(video: HTMLVideoElement, startTime: number): any;
    close(): void;
  }
}

// Khai báo module Three Stdlib
declare module 'three-stdlib' {
  export type OrbitControls = any;
}

// Khai báo biến môi trường
declare namespace NodeJS {
  interface ProcessEnv {
    readonly API_KEY: string;
    [key: string]: string | undefined;
  }
}