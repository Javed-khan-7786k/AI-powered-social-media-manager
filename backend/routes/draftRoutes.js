const express = require('express');
const router = express.Router();
const draftController = require('../controllers/draftController');

router.get('/', draftController.getDrafts);
router.post('/', draftController.saveDraft);
router.delete('/:id', draftController.deleteDraft);

module.exports = router;
