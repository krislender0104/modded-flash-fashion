import { serverUrl } from './config';

export const uploadVideo = async (blob) => {
  const formData = new FormData();
  formData.append('video', blob);
  const response = await fetch(`${serverUrl}/upload`, {
    method: 'POST',
    body: formData,
  });
  const json = await response.json();
  return json;
};

export const checkVideoConverted = async (videoURL) => {
  try {
    const response = await fetch(`${serverUrl}/checkConverted?file=${videoURL.split('file=')[1]}`);
    if (response.ok) {
      return true;
    }
  } catch (e) {}
  return false;
};
