import { useState, useRef, useCallback } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X, Check } from 'lucide-react'

const ImageCropModal = ({ imageSrc, onCropComplete, onClose }) => {
  // Aspect ratio 3:2 (1536 × 1024 = 1.5:1)
  const ASPECT_RATIO = 3 / 2
  
  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const imgRef = useRef(null)
  const canvasRef = useRef(null)

  // Función para convertir la imagen recortada a blob
  const getCroppedImg = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !canvasRef.current) {
      return null
    }

    const crop = completedCrop
    const displayedImage = imgRef.current
    
    // Verificar si la imagen es una data URL (base64) o una URL del servidor
    const isDataUrl = imageSrc.startsWith('data:')
    
    return new Promise((resolve) => {
      // Si es una URL del servidor, necesitamos cargar la imagen de nuevo con crossOrigin
      // Si es data URL, podemos usar la imagen directamente
      if (isDataUrl) {
        // Para data URLs, usar la imagen que ya está cargada
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')

        // ReactCrop calcula los porcentajes basándose en las dimensiones del elemento img
        // después de aplicar CSS. La forma más confiable es usar directamente las dimensiones
        // que ReactCrop está usando, que son las dimensiones del elemento img en el DOM.
        
        // Obtener las dimensiones del elemento img (ReactCrop usa estas dimensiones)
        // Usar getBoundingClientRect para obtener las dimensiones visuales reales
        const imgRect = displayedImage.getBoundingClientRect()
        let renderWidth = imgRect.width
        let renderHeight = imgRect.height
        
        // Si getBoundingClientRect da valores inválidos o muy grandes, usar offsetWidth/offsetHeight
        if (!renderWidth || !renderHeight || renderWidth === 0 || renderHeight === 0 ||
            renderWidth > displayedImage.naturalWidth * 5 || renderHeight > displayedImage.naturalHeight * 5) {
          renderWidth = displayedImage.offsetWidth || displayedImage.width || displayedImage.naturalWidth
          renderHeight = displayedImage.offsetHeight || displayedImage.height || displayedImage.naturalHeight
        }
        
        // Si aún así son inválidos o muy grandes, usar las dimensiones naturales directamente
        // Esto significa que el crop ya está en coordenadas naturales
        if (!renderWidth || !renderHeight || renderWidth === 0 || renderHeight === 0 ||
            renderWidth > displayedImage.naturalWidth * 5 || renderHeight > displayedImage.naturalHeight * 5) {
          console.warn('Usando dimensiones naturales directamente (crop ya está en coordenadas naturales)')
          renderWidth = displayedImage.naturalWidth
          renderHeight = displayedImage.naturalHeight
        }
        
        console.log('Dimensiones para cálculo de crop:', {
          renderWidth,
          renderHeight,
          naturalWidth: displayedImage.naturalWidth,
          naturalHeight: displayedImage.naturalHeight,
          imgRectWidth: imgRect.width,
          imgRectHeight: imgRect.height,
          offsetWidth: displayedImage.offsetWidth,
          offsetHeight: displayedImage.offsetHeight,
          clientWidth: displayedImage.clientWidth,
          clientHeight: displayedImage.clientHeight,
          width: displayedImage.width,
          height: displayedImage.height,
          crop: crop
        })
        
        // Calcular la escala entre dimensiones renderizadas y naturales
        const scaleX = displayedImage.naturalWidth / renderWidth
        const scaleY = displayedImage.naturalHeight / renderHeight
        
        // Validar que la escala sea razonable (entre 0.1 y 10)
        // Si no es razonable, usar dimensiones naturales directamente
        if (scaleX > 10 || scaleY > 10 || scaleX < 0.1 || scaleY < 0.1 || 
            isNaN(scaleX) || isNaN(scaleY) || !isFinite(scaleX) || !isFinite(scaleY)) {
          console.warn('Escala inválida, usando dimensiones naturales directamente', { scaleX, scaleY, renderWidth, renderHeight })
          // Usar dimensiones naturales directamente
          const cropWidth = Math.round((crop.width / 100) * displayedImage.naturalWidth)
          const cropHeight = Math.round((crop.height / 100) * displayedImage.naturalHeight)
          const cropX = Math.round((crop.x / 100) * displayedImage.naturalWidth)
          const cropY = Math.round((crop.y / 100) * displayedImage.naturalHeight)
          
          // Validar
          if (cropWidth <= 0 || cropHeight <= 0 || cropX < 0 || cropY < 0 ||
              cropX + cropWidth > displayedImage.naturalWidth || cropY + cropHeight > displayedImage.naturalHeight) {
            console.error('Crop inválido con dimensiones naturales:', {
              cropX, cropY, cropWidth, cropHeight,
              naturalWidth: displayedImage.naturalWidth,
              naturalHeight: displayedImage.naturalHeight
            })
            resolve(null)
            return
          }
          
          // Procesar con estas dimensiones
          canvas.width = cropWidth
          canvas.height = cropHeight
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, cropWidth, cropHeight)
          ctx.imageSmoothingQuality = 'high'
          
          try {
            ctx.drawImage(displayedImage, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
          } catch (error) {
            console.error('Error al dibujar imagen:', error)
            resolve(null)
            return
          }
          
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
            const byteString = atob(dataUrl.split(',')[1])
            const ab = new ArrayBuffer(byteString.length)
            const ia = new Uint8Array(ab)
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i)
            }
            const blob = new Blob([ab], { type: 'image/jpeg' })
            const file = new File([blob], 'cropped-image.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(file)
            return
          } catch (error) {
            console.error('Error al convertir canvas a data URL:', error)
            resolve(null)
            return
          }
        }
        
        // ReactCrop devuelve el crop en porcentajes cuando unit === '%'
        // Verificar la unidad del crop
        const isPercentage = crop.unit === '%'
        
        let cropWidthRender, cropHeightRender, cropXRender, cropYRender
        
        if (isPercentage) {
          // El crop está en porcentajes
          cropWidthRender = (crop.width / 100) * renderWidth
          cropHeightRender = (crop.height / 100) * renderHeight
          cropXRender = (crop.x / 100) * renderWidth
          cropYRender = (crop.y / 100) * renderHeight
        } else {
          // El crop ya está en píxeles renderizados
          cropWidthRender = crop.width
          cropHeightRender = crop.height
          cropXRender = crop.x
          cropYRender = crop.y
        }
        
        // Validar que los valores renderizados sean razonables
        // Si cropWidthRender es mayor que renderWidth, probablemente el cálculo está mal
        if (cropWidthRender > renderWidth * 1.5 || cropHeightRender > renderHeight * 1.5) {
          console.warn('Valores de crop renderizados inválidos, usando dimensiones naturales directamente', {
            cropWidthRender,
            cropHeightRender,
            renderWidth,
            renderHeight,
            cropUnit: crop.unit,
            isPercentage
          })
          
          // Usar dimensiones naturales directamente
          const cropWidth = Math.round((crop.width / 100) * displayedImage.naturalWidth)
          const cropHeight = Math.round((crop.height / 100) * displayedImage.naturalHeight)
          const cropX = Math.round((crop.x / 100) * displayedImage.naturalWidth)
          const cropY = Math.round((crop.y / 100) * displayedImage.naturalHeight)
          
          // Validar
          if (cropWidth <= 0 || cropHeight <= 0 || cropX < 0 || cropY < 0 ||
              cropX + cropWidth > displayedImage.naturalWidth || cropY + cropHeight > displayedImage.naturalHeight) {
            console.error('Crop inválido con dimensiones naturales:', {
              cropX, cropY, cropWidth, cropHeight,
              naturalWidth: displayedImage.naturalWidth,
              naturalHeight: displayedImage.naturalHeight
            })
            resolve(null)
            return
          }
          
          // Procesar con estas dimensiones
          canvas.width = cropWidth
          canvas.height = cropHeight
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, cropWidth, cropHeight)
          ctx.imageSmoothingQuality = 'high'
          
          try {
            ctx.drawImage(displayedImage, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
          } catch (error) {
            console.error('Error al dibujar imagen:', error)
            resolve(null)
            return
          }
          
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
            const byteString = atob(dataUrl.split(',')[1])
            const ab = new ArrayBuffer(byteString.length)
            const ia = new Uint8Array(ab)
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i)
            }
            const blob = new Blob([ab], { type: 'image/jpeg' })
            const file = new File([blob], 'cropped-image.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(file)
            return
          } catch (error) {
            console.error('Error al convertir canvas a data URL:', error)
            resolve(null)
            return
          }
        }
        
        console.log('Unidad del crop:', {
          unit: crop.unit,
          isPercentage,
          cropValues: { width: crop.width, height: crop.height, x: crop.x, y: crop.y },
          cropRenderValues: { cropWidthRender, cropHeightRender, cropXRender, cropYRender },
          renderWidth,
          renderHeight
        })
        
        // Convertir a dimensiones naturales (redondear para evitar decimales)
        const cropWidth = Math.round(cropWidthRender * scaleX)
        const cropHeight = Math.round(cropHeightRender * scaleY)
        const cropX = Math.round(cropXRender * scaleX)
        const cropY = Math.round(cropYRender * scaleY)
        
        console.log('Cálculo de crop:', {
          renderWidth,
          renderHeight,
          cropWidthRender,
          cropHeightRender,
          cropXRender,
          cropYRender,
          scaleX,
          scaleY,
          cropWidth,
          cropHeight,
          cropX,
          cropY,
          naturalWidth: displayedImage.naturalWidth,
          naturalHeight: displayedImage.naturalHeight
        })
        
        // Validar que los valores calculados no excedan las dimensiones naturales
        // Si exceden, usar dimensiones naturales directamente
        if (cropWidth > displayedImage.naturalWidth || cropHeight > displayedImage.naturalHeight ||
            cropX + cropWidth > displayedImage.naturalWidth || cropY + cropHeight > displayedImage.naturalHeight) {
          console.warn('Crop calculado excede dimensiones naturales, usando dimensiones naturales directamente')
          const cropWidthFallback = Math.round((crop.width / 100) * displayedImage.naturalWidth)
          const cropHeightFallback = Math.round((crop.height / 100) * displayedImage.naturalHeight)
          const cropXFallback = Math.round((crop.x / 100) * displayedImage.naturalWidth)
          const cropYFallback = Math.round((crop.y / 100) * displayedImage.naturalHeight)
          
          // Validar
          if (cropWidthFallback <= 0 || cropHeightFallback <= 0 || cropXFallback < 0 || cropYFallback < 0 ||
              cropXFallback + cropWidthFallback > displayedImage.naturalWidth || 
              cropYFallback + cropHeightFallback > displayedImage.naturalHeight) {
            console.error('Crop inválido incluso con fallback:', {
              cropXFallback, cropYFallback, cropWidthFallback, cropHeightFallback,
              naturalWidth: displayedImage.naturalWidth,
              naturalHeight: displayedImage.naturalHeight
            })
            resolve(null)
            return
          }
          
          // Usar valores de fallback
          canvas.width = cropWidthFallback
          canvas.height = cropHeightFallback
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, cropWidthFallback, cropHeightFallback)
          ctx.imageSmoothingQuality = 'high'
          
          try {
            ctx.drawImage(displayedImage, cropXFallback, cropYFallback, cropWidthFallback, cropHeightFallback, 
                          0, 0, cropWidthFallback, cropHeightFallback)
          } catch (error) {
            console.error('Error al dibujar imagen (fallback):', error)
            resolve(null)
            return
          }
          
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
            const byteString = atob(dataUrl.split(',')[1])
            const ab = new ArrayBuffer(byteString.length)
            const ia = new Uint8Array(ab)
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i)
            }
            const blob = new Blob([ab], { type: 'image/jpeg' })
            const file = new File([blob], 'cropped-image.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(file)
            return
          } catch (error) {
            console.error('Error al convertir canvas a data URL (fallback):', error)
            resolve(null)
            return
          }
        }

        // Validar dimensiones
        if (cropWidth <= 0 || cropHeight <= 0 || cropX < 0 || cropY < 0) {
          console.error('Dimensiones de crop inválidas:', { 
            cropWidth, 
            cropHeight, 
            cropX, 
            cropY,
            crop,
            displayedImageSize: {
              width: displayedImage.width,
              height: displayedImage.height,
              naturalWidth: displayedImage.naturalWidth,
              naturalHeight: displayedImage.naturalHeight
            }
          })
          resolve(null)
          return
        }

        // Verificar que las coordenadas no excedan las dimensiones de la imagen
        if (cropX + cropWidth > displayedImage.naturalWidth || cropY + cropHeight > displayedImage.naturalHeight) {
          console.error('Crop excede las dimensiones de la imagen:', {
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            imageNaturalWidth: displayedImage.naturalWidth,
            imageNaturalHeight: displayedImage.naturalHeight
          })
          resolve(null)
          return
        }

        // Establecer dimensiones del canvas
        canvas.width = cropWidth
        canvas.height = cropHeight

        // Limpiar el canvas con fondo blanco
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, cropWidth, cropHeight)

        ctx.imageSmoothingQuality = 'high'

        // Dibujar la imagen en el canvas usando dimensiones naturales
        try {
          console.log('Dibujando imagen en canvas:', {
            sourceX: cropX,
            sourceY: cropY,
            sourceWidth: cropWidth,
            sourceHeight: cropHeight,
            destX: 0,
            destY: 0,
            destWidth: cropWidth,
            destHeight: cropHeight
          })
          
          ctx.drawImage(
            displayedImage,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            cropWidth,
            cropHeight
          )
        } catch (error) {
          console.error('Error al dibujar imagen en canvas:', error)
          resolve(null)
          return
        }

        // Convertir canvas a data URL
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
          
          // Convertir data URL a blob
          const byteString = atob(dataUrl.split(',')[1])
          const ab = new ArrayBuffer(byteString.length)
          const ia = new Uint8Array(ab)
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i)
          }
          const blob = new Blob([ab], { type: 'image/jpeg' })
          const file = new File([blob], 'cropped-image.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
          resolve(file)
        } catch (error) {
          console.error('Error al convertir canvas a data URL:', error)
          resolve(null)
        }
      } else {
        // Para URLs del servidor, cargar una nueva imagen con crossOrigin
        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        img.onload = () => {
          const canvas = canvasRef.current
          const ctx = canvas.getContext('2d')

          // Usar getBoundingClientRect para obtener las dimensiones reales renderizadas
          const rect = displayedImage.getBoundingClientRect()
          const renderWidth = rect.width
          const renderHeight = rect.height
          
          // Si las dimensiones son inválidas, usar naturales directamente
          if (!renderWidth || !renderHeight || renderWidth === 0 || renderHeight === 0) {
            const cropWidth = Math.round((crop.width / 100) * displayedImage.naturalWidth)
            const cropHeight = Math.round((crop.height / 100) * displayedImage.naturalHeight)
            const cropX = Math.round((crop.x / 100) * displayedImage.naturalWidth)
            const cropY = Math.round((crop.y / 100) * displayedImage.naturalHeight)
            
            if (cropWidth <= 0 || cropHeight <= 0 || cropX < 0 || cropY < 0 ||
                cropX + cropWidth > displayedImage.naturalWidth || cropY + cropHeight > displayedImage.naturalHeight) {
              console.error('Dimensiones de crop inválidas (URL servidor fallback)')
              resolve(null)
              return
            }
            
            canvas.width = cropWidth
            canvas.height = cropHeight
            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(0, 0, cropWidth, cropHeight)
            ctx.imageSmoothingQuality = 'high'
            
            try {
              ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
            } catch (error) {
              console.error('Error al dibujar imagen (URL servidor fallback):', error)
              resolve(null)
              return
            }
            
            try {
              const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
              const byteString = atob(dataUrl.split(',')[1])
              const ab = new ArrayBuffer(byteString.length)
              const ia = new Uint8Array(ab)
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i)
              }
              const blob = new Blob([ab], { type: 'image/jpeg' })
              const file = new File([blob], 'cropped-image.jpg', {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(file)
              return
            } catch (error) {
              console.error('Error al convertir canvas (URL servidor fallback):', error)
              resolve(null)
              return
            }
          }
          
          // Calcular la escala entre dimensiones renderizadas y naturales
          const scaleX = displayedImage.naturalWidth / renderWidth
          const scaleY = displayedImage.naturalHeight / renderHeight
          
          // Convertir porcentajes de la imagen renderizada a píxeles renderizados
          const cropWidthRender = (crop.width / 100) * renderWidth
          const cropHeightRender = (crop.height / 100) * renderHeight
          const cropXRender = (crop.x / 100) * renderWidth
          const cropYRender = (crop.y / 100) * renderHeight
          
          // Convertir a dimensiones naturales
          const cropWidth = Math.round(cropWidthRender * scaleX)
          const cropHeight = Math.round(cropHeightRender * scaleY)
          const cropX = Math.round(cropXRender * scaleX)
          const cropY = Math.round(cropYRender * scaleY)

          // Validar dimensiones
          if (cropWidth <= 0 || cropHeight <= 0) {
            console.error('Dimensiones de crop inválidas:', { cropWidth, cropHeight, crop })
            resolve(null)
            return
          }

          // Establecer dimensiones del canvas
          canvas.width = cropWidth
          canvas.height = cropHeight

          // Limpiar el canvas con fondo blanco
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, cropWidth, cropHeight)

          ctx.imageSmoothingQuality = 'high'

          // Dibujar la imagen en el canvas usando dimensiones naturales
          try {
            ctx.drawImage(
              img,
              cropX,
              cropY,
              cropWidth,
              cropHeight,
              0,
              0,
              cropWidth,
              cropHeight
            )
          } catch (error) {
            console.error('Error al dibujar imagen en canvas:', error)
            resolve(null)
            return
          }

          // Convertir canvas a data URL
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
            
            // Convertir data URL a blob
            const byteString = atob(dataUrl.split(',')[1])
            const ab = new ArrayBuffer(byteString.length)
            const ia = new Uint8Array(ab)
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i)
            }
            const blob = new Blob([ab], { type: 'image/jpeg' })
            const file = new File([blob], 'cropped-image.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(file)
          } catch (error) {
            console.error('Error al convertir canvas a data URL:', error)
            resolve(null)
          }
        }
        
        img.onerror = () => {
          console.error('Error al cargar imagen para recorte (CORS)')
          // Si falla por CORS, intentar convertir la imagen existente a data URL primero
          // y luego recortarla
          try {
            const tempCanvas = document.createElement('canvas')
            tempCanvas.width = displayedImage.naturalWidth
            tempCanvas.height = displayedImage.naturalHeight
            const tempCtx = tempCanvas.getContext('2d')
            tempCtx.drawImage(displayedImage, 0, 0)
            
            const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.95)
            // Ahora usar esta data URL para recortar
            const img2 = new Image()
            img2.onload = () => {
              const canvas = canvasRef.current
              const ctx = canvas.getContext('2d')
              
              // Usar getBoundingClientRect para obtener las dimensiones reales renderizadas
              const rect = displayedImage.getBoundingClientRect()
              const renderWidth = rect.width
              const renderHeight = rect.height
              
              // Si las dimensiones son inválidas, usar naturales directamente
              if (!renderWidth || !renderHeight || renderWidth === 0 || renderHeight === 0) {
                const cropWidth = Math.round((crop.width / 100) * displayedImage.naturalWidth)
                const cropHeight = Math.round((crop.height / 100) * displayedImage.naturalHeight)
                const cropX = Math.round((crop.x / 100) * displayedImage.naturalWidth)
                const cropY = Math.round((crop.y / 100) * displayedImage.naturalHeight)
                
                if (cropWidth <= 0 || cropHeight <= 0 || cropX < 0 || cropY < 0 ||
                    cropX + cropWidth > displayedImage.naturalWidth || cropY + cropHeight > displayedImage.naturalHeight) {
                  console.error('Dimensiones de crop inválidas (CORS fallback)')
                  resolve(null)
                  return
                }
                
                canvas.width = cropWidth
                canvas.height = cropHeight
                ctx.fillStyle = '#FFFFFF'
                ctx.fillRect(0, 0, cropWidth, cropHeight)
                ctx.imageSmoothingQuality = 'high'
                
                try {
                  ctx.drawImage(img2, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
                } catch (error) {
                  console.error('Error al dibujar imagen (CORS fallback):', error)
                  resolve(null)
                  return
                }
                
                try {
                  const finalDataUrl = canvas.toDataURL('image/jpeg', 0.95)
                  const byteString = atob(finalDataUrl.split(',')[1])
                  const ab = new ArrayBuffer(byteString.length)
                  const ia = new Uint8Array(ab)
                  for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i)
                  }
                  const blob = new Blob([ab], { type: 'image/jpeg' })
                  const file = new File([blob], 'cropped-image.jpg', {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  })
                  resolve(file)
                  return
                } catch (error) {
                  console.error('Error al convertir canvas (CORS fallback):', error)
                  resolve(null)
                  return
                }
              }
              
              // Calcular la escala entre dimensiones renderizadas y naturales
              const scaleX = displayedImage.naturalWidth / renderWidth
              const scaleY = displayedImage.naturalHeight / renderHeight
              
              // Convertir porcentajes de la imagen renderizada a píxeles renderizados
              const cropWidthRender = (crop.width / 100) * renderWidth
              const cropHeightRender = (crop.height / 100) * renderHeight
              const cropXRender = (crop.x / 100) * renderWidth
              const cropYRender = (crop.y / 100) * renderHeight
              
              // Convertir a dimensiones naturales
              const cropWidth = Math.round(cropWidthRender * scaleX)
              const cropHeight = Math.round(cropHeightRender * scaleY)
              const cropX = Math.round(cropXRender * scaleX)
              const cropY = Math.round(cropYRender * scaleY)

              // Validar dimensiones
              if (cropWidth <= 0 || cropHeight <= 0) {
                console.error('Dimensiones de crop inválidas:', { cropWidth, cropHeight, crop })
                resolve(null)
                return
              }

              canvas.width = cropWidth
              canvas.height = cropHeight

              // Limpiar el canvas con fondo blanco
              ctx.fillStyle = '#FFFFFF'
              ctx.fillRect(0, 0, cropWidth, cropHeight)

              ctx.imageSmoothingQuality = 'high'

              try {
                ctx.drawImage(
                  img2,
                  cropX,
                  cropY,
                  cropWidth,
                  cropHeight,
                  0,
                  0,
                  cropWidth,
                  cropHeight
                )
              } catch (error) {
                console.error('Error al dibujar imagen en canvas:', error)
                resolve(null)
                return
              }

              const finalDataUrl = canvas.toDataURL('image/jpeg', 0.95)
              const byteString = atob(finalDataUrl.split(',')[1])
              const ab = new ArrayBuffer(byteString.length)
              const ia = new Uint8Array(ab)
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i)
              }
              const blob = new Blob([ab], { type: 'image/jpeg' })
              const file = new File([blob], 'cropped-image.jpg', {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(file)
            }
            img2.src = dataUrl
          } catch (e) {
            console.error('Error en fallback:', e)
            resolve(null)
          }
        }
        
        img.src = imageSrc
      }
    })
  }, [completedCrop, imageSrc])

  const handleCropComplete = async () => {
    if (!completedCrop || !imgRef.current) {
      console.error('No hay crop completado o imagen no cargada')
      return
    }
    
    const img = imgRef.current
    console.log('Iniciando recorte...', {
      crop: completedCrop,
      imageSize: {
        width: img.width,
        height: img.height,
        clientWidth: img.clientWidth,
        clientHeight: img.clientHeight,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      }
    })
    
    const croppedFile = await getCroppedImg()
    if (croppedFile) {
      console.log('Recorte completado, tamaño del archivo:', croppedFile.size)
      onCropComplete(croppedFile)
      onClose()
    } else {
      console.error('Error: No se pudo crear el archivo recortado')
    }
  }

  const onImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.currentTarget
    const image = e.currentTarget
    imgRef.current = image
    setImageLoaded(true)
    
    // Crear crop inicial centrado con aspect ratio 3:2
    const initialCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        ASPECT_RATIO,
        naturalWidth,
        naturalHeight
      ),
      naturalWidth,
      naturalHeight
    )
    
    setCrop(initialCrop)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Recortar Imagen</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-3">
              Arrastra las esquinas para recortar la imagen en formato 3:2 (1536 × 1024). 
              La imagen se ajustará automáticamente al tamaño de las cards del menú.
            </p>
          </div>

          <div className="flex justify-center mb-4 bg-gray-100 rounded-lg p-4 min-h-[400px]">
            {imageSrc ? (
              <div className="relative w-full">
                {crop ? (
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={ASPECT_RATIO}
                    minWidth={100}
                    minHeight={67}
                  >
                    <img
                      ref={imgRef}
                      src={imageSrc}
                      alt="Crop"
                      onLoad={onImageLoad}
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '70vh',
                        display: 'block',
                        objectFit: 'contain'
                      }}
                    />
                  </ReactCrop>
                ) : (
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="Crop"
                    onLoad={onImageLoad}
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '70vh',
                      display: 'block',
                      objectFit: 'contain'
                    }}
                  />
                )}
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <p className="text-gray-500">Cargando imagen...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No hay imagen para mostrar
              </div>
            )}
          </div>

          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="btn-outline flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
            <button
              onClick={handleCropComplete}
              className="btn-primary flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Aplicar Recorte
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageCropModal

