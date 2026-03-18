const { authenticate } = require('./src/middleware/auth');
(async () => {
    // We already know the Node process is running via nodemon which auto-restarted
    // Let's just do a sanity check to make sure there are no syntax errors in auth.js
    console.log("Syntax OK");
})();
