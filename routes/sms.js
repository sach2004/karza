const cron = require('node-cron');
const twilio = require('twilio');



const accountSid = 'AC98c1dff64a2124694e46fb823660c93e';
const authToken = '38f4857ba0b08e65d42e5f8f4e36b685';
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