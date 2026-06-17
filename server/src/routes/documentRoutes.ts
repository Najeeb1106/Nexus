import { Router } from 'express';
import { uploadDocument, getMyDocuments, signDocument, shareDocument, deleteDocument, upload } from '../controllers/documentController';
import { protect } from '../middleware/auth';

const router = Router();
router.use(protect);
router.post('/upload', upload.single('file'), uploadDocument);
router.get('/', getMyDocuments);
router.post('/:id/sign', signDocument);
router.post('/:id/share', shareDocument);
router.delete('/:id', deleteDocument);

export default router;
