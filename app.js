(() => {
  "use strict";

  const MAX_FILE_BYTES = 20 * 1024 * 1024;
  const MAX_BASE64_LENGTH = Math.ceil(MAX_FILE_BYTES / 3) * 4 + 128;
  const supportedTypes = new Set([
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/bmp",
    "image/x-icon",
    "image/vnd.microsoft.icon",
    "image/avif"
  ]);
  const extensions = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/bmp": "bmp",
    "image/x-icon": "ico",
    "image/vnd.microsoft.icon": "ico",
    "image/avif": "avif"
  };
  const outputLabels = {
    "data-uri": "Copy Data URI",
    raw: "Copy Base64",
    html: "Copy HTML",
    css: "Copy CSS"
  };
  const outputHints = {
    "data-uri": "Data URI includes the image type and Base64 data.",
    raw: "Raw Base64 contains only the encoded image data.",
    html: "HTML image element with an inline Data URI.",
    css: "CSS background image with an inline Data URI."
  };

  const fileInput = document.querySelector("#image-file");
  const dropZone = document.querySelector("#drop-zone");
  const imagePreview = document.querySelector("#image-preview");
  const imageDetails = document.querySelector("#image-details");
  const fileError = document.querySelector("#file-error");
  const outputValue = document.querySelector("#output-value");
  const copyButton = document.querySelector("#copy-output");
  const copyLabel = document.querySelector("#copy-label");
  const convertButton = document.querySelector("#convert-to-base64");
  const encodeStatus = document.querySelector("#encode-status");
  const base64Input = document.querySelector("#base64-input");
  const decodeError = document.querySelector("#decode-error");
  const decodedResult = document.querySelector("#decoded-result");
  const decodedPreview = document.querySelector("#decoded-preview");
  const downloadLink = document.querySelector("#download-image");
  const decodeStatus = document.querySelector("#decode-status");
  const modeTabs = [...document.querySelectorAll(".mode-tab")];
  const outputTabs = [...document.querySelectorAll(".output-tab")];

  let currentFile = null;
  let selectedReady = false;
  let currentDataUri = "";
  let currentOutput = "data-uri";
  let previewUrl = "";
  let downloadUrl = "";
  let decodeTimer = 0;
  let selectionVersion = 0;
  let conversionTask = null;

  function showError(element, message) {
    element.textContent = message;
    element.hidden = false;
  }

  function clearError(element) {
    element.textContent = "";
    element.hidden = true;
  }

  function setStatus(element, message) {
    element.textContent = message;
  }

  function switchMode(mode) {
    const encodeMode = mode === "encode";
    document.querySelector("#panel-to-base64").hidden = !encodeMode;
    document.querySelector("#panel-to-image").hidden = encodeMode;
    modeTabs.forEach((tab) => {
      const selected = tab.dataset.mode === mode;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
  }

  function syncModeWithHash() {
    if (window.location.hash === "#panel-to-image") switchMode("decode");
    else if (window.location.hash === "#panel-to-base64") switchMode("encode");
  }

  syncModeWithHash();
  window.addEventListener("hashchange", syncModeWithHash);

  function setOutput(value) {
    if (!currentDataUri) {
      outputValue.value = "";
      copyButton.disabled = true;
      convertButton.disabled = true;
      return;
    }
    const comma = currentDataUri.indexOf(",");
    const raw = currentDataUri.slice(comma + 1);
    if (value === "raw") outputValue.value = raw;
    else if (value === "html") outputValue.value = `<img src="${currentDataUri}" alt="">`;
    else if (value === "css") outputValue.value = `background-image: url("${currentDataUri}");`;
    else outputValue.value = currentDataUri;
    copyLabel.textContent = outputLabels[value];
    document.querySelector("#output-hint").textContent = outputHints[value];
    document.querySelector("#output-panel").setAttribute("aria-labelledby", `output-tab-${value}`);
    copyButton.disabled = false;
  }

  function releasePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
  }

  function resetSelectedImage() {
    selectionVersion += 1;
    currentFile = null;
    selectedReady = false;
    conversionTask = null;
    currentDataUri = "";
    releasePreview();
    imagePreview.removeAttribute("src");
    imagePreview.hidden = true;
    imageDetails.hidden = true;
    outputValue.value = "";
    copyButton.disabled = true;
    convertButton.disabled = true;
    fileInput.value = "";
    clearError(fileError);
    setStatus(encodeStatus, "");
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("Image decoding failed"));
      image.src = url;
      if (typeof image.decode === "function") {
        image.decode().then(
          () => resolve({ width: image.naturalWidth, height: image.naturalHeight }),
          () => reject(new Error("Image decoding failed"))
        );
      }
    });
  }

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("File could not be read"));
      };
      reader.onerror = () => reject(new Error("File could not be read"));
      reader.onabort = () => reject(new Error("File reading was interrupted"));
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(file) {
    if (!file) return;
    if (currentFile === file && selectedReady) return;
    clearError(fileError);
    setStatus(encodeStatus, "");
    if (file.size === 0) {
      showError(fileError, "This file is empty. Choose a valid image.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      showError(fileError, "This image is larger than 20 MB. Choose a smaller file.");
      return;
    }
    const type = file.type.toLowerCase();
    if (!supportedTypes.has(type)) {
      showError(fileError, "This file type is not supported. Choose PNG, JPG, GIF, WebP, SVG, BMP, ICO, or AVIF.");
      return;
    }

    resetSelectedImage();
    const version = selectionVersion;
    currentFile = file;
    selectedReady = true;
    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrl = nextPreviewUrl;
    imagePreview.src = previewUrl;
    imagePreview.hidden = false;
    imageDetails.hidden = false;
    document.querySelector("#file-name").textContent = file.name || "Selected image";
    document.querySelector("#file-meta").textContent =
      `${type.replace("image/", "").toUpperCase()} · ${formatBytes(file.size)} · Reading dimensions…`;
    convertButton.disabled = true;

    void loadImage(nextPreviewUrl).then((dimensions) => {
      if (selectionVersion !== version || currentFile !== file) return;
      document.querySelector("#file-meta").textContent =
        `${type.replace("image/", "").toUpperCase()} · ${formatBytes(file.size)} · ${dimensions.width} × ${dimensions.height}px`;
    }).catch(() => {
      if (selectionVersion !== version || currentFile !== file) return;
      imagePreview.hidden = true;
      document.querySelector("#file-meta").textContent =
        `${type.replace("image/", "").toUpperCase()} · ${formatBytes(file.size)} · Preview unavailable`;
      showError(fileError, "The image preview could not be decoded by this browser. The original file can still be converted.");
    });

    void convertSelectedFile(version);
  }

  async function convertSelectedFile(version = selectionVersion) {
    const file = currentFile;
    if (!file || !selectedReady || conversionTask) return conversionTask;
    conversionTask = (async () => {
      clearError(fileError);
      setStatus(encodeStatus, "Converting image…");
      convertButton.disabled = true;
      try {
        const dataUri = await readAsDataUrl(file);
        if (selectionVersion !== version || currentFile !== file) return;
        currentDataUri = dataUri;
        setOutput(currentOutput);
        setStatus(encodeStatus, "Image converted. Your output is ready to copy.");
      } catch {
        if (selectionVersion === version && currentFile === file) {
          showError(fileError, "The image could not be converted. Try choosing it again.");
          setStatus(encodeStatus, "");
        }
      } finally {
        if (selectionVersion === version && currentFile === file) {
          conversionTask = null;
          convertButton.disabled = !selectedReady;
        }
      }
    })();
    return conversionTask;
  }

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // Continue to the selection-based fallback when clipboard permission is unavailable.
      }
    }
    outputValue.focus();
    outputValue.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      outputValue.setSelectionRange(0, 0);
    }
  }

  function clearDecodedImage() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = "";
    decodedPreview.removeAttribute("src");
    downloadLink.removeAttribute("href");
    decodedResult.hidden = true;
  }

  function decodeBase64(value) {
    const input = value.trim();
    if (!input) throw new Error("Paste Base64 data or a Data URI to convert.");
    if (input.length > MAX_BASE64_LENGTH) throw new Error("This image is larger than 20 MB. Use a smaller image.");

    let mimeType = document.querySelector("#image-type").value;
    let encoded = input;
    if (/^data:/i.test(input)) {
      const dataUriMatch = input.match(/^data:([^;,]+);base64,([\s\S]*)$/i);
      if (!dataUriMatch) throw new Error("This Data URI is invalid. Use an image Data URI ending in ;base64, followed by its data.");
      mimeType = dataUriMatch[1].toLowerCase();
      encoded = dataUriMatch[2];
      if (!supportedTypes.has(mimeType)) throw new Error("This image type is not supported.");
    }
    if (!supportedTypes.has(mimeType)) throw new Error("Choose a supported image type.");
    encoded = encoded.replace(/\s/g, "");
    if (!encoded) throw new Error("The Base64 data is empty.");
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 === 1) {
      throw new Error("This is not valid Base64. Check the pasted data and try again.");
    }
    if (encoded.includes("=") && encoded.length % 4 !== 0) {
      throw new Error("This is not valid Base64. Check the pasted data and try again.");
    }
    const unpadded = encoded.replace(/=+$/, "");
    const padded = unpadded + "=".repeat((4 - unpadded.length % 4) % 4);
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(padded)) {
      throw new Error("This is not valid Base64. Check the pasted data and try again.");
    }

    let binary;
    try {
      binary = atob(padded);
    } catch {
      throw new Error("This is not valid Base64. Check the pasted data and try again.");
    }
    if (!binary.length) throw new Error("The Base64 data contains no image.");
    if (binary.length > MAX_FILE_BYTES) throw new Error("This image is larger than 20 MB. Use a smaller image.");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return { blob: new Blob([bytes], { type: mimeType }), mimeType };
  }

  function scheduleDecode() {
    window.clearTimeout(decodeTimer);
    decodeTimer = window.setTimeout(renderDecodedImage, 300);
  }

  async function renderDecodedImage() {
    clearError(decodeError);
    clearDecodedImage();
    setStatus(decodeStatus, "");
    const input = base64Input.value;
    if (!input.trim()) return;

    let decoded;
    try {
      decoded = decodeBase64(input);
    } catch (error) {
      showError(decodeError, error.message);
      return;
    }

    const nextUrl = URL.createObjectURL(decoded.blob);
    try {
      const dimensions = await loadImage(nextUrl);
      if (input !== base64Input.value) {
        URL.revokeObjectURL(nextUrl);
        return;
      }
      downloadUrl = nextUrl;
      decodedPreview.src = downloadUrl;
      document.querySelector("#decoded-type").textContent = decoded.mimeType;
      document.querySelector("#decoded-dimensions").textContent = `${dimensions.width} × ${dimensions.height}px`;
      const extension = extensions[decoded.mimeType] || "png";
      downloadLink.download = `converted-image.${extension}`;
      downloadLink.href = downloadUrl;
      decodedResult.hidden = false;
      setStatus(decodeStatus, "Image preview is ready.");
    } catch {
      URL.revokeObjectURL(nextUrl);
      if (input === base64Input.value) {
        showError(decodeError, "The Base64 is valid, but the image could not be decoded. Check its type or data.");
      }
    }
  }

  modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => switchMode(tab.dataset.mode));
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const nextIndex = (modeTabs.indexOf(tab) + (event.key === "ArrowRight" ? 1 : modeTabs.length - 1)) % modeTabs.length;
      modeTabs[nextIndex].focus();
      switchMode(modeTabs[nextIndex].dataset.mode);
    });
  });

  outputTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      currentOutput = tab.dataset.output;
      document.querySelector("#output-panel").setAttribute("aria-labelledby", tab.id);
      outputTabs.forEach((item) => {
        const selected = item === tab;
        item.classList.toggle("selected", selected);
        item.setAttribute("aria-selected", String(selected));
        item.tabIndex = selected ? 0 : -1;
      });
      setOutput(currentOutput);
    });
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (outputTabs.indexOf(tab) + direction + outputTabs.length) % outputTabs.length;
      outputTabs[nextIndex].focus();
      outputTabs[nextIndex].click();
    });
  });
  outputTabs.forEach((tab, index) => { tab.tabIndex = index === 0 ? 0 : -1; });

  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });
  fileInput.addEventListener("change", () => handleFile(fileInput.files?.[0]));
  document.querySelector("#replace-file").addEventListener("click", () => fileInput.click());
  document.querySelector("#remove-file").addEventListener("click", resetSelectedImage);
  convertButton.addEventListener("click", convertSelectedFile);
  document.querySelector("#clear-base64").addEventListener("click", () => {
    window.clearTimeout(decodeTimer);
    base64Input.value = "";
    clearError(decodeError);
    clearDecodedImage();
    setStatus(decodeStatus, "");
  });
  document.querySelector("#image-type").addEventListener("change", scheduleDecode);
  document.querySelector("#convert-to-image").addEventListener("click", () => {
    window.clearTimeout(decodeTimer);
    void renderDecodedImage();
  });
  base64Input.addEventListener("input", scheduleDecode);

  ["dragenter", "dragover"].forEach((eventName) => dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  }));
  ["dragleave", "drop"].forEach((eventName) => dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  }));
  dropZone.addEventListener("drop", (event) => handleFile(event.dataTransfer?.files?.[0]));

  document.addEventListener("paste", (event) => {
    if (document.querySelector("#panel-to-base64").hidden) return;
    const imageItem = [...(event.clipboardData?.items || [])].find((item) => item.type.startsWith("image/"));
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (file) {
      event.preventDefault();
      void handleFile(file);
    }
  });

  copyButton.addEventListener("click", async () => {
    if (!outputValue.value) return;
    const copied = await copyText(outputValue.value);
    setStatus(encodeStatus, copied ? "Copied!" : "Copy was unavailable. Select the output and copy it manually.");
  });

})();
