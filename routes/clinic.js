const express = require('express'),
    router = express.Router();

//controller
const {loginClinic} = require('../controller/authController');
const {authMiddleware} = require("../middleware/authMiddleware");
const {clinicAcceptAppointment, clinicRejectAppointment} = require("../controller/appointmentController");

//user auth router
router.post('/login', loginClinic);

//appointment controller
router.post('/acceptAppointment', authMiddleware, clinicAcceptAppointment)
router.post('/rejectAppointment', authMiddleware, clinicRejectAppointment)


module.exports = router;
