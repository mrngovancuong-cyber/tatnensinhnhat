// Dòng này đã được cập nhật lên phiên bản mới và đổi thành .mjs
import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/vision_bundle.mjs";

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const startButton = document.getElementById("startButton");
const loadingElement = document.getElementById("loading");
const scoreElement = document.getElementById("score");
const timerElement = document.getElementById("timer");
const finalMessage = document.getElementById("final-message");
const finalScoreElement = document.getElementById("final-score");

let handLandmarker;
let lastVideoTime = -1;
let gameIsRunning = false;
let candles = [];
let score = 0;
let timer = 60;
let timerInterval, candleInterval;

const createHandLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm");
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
    });
    loadingElement.classList.add("hidden");
    startButton.disabled = false;
};
createHandLandmarker();

navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
});

// ====================================================================
// PHẦN CODE MỚI ĐỂ VẼ BÀN TAY (GỠ LỖI VÀ LÀM GAME THÚ VỊ HƠN)
// ====================================================================
function drawHandConnectors(landmarks) {
    const connectors = [
        [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8], // Index
        [5, 9], [9, 10], [10, 11], [11, 12], // Middle
        [9, 13], [13, 14], [14, 15], [15, 16], // Ring
        [13, 17], [0, 17], [17, 18], [18, 19], [19, 20] // Pinky
    ];
    canvasCtx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
    canvasCtx.lineWidth = 3;
    connectors.forEach(pair => {
        const start = landmarks[pair[0]];
        const end = landmarks[pair[1]];
        canvasCtx.beginPath();
        canvasCtx.moveTo((1 - start.x) * canvasElement.width, start.y * canvasElement.height);
        canvasCtx.lineTo((1 - end.x) * canvasElement.width, end.y * canvasElement.height);
        canvasCtx.stroke();
    });
}

function drawHandLandmarks(landmarks) {
    canvasCtx.fillStyle = 'rgba(255, 0, 0, 0.7)';
    landmarks.forEach(point => {
        canvasCtx.beginPath();
        canvasCtx.arc((1 - point.x) * canvasElement.width, point.y * canvasElement.height, 5, 0, 2 * Math.PI);
        canvasCtx.fill();
    });
}
// ====================================================================
// KẾT THÚC PHẦN CODE MỚI
// ====================================================================

function predictWebcam() {
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;

    if (lastVideoTime !== video.currentTime && handLandmarker) {
        lastVideoTime = video.currentTime;
        handLandmarker.detectForVideo(video, performance.now(), (result) => {
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

            if (gameIsRunning) {
                if (result.landmarks && result.landmarks.length > 0) {
                    const landmarks = result.landmarks[0];
                    // VẼ BÀN TAY LÊN MÀN HÌNH
                    drawHandConnectors(landmarks);
                    drawHandLandmarks(landmarks);
                    checkPinch(landmarks);
                }
                drawCandles();
            }
        });
    }
    window.requestAnimationFrame(predictWebcam);
}

function checkPinch(landmarks) {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const distance = Math.sqrt(
        Math.pow(thumbTip.x - indexTip.x, 2) +
        Math.pow(thumbTip.y - indexTip.y, 2)
    );

    if (distance < 0.05) {
        const pinchX = (1 - indexTip.x) * canvasElement.width;
        const pinchY = indexTip.y * canvasElement.height;

        candles.forEach(candle => {
            if (candle.state === 'lit') {
                const distToCandle = Math.sqrt(
                    Math.pow(pinchX - candle.x, 2) +
                    Math.pow(pinchY - candle.y, 2)
                );
                if (distToCandle < 30) {
                    candle.state = 'snuffed';
                    score++;
                    scoreElement.textContent = score;
                }
            }
        });
    }
}

function spawnCandle() {
    if (candles.filter(c => c.state === 'lit').length < 10) {
        candles.push({
            x: Math.random() * (canvasElement.width - 60) + 30,
            y: Math.random() * (canvasElement.height - 60) + 30,
            state: 'lit',
            snuffedTime: 0 // Thêm thuộc tính để quản lý hiệu ứng khói
        });
    }
}

function drawCandles() {
    canvasCtx.font = "40px serif";
    const now = Date.now();
    candles.forEach(candle => {
        if (candle.state === 'lit') {
            canvasCtx.fillText('🔥', candle.x, candle.y);
        } else {
            if (candle.snuffedTime === 0) {
                candle.snuffedTime = now;
            }
            // Hiệu ứng khói chỉ tồn tại trong 1 giây
            if (now - candle.snuffedTime < 1000) {
                canvasCtx.globalAlpha = 1 - (now - candle.snuffedTime) / 1000; // Làm khói mờ dần
                canvasCtx.fillText('💨', candle.x, candle.y);
                canvasCtx.globalAlpha = 1.0; // Reset độ trong suốt
            }
        }
    });

    // SỬA LỖI: Chỉ xóa nến sau khi hiệu ứng khói đã kết thúc
    candles = candles.filter(candle => candle.state === 'lit' || (now - candle.snuffedTime < 1000));
}

function startGame() {
    gameIsRunning = true;
    score = 0;
    timer = 60;
    candles = [];
    scoreElement.textContent = score;
    timerElement.textContent = timer;
    startButton.classList.add("hidden");
    document.getElementById("game-info").classList.remove("hidden");
    finalMessage.classList.add("hidden");

    candleInterval = setInterval(spawnCandle, 1000);
    timerInterval = setInterval(() => {
        timer--;
        timerElement.textContent = timer;
        if (timer <= 0) {
            endGame();
        }
    }, 1000);
}

function endGame() {
    gameIsRunning = false;
    clearInterval(candleInterval);
    clearInterval(timerInterval);

    finalScoreElement.textContent = score;
    finalMessage.classList.remove("hidden");
    startButton.classList.remove("hidden");
    document.getElementById("game-info").classList.add("hidden");
}

startButton.addEventListener("click", startGame);

// Thay đổi giao diện ban đầu một chút
document.getElementById("game-info").classList.add("hidden");