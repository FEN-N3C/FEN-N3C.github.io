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

const result =
    document.getElementById("result");

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
let compressedBlob = null;
let downloadUrl = null;
let compressionRunning = false;


// ========================================
// Supported Formats
// ========================================

const SUPPORTED_IMAGE_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
];


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

    if (compressionRunning) {
        return;
    }

    dropZone.classList.add("drag-over");
});


dropZone.addEventListener("dragleave", () => {

    dropZone.classList.remove("drag-over");
});


dropZone.addEventListener("drop", (event) => {

    event.preventDefault();

    dropZone.classList.remove("drag-over");

    if (compressionRunning) {
        return;
    }

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
    compressedBlob = null;

    cleanupDownloadUrl();

    fileName.textContent = file.name;

    fileMeta.textContent =
        `${formatBytes(file.size)} • ${getFileType(file)}`;

    fileInfo.hidden = false;
    settings.hidden = false;
    result.hidden = true;
    progressSection.hidden = true;

    targetSize.value = "";

    hideError();

    updateInputHint();

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
// Update Input Hint
// ========================================

function updateInputHint() {

    if (!selectedFile) {
        return;
    }

    const size =
        formatBytes(selectedFile.size);

    inputHint.textContent =
        `Original file size: ${size}`;
}


// ========================================
// Validate Target Size
// ========================================

function validateTargetSize() {

    if (!selectedFile) {

        compressButton.disabled = true;

        return;
    }

    const value =
        Number(targetSize.value);

    if (!value || value <= 0) {

        compressButton.disabled = true;

        hideError();

        return;
    }

    const targetBytes =
        convertToBytes(
            value,
            sizeUnit.value
        );

    if (targetBytes >= selectedFile.size) {

        showError(
            "The target size must be smaller than the original file."
        );

        compressButton.disabled = true;

        return;
    }

    if (!SUPPORTED_IMAGE_TYPES.includes(selectedFile.type)) {

        showError(
            "This first version only supports JPG, PNG, and WebP images."
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

compressButton.addEventListener("click", async () => {

    if (!selectedFile || compressionRunning) {
        return;
    }

    await compressImage();
});


// ========================================
// Real Image Compression
// ========================================

async function compressImage() {

    compressionRunning = true;

    compressButton.disabled = true;

    compressButtonText.textContent =
        "Compressing...";

    progressSection.hidden = false;
    result.hidden = true;

    setProgress(0);

    try {

        const targetBytes =
            convertToBytes(
                Number(targetSize.value),
                sizeUnit.value
            );

        /*
            Load the image into an Image element.
        */

        setProgress(10);

        const image =
            await loadImage(selectedFile);

        setProgress(20);

        /*
            Find the best quality that produces
            an image below the requested size.
        */

        const blob =
            await findBestCompression(
                image,
                targetBytes
            );

        setProgress(100);

        compressedBlob = blob;

        showCompressionResult(
            selectedFile,
            compressedBlob
        );

    } catch (error) {

        console.error(error);

        showError(
            error.message ||
            "Something went wrong while compressing the image."
        );

        progressSection.hidden = true;

    } finally {

        compressionRunning = false;

        compressButton.disabled = false;

        compressButtonText.textContent =
            "Compress File";
    }
}


// ========================================
// Find Best Compression
// ========================================

async function findBestCompression(
    image,
    targetBytes
) {

    /*
        Start with the highest quality.

        Then progressively lower it until
        the output fits under the target.
    */

    let minimumQuality = 0.05;
    let maximumQuality = 0.95;

    let bestBlob = null;

    /*
        We use binary search to find the
        highest quality that fits the target.
    */

    for (let iteration = 0; iteration < 8; iteration++) {

        const quality =
            (minimumQuality + maximumQuality) / 2;

        const blob =
            await canvasToBlob(
                image,
                quality
            );

        const progress =
            20 + ((iteration + 1) / 8) * 65;

        setProgress(progress);

        if (blob.size <= targetBytes) {

            /*
                This works.

                Save it and try a higher quality.
            */

            bestBlob = blob;

            minimumQuality = quality;

        } else {

            /*
                Still too large.

                Lower the quality.
            */

            maximumQuality = quality;
        }
    }

    /*
        If we never managed to get under
        the requested size, the target is
        probably too aggressive for this image.
    */

    if (!bestBlob) {

        const lowestQualityBlob =
            await canvasToBlob(
                image,
                minimumQuality
            );

        if (lowestQualityBlob.size > targetBytes) {

            throw new Error(
                `This image cannot be compressed below ${formatBytes(targetBytes)} at the current resolution.`
            );
        }

        bestBlob = lowestQualityBlob;
    }

    return bestBlob;
}


// ========================================
// Canvas Compression
// ========================================

function canvasToBlob(image, quality) {

    return new Promise((resolve, reject) => {

        const canvas =
            document.createElement("canvas");

        canvas.width =
            image.naturalWidth;

        canvas.height =
            image.naturalHeight;

        const context =
            canvas.getContext("2d");

        if (!context) {

            reject(
                new Error(
                    "Your browser does not support canvas rendering."
                )
            );

            return;
        }

        /*
            Draw the original image onto
            the canvas.
        */

        context.drawImage(
            image,
            0,
            0
        );

        /*
            JPEG gives us predictable quality
            control.

            This means PNG/WebP input will
            currently become JPEG output.
        */

        canvas.toBlob(
            (blob) => {

                if (!blob) {

                    reject(
                        new Error(
                            "The browser failed to create the compressed image."
                        )
                    );

                    return;
                }

                resolve(blob);
            },
            "image/jpeg",
            quality
        );
    });
}


// ========================================
// Load Image
// ========================================

function loadImage(file) {

    return new Promise((resolve, reject) => {

        const url =
            URL.createObjectURL(file);

        const image =
            new Image();

        image.onload = () => {

            URL.revokeObjectURL(url);

            resolve(image);
        };

        image.onerror = () => {

            URL.revokeObjectURL(url);

            reject(
                new Error(
                    "The selected image could not be loaded."
                )
            );
        };

        image.src = url;
    });
}


// ========================================
// Display Result
// ========================================

function showCompressionResult(
    originalFile,
    compressedFile
) {

    originalSize.textContent =
        formatBytes(originalFile.size);

    compressedSize.textContent =
        formatBytes(compressedFile.size);

    const saved =
        1 -
        (compressedFile.size / originalFile.size);

    savedPercent.textContent =
        `${Math.max(0, Math.round(saved * 100))}%`;

    cleanupDownloadUrl();

    downloadUrl =
        URL.createObjectURL(
            compressedFile
        );

    downloadButton.href =
        downloadUrl;

    downloadButton.download =
        createCompressedFilename(
            originalFile.name
        );

    progressSection.hidden = true;

    result.hidden = false;
}


// ========================================
// Create Output Filename
// ========================================

function createCompressedFilename(filename) {

    const lastDot =
        filename.lastIndexOf(".");

    if (lastDot === -1) {

        return `${filename}-compressed.jpg`;
    }

    const name =
        filename.substring(
            0,
            lastDot
        );

    return `${name}-compressed.jpg`;
}


// ========================================
// Progress
// ========================================

function setProgress(value) {

    const rounded =
        Math.round(
            Math.max(
                0,
                Math.min(
                    100,
                    value
                )
            )
        );

    progressFill.style.width =
        `${rounded}%`;

    progressPercent.textContent =
        `${rounded}%`;
}


// ========================================
// Reset
// ========================================

resetButton.addEventListener("click", () => {

    resetTool();
});


function resetTool() {

    compressionRunning = false;

    selectedFile = null;

    compressedBlob = null;

    cleanupDownloadUrl();

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
// Download URL Cleanup
// ========================================

function cleanupDownloadUrl() {

    if (downloadUrl) {

        URL.revokeObjectURL(
            downloadUrl
        );

        downloadUrl = null;
    }
}


// ========================================
// Error Handling
// ========================================

function showError(message) {

    errorMessage.textContent =
        message;

    errorMessage.hidden =
        false;
}


function hideError() {

    errorMessage.textContent =
        "";

    errorMessage.hidden =
        true;
}


// ========================================
// Utilities
// ========================================

function convertToBytes(
    value,
    unit
) {

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
            Math.log(bytes) /
            Math.log(1024)
        );

    const size =
        bytes /
        Math.pow(
            1024,
            exponent
        );

    return `${size.toFixed(
        exponent === 0 ? 0 : 2
    )} ${units[exponent]}`;
}


function getFileType(file) {

    if (file.type) {
        return file.type;
    }

    const parts =
        file.name.split(".");

    if (parts.length > 1) {

        return parts
            .pop()
            .toUpperCase();
    }

    return "Unknown type";
}
