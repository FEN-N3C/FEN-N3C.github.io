```javascript
// ========================================
// Elements
// ========================================

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");

const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");
const fileMeta = document.getElementById("fileMeta");

const removeButton = document.getElementById("removeButton");

const settings = document.getElementById("settings");
const targetSize = document.getElementById("targetSize");
const sizeUnit = document.getElementById("sizeUnit");

const inputHint = document.getElementById("inputHint");
const errorMessage = document.getElementById("errorMessage");

const compressButton = document.getElementById("compressButton");
const compressButtonText =
    document.getElementById("compressButtonText");

const progressSection =
    document.getElementById("progressSection");

const progressFill =
    document.getElementById("progressFill");

const progressPercent =
    document.getElementById("progressPercent");

const result = document.getElementById("result");

const originalSize =
    document.getElementById("originalSize");

const compressedSize =
    document.getElementById("compressedSize");

const savedPercent =
    document.getElementById("savedPercent");

const downloadButton =
    document.getElementById("downloadButton");

const resetButton =
    document.getElementById("resetButton");


// ========================================
// State
// ========================================

let selectedFile = null;
let fakeProgressTimer = null;


// ========================================
// File Input
// ========================================

dropZone.addEventListener("click", () => {
    fileInput.click();
});


fileInput.addEventListener("change", (event) => {

    const files = event.target.files;

    if (!files || files.length === 0) {
        return;
    }

    handleFile(files[0]);
});


// ========================================
// Drag & Drop
// ========================================

dropZone.addEventListener("dragover", (event) => {

    event.preventDefault();

    dropZone.classList.add("drag-over");
});


dropZone.addEventListener("dragleave", () => {

    dropZone.classList.remove("drag-over");
});


dropZone.addEventListener("drop", (event) => {

    event.preventDefault();

    dropZone.classList.remove("drag-over");

    const files = event.dataTransfer.files;

    if (!files || files.length === 0) {
        return;
    }

    handleFile(files[0]);
});


// ========================================
// Handle File
// ========================================

function handleFile(file) {

    selectedFile = file;

    fileName.textContent = file.name;

    fileMeta.textContent =
        `${formatBytes(file.size)} • ${getFileType(file)}`;

    fileInfo.hidden = false;

    settings.hidden = false;

    result.hidden = true;

    progressSection.hidden = true;

    targetSize.value = "";

    hideError();

    validateTargetSize();
}


// ========================================
// Remove File
// ========================================

removeButton.addEventListener("click", () => {

    resetTool();
});


// ========================================
// Target Size Changes
// ========================================

targetSize.addEventListener("input", () => {

    validateTargetSize();
});


sizeUnit.addEventListener("change", () => {

    validateTargetSize();
});


// ========================================
// Validate Target Size
// ========================================

function validateTargetSize() {

    if (!selectedFile) {
        compressButton.disabled = true;
        return;
    }

    const value = Number(targetSize.value);

    if (!value || value <= 0) {

        compressButton.disabled = true;

        hideError();

        return;
    }

    const targetBytes =
        convertToBytes(value, sizeUnit.value);

    if (targetBytes >= selectedFile.size) {

        showError(
            "The target size must be smaller than the original file."
        );

        compressButton.disabled = true;

        return;
    }

    hideError();

    compressButton.disabled = false;
}


// ========================================
// Compress Button
// ========================================

compressButton.addEventListener("click", () => {

    if (!selectedFile) {
        return;
    }

    startCompression();
});


// ========================================
// Temporary Compression Simulation
// ========================================

function startCompression() {

    compressButton.disabled = true;

    compressButtonText.textContent = "Compressing...";

    progressSection.hidden = false;

    result.hidden = true;

    let progress = 0;

    progressFill.style.width = "0%";
    progressPercent.textContent = "0%";

    clearInterval(fakeProgressTimer);

    fakeProgressTimer = setInterval(() => {

        progress += Math.random() * 8;

        if (progress >= 100) {

            progress = 100;

            clearInterval(fakeProgressTimer);

            finishFakeCompression();

        }

        progressFill.style.width = `${progress}%`;

        progressPercent.textContent =
            `${Math.round(progress)}%`;

    }, 150);
}


// ========================================
// Temporary Result
// ========================================

function finishFakeCompression() {

    /*
        THIS IS NOT REAL COMPRESSION YET.

        For now we're pretending that the
        compression produced the target size.

        We'll replace this entire section with
        the actual compression system later.
    */

    const targetBytes =
        convertToBytes(
            Number(targetSize.value),
            sizeUnit.value
        );

    originalSize.textContent =
        formatBytes(selectedFile.size);

    compressedSize.textContent =
        formatBytes(targetBytes);

    const saved =
        1 - (targetBytes / selectedFile.size);

    savedPercent.textContent =
        `${Math.round(saved * 100)}%`;

    /*
        For now the download button simply
        downloads the original file.

        This will be replaced with the actual
        compressed Blob later.
    */

    const downloadUrl =
        URL.createObjectURL(selectedFile);

    downloadButton.href = downloadUrl;

    downloadButton.download =
        `compressed-${selectedFile.name}`;

    progressSection.hidden = true;

    result.hidden = false;

    compressButtonText.textContent =
        "Compress File";

    compressButton.disabled = false;
}


// ========================================
// Reset
// ========================================

resetButton.addEventListener("click", () => {

    resetTool();
});


function resetTool() {

    clearInterval(fakeProgressTimer);

    selectedFile = null;

    fileInput.value = "";

    fileInfo.hidden = true;

    settings.hidden = true;

    progressSection.hidden = true;

    result.hidden = true;

    targetSize.value = "";

    progressFill.style.width = "0%";

    progressPercent.textContent = "0%";

    compressButton.disabled = true;

    compressButtonText.textContent =
        "Compress File";

    hideError();
}


// ========================================
// Error Handling
// ========================================

function showError(message) {

    errorMessage.textContent = message;

    errorMessage.hidden = false;
}


function hideError() {

    errorMessage.textContent = "";

    errorMessage.hidden = true;
}


// ========================================
// Utility Functions
// ========================================

function convertToBytes(value, unit) {

    switch (unit) {

        case "KB":
            return value * 1024;

        case "MB":
            return value * 1024 * 1024;

        case "GB":
            return value * 1024 * 1024 * 1024;

        default:
            return value;
    }
}


function formatBytes(bytes) {

    if (bytes === 0) {
        return "0 Bytes";
    }

    const units = [
        "Bytes",
        "KB",
        "MB",
        "GB",
        "TB"
    ];

    const exponent =
        Math.floor(
            Math.log(bytes) / Math.log(1024)
        );

    const size =
        bytes / Math.pow(1024, exponent);

    return `${size.toFixed(exponent === 0 ? 0 : 2)} ${units[exponent]}`;
}


function getFileType(file) {

    if (file.type) {
        return file.type;
    }

    const parts =
        file.name.split(".");

    if (parts.length > 1) {
        return parts.pop().toUpperCase();
    }

    return "Unknown type";
}
```
