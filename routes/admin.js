const express = require('express'),
    router = express.Router(),

//controller
    {loginAdmin, migrateAdmin} = require('../controller/authController'),
    {
        addClinic,
        banClinic,
        showClinic,
        detailClinic,
        showAllVet,
        addVet,
        banVetClinic,
        detailVet,
        editVet,
        deleteClinic,
        editClinic
    } = require('../controller/crudController'),
    {authMiddleware} = require("../middleware/authMiddleware"),
    {uploadClinic} = require("../middleware/uploadFileMiddleware");

//user auth router
router.post('/login', loginAdmin);
router.get('/migrate', migrateAdmin);

//crud clinic route
router.post('/addClinic', uploadClinic.array("image"), authMiddleware, addClinic);
router.post('/banClinic', authMiddleware, banClinic);
router.post('/showClinic', authMiddleware, showClinic);
router.post('/detailClinic', authMiddleware, detailClinic);
router.post('/deleteClinic', authMiddleware, deleteClinic);
router.post('/editClinic', authMiddleware, editClinic);

//crud vet route
router.post('/detailVet', authMiddleware, detailVet);
router.post('/showAllVet', authMiddleware, showAllVet);
router.post('/banVetClinic', authMiddleware, banVetClinic);
router.post('/editVet', authMiddleware, editVet);
router.post('/showAllVet', authMiddleware, showAllVet);
router.post('/addVet', authMiddleware, addVet);

module.exports = router;
