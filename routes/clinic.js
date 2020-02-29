const express = require('express'),
    router = express.Router();

//controller
const {loginClinic} = require('../controller/authController'),
    {authMiddleware} = require("../middleware/authMiddleware"),
    {reScheduleAppointmentAction} = require("../controller/appointmentController"),
    {showVetClinic, searchVetClinic, addVetClinic} = require("../controller/crudController"),
    {clinicShowAllBookingAppointment, clinicShowOngoingAppointment, clinicShowQuickPendingAppointment} = require("../controller/appointmentController");

//user auth router
router.post('/login', loginClinic);

//appointment controller
router.post('/reScheduleAppointmentAction', authMiddleware, reScheduleAppointmentAction);
router.post('/clinicShowQuickPendingAppointment', authMiddleware, clinicShowQuickPendingAppointment);
router.post('/clinicShowAllBookingAppointment', authMiddleware, clinicShowAllBookingAppointment);
router.post('/clinicShowOngoingAppointment', authMiddleware, clinicShowOngoingAppointment);

//vet controller
router.post('/showVetClinic', authMiddleware, showVetClinic);
router.post('/searchVetClinic', authMiddleware, searchVetClinic);
router.post('/addVetClinic', authMiddleware, addVetClinic);

module.exports = router;
