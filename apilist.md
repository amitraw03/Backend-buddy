# DevBuddy APIS

## authRouter
- POST /signup
- POST /login
- POST /logout

## profileRouter
- GET    /profile/view
- PATCH  /profile/edit
- PATCH  /profile/reset-password

## connectionRequestRouter
- POST  /request/send/:status/:toUSerId
- POST /request/respond/:status/:requestID

## userRouter
- GET /user/requests-pending
- GET /user/connections
- GET /user/feed