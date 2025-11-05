import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/tasks-vision.js" type="module";

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
let gameInterval, timerInterval, candleInterval;

const createHandLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
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

function predictWebcam() {
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;
    
    if (lastVideoTime !== video.currentTime && handLandmarker) {
        lastVideoTime = video.currentTime;
        handLandmarker.detectForVideo(video, performance.now(), (result) => {
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            
            if (result.landmarks && result.landmarks.length > 0) {
                const landmarks = result.landmarks[0];
                checkPinch(landmarks);
            }
            if (gameIsRunning) {
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

    if (distance < 0.05) { // Threshold for pinch gesture
        const pinchX = (1 - indexTip.x) * canvasElement.width; // Flipped coordinate
        const pinchY = indexTip.y * canvasElement.height;
        
        candles.forEach(candle => {
            if (candle.state === 'lit') {
                const distToCandle = Math.sqrt(
                    Math.pow(pinchX - candle.x, 2) + 
                    Math.pow(pinchY - candle.y, 2)
                );
                if (distToCandle < 30) { // Collision radius
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
            x: Math.random() * (canvasElement.width - 40) + 20,
            y: Math.random() * (canvasElement.height - 40) + 20,
            state: 'lit'
        });
    }
}

function drawCandles() {
    canvasCtx.font = "40px serif";
    candles.forEach((candle, index) => {
        if (candle.state === 'lit') {
            canvasCtx.fillText('🔥', candle.x, candle.y);
        } else {
             canvasCtx.fillText('💨', candle.x, candle.y);
        }
    });
    // Remove snuffed candles after a short while
    candles = candles.filter(candle => candle.state === 'lit');
}


function startGame() {
    gameIsRunning = true;
    score = 0;
    timer = 60; // You can change the game duration here
    candles = [];
    scoreElement.textContent = score;
    timerElement.textContent = timer;
    startButton.classList.add("hidden");
    finalMessage.classList.add("hidden");

    candleInterval = setInterval(spawnCandle, 1000); // Spawn a candle every second
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
}

startButton.addEventListener("click", startGame);