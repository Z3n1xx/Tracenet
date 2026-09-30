// Free image hosting via Cloudinary — no billing required, unlike Firebase
// Storage. Sign up at https://cloudinary.com/users/register/free, then create
// an UNSIGNED upload preset under Settings → Upload → Upload presets.
const CLOUD_NAME = 'px9joql3';
const UPLOAD_PRESET = 'msixtnw6';

export async function uploadPhoto(localUri) {
  const formData = new FormData();
  formData.append('file', {
    uri: localUri,
    type: 'image/jpeg',
    name: `report-${Date.now()}.jpg`,
  });
  formData.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    throw new Error('Photo upload failed');
  }

  const data = await response.json();
  return data.secure_url;
}
