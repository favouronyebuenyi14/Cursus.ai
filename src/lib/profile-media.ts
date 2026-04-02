import type { SupabaseClient } from '@supabase/supabase-js'

export const AVATAR_BUCKET = 'avatars'
export const AVATAR_PREVIEW_SIZE = 320

export type AvatarCropState = {
  zoom: number
  offsetX: number
  offsetY: number
}

export function getAvatarUrl(supabase: SupabaseClient, avatarPath?: string | null) {
  if (!avatarPath) return null
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath)
  return data.publicUrl
}

export function getAvatarOffsetBounds(imageWidth: number, imageHeight: number, zoom: number, previewSize = AVATAR_PREVIEW_SIZE) {
  const baseScale = Math.max(previewSize / imageWidth, previewSize / imageHeight)
  const drawWidth = imageWidth * baseScale * zoom
  const drawHeight = imageHeight * baseScale * zoom

  return {
    maxX: Math.max((drawWidth - previewSize) / 2, 0),
    maxY: Math.max((drawHeight - previewSize) / 2, 0),
  }
}

export function clampAvatarOffset(value: number, limit: number) {
  return Math.max(-limit, Math.min(limit, value))
}

async function loadImage(src: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to load image'))
    image.src = src
  })
}

export async function cropAvatarToBlob(
  imageSrc: string,
  crop: AvatarCropState,
  outputSize = 512,
) {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Unable to prepare avatar canvas')
  }

  const baseScale = Math.max(outputSize / image.naturalWidth, outputSize / image.naturalHeight)
  const drawWidth = image.naturalWidth * baseScale * crop.zoom
  const drawHeight = image.naturalHeight * baseScale * crop.zoom
  const drawX = (outputSize - drawWidth) / 2 + crop.offsetX * (outputSize / AVATAR_PREVIEW_SIZE)
  const drawY = (outputSize - drawHeight) / 2 + crop.offsetY * (outputSize / AVATAR_PREVIEW_SIZE)

  ctx.fillStyle = '#f5f7f9'
  ctx.fillRect(0, 0, outputSize, outputSize)
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Unable to export cropped avatar'))
        return
      }
      resolve(blob)
    }, 'image/jpeg', 0.92)
  })
}
