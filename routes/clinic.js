const express = require('express'),
    router = express.Router();

//controller
const {loginClinic} = require('../controller/authController'),
    {authMiddleware} = require("../middleware/authMiddleware"),
    {clinicAcceptAppointment, clinicRejectAppointment} = require("../controller/appointmentController"),
    {showVetClinic, searchVetClinic, addVetClinic, getClinicNotification} = require("../controller/crudController"),
    {clinicShowAllBookingAppointment} = require("../controller/appointmentController");

//user auth router
router.post('/login', loginClinic);

//appointment controller
router.post('/acceptAppointment', authMiddleware, clinicAcceptAppointment);
router.post('/rejectAppointment', authMiddleware, clinicRejectAppointment);

//vet controller
router.post('/showVetClinic', authMiddleware, showVetClinic);
router.post('/searchVetClinic', authMiddleware, searchVetClinic);
router.post('/addVetClinic', authMiddleware, addVetClinic);

router.post('/getClinicNotification', authMiddleware, getClinicNotification);
router.post('/clinicShowAllBookingAppointment', authMiddleware, clinicShowAllBookingAppointment);

module.exports = router;
