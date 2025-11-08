FROM node:18-bullseye

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libreoffice \
    libreoffice-writer \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Python
RUN pip3 install --no-cache-dir pdf2docx==0.5.6 PyMuPDF==1.22.5

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de Node.js
RUN npm ci --only=production

# Copiar el resto de la aplicación
COPY . .

# Crear directorio temporal con permisos
RUN mkdir -p /app/tmp && chmod 777 /app/tmp

# Dar permisos de ejecución al script de Python
RUN chmod +x /app/pdf2docx_converter.py

# Exponer puerto
EXPOSE 4000

# Variables de entorno por defecto
ENV PORT=4000 \
    MAX_FILE_MB=50 \
    MAX_FILES=10 \
    NODE_ENV=production \
    PYTHON_PATH=/usr/bin/python3 \
    SOFFICE_PATH=/usr/bin/soffice

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

# Comando de inicio
CMD ["node", "server.js"]