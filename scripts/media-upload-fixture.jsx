import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import MediaUpload from '../src/features/partners/MediaUpload.jsx';
export default function Fixture() {
  const [media, setMedia] = useState([]);
  return <><MediaUpload value={media} onChange={setMedia} photosOnly single autoUpload role="professional" /><output id="uploaded-path">{media[0]?.path || ''}</output></>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
