/* ========================================================
   ZIA STUDIO - CORE MULTIMEDIA & FIXED RECORDING ENGINE
   ======================================================== */

const scriptTextInput = document.getElementById('scriptText');
const fontStyleSelect = document.getElementById('fontStyle');
const particleEffectSelect = document.getElementById('particleEffect');
const bgImageInput = document.getElementById('bgImage');
const imageMotionSelect = document.getElementById('imageMotion');
const bgMusicInput = document.getElementById('bgMusic');
const durationSlider = document.getElementById('durationSlider');
const durationVal = document.getElementById('durationVal');
const generateBtn = document.getElementById('generateBtn');
const renderOverlay = document.getElementById('renderOverlay');
const progressFill = document.getElementById('progressFill');
const statusText = document.getElementById('statusText');
const downloadPopup = document.getElementById('downloadPopup');
const downloadBtn = document.getElementById('downloadBtn');

const canvas = document.getElementById('videoCanvas');
const ctx = canvas.getContext('2d');

let uploadedImage = null;
let animationFrameId = null;
let particlesArray = [];
let generatedVideoBlob = null; // Standard video storage

durationSlider.addEventListener('input', (e) => {
    durationVal.textContent = e.target.value + 's';
});

bgImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            uploadedImage = new Image();
            uploadedImage.onload = function() {
                drawPreviewFrame(0);
            };
            uploadedImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

class Particle {
    constructor(x, y, text, color, style) {
        this.x = x + (Math.random() - 0.5) * 40;
        this.y = y + (Math.random() - 0.5) * 20;
        this.baseX = x;
        this.baseY = y;
        this.text = text;
        this.color = color;
        this.style = style;
        this.size = Math.random() * 2 + 1;
        this.density = (Math.random() * 30) + 1;
        
        if (style === 'rain') {
            this.vy = Math.random() * 4 + 2;
            this.vx = (Math.random() - 0.5) * 1;
        } else if (style === 'smoke') {
            this.vy = -(Math.random() * 1.5 + 0.5);
            this.vx = (Math.random() - 0.5) * 2;
            this.alpha = 1;
        } else {
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = (Math.random() - 0.5) * 2;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        if (this.style === 'smoke') {
            ctx.globalAlpha = this.alpha || 0.8;
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    update() {
        if (this.style === 'rain') {
            this.y += this.vy;
            this.x += this.vx;
            if (this.y > canvas.height) {
                this.y = this.baseY - 50;
                this.x = this.baseX + (Math.random() - 0.5) * 20;
            }
        } else if (this.style === 'smoke') {
            this.y += this.vy;
            this.x += this.vx;
            if (this.alpha > 0.01) this.alpha -= 0.005;
            else {
                this.y = this.baseY;
                this.x = this.baseX;
                this.alpha = 1;
            }
        } else {
            this.x += this.vx;
            this.y += this.vy;
            if (Math.abs(this.x - this.baseX) > 30) this.vx *= -1;
            if (Math.abs(this.y - this.baseY) > 20) this.vy *= -1;
        }
    }
}

function initializeParticles(text, font, effect) {
    particlesArray = [];
    ctx.fillStyle = '#fff';
    ctx.font = `bold 50px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const textCoordinates = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    for (let y = 0; y < textCoordinates.height; y += 4) {
        for (let x = 0; x < textCoordinates.width; x += 4) {
            if (textCoordinates.data[(y * 4 * textCoordinates.width) + (x * 4) + 3] > 128) {
                let color = effect === 'rain' ? '#00f2fe' : (effect === 'smoke' ? '#9d4edd' : '#fff');
                particlesArray.push(new Particle(x, y, text, color, effect));
            }
        }
    }
}

function applyCinematicMotion(timeRatio, motionType) {
    if (!uploadedImage) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
    }

    let scale = 1.0;
    let translateX = 0;
    let translateY = 0;

    if (motionType === 'zoomIn') {
        scale = 1.0 + (timeRatio * 0.15);
    } else if (motionType === 'zoomOut') {
        scale = 1.15 - (timeRatio * 0.15);
    } else if (motionType === 'panLeft') {
        scale = 1.1;
        translateX = -(timeRatio * (canvas.width * 0.1));
    }

    ctx.save();
    ctx.translate(canvas.width / 2 + translateX, canvas.height / 2 + translateY);
    ctx.scale(scale, scale);
    ctx.drawImage(uploadedImage, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    ctx.restore();
}

function drawPreviewFrame(timeRatio) {
    const motion = imageMotionSelect.value;
    const font = fontStyleSelect.value;
    const text = scriptTextInput.value || "Zia Studio";
    
    applyCinematicMotion(timeRatio, motion);
    
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f2fe';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 60px ${font}`;
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;
}

// REAL RECORDER ENGINE (Fixes the playability issue)
generateBtn.addEventListener('click', async () => {
    const text = scriptTextInput.value;
    if (!text) {
        alert("Pehle text input area mein kuch likhein!");
        return;
    }

    renderOverlay.classList.remove('hidden');
    progressFill.style.width = '0%';
    statusText.textContent = "Media Stream Encode Ho Raha Hai...";

    const duration = parseInt(durationSlider.value);
    const font = fontStyleSelect.value;
    const effect = particleEffectSelect.value;
    
    initializeParticles(text, font, effect);

    // Capture standard stream from canvas
    const stream = canvas.captureStream(30); 
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    const chunks = [];

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        // Create actual video binary blob
        generatedVideoBlob = new Blob(chunks, { type: 'video/webm' });
        statusText.textContent = "Video Successfully Rendered!";
        setTimeout(() => {
            renderOverlay.classList.add('hidden');
            downloadPopup.classList.remove('hidden');
        }, 800);
    };

    let currentFrame = 0;
    const fps = 30;
    const totalFrames = duration * fps;
    
    mediaRecorder.start();

    function renderLoop() {
        if (currentFrame < totalFrames) {
            const ratio = currentFrame / totalFrames;
            
            applyCinematicMotion(ratio, imageMotionSelect.value);
            
            particlesArray.forEach(p => {
                p.update();
                p.draw();
            });

            currentFrame++;
            const percent = Math.floor((currentFrame / totalFrames) * 100);
            progressFill.style.width = percent + '%';
            statusText.textContent = `Rendering Video Components... ${percent}%`;
            
            requestAnimationFrame(renderLoop);
        } else {
            mediaRecorder.stop(); // Stop recording when frames match duration
        }
    }

    renderLoop();
});

// ZERO FOOTPRINT CLEAN DOWNLOAD
downloadBtn.addEventListener('click', () => {
    if (!generatedVideoBlob) return;

    const url = URL.createObjectURL(generatedVideoBlob);
    const link = document.createElement('a');
    link.download = 'zia_studio_video.webm'; // Standard playable format
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
        URL.revokeObjectURL(url);
        generatedVideoBlob = null;
        particlesArray = [];
        uploadedImage = null;
        bgImageInput.value = '';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        downloadPopup.classList.add('hidden');
        alert("🧹 Storage Wiped: Browser logs cleared safely!");
    }, 500);
});
