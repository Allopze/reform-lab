# Reform Lab - Docker Deployment

## Despliegue con Docker

### Requisitos Previos
- Docker 20.10+
- Docker Compose 2.0+

### Comandos Rápidos

#### Producción

```bash
# Construir y ejecutar
docker-compose up --build

# Ejecutar en segundo plano (detached)
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f simplepdf

# Detener
docker-compose down

# Detener y eliminar volúmenes (borra archivos temporales)
docker-compose down -v

# Reconstruir sin caché
docker-compose build --no-cache
docker-compose up
```

#### Desarrollo (con hot-reload)

```bash
# Usar configuración de desarrollo
docker-compose -f docker-compose.dev.yml up --build

# O con npm script
npm run docker:dev
```

#### Gestión de Contenedores

```bash
# Ver estado
docker-compose ps

# Reiniciar servicio
docker-compose restart

# Ver uso de recursos
docker stats simplepdf-app

# Ejecutar comandos dentro del contenedor
docker-compose exec simplepdf bash

# Ver logs de errores
docker-compose logs --tail=100 simplepdf
```

### Verificación Post-Despliegue

Una vez que el contenedor esté corriendo:

1. **Health check**: 
   ```bash
   curl http://localhost:4000/health
   ```
   Deberías recibir:
   ```json
   {
     "status": "ok",
     "libreoffice": "detected"
   }
   ```

2. **Aplicación web**: 
   Abre `http://localhost:4000` en tu navegador

3. **Logs del servicio**:
   ```bash
   docker-compose logs -f
   ```

### Configuración de Variables de Entorno

Edita `docker-compose.yml` para personalizar:

```yaml
environment:
  - PORT=4000                    # Puerto del servidor
  - MAX_FILE_MB=100             # Tamaño máximo por archivo
  - MAX_FILES=20                # Cantidad máxima de archivos
  - NODE_ENV=production         # Entorno de ejecución
```

### Volúmenes Persistentes

El volumen `pdf_tmp` persiste los archivos temporales entre reinicios del contenedor.

Para limpiar completamente:
```bash
docker-compose down -v
```

### Troubleshooting

#### El contenedor no inicia
```bash
# Ver logs completos
docker-compose logs simplepdf

# Verificar que el puerto 4000 no esté en uso
netstat -an | grep 4000  # Linux/Mac
netstat -an | findstr 4000  # Windows
```

#### LibreOffice no detectado
```bash
# Entrar al contenedor
docker-compose exec simplepdf bash

# Verificar que LibreOffice esté instalado
which soffice
soffice --version
```

#### Problemas de permisos
```bash
# Verificar permisos del volumen
docker-compose exec simplepdf ls -la /app/tmp

# Recrear volumen si es necesario
docker-compose down -v
docker-compose up
```

#### Reconstruir imagen desde cero
```bash
docker-compose down
docker-compose build --no-cache --pull
docker-compose up
```

### Despliegue en Producción

#### Con reverse proxy (Nginx)

Configuración básica de Nginx:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts para archivos grandes
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        send_timeout 300;
        
        # Límite de tamaño de subida
        client_max_body_size 100M;
    }
}
```

#### Con Docker Swarm

```bash
# Inicializar swarm
docker swarm init

# Desplegar stack
docker stack deploy -c docker-compose.yml simplepdf

# Ver servicios
docker stack services simplepdf

# Escalar servicio
docker service scale simplepdf_simplepdf=3
```

#### Con Kubernetes

Crear deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: simplepdf
spec:
  replicas: 2
  selector:
    matchLabels:
      app: simplepdf
  template:
    metadata:
      labels:
        app: simplepdf
    spec:
      containers:
      - name: simplepdf
        image: simplepdf:latest
        ports:
        - containerPort: 4000
        env:
        - name: PORT
          value: "4000"
        - name: MAX_FILE_MB
          value: "50"
        resources:
          limits:
            memory: "2Gi"
            cpu: "2000m"
          requests:
            memory: "512Mi"
            cpu: "500m"
```

### Monitoreo

#### Logs centralizados
```bash
# Enviar logs a archivo
docker-compose logs -f > simplepdf.log

# Usar herramientas como Portainer para UI
docker run -d -p 9000:9000 --name portainer \
  -v /var/run/docker.sock:/var/run/docker.sock \
  portainer/portainer-ce
```

#### Métricas
```bash
# Stats en tiempo real
docker stats simplepdf-app --no-stream

# Exportar métricas
docker inspect simplepdf-app | jq '.[0].State'
```

### Backup

```bash
# Backup del volumen
docker run --rm -v simplepdf_pdf_tmp:/data -v $(pwd):/backup \
  ubuntu tar czf /backup/pdf_tmp_backup.tar.gz /data

# Restaurar backup
docker run --rm -v simplepdf_pdf_tmp:/data -v $(pwd):/backup \
  ubuntu tar xzf /backup/pdf_tmp_backup.tar.gz -C /
```

### Seguridad

1. **No exponer puertos innecesarios**: Usa reverse proxy
2. **Límites de recursos**: Ya configurados en `docker-compose.yml`
3. **Actualizaciones**: Reconstruir imagen regularmente
4. **Secrets**: Usar Docker secrets para información sensible

```bash
# Crear secret
echo "mi-secreto" | docker secret create api_key -

# Usar en compose (swarm mode)
secrets:
  - api_key
```

### CI/CD con GitHub Actions

Ejemplo de workflow:

```yaml
name: Build and Deploy

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Build image
      run: docker-compose build
    
    - name: Run tests
      run: docker-compose run --rm simplepdf npm test
    
    - name: Deploy
      run: |
        docker-compose down
        docker-compose up -d
```

## Ventajas del Despliegue con Docker

- **Portabilidad**: Funciona en cualquier sistema con Docker  
- **Reproducibilidad**: Mismas dependencias en dev/prod  
- **Aislamiento**: No contamina el sistema host  
- **Escalabilidad**: Fácil de replicar y escalar  
- **Rollback rápido**: Volver a versión anterior en segundos  
- **CI/CD**: Integración automática con pipelines