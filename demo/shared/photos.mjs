export const PHOTO_BUCKET = 'place-photos';
export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const formats = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};

export function validatePhotoSelection(files, existingCount = 0) {
  if (files.length + existingCount > MAX_PHOTOS) throw new Error('Vous pouvez joindre 5 photos maximum.');
  for (const file of files) {
    if (!formats[file.type]) throw new Error('Choisissez des photos JPEG, PNG ou WebP.');
    if (!file.size || file.size > MAX_PHOTO_BYTES) throw new Error('Chaque photo doit peser entre 1 octet et 5 Mo.');
  }
}
export function photoExtension(file) { return formats[file.type]; }

export async function validateImageContent(file) {
  validatePhotoSelection([file]);
  const b = new Uint8Array(await file.slice(0,12).arrayBuffer());
  const isJPEG = b[0]===255 && b[1]===216 && b[2]===255;
  const isPNG = [137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v);
  const isWebP = String.fromCharCode(...b.slice(0,4))==='RIFF' && String.fromCharCode(...b.slice(8,12))==='WEBP';
  if (!(file.type==='image/jpeg'&&isJPEG || file.type==='image/png'&&isPNG || file.type==='image/webp'&&isWebP)) {
    throw new Error('Le contenu du fichier ne correspond pas à une photo JPEG, PNG ou WebP.');
  }
}

// Download through Storage RLS, rather than publishing a permanently accessible URL.
// Revoke Blob URLs on navigation/logout, and fetch only photos in the viewport.
export function hydratePhotos(root, getClient, bucket = PHOTO_BUCKET) {
  let active = true;
  const urls = [];
  const requests = new Map();
  async function show(img) {
    const path=img.dataset.photoPath;
    try {
      if (!requests.has(path)) requests.set(path, (async()=>{
        const client=await getClient();
        const {data,error}=await client.storage.from(bucket).download(path);
        if (error) throw error;
        if (!active) return null;
        const url=URL.createObjectURL(data);urls.push(url);return url;
      })());
      const url=await requests.get(path);
      if (active && img.isConnected && url) img.src=url;
    } catch {
      if (active && img.isConnected) {img.alt='Photo indisponible';img.classList.add('photo-unavailable');}
    }
  }
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
    entries.filter(entry=>entry.isIntersecting).forEach(entry=>{observer.unobserve(entry.target);void show(entry.target);});
  },{rootMargin:'200px'}):null;
  root.querySelectorAll('img[data-photo-path]').forEach(img=>{if(observer)observer.observe(img);else void show(img);});
  return ()=>{active=false;observer?.disconnect();urls.forEach(url=>URL.revokeObjectURL(url));};
}
