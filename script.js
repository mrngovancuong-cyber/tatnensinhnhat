const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const startButton = document.getElementById("startButton");
const loadingElement = document.getElementById("loading");
const gameInfoElement = document.getElementById("game-info");

const hatImage = new Image();
hatImage.src = 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/refs/heads/main/birthdayhat.png';
hatImage.crossOrigin = "Anonymous";

// KHỞI TẠO VÀ TẢI MÔ HÌNH
async function initialize() {
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    console.log("AI Models Loaded!");

    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;
    
    await new Promise(resolve => video.onloadedmetadata = resolve);
    
    loadingElement.classList.add("hidden");
    startButton.disabled = false;
    console.log("Application is ready!");
}

initialize();

// ==========================================================
// HÀM VẼ VÀ NHẬN DIỆN CHÍNH (ĐÃ SỬA LỖI)
// ==========================================================
async function detectAndDraw() {
    if (canvasElement.width !== video.videoWidth) {
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }
    
    // THAY ĐỔI 1: Yêu cầu AI "dễ tính" hơn
    const detectorOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 512, // Kích thước đầu vào chuẩn
        scoreThreshold: 0.4 // Giảm ngưỡng tin cậy (mặc định là 0.5)
    });

    // Nhận diện khuôn mặt với tùy chọn mới
    const detections = await faceapi.detectAllFaces(video, detectorOptions);

    // THAY ĐỔI 2: In kết quả ra để chẩn đoán
    // Hãy mở Console (F12) và xem dòng này.
    // Nếu nó luôn là "Detections: []" thì AI không thấy bạn.
    console.log("Detections: ", detections);

    // Xóa canvas và vẽ kết quả
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    if (detections && detections.length > 0) {
        for (const detection of detections) {
            const box = detection.box;
            const flippedX = canvasElement.width - box.x - box.width;

            // Vẽ khung xanh
            canvasCtx.strokeStyle = '#00FF00';
            canvasCtx.lineWidth = 4;
            canvasCtx.strokeRect(flippedX, box.y, box.width, box.height);

            // Vẽ nón
            const hatWidth = box.width * 1.5;
            const hatHeight = hatImage.height * (hatWidth / hatImage.width);
            const hatX = flippedX - (hatWidth - box.width) / 2;
            const hatY = box.y - hatHeight * 0.9;
            canvasCtx.drawImage(hatImage, hatX, hatY, hatWidth, hatHeight);
        }
    }
    
    requestAnimationFrame(detectAndDraw);
}

// HÀM BẮT ĐẦU GAME
function startGame() {
    video.play();
    startButton.style.display = 'none';
    gameInfoElement.style.display = 'flex';
    console.log("Game started!");
    requestAnimationFrame(detectAndDraw);
}

startButton.addEventListener("click", startGame);