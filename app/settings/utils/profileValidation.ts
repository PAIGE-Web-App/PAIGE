export function addCacheBuster(url: string | null): string | null {
  if (!url) return url;
  return url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
}

export async function generateLQIP(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 16;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('');
        ctx.filter = 'blur(2px)';
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(blob);
  });
}

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmail = (emailValue: string) => {
  if (!emailValue.trim()) {
    return "Email address is required.";
  }
  if (!emailRegex.test(emailValue)) {
    return "Please enter a valid email address.";
  }
  return "";
};

export const validateName = (name: string, fieldName: string) => {
  if (!name.trim()) {
    return `${fieldName} is required.`;
  }
  if (name.trim().length < 2) {
    return `${fieldName} must be at least 2 characters.`;
  }
  return "";
};

export async function getCroppedImg(imageSrc: string, crop: { x: number; y: number; width: number; height: number }) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  canvas.width = safeArea;
  canvas.height = safeArea;

  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate(0);
  ctx.translate(-safeArea / 2, -safeArea / 2);

  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );
  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  canvas.width = crop.width;
  canvas.height = crop.height;

  ctx.putImageData(
    data,
    0 - safeArea / 2 + image.width * 0.5 - crop.x,
    0 - safeArea / 2 + image.height * 0.5 - crop.y
  );

  return canvas;
}

export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', error => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
} 