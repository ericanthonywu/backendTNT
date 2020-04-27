const express = require('express'),
    router = express.Router(),

//controller
    {login, register, verifyEmail, reSendEmail, userFCMToken} = require('../controller/authController'),
    {showUserAppointment, addAppointment, showUsersTodayAppointment, showVetAvailable, cancelAppointment, reScheduleAppointment} = require("../controller/appointmentController"),
    {userShowChat, userFileChat, userSendChat, endChat, getVet} = require("../controller/chatController"),
    {update_pet, add_pet, delete_pet, update_profile, user_profile} = require("../controller/profileController"),
    {getClinicByVet, searchVet, searchClinic} = require("../controller/dashboardController"),
    {getBlog} = require("../controller/crudController"),

//middleware
    {authMiddleware} = require('../middleware/authMiddleware'),
    {uploadPet, uploadChat} = require('../middleware/uploadFileMiddleware');

//user auth router
router.post('/login', login);
router.post('/register', register);
router.post('/verify', verifyEmail);
router.post('/resendEmail', reSendEmail);
router.post('/setFCMToken', authMiddleware, userFCMToken);

//care router
router.post('/searchVet', authMiddleware, searchVet);
router.post('/searchClinic', authMiddleware, searchClinic);
router.post('/getClinicByVet', authMiddleware, getClinicByVet);

//profile router
router.post('/user_profile', authMiddleware, user_profile);
router.post('/update_profile', authMiddleware, update_profile);
router.post('/delete_pet', authMiddleware, delete_pet);
router.post('/add_pet', uploadPet.single('image'), authMiddleware, add_pet);
router.post('/update_pet', uploadPet.single('image'), authMiddleware, update_pet);

//chat router
router.post('/fileChat', uploadChat.single("image"), authMiddleware, userFileChat);
router.post('/sendChat', authMiddleware, userSendChat);
router.post('/showChat', authMiddleware, userShowChat);
router.post('/getVet', authMiddleware, getVet);
router.post('/endChat', authMiddleware, endChat);

//appointment router
router.post('/addAppointment', authMiddleware, addAppointment);
router.post('/reScheduleAppointment', authMiddleware, reScheduleAppointment)
router.post('/cancelAppointment', authMiddleware, cancelAppointment)
router.post('/showVetAvailable', authMiddleware, showVetAvailable)
router.post('/showUsersTodayAppointment', authMiddleware, showUsersTodayAppointment)
router.post('/showUserAppointment', authMiddleware, showUserAppointment)

router.post('/getBlog', authMiddleware, getBlog)

module.exports = router;
