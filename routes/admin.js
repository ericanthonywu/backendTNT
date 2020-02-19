const express = require('express'),
    router = express.Router(),

//controller
    {loginAdmin, migrateAdmin} = require('../controller/authController'),
    {addClinic,  banClinic, showClinic} = require('../controller/crudController'),
    {authMiddleware} = require("../middleware/authMiddleware");

//user auth router
router.post('/login', loginAdmin);
router.get('/migrate', migrateAdmin);

router.post('/addClinic', authMiddleware, addClinic)
router.post('/banClinic', authMiddleware, banClinic)
router.post('/showClinic', authMiddleware, showClinic)

module.exports = router;
