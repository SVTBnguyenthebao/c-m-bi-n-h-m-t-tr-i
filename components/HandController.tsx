import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { HandGestureState } from '../types';

interface HandControllerProps {
  onUpdate: (state: HandGestureState) => void;
  className?: string;
  onCameraReady?: () => void;
}

const HandController: React.FC<HandControllerProps> = ({ onUpdate, className, onCameraReady }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const requestRef = useRef<number>(0);
  
  // Sử dụng any cho landmarker để tránh lỗi type phức tạp của thư viện
  const landmarkerRef = useRef<any>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  // --- SỬA LỖI: Đưa hàm drawLandmarks lên trước useEffect ---
  const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    if (!ctx || !ctx.canvas) return;

    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    ctx.clearRect(0, 0, width, height);
    
    // Vẽ xương bàn tay
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Ngón cái
      [0, 5], [5, 6], [6, 7], [7, 8], // Ngón trỏ
      [0, 9], [9, 10], [10, 11], [11, 12], // Ngón giữa
      [0, 13], [13, 14], [14, 15], [15, 16], // Ngón áp út
      [0, 17], [17, 18], [18, 19], [19, 20] // Ngón út
    ];

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#00FF00'; 
    
    connections.forEach(([start, end]) => {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    });

    // Vẽ khớp
    ctx.fillStyle = '#FF0000';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    landmarks.forEach((p: any) => {
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });
  };

  // --- SỬA LỖI: Đưa hàm predictWebcam lên trước useEffect ---
  const predictWebcam = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !landmarker || !canvas) {
       requestRef.current = requestAnimationFrame(predictWebcam);
       return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) {
      requestRef.current = requestAnimationFrame(predictWebcam);
      return;
    }

    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      const startTimeMs = performance.now();
      
      try {
        const results = landmarker.detectForVideo(video, startTimeMs);

        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        const ctx = canvas.getContext('2d');
        if (ctx && ctx.canvas) {
          if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            drawLandmarks(ctx, landmarks);
            
            const wrist = landmarks[0];
            const x = (wrist.x - 0.5) * 2; 
            const y = (wrist.y - 0.5) * 2;

            // Logic nhận diện cử chỉ đơn giản
            const isExtended = (tipIdx: number, pipIdx: number) => {
              return landmarks[tipIdx].y < landmarks[pipIdx].y;
            };
            const index = isExtended(8, 6);
            const middle = isExtended(12, 10);
            const ring = isExtended(16, 14);
            const pinky = isExtended(20, 18);
            
            let count = 0;
            if (index) count++;
            if (middle) count++;
            if (ring) count++;
            if (pinky) count++;

            let gesture: 'OPEN' | 'CLOSED' | 'POINTING' | 'NEUTRAL' = 'NEUTRAL';
            if (count === 4) gesture = 'OPEN';
            else if (count === 0) gesture = 'CLOSED';
            else if (index && !middle && !ring && !pinky) gesture = 'POINTING';

            onUpdate({
              isDetected: true,
              gesture,
              x: -x, 
              y: y
            });
          } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            onUpdate({ isDetected: false, gesture: 'NEUTRAL', x: 0, y: 0 });
          }
        }
      } catch (err) {
        console.warn("Prediction error:", err);
      }
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  useEffect(() => {
    let isMounted = true;

    const initHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        if (!isMounted) return;

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        if (isMounted) {
          landmarkerRef.current = landmarker;
          setLoaded(true);
        } else {
          landmarker.close();
        }
      } catch (e) {
        console.error("Failed to load MediaPipe:", e);
      }
    };

    initHandLandmarker();

    return () => {
      isMounted = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const enableCam = async () => {
      if (!loaded || !videoRef.current) return;

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', () => {
            if (videoRef.current) {
              predictWebcam();
              if (onCameraReady) onCameraReady();
            }
          });
        }
      } catch (err) {
        console.error("Webcam error:", err);
      }
    };

    if (loaded) {
      enableCam();
    }
    
    return () => {
       if (stream) {
         stream.getTracks().forEach(track => track.stop());
       }
       if (requestRef.current) {
         cancelAnimationFrame(requestRef.current);
       }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const containerClass = className || "absolute bottom-4 left-4 z-50 w-48 h-36 bg-black/50 rounded-xl overflow-hidden backdrop-blur-md";

  return (
    <div className={containerClass}>
      <div className="relative w-full h-full scale-x-[-1] transform">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted
          className="absolute inset-0 w-full h-full object-cover" 
        />
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

export default HandController;