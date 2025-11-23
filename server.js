const express = require('express');
const multer = require('multer');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { Blob } = require('buffer');
const { exec, execSync } = require('child_process');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');
const bmp = require('bmp-js');
const Jimp = require('jimp');
const AdmZip = require('adm-zip');
const archiver = require('archiver');
const QRCode = require('qrcode');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const potrace = require('potrace');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;
const { PDFDocument } = require('pdf-lib');
let removeBackgroundNode = null; // lazy-load for ESM compatibility

// Configure ffmpeg binary path
try {
  if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
  }
} catch (e) {
  console.warn('No se pudo configurar ffmpeg-static:', e?.message);
}


// --- CONFIGURACIÓN GENERAL ---
const MAX_FILE_MB = parseInt(process.env.MAX_FILE_MB || '50');
// Audio/Video large file support: default 10 GB unless overridden
const MAX_AV_FILE_GB = parseInt(process.env.MAX_AV_FILE_GB || '10');
const MAX_AV_FILE_BYTES = MAX_AV_FILE_GB * 1024 * 1024 * 1024;
const MAX_FILES = parseInt(process.env.MAX_FILES || '10');
const TMP_DIR = path.join(__dirname, 'tmp');
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
const JOB_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutos

// Extensiones permitidas desde .env
const ALLOWED_OFFICE_EXT = (process.env.ALLOWED_EXT || 'doc,docx,xls,xlsx,ppt,pptx,odt,ods,odp').split(',');
const ALLOWED_IMG_EXT = (process.env.ALLOWED_IMG_EXT || 'jpg,jpeg,png,gif,webp,tiff,tif,bmp,ico,svg').split(',');
const ALLOWED_AUDIO_EXT = (process.env.ALLOWED_AUDIO_EXT || 'mp3,wav,ogg,m4a,flac,aac,opus,oga,webm').split(',');
const ALLOWED_VIDEO_EXT = (process.env.ALLOWED_VIDEO_EXT || 'mp4,mov,webm,mkv,avi,m4v').split(',');
const SUPPORTED_IMG_OUTPUTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'tiff', 'ico', 'bmp', 'svg']);


// --- MIDDLEWARE ---
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Sirve archivos desde la carpeta 'public'

// Asegurar que existe la carpeta tmp
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// --- LÓGICA DE UTILIDAD ---
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isUnsupportedImageError(error) {
  if (!error || !error.message) {
    return false;
  }
  const message = error.message.toLowerCase();
  return message.includes('unsupported image format') || message.includes('input buffer contains unsupported image format');
}

function rgbaToBgra(buffer) {
  const converted = Buffer.from(buffer);
  for (let i = 0; i < converted.length; i += 4) {
    const r = converted[i];
    converted[i] = converted[i + 2];
    converted[i + 2] = r;
  }
  return converted;
}

async function createSharpSource(filePath) {
  let instance = sharp(filePath);
  try {
    await instance.metadata();
    return instance;
  } catch (error) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.bmp' || !isUnsupportedImageError(error)) {
      throw error;
    }

    try {
      const jimpImage = await Jimp.read(filePath);
      const pngBuffer = await jimpImage.getBufferAsync(Jimp.MIME_PNG);
      instance = sharp(pngBuffer);
      await instance.metadata();
      return instance;
    } catch (bmpError) {
      const reason = bmpError?.message || bmpError;
      throw new Error(`Formato BMP no soportado o archivo corrupto: ${reason}`);
    }
  }
}

function snapshotFiles(dir, extension) {
  const snapshot = new Map();
  const normalizedExt = extension.toLowerCase();
  if (!fs.existsSync(dir)) {
    return snapshot;
  }

  for (const name of fs.readdirSync(dir)) {
    if (!name.toLowerCase().endsWith(normalizedExt)) {
      continue;
    }
    const fullPath = path.join(dir, name);
    try {
      snapshot.set(name, fs.statSync(fullPath).mtimeMs);
    } catch (err) {
      // Ignore files that disappear between readdir and stat
    }
  }
  return snapshot;
}

async function waitForNewFile({ dir, extension, beforeSnapshot, startTime, pollTimeoutMs = 20000, pollIntervalMs = 250 }) {
  const normalizedExt = extension.toLowerCase();
  const deadline = Date.now() + pollTimeoutMs;

  while (Date.now() <= deadline) {
    const candidates = [];
    if (fs.existsSync(dir)) {
      for (const name of fs.readdirSync(dir)) {
        if (!name.toLowerCase().endsWith(normalizedExt)) {
          continue;
        }
        const fullPath = path.join(dir, name);
        try {
          const stats = fs.statSync(fullPath);
          const wasPresent = beforeSnapshot.has(name);
          const previousMtime = wasPresent ? beforeSnapshot.get(name) : -1;
          const isUpdated = stats.mtimeMs > previousMtime + 1;
          if (!wasPresent || isUpdated || stats.mtimeMs >= startTime - 5000) {
            candidates.push({ name, path: fullPath, mtimeMs: stats.mtimeMs });
          }
        } catch (err) {
          // Ignore race conditions and keep polling
        }
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
      return candidates[0];
    }

    await sleep(pollIntervalMs);
  }

  throw new Error('No se pudo detectar el archivo convertido a tiempo');
}

function decodeContentStream(stream) {
  if (!stream) return '';
  if (typeof stream.decode === 'function') {
    const decoded = stream.decode();
    if (decoded == null) return '';
    if (Buffer.isBuffer(decoded)) return decoded.toString('utf8');
    if (decoded instanceof Uint8Array) return Buffer.from(decoded).toString('utf8');
    return String(decoded);
  }
  const contents = stream.contents || stream.content || '';
  if (Buffer.isBuffer(contents)) return contents.toString('utf8');
  if (contents instanceof Uint8Array) return Buffer.from(contents).toString('utf8');
  return String(contents || '');
}

const DRAW_TEXT_REGEX = /\b(?:Tj|TJ|'|"|Tf|TD|Td|Tm|T\*|BT|ET|Do|sh|m|l|c|re|v|y|h|S|s|f|F|B|b|n|W|W\*|cs|CS|sc|SC|scn|SCN|gs|q|Q)\b/;

function isPageBlank(page) {
  try {
    if (typeof page.getXObjectNames === 'function' && page.getXObjectNames().length > 0) {
      return false;
    }
    const annots = page.node && typeof page.node.Annots === 'function' ? page.node.Annots() : null;
    if (annots) {
      return false;
    }
    if (typeof page.getContentStreamCount !== 'function') {
      return false;
    }
    const count = page.getContentStreamCount();
    if (count === 0) {
      return true;
    }
    for (let idx = 0; idx < count; idx += 1) {
      const stream = page.getContentStream(idx);
      const content = decodeContentStream(stream).replace(/%.*$/gm, '').trim();
      if (!content) {
        continue;
      }
      if (DRAW_TEXT_REGEX.test(content)) {
        return false;
      }
    }
    return true;
  } catch (err) {
    console.warn('No se pudo analizar una página para detectar contenido:', err.message);
    return false;
  }
}

async function removeBlankPagesFromPdf(pdfPath, workingDir) {
  const originalBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();
  if (totalPages === 0) {
    throw new Error('El PDF no contiene páginas');
  }

  const blankPageIndexes = [];
  for (let i = 0; i < totalPages; i += 1) {
    const page = pdfDoc.getPage(i);
    if (isPageBlank(page)) {
      blankPageIndexes.push(i);
    }
  }

  if (blankPageIndexes.length === totalPages) {
    throw new Error('El PDF solo contiene páginas en blanco');
  }

  const parsedPath = path.parse(pdfPath);
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const processedName = `${parsedPath.name}-processed-${uniqueSuffix}.pdf`;
  const processedPath = path.join(workingDir, processedName);

  if (blankPageIndexes.length === 0) {
    // No blank pages, just copy to working directory
    fs.writeFileSync(processedPath, originalBytes);
    return { pdfPath: processedPath, blankPagesRemoved: 0, tempFiles: [processedPath] };
  }

  // Remove blank pages
  blankPageIndexes.sort((a, b) => b - a).forEach(index => pdfDoc.removePage(index));
  const processedBytes = await pdfDoc.save();
  fs.writeFileSync(processedPath, processedBytes);

  return {
    pdfPath: processedPath,
    blankPagesRemoved: blankPageIndexes.length,
    tempFiles: [processedPath]
  };
}

function removeLargeBackgroundShapesFromDocx(docxPath) {
  try {
    if (!docxPath || !fs.existsSync(docxPath)) {
      return { removedCount: 0 };
    }

    const zip = new AdmZip(docxPath);
    const documentEntry = zip.getEntry('word/document.xml');
    if (!documentEntry) {
      return { removedCount: 0 };
    }

    let documentXml = documentEntry.getData().toString('utf8');
    let removedCount = 0;

    // Find all v:shape elements and check if they should be removed
    const shapeRegex = /<v:shape\b[^>]*>[\s\S]*?<\/v:shape>/g;
    
    documentXml = documentXml.replace(shapeRegex, (shapeText) => {
      // Extract dimensions from style attribute
      const styleMatch = shapeText.match(/style="([^"]*)"/);
      if (!styleMatch) return shapeText;
      
      const style = styleMatch[1];
      const widthMatch = style.match(/width:([0-9.]+)(in|pt|cm)/);
      const heightMatch = style.match(/height:([0-9.]+)(in|pt|cm)/);
      
      if (!widthMatch || !heightMatch) return shapeText;
      
      let widthCm = parseFloat(widthMatch[1]);
      let heightCm = parseFloat(heightMatch[1]);
      
      // Convert to cm
      if (widthMatch[2] === 'in') widthCm *= 2.54;
      if (widthMatch[2] === 'pt') widthCm *= 0.0353;
      if (heightMatch[2] === 'in') heightCm *= 2.54;
      if (heightMatch[2] === 'pt') heightCm *= 0.0353;
      
      // Only process large page-sized shapes
      if (widthCm < 15 || heightCm < 20) return shapeText;
      
      // Check if it contains an imagedata (background PDF page image)
      const hasImageData = /<v:imagedata/.test(shapeText);
      
      // Check if it has white/transparent fill
      const hasFillOff = /<v:fill[^>]*\bon="false"/.test(shapeText);
      const hasWhiteFill = /fillcolor=["']?(?:#fff(?:fff)?|white)["']?/i.test(shapeText);
      
      // Check if it's stroked="f" (no border)
      const isUnstroked = /\bstroked="f"/.test(shapeText);
      
      // Remove if it's a large shape with image data OR white/transparent fill without stroke
      const shouldRemove = hasImageData || ((hasWhiteFill || hasFillOff) && isUnstroked);
      
      if (shouldRemove) {
        removedCount++;
        // Return empty string to remove the shape
        return '';
      }
      
      return shapeText;
    });

    if (removedCount === 0) {
      return { removedCount: 0 };
    }

    try {
      zip.updateFile('word/document.xml', Buffer.from(documentXml, 'utf8'));
      const tempPath = `${docxPath}.tmp`;
      zip.writeZip(tempPath);
      
      // Replace original with cleaned version
      if (fs.existsSync(docxPath)) {
        fs.unlinkSync(docxPath);
      }
      fs.renameSync(tempPath, docxPath);
      
  console.log(`Eliminadas ${removedCount} formas de fondo del DOCX: ${path.basename(docxPath)}`);
    } catch (writeError) {
      console.error('Error al escribir DOCX limpio:', writeError.message);
      throw writeError;
    }

    return { removedCount };
  } catch (error) {
    console.warn('No se pudieron eliminar formas de fondo del DOCX:', error.message);
    return { removedCount: 0 };
  }
}

// --- CONFIGURACIÓN DE MULTER (SUBIDA DE ARCHIVOS) ---

// Storage común para ambos tipos de conversión
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const jobId = req.jobId || uuidv4();
    req.jobId = jobId;
    const inputDir = path.join(TMP_DIR, jobId, 'input');
    fs.mkdirSync(inputDir, { recursive: true });
    cb(null, inputDir);
  },
  filename: (req, file, cb) => {
    const sanitized = sanitizeFilename(file.originalname);
    cb(null, `${Date.now()}-${sanitized}`);
  }
});

// Uploader para archivos de Office
const officeUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().substring(1); // Eliminar el punto inicial
    if (!ALLOWED_OFFICE_EXT.includes(ext)) {
      return cb(new Error(`Extensión no permitida para Office: .${ext}`));
    }
    cb(null, true);
  }
});

// Uploader para archivos de Imagen
const imageUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().substring(1); // Eliminar el punto inicial
    if (!ALLOWED_IMG_EXT.includes(ext)) {
        return cb(new Error(`Extensión no permitida para imagen: .${ext}`));
    }
    cb(null, true);
  }
});

// 
const uploadPdf = multer({
  storage,
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().substring(1); // Eliminar el punto inicial
    const isPdf = ext === 'pdf' || file.mimetype === 'application/pdf';
    if (!isPdf) return cb(new Error('Solo se permiten archivos PDF'));
    cb(null, true);
  }
});

// Uploader para archivos de Audio
const audioUpload = multer({
  storage,
  // Allow large audio files (default 10 GB)
  limits: { fileSize: MAX_AV_FILE_BYTES },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().substring(1);
    const isAudio = ALLOWED_AUDIO_EXT.includes(ext) || (file.mimetype && file.mimetype.startsWith('audio/'));
    if (!isAudio) return cb(new Error(`Extensión no permitida para audio: .${ext}`));
    cb(null, true);
  }
});

// Uploader para archivos de Video
const videoUpload = multer({
  storage,
  // Allow large video files (default 10 GB)
  limits: { fileSize: MAX_AV_FILE_BYTES },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().substring(1);
    const isVideo = ALLOWED_VIDEO_EXT.includes(ext) || (file.mimetype && file.mimetype.startsWith('video/'));
    if (!isVideo) return cb(new Error(`Extensión no permitida para video: .${ext}`));
    cb(null, true);
  }
});

// Uploader para archivos comprimidos (ZIP/RAR)
const archiveUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5 GB para archivos comprimidos
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().substring(1);
    const isArchive = ['zip', 'rar'].includes(ext) || 
                      ['application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed'].includes(file.mimetype);
    if (!isArchive) return cb(new Error('Solo se permiten archivos ZIP o RAR'));
    cb(null, true);
  }
});

// Uploader general para cualquier archivo (para crear ZIP)
const anyFileUpload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 * 1024 } // 1 GB por archivo individual al comprimir
});


// --- LÓGICA DE CONVERSIÓN DE OFFICE ---
function findLibreOffice() {
  if (process.env.SOFFICE_PATH && fs.existsSync(process.env.SOFFICE_PATH)) {
    return process.env.SOFFICE_PATH;
  }
  const commonPaths = [
    'C:\\Program Files\\LibreOffice\\program\\soffice.com',  // .com for better console output
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe'
  ];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const SOFFICE_PATH = findLibreOffice();

// --- DETECCIÓN DE GHOSTSCRIPT ---
function findGhostscript() {
  if (process.env.GHOSTSCRIPT_PATH && fs.existsSync(process.env.GHOSTSCRIPT_PATH)) {
    return process.env.GHOSTSCRIPT_PATH;
  }
  const possiblePaths = process.platform === 'win32'
    ? [
        'gswin64c.exe',
        'gswin32c.exe',
        'C:\\Program Files\\gs\\gs10.04.0\\bin\\gswin64c.exe',
        'C:\\Program Files\\gs\\gs10.03.1\\bin\\gswin64c.exe',
        'C:\\Program Files\\gs\\gs10.02.1\\bin\\gswin64c.exe',
        'C:\\Program Files (x86)\\gs\\gs10.04.0\\bin\\gswin32c.exe',
        'C:\\Program Files (x86)\\gs\\gs10.03.1\\bin\\gswin32c.exe'
      ]
    : ['gs', '/usr/bin/gs', '/usr/local/bin/gs'];
  
  for (const gsPath of possiblePaths) {
    try {
      // Try to execute --version to verify it works
      execSync(`"${gsPath}" --version`, { stdio: 'ignore', timeout: 3000 });
      return gsPath;
    } catch (err) {
      // Continue to next path
    }
  }
  return null;
}

const GHOSTSCRIPT_PATH = findGhostscript();

function convertToPDF(inputPath, outputDir) {
  return new Promise((resolve, reject) => {
    if (!SOFFICE_PATH) {
      return reject(new Error('LibreOffice no detectado. Instálalo o configura SOFFICE_PATH en .env'));
    }
    const cmd = `"${SOFFICE_PATH}" --headless --norestore --nofirststartwizard --convert-to pdf --outdir "${outputDir}" "${inputPath}"`;
    exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`Error al convertir: ${error.message}`));
      }
      const inputFilename = path.basename(inputPath);
      const pdfName = inputFilename.replace(path.extname(inputFilename), '.pdf');
      const pdfPath = path.join(outputDir, pdfName);
      if (fs.existsSync(pdfPath)) {
        resolve({ pdfPath, pdfName });
      } else {
        reject(new Error('PDF no generado. Verifica que LibreOffice pueda abrir el archivo.'));
      }
    });
  });
}

// --- LIMPIEZA DE ARCHIVOS TEMPORALES ---
async function cleanupTempFiles() {
  if (!fs.existsSync(TMP_DIR)) return;
  const now = Date.now();
  const jobIds = await fs.promises.readdir(TMP_DIR); // Usar readdir asíncrono
  for (const jobId of jobIds) {
    const jobPath = path.join(TMP_DIR, jobId);
    try {
      const stats = await fs.promises.stat(jobPath); // Usar stat asíncrono
      if (now - stats.mtimeMs > JOB_MAX_AGE_MS) {
        await fs.promises.rm(jobPath, { recursive: true, force: true }); // Usar rm asíncrono
        console.log(`Limpieza: Job ${jobId} eliminado.`);
      }
    } catch (err) { /* Ignorar errores si el directorio ya fue eliminado por otro proceso */ }
  }
}
setInterval(cleanupTempFiles, CLEANUP_INTERVAL_MS); // Ejecutar la función de limpieza


// ======================================================
// --- ENDPOINTS DE LA API ---
// ======================================================

// Health check para Office
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    libreoffice: SOFFICE_PATH ? 'detected' : 'not found'
  });
});

// 1. Endpoint para convertir Office a PDF
app.post('/convert', officeUpload.array('files', MAX_FILES), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No se recibieron archivos' });
    }
    if (!SOFFICE_PATH) {
        return res.status(500).json({ message: 'LibreOffice no está instalado o no se detectó' });
    }

    const jobId = req.jobId;
    const outputDir = path.join(TMP_DIR, jobId, 'out');
    fs.mkdirSync(outputDir, { recursive: true });

  const results = [];
    for (const file of req.files) {
      try {
        const { pdfPath, pdfName } = await convertToPDF(file.path, outputDir);
        results.push({
          status: 'success',
          originalName: file.originalname,
          pdfName,
          downloadUrl: `/download/${jobId}/${pdfName}`
        });
      } catch (error) {
        results.push({ status: 'error', originalName: file.originalname, error: error.message });
      }
    }
    res.json({ items: results, jobId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 2. Endpoint para convertir Imágenes (¡NUEVO!)
app.post('/convert-image', imageUpload.array('files', MAX_FILES), async (req, res) => {
    try {
    const { format, quality } = req.body;
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'No se subieron archivos.' });
        }
    if (!format) {
            return res.status(400).json({ message: 'No se especificó un formato de salida.' });
        }

    const requestedFormat = String(format).toLowerCase();
    if (!SUPPORTED_IMG_OUTPUTS.has(requestedFormat)) {
      return res.status(400).json({
        message: `Formato de salida no soportado: ${requestedFormat}`
      });
    }

    const sharpFormat = requestedFormat === 'jpg' ? 'jpeg' : requestedFormat;

        const jobId = req.jobId;
        const outputDir = path.join(TMP_DIR, jobId, 'out');
        fs.mkdirSync(outputDir, { recursive: true });

        const results = [];
        for (const file of files) {
            try {
        const outputExt = requestedFormat;
        const baseName = sanitizeFilename(path.parse(file.originalname).name);
        const outputFileName = `${baseName}.${outputExt}`;
                const outputPath = path.join(outputDir, outputFileName);

                const sourceSharp = await createSharpSource(file.path);

                if (requestedFormat === 'ico') {
                  const iconSizes = [256, 128, 64, 48, 32, 16];
                  try {
                    const pngBuffers = await Promise.all(
                      iconSizes.map(size =>
                        sourceSharp
                          .clone()
                          .resize(size, size, {
                            fit: 'contain',
                            background: { r: 0, g: 0, b: 0, alpha: 0 }
                          })
                          .png()
                          .toBuffer()
                      )
                    );
                    const icoBuffer = await pngToIco(pngBuffers);
                    await fs.promises.writeFile(outputPath, icoBuffer);
                  } catch (icoError) {
                    throw new Error(`Error al generar ICO: ${icoError.message}`);
                  }
                } else if (requestedFormat === 'bmp') {
                  try {
                    const { data, info } = await sourceSharp
                      .clone()
                      .ensureAlpha()
                      .raw()
                      .toBuffer({ resolveWithObject: true });

                    const encodedData = rgbaToBgra(data);
                    const bmpBuffer = bmp.encode({
                      data: encodedData,
                      width: info.width,
                      height: info.height,
                      isWithAlpha: true
                    }).data;

                    await fs.promises.writeFile(outputPath, bmpBuffer);
                  } catch (bmpError) {
                    throw new Error(`Error al generar BMP: ${bmpError.message}`);
                  }
                } else if (requestedFormat === 'svg') {
                  try {
                    // Convert to PNG first, then trace to SVG using potrace
                    const pngBuffer = await sourceSharp
                      .clone()
                      .png()
                      .toBuffer();
                    
                    // Use potrace to convert bitmap to vector SVG
                    const svgString = await new Promise((resolve, reject) => {
                      potrace.trace(pngBuffer, (err, svg) => {
                        if (err) reject(err);
                        else resolve(svg);
                      });
                    });
                    
                    await fs.promises.writeFile(outputPath, svgString);
                  } catch (svgError) {
                    throw new Error(`Error al generar SVG: ${svgError.message}`);
                  }
                } else {
                  let imageSharp = sourceSharp.clone();
                  const parsedQuality = parseInt(quality);

                  if (['jpeg', 'jpg', 'png', 'webp', 'tiff'].includes(requestedFormat) && !isNaN(parsedQuality)) {
                    imageSharp = imageSharp.toFormat(sharpFormat, { quality: parsedQuality });
                  } else {
                    imageSharp = imageSharp.toFormat(sharpFormat);
                  }

                  await imageSharp.toFile(outputPath);
                }
                
                results.push({
                    status: 'success',
                    originalName: file.originalname,
                    outputName: outputFileName,
          format: requestedFormat,
                    downloadUrl: `/download/${jobId}/${outputFileName}`
                });
            } catch (error) {
                results.push({
                    status: 'error',
                    originalName: file.originalname,
                    error: `Error al convertir: ${error.message}`
                });
            }
        }
        res.json({ items: results });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 2b. Endpoint para quitar fondo de imágenes (IA)
app.post('/remove-background', imageUpload.array('files', MAX_FILES), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No se subieron imágenes.' });
    }

    // Cargar dinámicamente la librería ESM cuando se usa por primera vez
    if (!removeBackgroundNode) {
      try {
        const mod = await import('@imgly/background-removal-node');
        removeBackgroundNode = mod.removeBackground;
      } catch (e) {
        console.error('Error cargando @imgly/background-removal-node:', e);
        return res.status(500).json({ message: 'No se pudo cargar el motor de eliminación de fondo.' });
      }
    }

    const jobId = req.jobId;
    const outputDir = path.join(TMP_DIR, jobId, 'out');
    fs.mkdirSync(outputDir, { recursive: true });

    const results = [];

    for (const file of files) {
      try {
        // Intentar decodificar con sharp a RGBA crudo para evitar dependencias de canvas
        let imageInput = null;
        try {
          const sourceSharp = await createSharpSource(file.path);
          const { data, info } = await sourceSharp
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
          // Construir un Blob con mime personalizado que la lib sabe decodificar sin sharp
          const mime = `image/x-rgba8;width=${info.width};height=${info.height}`;
          imageInput = new Blob([data], { type: mime });
        } catch (decodeErr) {
          // Fallback a buffer si no se pudo decodificar
          const buf = await fs.promises.readFile(file.path);
          const type = file.mimetype && /^image\//.test(file.mimetype) ? file.mimetype : 'application/octet-stream';
          imageInput = new Blob([buf], { type });
        }

        // Configuración por defecto: PNG del primer plano (sin fondo)
        const publicPath = `file://${path.resolve(path.join(__dirname, 'node_modules', '@imgly', 'background-removal-node', 'dist'))}/`;
        const config = {
          publicPath,
          model: 'medium',
          output: {
            format: 'image/png',
            quality: 0.95
          }
        };

        const blob = await removeBackgroundNode(imageInput, config);
        const arrayBuffer = await blob.arrayBuffer();
        const outBuffer = Buffer.from(arrayBuffer);

        const base = sanitizeFilename(path.parse(file.originalname).name);
        const outputName = `${base}-bg-removed.png`;
        const outputPath = path.join(outputDir, outputName);
        await fs.promises.writeFile(outputPath, outBuffer);

        results.push({
          status: 'success',
          originalName: file.originalname,
          outputName,
          format: 'png',
          downloadUrl: `/download/${jobId}/${outputName}`
        });
      } catch (err) {
        console.error('Remove background error:', err);
        results.push({
          status: 'error',
          originalName: file.originalname,
          error: err?.message || 'Error al eliminar el fondo'
        });
      }
    }

    res.json({ items: results, jobId });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error interno' });
  }
});

// ======================================================
// --- AUDIO: compresión/transcodificación a MP3 ---
// ======================================================
app.post('/reform-audio/compress', audioUpload.array('files', MAX_FILES), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No se subieron audios.' });
    }

    // formato de salida y bitrate
  const requestedFormat = String(req.body.format || 'mp3').toLowerCase();
  const SUPPORTED_AUDIO_OUTPUTS = new Set(['mp3','m4a','aac','ogg','opus','wav','flac']);
    if (!SUPPORTED_AUDIO_OUTPUTS.has(requestedFormat)) {
      return res.status(400).json({ message: `Formato de salida no soportado: ${requestedFormat}` });
    }

    const bitrateKbps = parseInt(String(req.body.bitrate || '128'), 10);
    const targetBitrate = Number.isFinite(bitrateKbps) && bitrateKbps > 16 ? bitrateKbps : 128;

    const jobId = req.jobId;
    const outputDir = path.join(TMP_DIR, jobId, 'out');
    fs.mkdirSync(outputDir, { recursive: true });

    const results = [];

    const transcodeOne = (inputPath, outputPath) => {
      return new Promise((resolve, reject) => {
        const cmd = ffmpeg(inputPath);

        switch (requestedFormat) {
          case 'mp3':
            cmd.audioCodec('libmp3lame').audioBitrate(targetBitrate);
            break;
          case 'm4a':
            // Usar encoder AAC nativo; el contenedor se infiere por la extensión .m4a
            cmd.audioCodec('aac').audioBitrate(targetBitrate).outputOptions('-vn');
            break;
          case 'aac':
            // AAC crudo en contenedor ADTS (.aac)
            cmd.audioCodec('aac').audioBitrate(targetBitrate).outputOptions('-vn');
            break;
          case 'ogg':
            cmd.audioCodec('libvorbis').audioBitrate(targetBitrate);
            break;
          case 'opus':
            cmd.audioCodec('libopus').audioBitrate(targetBitrate);
            break;
          case 'wav':
            cmd.audioCodec('pcm_s16le');
            break;
          case 'flac':
            cmd.audioCodec('flac');
            break;
        }

        // Formato de salida: para m4a usar 'ipod'; para aac usar 'adts'; resto el mismo nombre
        const container = requestedFormat === 'm4a' ? 'ipod'
          : requestedFormat === 'aac' ? 'adts'
          : requestedFormat === 'opus' ? 'ogg'
          : requestedFormat;
        cmd
          .format(container)
          .on('error', (err) => reject(err))
          .on('end', () => resolve())
          .save(outputPath);
      });
    };

    for (const file of files) {
      try {
        const base = sanitizeFilename(path.parse(file.originalname).name);
        const ext = requestedFormat === 'm4a' ? 'm4a' : requestedFormat;
        const outputName = `${base}-converted.${ext}`;
        const outputPath = path.join(outputDir, outputName);
        await transcodeOne(file.path, outputPath);
        results.push({
          status: 'success',
          originalName: file.originalname,
          outputName,
          bitrate: ['mp3','m4a','aac'].includes(requestedFormat) ? targetBitrate : undefined,
          format: ext,
          downloadUrl: `/download/${jobId}/${outputName}`
        });
      } catch (err) {
        results.push({ status: 'error', originalName: file.originalname, error: err?.message || 'Error al comprimir' });
      }
    }

    res.json({ items: results, jobId });
  } catch (error) {
    console.error('Audio compress error:', error);
    res.status(500).json({ message: error.message || 'Error interno' });
  }
});

// ======================================================
// --- VIDEO: compresión a H.264 MP4 (CRF) ---
// ======================================================
app.post('/reform-video/compress', videoUpload.array('files', MAX_FILES), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No se subieron videos.' });
    }

    const requestedFormat = String(req.body.format || 'mp4').toLowerCase();
    const formatConfigs = {
      mp4: {
        ext: 'mp4',
        container: 'mp4',
        pipelines: [
          { label: 'copy', copyAll: true, outputOptions: ['-movflags', '+faststart'] },
          { label: 'h264-aac', videoCodec: 'libx264', audioCodec: 'aac', audioBitrate: '128k', outputOptions: ['-preset', 'veryfast', '-crf', '23', '-movflags', '+faststart'] },
        ],
      },
      mov: {
        ext: 'mov',
        container: 'mov',
        pipelines: [
          { label: 'copy', copyAll: true },
          { label: 'h264-aac', videoCodec: 'libx264', audioCodec: 'aac', audioBitrate: '128k', outputOptions: ['-preset', 'veryfast', '-crf', '23'] },
        ],
      },
      webm: {
        ext: 'webm',
        container: 'webm',
        pipelines: [
          { label: 'copy', copyAll: true },
          { label: 'vp9-opus', videoCodec: 'libvpx-vp9', audioCodec: 'libopus', outputOptions: ['-b:v', '0', '-crf', '36', '-deadline', 'realtime', '-cpu-used', '4'] },
        ],
      },
      mkv: {
        ext: 'mkv',
        container: 'matroska',
        pipelines: [
          { label: 'copy', copyAll: true },
          { label: 'h264-aac', videoCodec: 'libx264', audioCodec: 'aac', audioBitrate: '128k', outputOptions: ['-preset', 'veryfast', '-crf', '23'] },
        ],
      },
      avi: {
        ext: 'avi',
        container: 'avi',
        pipelines: [
          { label: 'copy', copyAll: true },
          { label: 'mpeg4-mp3', videoCodec: 'mpeg4', audioCodec: 'libmp3lame', audioBitrate: '160k', outputOptions: ['-q:v', '5'] },
        ],
      },
    };

    const config = formatConfigs[requestedFormat];
    if (!config) {
      return res.status(400).json({ message: `Formato de salida no soportado: ${requestedFormat}` });
    }

    const jobId = req.jobId;
    const outputDir = path.join(TMP_DIR, jobId, 'out');
    fs.mkdirSync(outputDir, { recursive: true });

    const results = [];

    const convertOne = async (inputPath, outputPath) => {
      const pipelines = Array.isArray(config.pipelines) && config.pipelines.length
        ? config.pipelines
        : [{ label: 'default', copyAll: true }];

      let lastError = null;

      for (const pipeline of pipelines) {
        try {
          await fs.promises.rm(outputPath, { force: true }).catch(() => {});

          await new Promise((resolve, reject) => {
            const cmd = ffmpeg(inputPath)
              .inputOptions(['-nostdin'])
              .format(pipeline.container || config.container || config.ext);

            const outputOptions = ['-y'];
            if (Array.isArray(pipeline.outputOptions) && pipeline.outputOptions.length) {
              outputOptions.push(...pipeline.outputOptions);
            }

            cmd.outputOptions(outputOptions);

            if (pipeline.copyAll) {
              cmd.outputOptions('-c copy');
            } else {
              if (pipeline.videoCodec) {
                cmd.videoCodec(pipeline.videoCodec);
              }

              if (pipeline.noAudio) {
                cmd.noAudio();
              } else if (pipeline.audioCodec) {
                cmd.audioCodec(pipeline.audioCodec);
                if (pipeline.audioBitrate) {
                  cmd.audioBitrate(pipeline.audioBitrate);
                }
              }
            }

            const pipelineLabel = pipeline.label || pipeline.videoCodec || pipeline.container || 'pipeline';

            cmd
              .on('start', (cmdline) => {
                console.log(`[reform-video] ffmpeg (${pipelineLabel}) start:`, cmdline);
              })
              .on('progress', (p) => {
                if (p && typeof p.percent === 'number') {
                  const pct = Math.max(0, Math.min(100, Math.round(p.percent)));
                  if (pct % 10 === 0) {
                    console.log(`[reform-video] progress ~${pct}% (${pipelineLabel})`);
                  }
                }
              })
              .once('error', (err) => {
                const wrapped = err instanceof Error ? err : new Error(err?.message || String(err));
                wrapped.pipeline = pipelineLabel;
                reject(wrapped);
              })
              .once('end', () => resolve())
              .save(outputPath);
          });

          return pipeline;
        } catch (err) {
          lastError = err;
          const label = err?.pipeline || pipeline.label || pipeline.videoCodec || 'pipeline';
          console.warn(`[reform-video] pipeline ${label} falló:`, err?.message || err);
          await fs.promises.rm(outputPath, { force: true }).catch(() => {});
        }
      }

      throw lastError || new Error('No se pudo convertir el video');
    };

    for (const file of files) {
      try {
        const base = sanitizeFilename(path.parse(file.originalname).name);
        const outputName = `${base}_reformed.${config.ext}`;
        const outputPath = path.join(outputDir, outputName);
        const pipelineUsed = await convertOne(file.path, outputPath);
        results.push({
          status: 'success',
          originalName: file.originalname,
          outputName,
          format: config.ext,
          pipeline: pipelineUsed?.label || pipelineUsed?.videoCodec || (pipelineUsed?.copyAll ? 'copy' : null) || 'default',
          downloadUrl: `/download/${jobId}/${outputName}`
        });
      } catch (err) {
        results.push({ status: 'error', originalName: file.originalname, error: err?.message || 'Error al convertir video' });
      }
    }

    res.json({ items: results, jobId });
  } catch (error) {
    console.error('Reform video error:', error);
    res.status(500).json({ message: error.message || 'Error interno' });
  }
});

// (debajo del endpoint /convert) - NUEVO endpoint para unir PDFs
app.post('/merge-pdf', uploadPdf.array('files', MAX_FILES), async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({
        code: 'NEED_AT_LEAST_TWO',
        message: 'Sube al menos 2 archivos PDF'
      });
    }

    const jobId = req.jobId;
    const outputDir = path.join(TMP_DIR, jobId, 'out');
    fs.mkdirSync(outputDir, { recursive: true });

    const mergedPdf = await PDFDocument.create();
    const invalidFiles = [];

    // Importa las páginas en el orden exacto en que llegaron
    for (const f of req.files) {
      const bytes = fs.readFileSync(f.path);
      const header = bytes.slice(0, 5).toString();
      if (!header.startsWith('%PDF')) {
        invalidFiles.push(f.originalname);
        continue;
      }

      try {
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await mergedPdf.copyPages(doc, doc.getPageIndices());
        pages.forEach(p => mergedPdf.addPage(p));
      } catch (pdfError) {
        invalidFiles.push(f.originalname);
      }
    }

    if (mergedPdf.getPageCount() === 0) {
      return res.status(400).json({
        code: 'INVALID_PDFS',
        message: `No se pudieron leer los archivos: ${invalidFiles.join(', ')}`
      });
    }

    const outputName = `merged-${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, outputName);
    const mergedBytes = await mergedPdf.save();
    fs.writeFileSync(outputPath, mergedBytes);

    res.json({
      status: 'success',
      jobId,
      outputName,
      downloadUrl: `/download/${jobId}/${outputName}`,
      totalFiles: req.files.length,
      skippedFiles: invalidFiles
    });
  } catch (error) {
    console.error('Error al unir PDFs:', error);
    res.status(500).json({
      code: 'MERGE_ERROR',
      message: error.message || 'Error al unir los PDF'
    });
  }
});

// 3. Endpoint para descargar cualquier archivo convertido
app.get('/download/:jobId/:filename', (req, res) => {
  const { jobId, filename } = req.params;
  const sanitizedFilename = sanitizeFilename(filename);
  const filePath = path.join(TMP_DIR, jobId, 'out', sanitizedFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Archivo no encontrado o ya expiró' });
  }
  res.download(filePath, sanitizedFilename);
});

// 4. Endpoint para convertir PDF a Office (DOCX)
app.post('/pdf-to-office', uploadPdf.array('files', MAX_FILES), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No se recibieron archivos' });
    }
    if (!SOFFICE_PATH) {
      return res.status(500).json({ message: 'LibreOffice no está instalado o no se detectó' });
    }

    const jobId = req.jobId;
    const outputDir = path.join(TMP_DIR, jobId, 'out');
    const workingDir = path.join(TMP_DIR, jobId, 'work');
    fs.mkdirSync(outputDir, { recursive: true });
    fs.mkdirSync(workingDir, { recursive: true });

    const results = [];
    for (const file of req.files) {
      let artifacts = [];

      try {
        let pdfSourcePath = file.path;
        let blankPagesRemoved = 0;

        const processed = await removeBlankPagesFromPdf(file.path, workingDir);
        pdfSourcePath = processed.pdfPath;
        blankPagesRemoved = processed.blankPagesRemoved;
        artifacts = processed.tempFiles.slice();

  console.log(`Procesando: ${file.originalname} (${blankPagesRemoved} páginas en blanco eliminadas)`);
        console.log(`   PDF fuente: ${pdfSourcePath}`);
        
        if (!fs.existsSync(pdfSourcePath)) {
          throw new Error(`El archivo PDF procesado no existe: ${pdfSourcePath}`);
        }

        // Use Python pdf2docx for conversion (better quality than LibreOffice)
        const desiredDocxName = `${sanitizeFilename(path.parse(file.originalname).name)}.docx`;
        const desiredDocxPath = path.join(outputDir, desiredDocxName);
        
        const pythonScript = path.join(__dirname, 'pdf2docx_converter.py');
        const pythonCmd = `python "${pythonScript}" "${pdfSourcePath}" "${desiredDocxPath}"`;
        
        console.log(`   Convirtiendo a DOCX con pdf2docx...`);

        await new Promise((resolve, reject) => {
          exec(pythonCmd, { timeout: 300000 }, (error, stdout, stderr) => {
            if (error) {
              console.error('pdf2docx error:', stderr?.trim() || error.message);
              return reject(new Error(`Error al convertir a DOCX: ${stderr?.trim() || error.message}`));
            }
            if (stdout) console.log(`   ${stdout.trim()}`);
            resolve();
          });
        });

        // Wait a moment for file to be fully written
        await sleep(500);

        if (!fs.existsSync(desiredDocxPath)) {
          throw new Error('DOCX no generado por pdf2docx');
        }

  console.log(`   Conversión exitosa: ${desiredDocxName}`);

        // No shape removal needed - pdf2docx doesn't add background images
        const shapesRemoved = 0;

        results.push({
          status: 'success',
          originalName: file.originalname,
          docxName: desiredDocxName,
          downloadUrl: `/download/${jobId}/${desiredDocxName}`,
          blankPagesRemoved,
          shapesRemoved
        });
      } catch (error) {
        results.push({ status: 'error', originalName: file.originalname, error: error.message });
      } finally {
        for (const artifactPath of artifacts) {
          try {
            if (artifactPath && fs.existsSync(artifactPath)) {
              fs.unlinkSync(artifactPath);
            }
          } catch (cleanupErr) {
            // Ignore cleanup errors
          }
        }
      }
    }
    try {
      fs.rmSync(workingDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      // Ignore cleanup errors
    }
    res.json({ items: results, jobId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 5. Endpoint para comprimir PDF con Ghostscript
app.post('/compress-pdf', uploadPdf.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió ningún archivo PDF' });
    }
    if (!GHOSTSCRIPT_PATH) {
      return res.status(500).json({ 
        message: 'Ghostscript no está instalado o no se detectó. La compresión de PDF no está disponible.' 
      });
    }

    const preset = req.body.preset || 'balanced';
    const jobId = req.jobId;
    const outputDir = path.join(TMP_DIR, jobId, 'out');
    fs.mkdirSync(outputDir, { recursive: true });

    const inputPath = req.file.path;
    const baseName = sanitizeFilename(path.parse(req.file.originalname).name);
    const outputName = `${baseName}_compressed.pdf`;
    const outputPath = path.join(outputDir, outputName);

    // Configuración de Ghostscript según el preset
    const gsSettings = {
      high: { dPDFSETTINGS: '/printer', quality: 'Alta calidad' },
      balanced: { dPDFSETTINGS: '/ebook', quality: 'Equilibrado' },
      strong: { dPDFSETTINGS: '/screen', quality: 'Máxima compresión' }
    };

    const settings = gsSettings[preset] || gsSettings.balanced;

    // Comando de Ghostscript
    const gsCommand = `"${GHOSTSCRIPT_PATH}" -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=${settings.dPDFSETTINGS} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${inputPath}"`;

    console.log(`Comprimiendo PDF con preset '${preset}' (${settings.quality})...`);

    await new Promise((resolve, reject) => {
      exec(gsCommand, { timeout: 120000 }, (error, stdout, stderr) => {
        if (error) {
          console.error('Ghostscript error:', stderr?.trim() || error.message);
          return reject(new Error(`Error al comprimir PDF: ${stderr?.trim() || error.message}`));
        }
        resolve();
      });
    });

    // Verificar que el archivo comprimido existe
    if (!fs.existsSync(outputPath)) {
      throw new Error('El PDF comprimido no fue generado');
    }

    // Obtener tamaños para estadísticas
    const originalSize = fs.statSync(inputPath).size;
    const compressedSize = fs.statSync(outputPath).size;
    const savings = Math.max(0, originalSize - compressedSize);
    const savingsPercent = originalSize > 0 ? Math.round((savings / originalSize) * 100) : 0;

    console.log(`Compresión exitosa: ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (${savingsPercent}% ahorro)`);

    res.json({
      status: 'success',
      originalName: req.file.originalname,
      outputName,
      downloadUrl: `/download/${jobId}/${outputName}`,
      preset,
      originalSize,
      compressedSize,
      savings,
      savingsPercent
    });
  } catch (error) {
    console.error('Error al comprimir PDF:', error);
    res.status(500).json({ message: error.message });
  }
});

// ======================================================
// --- ARCHIVO: Comprimir en ZIP ---
// ======================================================
app.post('/archive/compress', anyFileUpload.array('files', MAX_FILES), (req, res) => {
  const jobId = req.jobId;
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No se subieron archivos para comprimir.' });
    }

    // Responder inmediatamente con el Job ID
    res.status(202).json({ jobId });

    // --- Iniciar la compresión en segundo plano ---
    const compressionLevel = req.body.level || 'deflate';
    const outputDir = path.join(TMP_DIR, jobId, 'out');
    fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = Date.now();
    const zipName = `archive-${timestamp}.zip`;
    const zipPath = path.join(outputDir, zipName);
    const statusFilePath = path.join(outputDir, 'status.json');

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { 
        level: compressionLevel === 'store' ? 0 : (compressionLevel === 'deflate-max' ? 9 : 6) 
      }
    });

    output.on('close', () => {
      const status = {
        status: 'completed',
        zipName,
        downloadUrl: `/download/${jobId}/${zipName}`,
        bytes: archive.pointer()
      };
      fs.writeFileSync(statusFilePath, JSON.stringify(status));
      console.log(`Archivo ZIP creado y estado guardado: ${zipName}`);
    });

    const onError = (err) => {
      const errorStatus = { status: 'error', message: err.message };
      fs.writeFileSync(statusFilePath, JSON.stringify(errorStatus));
      console.error('Error durante la compresión, estado guardado:', err);
    };

    output.on('error', onError);
    archive.on('error', onError);
    archive.on('warning', (err) => console.warn('Archiver warning:', err));

    archive.pipe(output);

    for (const file of files) {
      archive.file(file.path, { name: file.originalname });
    }

    archive.finalize();

  } catch (error) {
    console.error('Error síncrono en /archive/compress:', error);
    // Si el error ocurre antes de la respuesta, enviar error 500
    if (!res.headersSent) {
      res.status(500).json({ message: error.message || 'Error al iniciar la compresión del ZIP' });
    }
  }
});

// Nuevo endpoint para consultar el estado de la compresión
app.get('/archive/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const outputDir = path.join(TMP_DIR, jobId, 'out');
  const statusFilePath = path.join(outputDir, 'status.json');

  if (fs.existsSync(statusFilePath)) {
    const status = JSON.parse(fs.readFileSync(statusFilePath, 'utf-8'));
    return res.json(status);
  }

  // Si el archivo de estado no existe, pero la carpeta sí, está en proceso
  if (fs.existsSync(outputDir)) {
    return res.json({ status: 'processing' });
  }

  // Si no existe nada, el job es inválido
  return res.status(404).json({ status: 'not_found', message: 'Job no encontrado.' });
});

// ======================================================
// --- ARCHIVO: Extraer ZIP/RAR ---
// ======================================================
app.post('/archive/extract', archiveUpload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'No se subió archivo para extraer.' });
    }

    const jobId = req.jobId;
    const outputDir = path.join(TMP_DIR, jobId, 'out');
    fs.mkdirSync(outputDir, { recursive: true });

    const ext = path.extname(file.originalname).toLowerCase();
    const extractedFiles = [];

    if (ext === '.zip') {
      // Extraer ZIP con AdmZip
      const zip = new AdmZip(file.path);
      const zipEntries = zip.getEntries();

      for (const entry of zipEntries) {
        if (!entry.isDirectory) {
          const entryName = entry.entryName;
          const sanitizedName = sanitizeFilename(path.basename(entryName));
          const outputPath = path.join(outputDir, sanitizedName);
          
          zip.extractEntryTo(entry, outputDir, false, true, false, sanitizedName);
          
          extractedFiles.push({
            name: sanitizedName,
            originalName: entryName,
            downloadUrl: `/download/${jobId}/${sanitizedName}`
          });
        }
      }
    } else if (ext === '.rar') {
      // Para RAR necesitamos usar unrar (requiere instalación externa)
      // En Windows, se puede instalar WinRAR o usar unrar-free
      return res.status(400).json({ 
        message: 'La extracción de archivos RAR no está disponible actualmente. Por favor, usa archivos ZIP.' 
      });
    } else {
      return res.status(400).json({ message: 'Solo se soportan archivos ZIP' });
    }

    res.json({
      jobId,
      files: extractedFiles,
      count: extractedFiles.length
    });
  } catch (error) {
    console.error('Error extracting archive:', error);
    res.status(500).json({ message: error.message || 'Error al extraer el archivo' });
  }
});

// ======================================================
// --- QR CODE: Generar códigos QR ---
// ======================================================

// Uploader para archivos de QR (PDF, MP3, imágenes)
const qrFileUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    try {
      const mimetype = (file.mimetype || '').toLowerCase();
      const name = (file.originalname || '').toLowerCase();

      const allowedExt = /\.(pdf|mp3|wav|m4a|aac|ogg|opus|jpg|jpeg|png|gif|webp|bmp|svg|ico|heic|heif|avif|tif|tiff)$/i;

      const isAllowedMime = (
        mimetype === 'application/pdf' ||
        mimetype.startsWith('image/') ||
        mimetype.startsWith('audio/')
      );

      if (isAllowedMime || allowedExt.test(name)) {
        return cb(null, true);
      }
      return cb(new Error('Tipo de archivo no permitido'));
    } catch (e) {
      return cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

app.post('/qr/upload', qrFileUpload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'No se subió ningún archivo' });
    }

    const jobId = req.jobId;
    const outputDir = path.join(TMP_DIR, jobId, 'out');
    fs.mkdirSync(outputDir, { recursive: true });

    // Mover el archivo a la carpeta de salida
    const fileName = sanitizeFilename(file.originalname);
    const destPath = path.join(outputDir, fileName);
    fs.renameSync(file.path, destPath);

    // Generar URL pública
    const fileUrl = `${req.protocol}://${req.get('host')}/download/${jobId}/${fileName}`;

    res.json({
      jobId,
      fileName,
      url: fileUrl
    });
  } catch (error) {
    console.error('Error uploading file for QR:', error);
    res.status(500).json({ message: error.message || 'Error al subir el archivo' });
  }
});

app.post('/qr/generate', async (req, res) => {
  try {
    const { data, size = 300, color = '#000000', background = '#ffffff', format = 'png' } = req.body;

    if (!data) {
      return res.status(400).json({ message: 'No se proporcionaron datos para el QR' });
    }

    const width = parseInt(size);
    const baseOptions = {
      width,
      color: {
        dark: color,
        light: background
      },
      errorCorrectionLevel: 'H',
      margin: 1
    };

    const fmt = String(format).toLowerCase();
    if (fmt === 'svg') {
      // Generar SVG como string
      const svg = await QRCode.toString(data, { ...baseOptions, type: 'svg' });
      res.set('Content-Type', 'image/svg+xml');
      return res.send(svg);
    }

    // Por defecto generar PNG como buffer
    const pngBuffer = await QRCode.toBuffer(data, baseOptions);
    res.set('Content-Type', 'image/png');
    res.send(pngBuffer);
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ message: error.message || 'Error al generar el código QR' });
  }
});

// --- MANEJO DE ERRORES Y RUTAS ---
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({ message: `Error de subida: ${error.message}` });
    }
    if (error) {
        return res.status(500).json({ message: error.message });
    }
    next();
});

// Servir las páginas HTML
app.get('/image-converter.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'image-converter.html'));
});

app.get('/pdf-merge.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pdf-merge.html'));
});

app.get('/pdf-to-office.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pdf-to-office.html'));
});

// Páginas nuevas: Remove Background y Reform Audio
app.get('/remove-background.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'remove-background.html'));
});

app.get('/reform-audio.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reform-audio.html'));
});

// Opcional: PDF Compress explícito
app.get('/pdf-compress.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pdf-compress.html'));
});

// Nueva página: Audio Compress
app.get('/audio-compress.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'audio-compress.html'));
});

// Páginas de video (opcional explícito)
app.get('/video-compress.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'video-compress.html'));
});

app.get('/reform-video.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reform-video.html'));
});

// Páginas de archivo
app.get('/archive-zip.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'archive-zip.html'));
});

app.get('/extract-archive.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'extract-archive.html'));
});

// Página de generador de QR
app.get('/qr-generator.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'qr-generator.html'));
});

// Capacidades dinámicas de FFmpeg (encoders y formatos/muxers)
app.get('/reform-audio/capabilities', async (req, res) => {
  try {
    const encoders = await new Promise((resolve, reject) => {
      ffmpeg.getAvailableCodecs((err, codecs) => {
        if (err) return reject(err);
        resolve(codecs || {});
      });
    });
    const formats = await new Promise((resolve, reject) => {
      ffmpeg.getAvailableFormats((err, fmts) => {
        if (err) return reject(err);
        resolve(fmts || {});
      });
    });

    const hasEncoder = (name) => !!encoders[name] && (encoders[name].canEncode === true || /E/.test(encoders[name].type || ''));
    const canMux = (name) => !!formats[name] && (formats[name].canMux === true || /Mux/.test(formats[name].description || ''));

    const support = {
      mp3: hasEncoder('libmp3lame') && canMux('mp3'),
      m4a: hasEncoder('aac') && canMux('ipod'),
      aac: hasEncoder('aac') && canMux('adts'),
      ogg: hasEncoder('libvorbis') && canMux('ogg'),
      opus: hasEncoder('libopus') && canMux('ogg'),
      wav: hasEncoder('pcm_s16le') && canMux('wav'),
      flac: hasEncoder('flac') && canMux('flac'),
    };

    res.json({ support });
  } catch (err) {
    res.json({ support: { mp3: true, m4a: true, aac: true, ogg: false, opus: false, wav: true, flac: true } });
  }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});// --- INICIAR SERVIDOR ---
app.listen(PORT, () => {
  console.log(`\nServidor corriendo en http://localhost:${PORT}`);
  console.log(`LibreOffice: ${SOFFICE_PATH || 'NO DETECTADO'}`);
  console.log(`Ghostscript: ${GHOSTSCRIPT_PATH || 'NO DETECTADO'}`);
});
