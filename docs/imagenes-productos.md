# Fotos de productos sin fondo

`ProductPhoto` solicita las fotos locales mediante
`/api/images/products/<archivo>?sin_fondo=1&recorte=2`. El servidor responde un
PNG transparente antes de mostrar la foto. Los archivos originales no se
modifican. Las imágenes que ya tienen transparencia en sus bordes conservan esa
transparencia sin ejecutar el modelo.

El procesador técnico `lib/media/product-background.mjs` utiliza ONNX Runtime en
CPU y U²-Net pequeño (u2netp). La inferencia es local; no se envían las fotos a
un proveedor externo. La primera ejecución descarga los pesos públicos
(aproximadamente 4,6 MB) y verifica su SHA-256. El origen y la normalización
siguen la implementación de referencia de
[rembg](https://github.com/danielgatis/rembg/blob/main/rembg/sessions/u2netp.py).
El [modelo U²-Net](https://github.com/xuebinqin/U-2-Net) usa licencia Apache
2.0; [ONNX Runtime](https://github.com/microsoft/onnxruntime) usa licencia MIT.

Los pesos y los resultados se guardan en `.cache/product-photos/`, excluido de
Git. El servidor necesita permisos de escritura en ese directorio. Las claves de
caché incluyen el contenido original y la versión del procesador. Las peticiones
simultáneas de una misma foto comparten resultado y la inferencia se procesa de
forma secuencial para limitar el consumo de memoria.

Para preparar las fotos existentes antes de abrir el catálogo:

```sh
node --conditions=react-server scripts/prepare-product-photos.mjs
```

Los archivos nuevos se procesan automáticamente al solicitar su foto. Si el
motor o la descarga fallan, el endpoint conserva la imagen original con caché
breve para permitir reintentos. Las URL externas conservan el recorte básico
anterior del navegador; el procesamiento por modelo se aplica a las fotos
locales del catálogo.
