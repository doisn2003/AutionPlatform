import { Router } from 'express';
import multer from 'multer';
import { uploadToIPFS } from '../controllers/ipfsController';

const router = Router();

// Configure multer for temp storage
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.array('files', 10), uploadToIPFS);

export default router;
