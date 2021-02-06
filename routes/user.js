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
router.get('/getClinicByVet', authMiddleware, getClinicByVet);

//profile router
router.get('/user_profile', authMiddleware, user_profile);
router.put('/update_profile', authMiddleware, update_profile);
router.post('/delete_pet', authMiddleware, delete_pet);
router.post('/add_pet', uploadPet.single('image'), authMiddleware, add_pet);
router.put('/update_pet', uploadPet.single('image'), authMiddleware, update_pet);

//chat router
router.post('/fileChat', uploadChat.single("image"), authMiddleware, userFileChat);
router.post('/sendChat', authMiddleware, userSendChat);
router.get('/showChat', authMiddleware, userShowChat);
router.get('/getVet', authMiddleware, getVet);
router.post('/endChat', authMiddleware, endChat);

//appointment router
router.post('/addAppointment', authMiddleware, addAppointment);
router.put('/reScheduleAppointment', authMiddleware, reScheduleAppointment)
router.post('/cancelAppointment', authMiddleware, cancelAppointment)
router.get('/showVetAvailable', authMiddleware, showVetAvailable)
router.get('/showUsersTodayAppointment', authMiddleware, showUsersTodayAppointment)
router.get('/showUserAppointment', authMiddleware, showUserAppointment)

router.get('/getBlog', authMiddleware, getBlog)

module.exports = router;
