// Grab elements from the HTML
const testToneButton = document.getElementById('test-tone-btn');
const pauseButton = document.getElementById('pause-btn');
const audioFileInput = document.getElementById('audio-file');
const canvas = document.getElementById('chladniCanvas');
const fftSizeSelect = document.getElementById('fft-size');
const ctx = canvas.getContext('2d');

// Variables for audio input
let audioContext, source, analyser, gainNode, isPlaying = false;
const L = canvas.width;

audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Function to set up a test tone (sine wave)
function setUpTestTone() {
    if (source) {
        source.stop();
        source.disconnect();
    }

    source = audioContext.createOscillator();
    source.type = 'sine';
    source.frequency.setValueAtTime(440, audioContext.currentTime);

    analyser = audioContext.createAnalyser();
    analyser.fftSize = parseInt(fftSizeSelect.value);

    gainNode = audioContext.createGain();
    gainNode.gain.value = 20;

    source.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(audioContext.destination);

    source.start();
    console.log("Test tone started (440Hz)");

    visualizeChladni(analyser);
}

// Function to handle audio file input
audioFileInput.addEventListener('change', function () {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            audioContext.decodeAudioData(event.target.result, function (buffer) {
                if (source) {
                    source.stop();
                    source.disconnect();
                }

                source = audioContext.createBufferSource();
                source.buffer = buffer;

                analyser = audioContext.createAnalyser();
                analyser.fftSize = parseInt(fftSizeSelect.value);

                gainNode = audioContext.createGain();
                gainNode.gain.value = 20;

                source.connect(gainNode);
                gainNode.connect(analyser);
                analyser.connect(audioContext.destination);

                source.start();
                console.log("Audio file loaded and playing");

                visualizeChladni(analyser);
            });
        };
        reader.readAsArrayBuffer(file);
    }
});

// Play test tone button logic
testToneButton.addEventListener('click', function () {
    if (!isPlaying) {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        setUpTestTone();
        isPlaying = true;
    } else {
        console.log("Test tone is already playing");
    }
});

// Pause button logic
pauseButton.addEventListener('click', function () {
    if (isPlaying) {
        source.stop();
        console.log("Audio stopped");
        isPlaying = false;
    }
});

// Helper function for smoothing
function smoothData(data, smoothingFactor) {
    let smoothedData = new Uint8Array(data.length);
    smoothedData[0] = data[0];  // First value remains the same
    for (let i = 1; i < data.length; i++) {
        smoothedData[i] = smoothingFactor * data[i] + (1 - smoothingFactor) * smoothedData[i - 1];
    }
    return smoothedData;
}

// Visualizing the audio using Chladni wave equation and audio-driven m, n
function visualizeChladni(analyser) {
    const bufferLength = analyser.frequencyBinCount;
    let dataArray = new Uint8Array(bufferLength);
    const smoothingFactor = 0.85;

    const cols = 150;
    const rows = 266;
    const cellWidth = canvas.width / cols;
    const cellHeight = canvas.height / rows;

    function draw() {
        analyser.getByteFrequencyData(dataArray);
        let smoothedData = smoothData(dataArray, smoothingFactor);

        console.log("Frequency data (byte):", smoothedData);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const m = Math.floor(2 + (smoothedData[100] / 255) * 10);
        const n = Math.floor(2 + (smoothedData[200] / 255) * 10);

        console.log(`m: ${m}, n: ${n}`);

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const x = (i * cellWidth) / L;
                const y = (j * cellHeight) / L;

                const f_xy = Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y) -
                             Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y);

                const colorValue = Math.abs(f_xy) * 255;
                ctx.fillStyle = `rgb(${colorValue}, ${255 - colorValue}, ${colorValue})`;

                ctx.fillRect(i * cellWidth, j * cellHeight, cellWidth - 1, cellHeight - 1);
            }
        }

        if (isPlaying) {
            requestAnimationFrame(draw);
        }
    }

    draw();
}

