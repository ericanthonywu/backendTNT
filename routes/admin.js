const express = require('express'),
    router = express.Router(),

//controller
    authController = require('../controller/authController')
    crudController = require('../controller/crudController')
const {authMiddleware} = require("../middleware/authMiddleware");

//user auth router
router.post('/login', authController.loginAdmin);
router.get('/migrate', authController.migrateAdmin);

router.post('/addClinic', authMiddleware, crudController.addClinic)
router.post('/banClinic', authMiddleware, crudController.banClinic)
router.post('/showClinic', authMiddleware, crudController.showClinic)

module.exports = router;
