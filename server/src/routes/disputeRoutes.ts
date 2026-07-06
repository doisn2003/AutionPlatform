import { Router } from 'express';
import multer from 'multer';
import { getDisputeDetail, getDisputesForJuror, uploadEvidence } from '../controllers/disputeController';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Route lấy chi tiết vụ tranh chấp
router.get('/:id', getDisputeDetail);

// Route lấy danh sách vụ tranh chấp của một trọng tài
router.get('/juror/:address', getDisputesForJuror);

// Route tải lên bằng chứng tài liệu/hình ảnh lên IPFS
router.post('/evidence', upload.single('file'), uploadEvidence);

export default router;
