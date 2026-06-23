import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './config'

export async function uploadFile(
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const storageRef = ref(storage, path)
  const uploadTask = uploadBytesResumable(storageRef, file)

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        onProgress?.(progress)
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref)
        resolve(url)
      }
    )
  })
}

export async function uploadReceipt(file: File, transactionId: string, onProgress?: (p: number) => void): Promise<string> {
  const ext = file.name.split('.').pop()
  return uploadFile(file, `receipts/${transactionId}.${ext}`, onProgress)
}

export async function uploadSitePhoto(file: File, logId: string, index: number, onProgress?: (p: number) => void): Promise<string> {
  const ext = file.name.split('.').pop()
  return uploadFile(file, `photos/${logId}_${index}_${Date.now()}.${ext}`, onProgress)
}

export async function uploadMaterialReceipt(file: File, materialTxId: string, onProgress?: (p: number) => void): Promise<string> {
  const ext = file.name.split('.').pop()
  return uploadFile(file, `material_receipts/${materialTxId}.${ext}`, onProgress)
}

export async function deleteFile(url: string): Promise<void> {
  const storageRef = ref(storage, url)
  await deleteObject(storageRef)
}
