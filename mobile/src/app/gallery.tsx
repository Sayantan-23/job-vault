import { Gallery } from '@/components/ui/gallery';

// Dev-only surface: /gallery renders every C2 primitive so a device pass can
// confirm they are visible, not merely compiled. Nothing in the app links here.
export default function GalleryRoute() {
  return <Gallery />;
}
