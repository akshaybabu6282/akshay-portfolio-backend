import express from 'express';
import { addNewSkill, deleteSkill, updateSkill, getallSkill } from '../controller/skillController.js';
import { isAuthenticated } from '../middlewares/auth.js';

const router = express.Router();

router.post('/add', isAuthenticated, addNewSkill);
router.delete('/delete/:id', isAuthenticated, deleteSkill);
router.put('/update/:id', isAuthenticated, updateSkill);
router.get('/getall', getallSkill);

export default router;