import { FaceDetector, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/vision_bundle.mjs";

// Lấy các phần tử DOM
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const startButton = document.getElementById("startButton");
const loadingElement = document.getElementById("loading");
const gameInfoElement = document.getElementById("game-info");

// Biến trạng thái game
let faceDetector;
let lastDetections = [];
let isDetecting = false;

const hatImage = new Image();
hatImage.src = 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/main/birthday_hat.png';
hatImage.crossOrigin = "Anonymous";

// Hàm khởi tạo AI
async function initializeAI() {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm");
    faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
            // ==========================================================
            // THAY ĐỔI QUAN TRỌNG NHẤT: CHUYỂN SANG CPU
            // ==========================================================
            delegate: "CPU" 
        },
        runningMode: "VIDEO",
        // Thêm tùy chọn để mô hình bớt "khó tính" hơn
        minDetectionConfidence: 0.4
    });
    await hatImage.decode();
    console.log("SUCCESS: AI and Hat Image are ready!");
}

// Hàm chính để khởi động mọi thứ theo đúng thứ tự
async function main() {
    try {
        const initializeAIPromise = initializeAI();
        const getUserMediaPromise = navigator.mediaDevices.getUserMedia({ video: true });

        const [_, stream] = await Promise.all([initializeAIPromise, getUserMediaPromise]);

        video.srcObject = stream;
        await new Promise((resolve) => {
            video.addEventListener("loadeddata", resolve);
        });
        
        loadingElement.classList.add("hidden");
        startButton.disabled = false;
        console.log("Application is fully ready. Starting game loop.");
        
        window.requestAnimationFrame(gameLoop);

    } catch (error) {
        console.error("LỖI KHỞI ĐỘNG ỨNG DỤNG:", error);
        loadingElement.innerText = "Tải tài nguyên thất bại hoặc không có camera.";
    }
}

main(); // Chạy hàm chính

// Vòng lặp game và các hàm vẽ
let lastVideoTime = -1;
function gameLoop() {
    if (canvasElement.width !== video.videoWidth) {
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }

    if (isDetecting && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        faceDetector.detectForVideo(video, performance.now(), (result) => {
            if (result.detections) {
                lastDetections = result.detections;
            }
        });
    }

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (isDetecting && lastDetections.length > 0) {
        for (const detection of lastDetections) {
            drawFaceBox(detection.boundingBox);
            drawHat(detection.boundingBox);
        }
    }
    window.requestAnimationFrame(gameLoop);
}

function drawFaceBox(face) {
    canvasCtx.strokeStyle = '#00FF00';
    canvasCtx.lineWidth = 4;
    const width = face.width * canvasElement.width;
    const height = face.height * canvasElement.height;
    const x = canvasElement.width - (face.originX * canvasElement.width) - width;
    const y = face.originY * canvasElement.height;
    canvasCtx.strokeRect(x, y, width, height);
}

function drawHat(face) {
    const faceWidthPx = face.width * canvasElement.width;
    const faceCenterXpx = (face.originX * canvasElement.width) + (faceWidthPx / 2);
    const hatWidth = faceWidthPx * 1.5;
    const hatHeight = hatImage.height * (hatWidth / hatImage.width);
    const hatX = canvasElement.width - faceCenterXpx - (hatWidth / 2);
    const hatY = (face.originY * canvasElement.height) - hatHeight * 0.9;
    canvasCtx.drawImage(hatImage, hatX, hatY, hatWidth, hatHeight);
}

function startGame() {
    isDetecting = true;
    startButton.style.display = 'none';
    gameInfoElement.style.display = 'flex';
}

startButton.addEventListener("click", startGame);