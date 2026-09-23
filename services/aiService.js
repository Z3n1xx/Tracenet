// AI service for missing person photo matching via cloud API
// Replace BASE_URL and API_KEY with your actual AI backend endpoint

const BASE_URL = 'https://your-ai-backend.com/api';
const API_KEY = 'YOUR_AI_API_KEY';

export async function matchFaces(reportPhotoUrl, sightingPhotoUrl) {
  const response = await fetch(`${BASE_URL}/match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      reportPhoto: reportPhotoUrl,
      sightingPhoto: sightingPhotoUrl,
    }),
  });

  if (!response.ok) {
    throw new Error('AI matching request failed');
  }

  const data = await response.json();
  return {
    matchScore: data.similarity,   // 0.0 to 1.0
    isMatch: data.similarity >= 0.75,
    confidence: Math.round(data.similarity * 100) + '%',
  };
}

export async function analyzePhoto(photoUrl) {
  const response = await fetch(`${BASE_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ photoUrl }),
  });

  if (!response.ok) {
    throw new Error('AI analysis request failed');
  }

  return response.json();
}
