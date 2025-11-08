# Reform Lab - Office & Image Converter

Aplicación web para convertir documentos Office a PDF e imágenes a diferentes formatos.

## Características

### Office → PDF
- Convierte DOC, DOCX, XLS, XLSX, PPT, PPTX, ODT, ODS, ODP a PDF
- Usa LibreOffice headless para conversión de alta calidad
- Procesamiento por lotes

### Image Converter
- Convierte imágenes entre múltiples formatos: JPG, PNG, WEBP, GIF, TIFF, BMP, ICO
- Detecta automáticamente el formato de entrada
- Control de calidad ajustable para formatos compatibles
- Procesamiento rápido con Sharp

## Requisitos

- **Node.js** 16+ 
- **LibreOffice** (solo para conversión Office → PDF)
  - Windows: Descargar de [libreoffice.org](https://www.libreoffice.org/download/download/)
  - Instalar en la ruta por defecto o configurar `SOFFICE_PATH` en `.env`

## Instalación

1. **Clonar o descargar el proyecto**

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno** (opcional)
   
   Editar `.env` si necesitas personalizar:
   ```env
   PORT=4000
   MAX_FILE_MB=50
   MAX_FILES=10
   ALLOWED_EXT=doc,docx,xls,xlsx,ppt,pptx,odt,ods,odp
   ALLOWED_IMG_EXT=jpg,jpeg,png,gif,webp,tiff,tif,bmp,ico,svg
   SOFFICE_PATH=  # Ruta personalizada a LibreOffice (opcional)
   ```

4. **Iniciar el servidor**
   ```bash
   npm start
   ```
   
   O con auto-reload en desarrollo:
   ```bash
   npm run watch
   ```

5. **Abrir en el navegador**
   ```
   http://localhost:4000
   ```

## Estructura del Proyecto

```
├── server.js                 # Servidor Express con endpoints
├── package.json             # Dependencias y scripts
├── .env                     # Variables de entorno
├── public/
│   ├── index.html          # Convertidor Office → PDF
│   ├── image-converter.html # Convertidor de imágenes
│   ├── app.js              # JS para Office → PDF
│   ├── image-converter.js  # JS para Image Converter
│   └── styles.css          # Estilos globales
└── tmp/                    # Archivos temporales (auto-limpieza)
```

## Características de la UI

- **Glassmorphism** design moderno
- **Tema oscuro/claro** con detección automática del sistema
- **Drag & drop** para subir archivos
- **Barra de progreso** en tiempo real
- **Notificaciones toast** para feedback
- **Responsive** para móviles y tablets

## API Endpoints

### Office → PDF

**POST** `/convert`
- **Body**: `multipart/form-data` con archivos Office
- **Response**: Lista de PDFs generados con URLs de descarga

### Image Converter

**POST** `/convert-image`
- **Body**: 
  - `files`: Archivos de imagen (multipart/form-data)
  - `format`: Formato de salida (jpg, png, webp, etc.)
  - `quality`: Calidad 1-100 (opcional, default: 90)
- **Response**: Lista de imágenes convertidas con URLs de descarga

### Descargar archivos

**GET** `/download/:jobId/:filename`
- Descarga un archivo procesado

### Health check

**GET** `/health`
- Verifica estado del servidor y LibreOffice

## Tecnologías Utilizadas

### Backend
- **Express**: Framework web
- **Multer**: Manejo de uploads
- **Sharp**: Procesamiento de imágenes
- **LibreOffice**: Conversión Office → PDF
- **Helmet**: Seguridad HTTP
- **CORS**: Control de acceso

### Frontend
- **Vanilla JavaScript**: Sin frameworks
- **CSS moderno**: Variables CSS, Grid, Flexbox
- **Glassmorphism**: Diseño con efectos de vidrio

## Seguridad

- Validación de extensiones de archivo
- Límites de tamaño y cantidad de archivos
- Sanitización de nombres de archivo
- Auto-limpieza de archivos temporales (30 min)
- Headers de seguridad con Helmet

## Configuración Avanzada

### Cambiar límites de archivos

Editar en `.env`:
```env
MAX_FILE_MB=100    # Tamaño máximo por archivo
MAX_FILES=20       # Cantidad máxima de archivos
```

### Ruta personalizada de LibreOffice

Si LibreOffice no se detecta automáticamente:
```env
SOFFICE_PATH=C:\Program Files\LibreOffice\program\soffice.exe
```

### Formatos adicionales

Agregar extensiones permitidas:
```env
ALLOWED_EXT=doc,docx,rtf,txt
ALLOWED_IMG_EXT=jpg,png,webp,avif,heic
```

## Solución de Problemas

### "LibreOffice no detectado"
- Verificar que LibreOffice esté instalado
- Configurar `SOFFICE_PATH` en `.env` con la ruta correcta
- Reiniciar el servidor después de instalar LibreOffice

### Errores de conversión de imágenes
- Verificar que el formato de entrada sea válido
- Algunos formatos (SVG) pueden tener limitaciones
- Revisar logs del servidor para más detalles

### Archivos no se descargan
- Los archivos se eliminan automáticamente después de 30 minutos
- Verificar que el `jobId` sea válido
- Revisar permisos de escritura en la carpeta `tmp/`

## Notas

- Los archivos temporales se limpian automáticamente cada 5 minutos
- Los jobs antiguos (>30 min) se eliminan automáticamente
- La conversión es secuencial para mejor feedback al usuario
- Sharp soporta la mayoría de formatos de imagen modernos

## Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## Licencia

MIT License - Ver archivo LICENSE para más detalles

## Autor

Desarrollado para simplificar la conversión de archivos