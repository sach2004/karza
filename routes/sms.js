const cron = require('node-cron');
const twilio = require('twilio');


require('dotenv').config();
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

function sendScheduledSms() {
    client.messages.create({
        body: 'Remember to return the borrowed money!',
        from: '+15017122661', 
        to: '+15558675310' 
    })
    .then(message => console.log(`Message sent: ${message.sid}`))
    .catch(error => console.error(error));
}


cron.schedule('0 10 * * *', sendScheduledSms, {
    scheduled: true,
    timezone: "Your/Timezone"
});