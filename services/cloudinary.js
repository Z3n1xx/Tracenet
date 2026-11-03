// Free image hosting via Cloudinary — no billing required, unlike Firebase
// Storage. Sign up at https://cloudinary.com/users/register/free, then create
// an UNSIGNED upload preset under Settings → Upload → Upload presets.
//
// Uses expo-file-system's File.upload() (multipart) instead of fetch+FormData:
// Expo's native fetch module in SDK 57 rejects the classic React Native
// `{ uri, name, type }` FormData file shape with "Unsupported FormDataPart
// implementation". File.upload() is the purpose-built replacement.
import { File, UploadType } from 'expo-file-system';

const CLOUD_NAME = 'px9joql3';
const UPLOAD_PRESET = 'msixtnw6';

export async function uploadPhoto(localUri) {
  const file = new File(localUri);
  const result = await file.upload(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      uploadType: UploadType.MULTIPART,
      fieldName: 'file',
      parameters: { upload_preset: UPLOAD_PRESET },
    }
  );

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Photo upload failed (status ${result.status})`);
  }

  const data = JSON.parse(result.body);
  return data.secure_url;
}
