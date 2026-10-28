import { requireBackend } from './experience.js';

const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf', 'video/mp4': 'mp4', 'video/webm': 'webm' };

const PARTNER_ROLES = new Set(['professional', 'influencer', 'consultant']);

/**
 * Uploads media to the private partner-media bucket.
 * 
 * For partner roles (professional/influencer/consultant):
 * - Documents (KYC/verification docs like Aadhaar, PAN, Gumasta, Udyam) go to `{userId}/{role}/documents/`
 * - Photos/media go to `{userId}/{role}/`
 * 
 * This matches the database validation requirements.
 */
export async function uploadPartnerMedia(file, role = 'media', options = {}) {
  const extension = extensions[file.type];
  if (!extension || file.size > 50 * 1024 * 1024) {
    throw new Error('Choose an allowed file smaller than 50 MB.');
  }

  const db = requireBackend();
  const { data: { user }, error } = await db.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Sign in before uploading a file.');

  const isPartnerRole = PARTNER_ROLES.has(role);
  const folder = isPartnerRole ? role : 'media';
  const useDocumentsSubfolder = isPartnerRole && options.isDocument === true;
  const subfolder = useDocumentsSubfolder ? '/documents' : '';
  const path = `${user.id}/${folder}${subfolder}/${crypto.randomUUID()}.${extension}`;

  const upload = await db.storage.from('partner-media').upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (upload.error) throw upload.error;
  return { path, name: file.name, type: file.type, size: file.size };
}
